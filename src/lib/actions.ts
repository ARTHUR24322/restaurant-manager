/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
"use server";

import { prisma } from "./prisma";
import { revalidatePath, revalidateTag } from "next/cache";
import { headers } from "next/headers";
import { broadcastEvent } from "@/lib/sse";
import { ensureManager } from "./auth-actions";
import { getCachedPlats, getCachedRestaurant } from "./cache";
import { deductStockForOrder } from "./inventory-actions";

import { uploadImageToSupabase } from "./supabase-storage";
import { notifyOrderReady, sendDigitalReceipt, sendWhatsAppTemplate } from "./whatsapp-service";
import { LoyaltyService } from "./loyalty-service";
import { validateUploadFile } from "./upload-validator";

// --- SÉCURITÉ: Rate Limiter en mémoire pour les Server Actions publiques ---
const actionRateLimitMap = new Map<string, { count: number; lastRequest: number }>();
let lastActionCleanup = Date.now();

function checkActionRateLimit(ip: string): boolean {
  const now = Date.now();
  if (now - lastActionCleanup > 5 * 60 * 1000) {
    lastActionCleanup = now;
    // Nettoyer vieilles entrées (> 2 mins)
    for (const [key, record] of Array.from(actionRateLimitMap.entries())) {
      if (now - record.lastRequest > 2 * 60 * 1000) {
        actionRateLimitMap.delete(key);
      }
    }
  }

  const windowMs = 2 * 60 * 1000; // 2 minutes
  const maxAttempts = 3; // 3 commandes max par IP toutes les 2 minutes

  const record = actionRateLimitMap.get(ip);
  if (!record) {
    actionRateLimitMap.set(ip, { count: 1, lastRequest: now });
    return false;
  }

  if (now - record.lastRequest > windowMs) {
    record.count = 1;
    record.lastRequest = now;
    return false;
  }

  record.count++;
  record.lastRequest = now;
  return record.count > maxAttempts;
}

// Utilitaire de diffusion Temps Réel (SSE)
function broadcastToAll(type: string, data: Record<string, unknown> = {}) {
  broadcastEvent(type, data);
}

export async function getRestaurantStatus(restaurantId: string) {
  try {
    return await getCachedRestaurant(restaurantId);
  } catch (_error) {
    return null;
  }
}

export async function getPlats(restaurantId?: string) {
  try {
    if (!restaurantId) return [];
    return await getCachedPlats(restaurantId);
  } catch (_error) {
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
    const devise = (formData.get("devise") as string) || "USD";
    const categorie = formData.get("categorie") as string;
    const isLoyaltyReward = formData.get("isLoyaltyReward") === "true";
    let image = formData.get("image") as string;
    const imageFile = formData.get("imageFile") as File | null;

    if (imageFile && imageFile.size > 0 && typeof imageFile.arrayBuffer === 'function') {
      // SÉCURITÉ M4 : Validation du fichier uploadé
      const validation = validateUploadFile(imageFile);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      const bytes = await imageFile.arrayBuffer();
      const buffer = Buffer.from(bytes);

      image = await uploadImageToSupabase(buffer, imageFile.name, "plats");
    }

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
        devise,
        categorie,
        image,
        isLoyaltyReward,
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
    revalidateTag(`menu-${restaurantId}`);
  } catch (error) {
    console.error("Error adding plat:", error);
    throw error;
  }
}

