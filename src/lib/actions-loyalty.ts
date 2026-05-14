"use server"

import { LoyaltyService } from "./loyalty-service";
import { prisma } from "./prisma";
import { revalidatePath } from "next/cache";

// --- ACTIONS POUR LES RESTAURANTS (MANAGER) ---

export async function addToRewardCatalog(restaurantId: string, data: any) {
  try {
    await prisma.rewardCatalog.create({
      data: {
        restaurantId,
        type: data.type,
        requiredPoints: parseInt(data.requiredPoints),
        productId: data.productId || null,
        discountValue: data.discountValue ? parseFloat(data.discountValue) : null,
        allowedDays: data.allowedDays || []
      }
    });
    revalidatePath("/manager/loyalty");
    return { success: true };
  } catch (error) {
    console.error("Error adding to catalog:", error);
    return { success: false, error: "Erreur lors de l'ajout." };
  }
}

export async function deleteFromRewardCatalog(id: string, restaurantId: string) {
  try {
    await prisma.rewardCatalog.delete({
      where: { id, restaurantId }
    });
    revalidatePath("/manager/loyalty");
    return { success: true };
  } catch (error) {
    return { success: false };
  }
}

// --- ACTIONS POUR LES CLIENTS ---

export async function getClientLoyalty(restaurantId: string, phone: string) {
  try {
    const customer = await prisma.loyaltyCustomer.findUnique({
      where: { phone_restaurantId: { phone, restaurantId } },
      include: {
        rewards: {
          where: { isUsed: false },
          orderBy: { createdAt: "desc" }
        }
      }
    });

    const catalog = await prisma.rewardCatalog.findMany({
      where: { restaurantId },
      orderBy: { requiredPoints: "asc" }
    });

    return {
      success: true,
      points: customer?.points || 0,
      totalEarned: customer?.totalPointsEarned || 0,
      myRewards: customer?.rewards || [],
      catalog
    };
  } catch (error) {
    return { success: false, points: 0, myRewards: [], catalog: [] };
  }
}

export async function claimRewardAction(restaurantId: string, phone: string, catalogId: string) {
  try {
    const reward = await LoyaltyService.redeemReward(phone, restaurantId, catalogId);
    revalidatePath("/client/loyalty");
    return { success: true, reward };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function validateAndApplyPromo(restaurantId: string, promoCode: string) {
  try {
    const result = await LoyaltyService.validatePromoCode(promoCode, restaurantId);
    if (!result.valid) return { success: false, error: result.error };

    // Note: l'application réelle du code (déduction prix) se fera au checkout
    return { success: true, reward: result.reward };
  } catch (error) {
    return { success: false, error: "Erreur serveur." };
  }
}
