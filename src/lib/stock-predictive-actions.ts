"use server";

import { prisma } from "./prisma";
import { ensureManager } from "./auth-actions";

/**
 * Calculer les prévisions de stock pour un restaurant
 */
export async function getPredictiveStockReport(restaurantId: string, daysWindow: number = 14) {
  try {
    await ensureManager(restaurantId);

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysWindow);

    const articles = await prisma.articleStock.findMany({
      where: { restaurantId },
      include: {
        emplacement: true,
        mouvements: {
          where: {
            type: { in: ['SORTIE', 'PERTE'] },
            createdAt: { gte: cutoffDate }
          }
        }
      }
    });

    const predictions = articles.map(article => {
      const totalConsumed = article.mouvements.reduce((acc, mov) => acc + Math.abs(mov.quantite), 0);
      const dailyConsumptionRate = totalConsumed / daysWindow;

      let daysRemaining = -1; 
      let stockoutDate = null;

      if (dailyConsumptionRate > 0) {
        daysRemaining = Math.floor(article.stockActuel / dailyConsumptionRate);
        const outDate = new Date();
        outDate.setDate(outDate.getDate() + daysRemaining);
        stockoutDate = outDate;
      } else if (article.stockActuel <= 0) {
        daysRemaining = 0;
        stockoutDate = new Date();
      }

      return {
        articleId: article.id,
        nom: article.nom,
        unite: article.unite,
        stockActuel: article.stockActuel,
        stockMin: article.stockMin,
        dailyConsumptionRate,
        daysRemaining,
        stockoutDate,
        isCritical: (daysRemaining >= 0 && daysRemaining <= 3) || article.stockActuel <= article.stockMin
      };
    });
    
    predictions.sort((a, b) => {
      if (a.daysRemaining === -1) return 1;
      if (b.daysRemaining === -1) return -1;
      return a.daysRemaining - b.daysRemaining;
    });

    return { success: true, predictions };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    console.error("[Prediction] Error:", error);
    return { success: false, error: message };
  }
}