export async function updatePlat(formData: FormData) {
  try {
    const restaurantId = formData.get("restaurantId") as string;
    const platId = formData.get("platId") as string;
    if (!restaurantId || !platId) throw new Error("IDs requis");

    await ensureManager(restaurantId);

    // SÉCURITÉ: Vérifier que le plat appartient bien à ce restaurant
    const exist = await prisma.plat.findUnique({ where: { id: platId } });
    if (!exist || exist.restaurantId !== restaurantId) {
        throw new Error("Action non autorisée : Plat non trouvé ou n'appartenant pas à cet établissement");
    }

    const nom = formData.get("nom") as string;
    const description = formData.get("description") as string;
    const prixUsd = parseFloat(formData.get("prixUsd") as string);
    const devise = (formData.get("devise") as string) || "USD";
    const categorie = formData.get("categorie") as string;
    const isLoyaltyReward = formData.get("isLoyaltyReward") === "true";
    const image = formData.get("image") as string;
    const imageFile = formData.get("imageFile") as File | null;

    const data: Record<string, unknown> = {
      nom,
      description,
      prixUsd,
      devise,
      categorie,
      isLoyaltyReward,
    };

    if (imageFile && imageFile.size > 0 && typeof imageFile.arrayBuffer === 'function') {
      // SÉCURITÉ M4 : Validation du fichier uploadé
      const validation = validateUploadFile(imageFile);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      const bytes = await imageFile.arrayBuffer();
      const buffer = Buffer.from(bytes);
      data.image = await uploadImageToSupabase(buffer, imageFile.name, "plats");
    } else if (image) {
      data.image = image;
    }

    const optionsRaw = formData.get("options") as string;
    const optionsList = optionsRaw 
      ? optionsRaw.split(",").map(opt => opt.trim()).filter(opt => opt !== "") 
      : [];

    await prisma.plat.update({
      where: { id: platId },
      data: {
        ...data,
        options: {
          deleteMany: {},
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
    revalidateTag(`menu-${restaurantId}`);
    return { success: true };
  } catch (error: unknown) {
    console.error("Error updating plat:", error);
    const msg = error instanceof Error ? error.message : "Erreur inconnue";
    return { success: false, error: msg };
  }
}

export async function deletePlat(formData: FormData) {
  try {
    const restaurantId = formData.get("restaurantId") as string;
    const platId = formData.get("platId") as string;
    if (!restaurantId || !platId) throw new Error("IDs requis");

    await ensureManager(restaurantId);

    // SÉCURITÉ: Vérifier que le plat appartient bien à ce restaurant
    const plat = await prisma.plat.findUnique({ where: { id: platId } });
    if (!plat || plat.restaurantId !== restaurantId) {
        throw new Error("Action non autorisée : Plat non trouvé ou n'appartenant pas à cet établissement");
    }

    await prisma.plat.delete({
      where: { id: platId }
    });

    revalidatePath("/manager/menu");
    revalidatePath("/client/menu");
    revalidateTag(`menu-${restaurantId}`);
  } catch (error: unknown) {
    console.error("Error deleting plat:", error);
    throw error;
  }
}

export async function getOrderDetails(orderId: string) {
  try {
    const order = await prisma.commande.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            plat: true
          }
        },
        restaurant: true
      }
    });

    if (!order) return { success: false, error: "Commande introuvable" };

    // Get loyalty status if phone exists
    let loyalty = null;
    let isLoyaltyActive = false;
    
    const config = await prisma.loyaltyConfig.findUnique({
      where: { restaurantId: order.restaurantId }
    });
    isLoyaltyActive = config?.isActive || false;

    if (order.phone && isLoyaltyActive) {
      loyalty = await getLoyaltyStatus(order.restaurantId, order.phone);
    }

    return { success: true, order, loyalty, isLoyaltyActive };
  } catch (error) {
    console.error("Error fetching order details:", error);
    return { success: false, error: "Erreur serveur" };
  }
}

export async function updateOrderAddress(orderId: string, adresseLivraison: string) {
  try {
    // SÉCURITÉ M3 : Vérifier que la commande existe et contrôler l'autorisation
    const existing = await prisma.commande.findUnique({
      where: { id: orderId },
      select: { restaurantId: true, createdAt: true }
    });
    if (!existing) throw new Error("Commande introuvable");

    // Autorisation : seules les commandes récentes (< 30 min) OU un manager authentifié peuvent modifier l'adresse
    const ageMs = Date.now() - new Date(existing.createdAt).getTime();
    const isRecentOrder = ageMs < 30 * 60 * 1000; // 30 minutes
    
    if (!isRecentOrder) {
      // Si la commande est ancienne, seul un manager peut modifier
      await ensureManager(existing.restaurantId);
    }

    const order = await prisma.commande.update({
      where: { id: orderId },
      data: { adresseLivraison }
    });
    
    // Broadcast for dashboard real-time update
    broadcastToAll("status-updated", { orderId, adresseLivraison, restaurantId: order.restaurantId });
    return { success: true };
  } catch (error) {
    console.error("Error updating order address:", error);
    return { success: false, error: "Erreur lors de l'enregistrement de l'adresse" };
  }
}

