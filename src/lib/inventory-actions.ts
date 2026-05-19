"use server";

import { prisma } from "./prisma";
import { revalidatePath, revalidateTag } from "next/cache";
import { ensureManager } from "./auth-actions";

/**
 * Récupérer tous les articles de stock d'un restaurant
 */
export async function getInventory(restaurantId: string) {
  try {
    await ensureManager(restaurantId);
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
    await ensureManager(restaurantId);
    const article = await prisma.articleStock.create({
      data: {
        ...data,
        restaurantId
      }
    });

    if (data.stockActuel && data.stockActuel > 0) {
      await prisma.mouvementStock.create({
        data: {
          type: "ENTREE",
          quantite: data.stockActuel,
          note: "Stock initial à la création",
          prixUnitaire: data.prixAchat,
          articleId: article.id,
          restaurantId: restaurantId
        }
      });
    }

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
    await ensureManager(data.restaurantId);

    // SÉCURITÉ: Vérifier que l'article appartient bien à ce restaurant
    const exist = await prisma.articleStock.findUnique({ where: { id: data.articleId } });
    if (!exist || exist.restaurantId !== data.restaurantId) {
        throw new Error("Action non autorisée : Article non trouvé ou n'appartenant pas à cet établissement");
    }

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
    revalidateTag(`menu-${data.restaurantId}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Récupérer les emplacements
 */
export async function getLocations(restaurantId: string) {
  await ensureManager(restaurantId);
  return await prisma.emplacement.findMany({ where: { restaurantId } });
}

/**
 * Récupérer les fournisseurs
 */
export async function getSuppliers(restaurantId: string) {
  await ensureManager(restaurantId);
  return await prisma.fournisseur.findMany({ where: { restaurantId } });
}

/**
 * Créer un emplacement
 */
export async function createLocation(restaurantId: string, data: any) {
  try {
    await ensureManager(restaurantId);
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
    await ensureManager(restaurantId);
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
    const loc = await prisma.emplacement.findUnique({ where: { id } });
    if (!loc) throw new Error("Introuvable");
    await ensureManager(loc.restaurantId);

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
    const sup = await prisma.fournisseur.findUnique({ where: { id } });
    if (!sup) throw new Error("Introuvable");
    await ensureManager(sup.restaurantId);

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
    await ensureManager(restaurantId);
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

/**
 * Récupérer la recette (composition) d'un plat
 */
export async function getRecipeForPlat(platId: string, restaurantId: string) {
  try {
    await ensureManager(restaurantId);
    return await prisma.recetteItem.findMany({
      where: { platId },
      include: {
        article: true
      }
    });
  } catch (error) {
    console.error("[Recipe] Error fetching:", error);
    return [];
  }
}

/**
 * Mettre à jour la recette d'un plat
 */
export async function updateRecipe(platId: string, restaurantId: string, items: { articleId: string; quantite: number }[]) {
  try {
    await ensureManager(restaurantId);
    
    // Vérifier que le plat appartient au restaurant
    const plat = await prisma.plat.findFirst({
      where: { id: platId, restaurantId }
    });
    
    if (!plat) throw new Error("Plat introuvable ou non autorisé");

    // Supprimer l'ancienne recette
    await prisma.recetteItem.deleteMany({
      where: { platId }
    });

    // Créer la nouvelle recette
    if (items && items.length > 0) {
      await prisma.recetteItem.createMany({
        data: items.map(item => ({
          platId,
          articleId: item.articleId,
          quantite: item.quantite
        }))
      });
    }

    revalidatePath("/manager/menu");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Déduire le stock pour une commande complétée
 */
export async function deductStockForOrder(orderId: string, restaurantId: string) {
  try {
    await ensureManager(restaurantId);

    const checkOrder = await prisma.commande.findUnique({
      where: { id: orderId }
    });
    
    // Si la commande n'existe pas ou c'est déjà déduit (on pourrait ajouter un flag if needed), ignorer.
    // Pour simplifier et éviter le double comptage, on déduit à la completion (qui en principe est appelée une fois).

    const order = await prisma.commande.findUnique({
      where: { id: orderId, restaurantId },
      include: {
        items: {
          include: {
            plat: {
              include: {
                recetteItems: true
              }
            }
          }
        }
      }
    });

    if (!order) return { success: false, error: "Commande introuvable" };

    // Regrouper les déductions d'articles pour éviter de multiples enregistrements de mouvements
    const articleDeductions: Record<string, number> = {};

    for (const item of order.items) {
      const qteCommandee = item.quantite;
      if (item.plat && item.plat.recetteItems) {
        for (const recette of item.plat.recetteItems) {
          const totalIngredientUtilise = recette.quantite * qteCommandee;
          if (articleDeductions[recette.articleId]) {
            articleDeductions[recette.articleId] += totalIngredientUtilise;
          } else {
            articleDeductions[recette.articleId] = totalIngredientUtilise;
          }
        }
      }
    }

    // Effectuer les déductions
    for (const [articleId, qteToDeduct] of Object.entries(articleDeductions)) {
      // 1. Créer le mouvement de sortie
      await prisma.mouvementStock.create({
        data: {
          type: "SORTIE",
          quantite: qteToDeduct,
          note: `Vente liée à la commande #${orderId.slice(-6)}`,
          articleId: articleId,
          restaurantId: restaurantId
        }
      });

      // 2. Mettre à jour le stock
      await prisma.articleStock.update({
        where: { id: articleId },
        data: {
          stockActuel: {
            decrement: qteToDeduct
          }
        }
      });
    }

    revalidateTag(`menu-${restaurantId}`);
    return { success: true };
  } catch (error: any) {
    console.error("[Stock Deduction] Error:", error);
    return { success: false, error: error.message };
  }
}
