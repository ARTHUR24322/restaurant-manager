"use server";

import { prisma } from "./prisma";
import { revalidatePath } from "next/cache";

/**
 * Récupérer tous les articles de stock d'un restaurant
 */
export async function getInventory(restaurantId: string) {
  try {
    return await prisma.articleStock.findMany({
      where: { restaurantId },
      include: {
        emplacement: true,
        fournisseur: true,
        mouvements: {
          take: 5,
          orderBy: { createdAt: "desc" }
        }
      },
      orderBy: { nom: "asc" }
    });
  } catch (error) {
    console.error("[Inventory] Error fetching:", error);
    return [];
  }
}

/**
 * Créer un nouvel article
 */
export async function createArticle(restaurantId: string, data: any) {
  try {
    const article = await prisma.articleStock.create({
      data: {
        ...data,
        restaurantId
      }
    });
    revalidatePath("/manager/inventory");
    return { success: true, article };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Enregistrer un mouvement de stock
 */
export async function recordMovement(data: {
  articleId: string;
  restaurantId: string;
  type: 'ENTREE' | 'SORTIE' | 'PERTE' | 'RETOUR' | 'AJUSTEMENT';
  quantite: number;
  note?: string;
  prixUnitaire?: number;
}) {
  try {
    // 1. Créer le mouvement
    await prisma.mouvementStock.create({
      data: {
        type: data.type,
        quantite: data.quantite,
        note: data.note,
        prixUnitaire: data.prixUnitaire,
        articleId: data.articleId,
        restaurantId: data.restaurantId
      }
    });

    // 2. Calculer le nouvel inventaire
    let adjustment = data.quantite;
    if (['SORTIE', 'PERTE'].includes(data.type)) {
      adjustment = -Math.abs(data.quantite);
    } else {
      adjustment = Math.abs(data.quantite);
    }

    await prisma.articleStock.update({
      where: { id: data.articleId },
      data: {
        stockActuel: {
          increment: adjustment
        }
      }
    });

    revalidatePath("/manager/inventory");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Récupérer les emplacements
 */
export async function getLocations(restaurantId: string) {
  return await prisma.emplacement.findMany({ where: { restaurantId } });
}

/**
 * Récupérer les fournisseurs
 */
export async function getSuppliers(restaurantId: string) {
  return await prisma.fournisseur.findMany({ where: { restaurantId } });
}

/**
 * Créer un emplacement
 */
export async function createLocation(restaurantId: string, data: any) {
  try {
    const loc = await prisma.emplacement.create({
      data: { ...data, restaurantId }
    });
    revalidatePath("/manager/inventory");
    return { success: true, loc };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Créer un fournisseur
 */
export async function createSupplier(restaurantId: string, data: any) {
  try {
    const sup = await prisma.fournisseur.create({
      data: { ...data, restaurantId }
    });
    revalidatePath("/manager/inventory");
    return { success: true, sup };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Supprimer un emplacement
 */
export async function deleteLocation(id: string) {
  try {
    await prisma.emplacement.delete({ where: { id } });
    revalidatePath("/manager/inventory");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Supprimer un fournisseur
 */
export async function deleteSupplier(id: string) {
  try {
    await prisma.fournisseur.delete({ where: { id } });
    revalidatePath("/manager/inventory");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Statistiques globales du stock
 */
export async function getInventoryStats(restaurantId: string) {
  try {
    const articles = await prisma.articleStock.findMany({
      where: { restaurantId }
    });

    const totalValue = articles.reduce((acc: number, art: any) => acc + (art.stockActuel * art.prixAchat), 0);
    const lowStockCount = articles.filter((art: any) => art.stockActuel <= art.stockMin).length;
    
    return {
      totalItems: articles.length,
      totalValue,
      lowStockCount
    };
  } catch (error) {
    return { totalItems: 0, totalValue: 0, lowStockCount: 0 };
  }
}