export async function createCommande(data: {
  cartItems: { plat: { id: string }, quantite: number | string, selectedOptions: Record<string, unknown> }[];
  tableNumber: string;
  customerName?: string;
  notes?: string;
  totalUsd: number;
  restaurantId?: string;
  promoRewardId?: string;
  forceStatus?: string;
}) {
  try {
    const restaurantId = data.restaurantId;
    if (!restaurantId) throw new Error("Restaurant ID requis");

    // SÉCURITÉ B0: Rate Limiting
    const headersList = headers();
    const fallbackIp = headersList.get('x-forwarded-for') || headersList.get('x-real-ip') || 'anonymous_action';
    const clientIp = fallbackIp.split(',')[0].trim();
    if (checkActionRateLimit(clientIp)) {
      console.warn(`[Anti-Bot] Blocage d'une création abusive de commande pour l'IP : ${clientIp}`);
      return { success: false, error: "Trop de commandes récentes. Veuillez patienter 2 minutes avant de ré-essayer." };
    }

    // SÉCURITÉ B0.5: Validation Stricte des entrées (Anti-Spam / Payload trop lourd)
    if (!data.cartItems || !Array.isArray(data.cartItems) || data.cartItems.length === 0) {
      return { success: false, error: "Le panier est vide ou invalide." };
    }
    if (data.cartItems.length > 50) {
      return { success: false, error: "Limite de 50 articles par commande atteinte." };
    }
    if (data.customerName && data.customerName.length > 100) {
      return { success: false, error: "Le nom du client est trop long." };
    }
    if (data.notes && data.notes.length > 500) {
      return { success: false, error: "Les notes sont trop longues (max 500 caractères)." };
    }

    // SÉCURITÉ B2 : Vérifier le statut d'abonnement du restaurant
    const restoProfile = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { tauxChange: true, active: true, subscriptionEnd: true }
    });

    if (!restoProfile || !restoProfile.active) {
      return { success: false, error: "Ce restaurant est actuellement inactif. Impossible de passer une commande." };
    }

    if (restoProfile.subscriptionEnd && new Date(restoProfile.subscriptionEnd) < new Date()) {
      return { success: false, error: "L'abonnement de ce restaurant a expiré. Impossible de passer une commande." };
    }

    // 0. Récupérer le taux de change
    let exchangeRate = 2800;
    if (restoProfile?.tauxChange) exchangeRate = restoProfile.tauxChange;
    
    // 1. Recalculer le total côté serveur
    const platIds = data.cartItems.map((item) => item.plat.id);
    const plats = await prisma.plat.findMany({
      where: { 
        id: { in: platIds },
        restaurantId: restaurantId
      }
    });

    let calculatedTotal = 0;
    for (const item of data.cartItems) {
      const qte = parseInt(String(item.quantite), 10);
      if (isNaN(qte) || qte <= 0) {
        throw new Error("Quantité invalide détectée dans le panier");
      }
      item.quantite = qte;

      const plat = plats.find(p => p.id === item.plat.id);
      if (plat) {
        calculatedTotal += plat.prixUsd * item.quantite;
      }
    }

    // 1.5 Appliquer Promo si existante
    if (data.promoRewardId) {
       const reward = await prisma.clientReward.findUnique({
         where: { id: data.promoRewardId, restaurantId, isUsed: false }
       });
       if (reward) {
          const discount = (calculatedTotal * (reward.discountValue || 0)) / 100;
          calculatedTotal -= discount;
          // Marquer comme utilisé
          await prisma.clientReward.update({
            where: { id: data.promoRewardId },
            data: { isUsed: true }
          });
       }
    }

    // Create the order
    const order = await prisma.commande.create({
      data: {
        table: data.tableNumber,
        client: data.customerName || "Anonyme",
        noteSpeciale: data.notes,
        totalUsd: calculatedTotal, 
        tauxChange: exchangeRate,
        statut: data.forceStatus || (data.tableNumber === "EN LIGNE" ? "PENDING_BOUTIQUE" : "SUBMITTED"),
        paiementStatus: "UNPAID",
        restaurantId: restaurantId,
        items: {
          create: data.cartItems.map((item) => ({
            plat: { connect: { id: item.plat.id } },
            quantite: Number(item.quantite),
            options: JSON.stringify(item.selectedOptions)
          }))
        }
      },
      include: {
        items: true
      }
    });

    broadcastToAll("new-order", { ...order, restaurantId });
    
    // Revalidation asynchrone (non-bloquante pour la réponse immédiate)
    revalidateTag(`menu-${restaurantId}`);
    revalidatePath("/manager/dashboard");

    return { success: true, orderId: order.id };
  } catch (error: unknown) {
    console.error("Critical: Error creating order:", error);
    return { success: false, error: "Erreur lors de l'envoi de la commande. Veuillez réessayer." };
  }
}

export async function getRecentCommandes(restaurantId?: string) {
  try {
    if (!restaurantId) return [];
    
    // On récupère les commandes actives (non terminées/annulées) 
    // + les 10 dernières commandes terminées pour historique récent
    const orders = await prisma.commande.findMany({
      where: { 
        restaurantId,
        OR: [
          { statut: { in: ["SUBMITTED", "PREPARING", "READY", "PENDING_BOUTIQUE", "READY_FOR_DELIVERY", "DELIVERING"] } },
          { 
            statut: { in: ["COMPLETED", "CANCELLED"] },
            createdAt: { gte: new Date(Date.now() - 12 * 60 * 60 * 1000) } // 12 dernières heures
          }
        ]
      },
      orderBy: { createdAt: "asc" },
      include: {
        items: {
          include: {
            plat: true
          }
        }
      }
    });
    return orders;
  } catch (error: unknown) {
    console.error("Error fetching recent orders:", error);
    return [];
  }
}

