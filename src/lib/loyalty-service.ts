import { prisma } from "./prisma";

export const LoyaltyService = {
  // 1. Ajouter des points (Multi-tenant)
  async addPoints(phone: string, restaurantId: string, amountUsd: number, commandeId?: string) {
    const config = await prisma.loyaltyConfig.findUnique({
      where: { restaurantId }
    });
    
    if (!config || !config.isActive) return null;

    const pointsToEarn = Math.floor(amountUsd * config.pointsPerUsd);
    
    if (pointsToEarn <= 0) return null;

    const customer = await prisma.loyaltyCustomer.upsert({
      where: {
        phone_restaurantId: {
          phone,
          restaurantId
        }
      },
      update: {
        points: { increment: pointsToEarn },
        totalPointsEarned: { increment: pointsToEarn },
        updatedAt: new Date()
      },
      create: {
        phone,
        restaurantId,
        points: pointsToEarn,
        totalPointsEarned: pointsToEarn
      }
    });

    await prisma.loyaltyTransaction.create({
      data: {
        customerId: customer.id,
        type: "EARN",
        points: pointsToEarn,
        commandeId,
        note: `Points gagnés pour la commande #${commandeId ? commandeId.slice(-4) : "—"}`
      }
    });

    return customer;
  },

  // 2. Récupérer les récompenses débloquées
  async getAvailableRewards(phone: string, restaurantId: string) {
    const customer = await prisma.loyaltyCustomer.findUnique({
      where: { phone_restaurantId: { phone, restaurantId } }
    });

    if (!customer) return [];

    // On cherche dans le catalogue ce qui est payable avec ses points
    return await prisma.rewardCatalog.findMany({
      where: {
        restaurantId,
        requiredPoints: { lte: customer.points }
      }
    });
  },

  // 3. Échanger points contre récompense
  async redeemReward(phone: string, restaurantId: string, catalogId: string) {
    const rewardItem = await prisma.rewardCatalog.findUnique({
      where: { id: catalogId }
    });

    if (!rewardItem || rewardItem.restaurantId !== restaurantId) {
       throw new Error("Récompense non trouvée ou non autorisée pour ce restaurant.");
    }

    const customer = await prisma.loyaltyCustomer.findUnique({
      where: { phone_restaurantId: { phone, restaurantId } }
    });

    if (!customer || customer.points < rewardItem.requiredPoints) {
      throw new Error("Points insuffisants pour cette récompense.");
    }

    // Retrait des points
    await prisma.loyaltyCustomer.update({
      where: { id: customer.id },
      data: { points: { decrement: rewardItem.requiredPoints } }
    });

    // Génération du reward client
    let promoCode = null;
    if (rewardItem.type === "PROMO_CODE") {
      promoCode = `SR-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    }

    const clientReward = await prisma.clientReward.create({
      data: {
        customerId: customer.id,
        restaurantId,
        type: rewardItem.type,
        productId: rewardItem.productId,
        promoCode,
        allowedDays: rewardItem.allowedDays,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 jours
      }
    });

    // Journalisation
    await prisma.loyaltyTransaction.create({
      data: {
        customerId: customer.id,
        type: "REDEEM",
        points: -rewardItem.requiredPoints,
        note: `Échange points contre : ${rewardItem.type === "PRODUCT" ? "Produit Gratuit" : "Code Promo"}`
      }
    });

    return clientReward;
  },

  // 4. Validation Code Promo (Check Jours + Utilisation)
  async validatePromoCode(promoCode: string, restaurantId: string) {
    const reward = await prisma.clientReward.findUnique({
      where: { promoCode }
    });

    if (!reward || reward.restaurantId !== restaurantId) {
      return { valid: false, error: "Code promo invalide." };
    }

    if (reward.isUsed) {
      return { valid: false, error: "Code promo déjà utilisé." };
    }

    if (reward.expiresAt && new Date() > reward.expiresAt) {
      return { valid: false, error: "Code promo expiré." };
    }

    // Vérification des jours autorisés
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const currentDay = days[new Date().getDay()];

    if (reward.allowedDays.length > 0 && !reward.allowedDays.includes(currentDay)) {
      return { 
        valid: false, 
        error: `Ce code n'est valide que le(s) : ${reward.allowedDays.join(", ")}`
      };
    }

    return { valid: true, reward };
  },

  // 5. Appliquer Récompense (Marquer comme utilisée)
  async markRewardUsed(rewardId: string) {
    return await prisma.clientReward.update({
      where: { id: rewardId },
      data: { isUsed: true }
    });
  }
};
