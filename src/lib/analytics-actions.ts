"use server";

import { prisma } from "./prisma";
import { ensureSuperAdmin } from "./auth-actions";


/**
 * Enregistre une visite (un scan de QR code) de manière asynchrone pour ne pas bloquer.
 */
export async function recordVisit(restaurantId: string, table: string) {
  try {
    // Note: On n'attend pas la création pour ne pas bloquer le rendu,
    // mais on enlève setTimeout qui peut causer des problèmes au build.
    prisma.visite.create({
      data: {
        restaurantId,
        table,
      },
    }).catch((err: any) => {
      console.error("Erreur lors de l'enregistrement de la visite:", err);
    });
  } catch (error) {
    console.error("Failed to start visit record:", error);
  }
}

/**
 * Récupère les analytiques globaux pour le Super-Admin
 */
export async function getGlobalAnalytics() {
  try {
    await ensureSuperAdmin();
    const totalVisites = await prisma.visite.count();
    
    // Pour compter les visites du jour
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const visitesJour = await prisma.visite.count({
      where: {
        createdAt: {
          gte: today
        }
      }
    });

    // Classement des restaurants
    const allVisits = await prisma.visite.findMany({
      include: {
        restaurant: {
          select: { nom: true, logoUrl: true }
        }
      }
    });

    const stats: Record<string, { id: string, nom: string; logoUrl: string | null; scans: number }> = {};
    
    allVisits.forEach((v: any) => {
      if (!stats[v.restaurantId]) {
        stats[v.restaurantId] = {
          id: v.restaurantId,
          nom: v.restaurant.nom,
          logoUrl: v.restaurant.logoUrl,
          scans: 0
        };
      }
      stats[v.restaurantId].scans += 1;
    });

    const topRestaurants = Object.values(stats)
      .sort((a, b) => b.scans - a.scans);

    // Calcul du revenu global sur toute la plateforme (GMV)
    const completedOrders = await prisma.commande.findMany({
      where: { statut: "COMPLETED" },
      select: { totalUsd: true }
    });
    const globalRevenue = completedOrders.reduce((sum, order) => sum + (order.totalUsd || 0), 0);

    // Calcul du revenu SaaS (MRR) - Dynamique
    const activeRestos = await prisma.restaurant.findMany({
      where: { active: true },
      select: { monthlyPrice: true }
    });

    const saasRevenue = activeRestos.reduce((sum: number, r: any) => sum + (r.monthlyPrice || 0), 0);

    // Récupérer les 10 derniers logs d'abonnement pour le flux d'activité
    const recentLogs = await prisma.subscriptionLog.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
    });

    // Enrichir les logs avec les noms des restaurants
    const logsWithRestos = await Promise.all(recentLogs.map(async (log: any) => {
        const resto = await prisma.restaurant.findUnique({
            where: { id: log.restaurantId },
            select: { nom: true }
        });
        return { ...log, restaurantNom: resto?.nom || "Inconnu" };
    }));

    return {
      success: true,
      totalVisites,
      visitesJour,
      topRestaurants,
      globalRevenue,
      saasRevenue,
      subscriptionActivity: logsWithRestos
    };

  } catch (error: any) {
    console.error("Erreur analytiques:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Récupère les analytiques pour le Dashboard Gérant (Filtré par période)
 */
export async function getManagerAnalytics(restaurantId: string, period: "day" | "week" | "month") {
    try {
        const now = new Date();
        let startDate = new Date();
        let prevStartDate = new Date();

        if (period === "day") {
            startDate.setHours(0, 0, 0, 0);
            prevStartDate.setDate(now.getDate() - 1);
            prevStartDate.setHours(0, 0, 0, 0);
        } else if (period === "week") {
            startDate.setDate(now.getDate() - 7);
            prevStartDate.setDate(now.getDate() - 14);
        } else {
            startDate.setDate(now.getDate() - 30);
            prevStartDate.setDate(now.getDate() - 60);
        }

        // 1. Chiffre d'Affaires & Commandes (Période Actuelle)
        const currentOrders = await prisma.commande.findMany({
            where: {
                restaurantId,
                createdAt: { gte: startDate },
                statut: "COMPLETED"
            },
            include: { items: { include: { plat: true } } }
        });

        const totalRevenue = currentOrders.reduce((acc, o) => acc + (o.totalUsd || 0), 0);
        const orderCount = currentOrders.length;

        // 2. Calcul de la Croissance (Période Précédente)
        const prevOrders = await prisma.commande.findMany({
            where: {
                restaurantId,
                createdAt: { gte: prevStartDate, lt: startDate },
                statut: "COMPLETED"
            }
        });

        const prevRevenue = prevOrders.reduce((acc, o) => acc + (o.totalUsd || 0), 0);
        const growth = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0;

        // 3. Top Plats (Période Actuelle)
        const dishStats: Record<string, { count: number, price: number }> = {};
        currentOrders.forEach(order => {
            order.items.forEach(item => {
                const name = item.plat.nom;
                if (!dishStats[name]) dishStats[name] = { count: 0, price: item.plat.prixUsd };
                dishStats[name].count += item.quantite;
            });
        });

        const topDishes = Object.entries(dishStats)
            .map(([name, stats]) => ({ name, orders: stats.count, price: stats.price }))
            .sort((a, b) => b.orders - a.orders)
            .slice(0, 5);

        // 4. Données Graphique (Derniers 7 jours si jour/week, ou 4 dernières semaines si mois)
        // Simplification pour le graphique hebdo standard par jour
        const chartData = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(now.getDate() - i);
            const dStart = new Date(d); dStart.setHours(0,0,0,0);
            const dEnd = new Date(d); dEnd.setHours(23,59,59,999);
            
            const dayRev = currentOrders
                .filter(o => o.createdAt >= dStart && o.createdAt <= dEnd)
                .reduce((acc, o) => acc + o.totalUsd, 0);

            chartData.push({
                day: d.toLocaleDateString('fr-FR', { weekday: 'short' }),
                val: dayRev
            });
        }

        return {
            success: true,
            totalRevenue,
            orderCount,
            growth,
            topDishes,
            chartData
        };
    } catch (error) {
        console.error("Manager Analytics Error:", error);
        return { success: false };
    }
}