export async function updateOrderStatus(orderId: string, newStatus: string, cuisinierId?: string) {
  try {
    const order = await prisma.commande.findUnique({
      where: { id: orderId },
      select: { restaurantId: true }
    });

    if (!order) throw new Error("Commande introuvable");
    
    // Vérification de l'autorisation
    await ensureManager(order.restaurantId);

    const updateData: Record<string, unknown> = { statut: newStatus };
    // Si un cuisinier est identifié lors du passage en READY, on le trace
    if (cuisinierId && (newStatus === "READY" || newStatus === "READY_FOR_DELIVERY")) {
      updateData.cuisinierId = cuisinierId;
    }

    await prisma.commande.update({
      where: { id: orderId },
      data: updateData
    });
    
    broadcastToAll("status-updated", { orderId, newStatus, restaurantId: order.restaurantId });
    
    // NOUVEAU: Notification WhatsApp si la commande est prête
    if (newStatus === "READY") {
      const fullOrder = await prisma.commande.findUnique({ 
        where: { id: orderId },
        include: { items: { include: { plat: true } } }
      });
      if (fullOrder && fullOrder.phone) {
        notifyOrderReady(fullOrder as any).catch((err: any) => console.error("WA Ready Error:", err));
      }
    }
    
    revalidatePath("/manager/dashboard");
    revalidatePath("/manager/cuisine");
    
    return { success: true };
  } catch (error: unknown) {
    console.error("Error updating order status:", error);
    return { success: false };
  }
}

export async function validateBoutiqueOrder(orderId: string) {
  try {
    // SÉCURITÉ: Récupérer le restaurantId et vérifier l'autorisation
    const existing = await prisma.commande.findUnique({
      where: { id: orderId },
      select: { restaurantId: true }
    });
    if (!existing) throw new Error("Commande introuvable");

    await ensureManager(existing.restaurantId);

    const order = await prisma.commande.update({
      where: { id: orderId },
      data: { statut: "SUBMITTED" }
    });
    
    broadcastToAll("status-updated", { orderId, newStatus: "SUBMITTED", restaurantId: order.restaurantId });
    return { success: true };
  } catch (error) {
    console.error("Error validating boutique order:", error);
    return { success: false, error: "Erreur lors de la validation" };
  }
}

export async function assignLivreur(orderId: string, livreurName: string) {
  try {
    // SÉCURITÉ: Récupérer le restaurantId et vérifier l'autorisation
    const existing = await prisma.commande.findUnique({
      where: { id: orderId },
      select: { restaurantId: true }
    });
    if (!existing) throw new Error("Commande introuvable");

    await ensureManager(existing.restaurantId);

    const order = await prisma.commande.update({
      where: { id: orderId },
      data: { statut: "DELIVERING", livreur: livreurName }
    });
    broadcastToAll("status-updated", { orderId, newStatus: "DELIVERING", restaurantId: order.restaurantId });
    return { success: true };
  } catch (error) {
    console.error("Error assigning livreur:", error);
    return { success: false, error: "Erreur lors de l'assignation du livreur" };
  }
}

