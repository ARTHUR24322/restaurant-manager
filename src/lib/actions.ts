"use server";

import { prisma } from "./prisma";
import { revalidatePath } from "next/cache";
import { broadcastEvent } from "@/lib/sse";
import { ensureManager } from "./auth-actions";

// Utilitaire de diffusion Temps Réel (SSE)
function broadcastToAll(type: string, data: any = {}) {
  broadcastEvent(type, data);
}

export async function getRestaurantStatus(restaurantId: string) {
  try {
    const resto = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { id: true, nom: true, active: true, plan: true, email: true }
    });
    return resto;
  } catch (error) {
    console.error("Error fetching restaurant status:", error);
    return null;
  }
}

export async function getPlats(restaurantId?: string) {
  try {
    if (!restaurantId) return [];
    const plats = await prisma.plat.findMany({
      where: { restaurantId },
      orderBy: { categorie: "asc" },
      include: {
        options: true
      }
    });
    return plats;
  } catch (error) {
    console.error("Error fetching plats:", error);
    return [];
  }
}

export async function addPlat(formData: FormData) {
  try {
    const restaurantId = formData.get("restaurantId") as string;
    if (!restaurantId) throw new Error("Restaurant ID requis");
    
    // Vérification de l'autorisation
    await ensureManager(restaurantId);

    const nom = formData.get("nom") as string;
    const description = formData.get("description") as string;
    const prixUsd = parseFloat(formData.get("prixUsd") as string);
    const categorie = formData.get("categorie") as string;
    const image = formData.get("image") as string;

    if (!nom || isNaN(prixUsd)) {
      throw new Error("Nom et Prix sont obligatoires");
    }

    const optionsRaw = formData.get("options") as string;
    const optionsList = optionsRaw 
      ? optionsRaw.split(",").map(opt => opt.trim()).filter(opt => opt !== "") 
      : [];

    await prisma.plat.create({
      data: {
        nom,
        description,
        prixUsd,
        categorie,
        image,
        restaurantId,
        options: {
          create: optionsList.map(opt => ({
            nom: opt,
            type: "CHECKBOX",
            choix: JSON.stringify([opt])
          }))
        }
      },
    });

    revalidatePath("/manager/menu");
    revalidatePath("/client/menu");
  } catch (error) {
    console.error("Error adding plat:", error);
    throw error;
  }
}

export async function deletePlat(formData: FormData) {
  try {
    const restaurantId = formData.get("restaurantId") as string;
    const platId = formData.get("platId") as string;
    if (!restaurantId || !platId) throw new Error("IDs requis");

    await ensureManager(restaurantId);

    await prisma.plat.delete({
      where: { id: platId }
    });

    revalidatePath("/manager/menu");
    revalidatePath("/client/menu");
  } catch (error) {
    console.error("Error deleting plat:", error);
    throw error;
  }
}

export async function createCommande(data: {
  cartItems: any[];
  tableNumber: string;
  customerName?: string;
  notes?: string;
  totalUsd: number;
  restaurantId?: string;
}) {
  try {
    const restaurantId = data.restaurantId;
    if (!restaurantId) throw new Error("Restaurant ID requis");

    // 0. Récupérer le taux de change du restaurant (mis à jour quotidiennement par le gérant)
    let exchangeRate = 2800;
    try {
      const restoProfile = await (prisma as any).restaurant.findUnique({
        where: { id: restaurantId },
        select: { tauxChange: true }
      });
      if (restoProfile?.tauxChange) exchangeRate = restoProfile.tauxChange;
    } catch (e) {}
    
    // 1. Recalculer le total côté serveur pour éviter la manipulation (SÉCURITÉ)
    const platIds = data.cartItems.map((item: any) => item.plat.id);
    const plats = await prisma.plat.findMany({
      where: { id: { in: platIds } }
    });

    let calculatedTotal = 0;
    data.cartItems.forEach((item: any) => {
      const plat = plats.find(p => p.id === item.plat.id);
      if (plat) {
        calculatedTotal += plat.prixUsd * item.quantite;
      }
    });

    // Create the order with nested items creation
    const order = await prisma.commande.create({
      data: {
        table: data.tableNumber,
        client: data.customerName || "Anonyme",
        noteSpeciale: data.notes,
        totalUsd: calculatedTotal, 
        tauxChange: exchangeRate,
        statut: "SUBMITTED",
        paiementStatus: "UNPAID",
        restaurantId: restaurantId,
        items: {
          create: data.cartItems.map((item: any) => ({
            platId: item.plat.id,
            quantite: item.quantite,
            options: JSON.stringify(item.selectedOptions)
          }))
        }
      },
      include: {
        items: true
      }
    });

    broadcastToAll("new-order", { ...order, restaurantId });
    revalidatePath("/manager");
    revalidatePath("/manager/dashboard");
    return { success: true, orderId: order.id };
  } catch (error) {
    console.error("Critical: Error creating order:", error);
    return { success: false, error: "Erreur lors de l'envoi de la commande. Veuillez réessayer." };
  }
}

export async function getRecentCommandes(restaurantId?: string) {
  try {
    if (!restaurantId) return [];
    const commandes = await prisma.commande.findMany({
      where: { restaurantId },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        items: {
          include: {
            plat: true
          }
        }
      }
    });
    return commandes;
  } catch (error) {
    console.error("Error fetching recent orders:", error);
    return [];
  }
}

export async function updateOrderStatus(orderId: string, newStatus: string) {
  try {
    const order = await prisma.commande.findUnique({
      where: { id: orderId },
      select: { restaurantId: true }
    });

    if (!order) throw new Error("Commande introuvable");
    
    // Vérification de l'autorisation
    await ensureManager(order.restaurantId);

    await prisma.commande.update({
      where: { id: orderId },
      data: { statut: newStatus }
    });
    
    broadcastToAll("status-updated", { orderId, newStatus, restaurantId: order.restaurantId });
    
    revalidatePath("/manager/dashboard");
    revalidatePath("/manager/cuisine");
    revalidatePath("/client/menu");
    
    return { success: true };
  } catch (error) {
    console.error("Error updating order status:", error);
    return { success: false };
  }
}

export async function confirmOrderPayment(orderId: string, method: string) {
  try {
    const order = await prisma.commande.findUnique({
      where: { id: orderId },
      select: { restaurantId: true }
    });

    if (!order) throw new Error("Commande introuvable");

    // Vérification de l'autorisation
    await ensureManager(order.restaurantId);

    await prisma.commande.update({
      where: { id: orderId },
      data: { 
        statut: "COMPLETED",
        paiementStatus: method === "CASH" ? "PAID_CASH" : "PAID_MOBILE"
      }
    });
    
    revalidatePath("/manager/dashboard");
    revalidatePath("/client/menu");
    broadcastToAll("status-updated", { orderId, newStatus: "COMPLETED", restaurantId: order.restaurantId });
    
    return { success: true };
  } catch (error) {
    console.error("Error confirming payment:", error);
    return { success: false };
  }
}