export async function markDelivered(orderId: string) {
  try {
    const orderToUpdate = await prisma.commande.findUnique({
      where: { id: orderId }
    });
    if (!orderToUpdate) throw new Error("Commande introuvable");

    // SÉCURITÉ: Vérifier que le manager est bien celui de ce restaurant
    await ensureManager(orderToUpdate.restaurantId);

    const order = await prisma.commande.update({
      where: { id: orderId },
      data: { statut: "COMPLETED", paiementStatus: "PAID_CASH" }
    });

    // SÉCURITÉ B1 : Déduction des stocks uniquement si pas déjà fait
    if (!orderToUpdate.stockDeducted) {
      await deductStockForOrder(orderId, order.restaurantId);
      await prisma.commande.update({
        where: { id: orderId },
        data: { stockDeducted: true }
      });
    }

    // Fidélité et Reçu WhatsApp
    const fullOrderForReceipt = await prisma.commande.findUnique({
      where: { id: orderId },
      include: { items: { include: { plat: true } } }
    });

    const restaurant = await prisma.restaurant.findUnique({
      where: { id: order.restaurantId },
      select: { plan: true }
    });

    if (order.phone && restaurant && fullOrderForReceipt && (restaurant.plan === "PRO" || restaurant.plan === "PLATINUM" || restaurant.plan === "FREE" || restaurant.plan === "TRIAL")) {
      const customer = await LoyaltyService.addPoints(order.phone, order.restaurantId, order.totalUsd, orderId);
      
      if (customer) {
        // Notification Fidélité WhatsApp
        const config = await prisma.loyaltyConfig.findUnique({ where: { restaurantId: order.restaurantId } });
        const threshold = config?.rewardThreshold || 100;
        
        if (customer.points >= threshold) {
          sendWhatsAppTemplate(
            order.restaurantId,
            order.phone,
            "loyalty_reward_reached",
            "fr",
            [
              {
                type: "body",
                parameters: [
                  { type: "text", text: customer.points.toString() },
                  { type: "text", text: "une récompense" }
                ]
              }
            ]
          ).catch((err: any) => console.error("WA Loyalty Reward Error:", err));
        } else {
          sendWhatsAppTemplate(
            order.restaurantId,
            order.phone,
            "loyalty_points_earned",
            "fr",
            [
              {
                type: "body",
                parameters: [
                  { type: "text", text: Math.floor(order.totalUsd * (config?.pointsPerUsd || 1)).toString() },
                  { type: "text", text: customer.points.toString() }
                ]
              }
            ]
          ).catch((err: any) => console.error("WA Loyalty Earn Error:", err));
        }
      }

      // Envoi du reçu numérique via WhatsApp
      sendDigitalReceipt(fullOrderForReceipt as any).catch((err: any) => console.error("WA Receipt Error:", err));
    }

    broadcastToAll("status-updated", { orderId, newStatus: "COMPLETED", restaurantId: order.restaurantId });
    return { success: true };
  } catch (error) {
    console.error("Error marking delivered:", error);
    return { success: false };
  }
}

export async function requestPaymentByWaiter(orderId: string) {
  try {
    const order = await prisma.commande.findUnique({
      where: { id: orderId },
      select: { restaurantId: true, statut: true, id: true }
    });

    if (!order) throw new Error("Commande introuvable");
    
    // Vérification de l'autorisation
    await ensureManager(order.restaurantId);

    await prisma.commande.update({
      where: { id: orderId },
      data: { paiementStatus: "PAYMENT_REQUESTED" }
    });

    broadcastToAll("status-updated", { orderId, newStatus: "PAYMENT_REQUESTED", restaurantId: order.restaurantId });
    
    revalidatePath("/manager/dashboard");
    revalidatePath("/manager/caisse");
    revalidatePath("/manager/service");
    
    return { success: true };
  } catch (error) {
    console.error("Error requesting waiter payment:", error);
    return { success: false };
  }
}

export async function confirmOrderPayment(orderId: string, method: string) {
  try {
    const order = await prisma.commande.findUnique({
      where: { id: orderId },
      select: { restaurantId: true, statut: true, id: true, totalUsd: true, client: true, phone: true, table: true, stockDeducted: true }
    });

    if (!order) throw new Error("Commande introuvable");
    if (order.statut === "COMPLETED" || order.statut === "CANCELLED") {
      return { success: false, error: "Cette commande est déjà traitée." };
    }

    // Vérification de l'autorisation
    await ensureManager(order.restaurantId);

    await prisma.commande.update({
      where: { id: orderId },
      data: { 
        statut: "COMPLETED",
        paiementStatus: method === "CASH" ? "PAID_CASH" : "PAID_MOBILE"
      }
    });

    // SÉCURITÉ B1 : Déduction des stocks uniquement si pas déjà fait
    if (!order.stockDeducted) {
      await deductStockForOrder(orderId, order.restaurantId);
      await prisma.commande.update({
        where: { id: orderId },
        data: { stockDeducted: true }
      });
    }
    
    // Points de fidélité et Reçu WhatsApp (Uniquement PRO et PLATINUM)
    const fullOrderForReceipt = await prisma.commande.findUnique({
      where: { id: orderId },
      include: { items: { include: { plat: true } } }
    });

    const restaurant = await prisma.restaurant.findUnique({
      where: { id: order.restaurantId },
      select: { plan: true }
    });

    if (order.phone && restaurant && fullOrderForReceipt && (restaurant.plan === "PRO" || restaurant.plan === "PLATINUM" || restaurant.plan === "FREE" || restaurant.plan === "TRIAL")) {
      const customer = await LoyaltyService.addPoints(order.phone, order.restaurantId, order.totalUsd, orderId);
      
      if (customer) {
        // Notification Fidélité WhatsApp
        const config = await prisma.loyaltyConfig.findUnique({ where: { restaurantId: order.restaurantId } });
        const threshold = config?.rewardThreshold || 100;
        
        if (customer.points >= threshold) {
          sendWhatsAppTemplate(
            order.restaurantId,
            order.phone,
            "loyalty_reward_reached",
            "fr",
            [
              {
                type: "body",
                parameters: [
                  { type: "text", text: customer.points.toString() },
                  { type: "text", text: "une récompense" }
                ]
              }
            ]
          ).catch((err: any) => console.error("WA Loyalty Reward Error:", err));
        } else {
          sendWhatsAppTemplate(
            order.restaurantId,
            order.phone,
            "loyalty_points_earned",
            "fr",
            [
              {
                type: "body",
                parameters: [
                  { type: "text", text: Math.floor(order.totalUsd * (config?.pointsPerUsd || 1)).toString() },
                  { type: "text", text: customer.points.toString() }
                ]
              }
            ]
          ).catch((err: any) => console.error("WA Loyalty Earn Error:", err));
        }
      }

      // Envoi du reçu numérique via WhatsApp
      sendDigitalReceipt(fullOrderForReceipt as any).catch((err: any) => console.error("WA Receipt Error:", err));
    }

    revalidatePath("/manager/dashboard");
    revalidatePath("/client/menu");
    broadcastToAll("status-updated", { orderId, newStatus: "COMPLETED", restaurantId: order.restaurantId });
    
    return { success: true };
  } catch (error) {
    console.error("Error confirming payment:", error);
    return { success: false };
  }
}

export async function cancelOrder(orderId: string) {
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
      data: { statut: "CANCELLED" }
    });
    
    broadcastToAll("status-updated", { orderId, newStatus: "CANCELLED", restaurantId: order.restaurantId });
    
    revalidatePath("/manager/dashboard");
    revalidatePath("/manager/caisse");
    revalidatePath("/manager/cuisine");
    
    return { success: true };
  } catch (error) {
    console.error("Error cancelling order:", error);
    return { success: false };
  }
}

// -----------------------------
// SYSTÈME DE FIDÉLITÉ (LOYALTY)
// -----------------------------

export async function getLoyaltyStatus(restaurantId: string, phone: string) {
  try {
    const config = await prisma.loyaltyConfig.findUnique({
      where: { restaurantId },
      include: { restaurant: { select: { plan: true } } }
    });
    
    const threshold = config?.rewardThreshold || 100;
    
    const customer = await prisma.loyaltyCustomer.findUnique({
      where: {
        phone_restaurantId: {
          phone,
          restaurantId
        }
      }
    });

    return {
      points: customer?.points || 0,
      threshold,
      rewardDescription: config?.rewardDescription || "Un cadeau offert !",
      plan: config?.restaurant?.plan || 'STANDARD'
    };
  } catch (error) {
    console.error("Error fetching loyalty status:", error);
    return null;
  }
}

export async function getLoyaltyConfig(restaurantId: string) {
  try {
    const config = await prisma.loyaltyConfig.findUnique({
      where: { restaurantId }
    });
    return config;
  } catch (error) {
    console.error("Error fetching loyalty config:", error);
    return null;
  }
}

export async function assignPhoneToOrder(orderId: string, phone: string, customerName?: string) {
  try {
    // SÉCURITÉ M2 : Vérifier que la commande existe avant modification
    const existingOrder = await prisma.commande.findUnique({
      where: { id: orderId },
      select: { id: true, createdAt: true }
    });
    if (!existingOrder) {
      return { success: false, error: "Commande introuvable." };
    }

    // Autorisation : uniquement sur les commandes récentes (< 2h)
    const ageMs = Date.now() - new Date(existingOrder.createdAt).getTime();
    if (ageMs > 2 * 60 * 60 * 1000) {
      return { success: false, error: "Cette commande est trop ancienne pour être modifiée." };
    }

    const order = await prisma.commande.update({
      where: { id: orderId },
      data: { phone }
    });
    
    // Return loyalty status dynamically based on current order potential points
    const config = await prisma.loyaltyConfig.findUnique({
      where: { restaurantId: order.restaurantId }
    });
    
    const threshold = config?.rewardThreshold || 100;
    const multiplier = config?.pointsPerUsd || 1;
    const potentialPoints = Math.floor(order.totalUsd * multiplier);
    
    // Check if customer already exists
    let customer = await prisma.loyaltyCustomer.findUnique({
      where: {
        phone_restaurantId: {
          phone,
          restaurantId: order.restaurantId
        }
      }
    });

    const isNewCustomer = !customer;

    // If new customer and name provided, pre-create the loyalty account
    if (!customer && customerName) {
      customer = await prisma.loyaltyCustomer.create({
        data: {
          phone,
          name: customerName,
          points: 0,
          restaurantId: order.restaurantId
        }
      });
    }

    return {
      success: true,
      isNewCustomer,
      customerName: customer?.name || customerName || "Client",
      currentPoints: customer?.points || 0,
      potentialPoints,
      threshold
    };
  } catch (error) {
    console.error("Error assigning phone to order:", error);
    return { success: false };
  }
}

export async function updateLoyaltySettings(formData: FormData) {
  try {
    const restaurantId = formData.get("restaurantId") as string;
    await ensureManager(restaurantId);

    const pointsPerUsd = parseInt(formData.get("pointsPerUsd") as string);
    const rewardThreshold = parseInt(formData.get("rewardThreshold") as string);
    const isActive = formData.get("isActive") === "true";

    await prisma.loyaltyConfig.upsert({
      where: { restaurantId },
      update: {
        pointsPerUsd,
        rewardThreshold,
        isActive
      },
      create: {
        restaurantId,
        pointsPerUsd,
        rewardThreshold,
        isActive
      }
    });

    revalidatePath("/manager/settings");
    return { success: true };
  } catch (error) {
    console.error("Error updating loyalty settings:", error);
    return { success: false, error: "Erreur lors de la mise à jour." };
  }
}

// -----------------------------
// GESTION DES CLIENTS FIDÉLITÉ (MANAGER)
// -----------------------------

export async function getLoyaltyCustomers(restaurantId: string) {
  try {
    await ensureManager(restaurantId);
    
    const customers = await prisma.loyaltyCustomer.findMany({
      where: { restaurantId },
      orderBy: { points: "desc" },
      include: {
        _count: {
          select: { transactions: true }
        }
      }
    });

    const config = await prisma.loyaltyConfig.findUnique({
      where: { restaurantId },
      include: { restaurant: { select: { plan: true } } }
    });

    return {
      success: true,
      customers,
      config: config || { pointsPerUsd: 1, rewardThreshold: 100 },
      plan: config?.restaurant?.plan || 'STANDARD'
    };
  } catch (error) {
    console.error("Error fetching loyalty customers:", error);
    return { success: false, customers: [], config: null };
  }
}

export async function getLoyaltyCustomerDetails(restaurantId: string, customerId: string) {
  try {
    await ensureManager(restaurantId);
    
    const customer = await prisma.loyaltyCustomer.findUnique({
      where: { id: customerId },
      include: {
        transactions: {
          orderBy: { createdAt: "desc" },
          take: 50
        }
      }
    });

    if (!customer || customer.restaurantId !== restaurantId) {
      return { success: false, customer: null };
    }

    return { success: true, customer };
  } catch (error) {
    console.error("Error fetching customer details:", error);
    return { success: false, customer: null };
  }
}

export async function redeemLoyaltyPoints(restaurantId: string, customerId: string, pointsToRedeem: number, note?: string) {
  try {
    await ensureManager(restaurantId);
    
    const customer = await prisma.loyaltyCustomer.findUnique({
      where: { id: customerId }
    });

    if (!customer || customer.restaurantId !== restaurantId) {
      return { success: false, error: "Client introuvable." };
    }

    if (customer.points < pointsToRedeem) {
      return { success: false, error: "Points insuffisants." };
    }

    await prisma.loyaltyCustomer.update({
      where: { id: customerId },
      data: { points: { decrement: pointsToRedeem } }
    });

    await prisma.loyaltyTransaction.create({
      data: {
        customerId,
        type: "REDEEM",
        points: -pointsToRedeem,
        note: note || `Échange de ${pointsToRedeem} points contre un cadeau`
      }
    });

    revalidatePath("/manager/loyalty");
    return { success: true };
  } catch (error) {
    console.error("Error redeeming points:", error);
    return { success: false, error: "Erreur lors de l'échange." };
  }
}

// -----------------------------
// CONVERSION POINTS → CADEAU PRODUIT
// -----------------------------

export async function toggleLoyaltyReward(platId: string, restaurantId: string) {
  try {
    await ensureManager(restaurantId);

    const plat = await prisma.plat.findUnique({ where: { id: platId } });
    if (!plat || plat.restaurantId !== restaurantId) {
      return { success: false, error: "Plat introuvable." };
    }

    await prisma.plat.update({
      where: { id: platId },
      data: { isLoyaltyReward: !plat.isLoyaltyReward }
    });

    revalidatePath("/manager/menu");
    revalidateTag(`menu-${restaurantId}`);
    return { success: true, isLoyaltyReward: !plat.isLoyaltyReward };
  } catch (error) {
    console.error("Error toggling loyalty reward:", error);
    return { success: false, error: "Erreur." };
  }
}

export async function getRandomRewardProducts(restaurantId: string) {
  try {
    const allRewards = await prisma.plat.findMany({
      where: {
        restaurantId,
        isLoyaltyReward: true,
        disponible: true
      },
      select: {
        id: true,
        nom: true,
        image: true,
        prixUsd: true,
        devise: true,
        categorie: true
      }
    });

    if (allRewards.length === 0) {
      return { success: false, products: [], error: "Aucun produit cadeau configuré par le restaurant." };
    }

    // Shuffle and pick 2 (or less if only 1 available)
    const shuffled = allRewards.sort(() => Math.random() - 0.5);
    const picked = shuffled.slice(0, Math.min(2, shuffled.length));

    return { success: true, products: picked };
  } catch (error) {
    console.error("Error getting reward products:", error);
    return { success: false, products: [], error: "Erreur serveur." };
  }
}

export async function redeemLoyaltyGift(
  restaurantId: string,
  customerId: string,
  chosenPlatId: string
) {
  try {
    const config = await prisma.loyaltyConfig.findUnique({
      where: { restaurantId }
    });
    if (!config) return { success: false, error: "Config introuvable." };

    const customer = await prisma.loyaltyCustomer.findUnique({
      where: { id: customerId }
    });
    if (!customer || customer.restaurantId !== restaurantId) {
      return { success: false, error: "Client introuvable." };
    }
    if (customer.points < config.rewardThreshold) {
      return { success: false, error: "Points insuffisants." };
    }

    const plat = await prisma.plat.findUnique({
      where: { id: chosenPlatId }
    });
    if (!plat || plat.restaurantId !== restaurantId || !plat.isLoyaltyReward) {
      return { success: false, error: "Produit cadeau invalide." };
    }

    // Deduct points
    await prisma.loyaltyCustomer.update({
      where: { id: customerId },
      data: { points: { decrement: config.rewardThreshold } }
    });

    // Log transaction
    await prisma.loyaltyTransaction.create({
      data: {
        customerId,
        type: "REDEEM",
        points: -config.rewardThreshold,
        note: `🎁 Cadeau : ${plat.nom} (${config.rewardThreshold} pts)`
      }
    });

    revalidatePath("/manager/loyalty");
    return { success: true, giftName: plat.nom, giftImage: plat.image };
  } catch (error) {
    console.error("Error redeeming gift:", error);
    return { success: false, error: "Erreur lors de l'échange." };
  }
}

export async function redeemLoyaltyGiftByPhone(
  restaurantId: string,
  phone: string,
  chosenPlatId: string
) {
  try {
    const config = await prisma.loyaltyConfig.findUnique({
      where: { restaurantId }
    });
    if (!config) return { success: false, error: "Config introuvable." };

    const customer = await prisma.loyaltyCustomer.findUnique({
      where: {
        phone_restaurantId: {
          phone,
          restaurantId
        }
      }
    });
    if (!customer) {
      return { success: false, error: "Client introuvable." };
    }
    if (customer.points < config.rewardThreshold) {
      return { success: false, error: "Points insuffisants." };
    }

    const plat = await prisma.plat.findUnique({
      where: { id: chosenPlatId }
    });
    if (!plat || plat.restaurantId !== restaurantId || !plat.isLoyaltyReward) {
      return { success: false, error: "Produit cadeau invalide." };
    }

    await prisma.loyaltyCustomer.update({
      where: { id: customer.id },
      data: { points: { decrement: config.rewardThreshold } }
    });

    await prisma.loyaltyTransaction.create({
      data: {
        customerId: customer.id,
        type: "REDEEM",
        points: -config.rewardThreshold,
        note: `🎁 Cadeau : ${plat.nom} (${config.rewardThreshold} pts)`
      }
    });

    // Envoi de la confirmation par WhatsApp
    sendWhatsAppTemplate(
      restaurantId,
      phone,
      "loyalty_gift_redeemed", // Template: Félicitations! Vous avez échangé vos points contre {1}. 🎁
      "fr",
      [
        {
          type: "body",
          parameters: [
            { type: "text", text: plat.nom }
          ]
        }
      ]
    ).catch((err: any) => console.error("WA Gift Redeem Error:", err));

    revalidatePath("/manager/loyalty");
    return { success: true, giftName: plat.nom, newPoints: customer.points - config.rewardThreshold };
  } catch (error: any) {
    console.error("Error redeeming gift by phone:", error);
    return { success: false, error: "Erreur lors de l'échange." };
  }
}
