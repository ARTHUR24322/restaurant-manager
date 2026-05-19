/* eslint-disable @typescript-eslint/no-explicit-any */
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
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalVisites,
      visitesJour,
      visitStats,
      aggOrders,
      aggSaaS,
      planGroup,
      cityGroup,
      recentLogs
    ] = await Promise.all([
      prisma.visite.count(),
      prisma.visite.count({ where: { createdAt: { gte: today } } }),
      prisma.visite.groupBy({
        by: ['restaurantId'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10
      }),
      prisma.commande.aggregate({
        _sum: { totalUsd: true },
        where: { statut: "COMPLETED" }
      }),
      prisma.restaurant.aggregate({
        _sum: { monthlyPrice: true },
        where: { active: true }
      }),
      prisma.restaurant.groupBy({
        by: ['plan'],
        _count: { id: true },
      }),
      prisma.restaurant.groupBy({
        by: ['ville'],
        _count: { id: true }
      }),
      prisma.subscriptionLog.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: { restaurant: { select: { nom: true } } }
      })
    ]);

    const topRestaurants = await Promise.all(visitStats.map(async (v) => {
      const r = await prisma.restaurant.findUnique({
        where: { id: v.restaurantId },
        select: { nom: true, logoUrl: true }
      });
      return {
        id: v.restaurantId,
        nom: r?.nom || "Inconnu",
        logoUrl: r?.logoUrl || null,
        scans: v._count.id
      };
    }));

    return {
      success: true,
      totalVisites,
      visitesJour,
      topRestaurants,
      globalRevenue: aggOrders._sum.totalUsd || 0,
      saasRevenue: aggSaaS._sum.monthlyPrice || 0,
      planDistribution: planGroup.map(g => ({ name: g.plan, value: g._count.id })),
      cityDistribution: cityGroup.map(g => ({ name: g.ville, value: g._count.id })),
      subscriptionActivity: recentLogs.map((log: any) => ({
        ...log,
        restaurantNom: log.restaurant?.nom || "Inconnu"
      }))
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
        const startDate = new Date();
        const prevStartDate = new Date();

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
        const dishStats: Record<string, { count: number, price: number, totalCost: number }> = {};
        let totalEstimatedCost = 0;

        // On charge les recettes pour le calcul du profit (si dispo)
        const platsWithRecettes = await prisma.plat.findMany({
            where: { restaurantId },
            include: { recetteItems: { include: { article: true } } }
        });

        const platCosts: Record<string, number> = {};
        platsWithRecettes.forEach(p => {
            let cost = 0;
            p.recetteItems.forEach(ri => {
                cost += (ri.quantite * (ri.article.prixAchat || 0));
            });
            platCosts[p.id] = cost;
        });

        currentOrders.forEach(order => {
            order.items.forEach(item => {
                const name = item.plat.nom;
                const cost = (platCosts[item.platId] || 0) * item.quantite;
                totalEstimatedCost += cost;

                if (!dishStats[name]) dishStats[name] = { count: 0, price: item.plat.prixUsd, totalCost: 0 };
                dishStats[name].count += item.quantite;
                dishStats[name].totalCost += cost;
            });
        });

        const topDishes = Object.entries(dishStats)
            .map(([name, stats]) => ({ 
                name, 
                orders: stats.count, 
                price: stats.price,
                profit: (stats.price * stats.count) - stats.totalCost
            }))
            .sort((a, b) => b.orders - a.orders)
            .slice(0, 5);

        // 4. Heures de Pointe (Peak Hours)
        const peakHours = Array.from({ length: 24 }, (_, i) => ({ hour: i, count: 0 }));
        currentOrders.forEach(o => {
            const hour = new Date(o.createdAt).getHours();
            peakHours[hour].count++;
        });

        // 5. Répartition des Paiements
        const payments = {
            cash: currentOrders.filter(o => o.paiementStatus === "PAID_CASH").length,
            mobile: currentOrders.filter(o => o.paiementStatus === "PAID_MOBILE").length,
        };
        const totalPaid = payments.cash + payments.mobile;
        const paymentDistribution = [
            { label: "Cash", value: totalPaid > 0 ? Math.round((payments.cash / totalPaid) * 100) : 50, color: "bg-emerald-500" },
            { label: "Mobile", value: totalPaid > 0 ? Math.round((payments.mobile / totalPaid) * 100) : 50, color: "bg-indigo-500" }
        ];

        // 6. Statistiques Clients (Fidélité)
        const uniquePhones = new Set(currentOrders.map(o => o.phone).filter(Boolean));
        const customerStats = {
            totalUnique: uniquePhones.size,
            returning: currentOrders.filter(o => o.phone).length - uniquePhones.size // Approximation
        };

        // 7. Données Graphique (Derniers 7 jours)
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
            totalEstimatedProfit: totalRevenue - totalEstimatedCost,
            growth,
            topDishes,
            chartData,
            peakHours,
            paymentDistribution,
            customerStats
        };
    } catch (error) {
        console.error("Manager Analytics Error:", error);
        return { success: false };
    }
}

/**
 * Récupère les données brutes des commandes pour les rapports (Excel/PDF)
 */
export async function getReportData(restaurantId: string, period: "day" | "week" | "month" | "year") {
  try {
    const now = new Date();
    const startDate = new Date();

    if (period === "day") {
      startDate.setHours(0, 0, 0, 0);
    } else if (period === "week") {
      startDate.setDate(now.getDate() - 7);
    } else if (period === "month") {
      startDate.setMonth(now.getMonth() - 1);
    } else if (period === "year") {
      startDate.setFullYear(now.getFullYear() - 1);
    }

    const orders = await prisma.commande.findMany({
      where: {
        restaurantId,
        createdAt: { gte: startDate },
        statut: "COMPLETED"
      },
      include: {
        items: {
          include: {
            plat: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return { success: true, orders };
  } catch (error) {
    console.error("Report Data Error:", error);
    return { success: false, orders: [] };
  }
}
/**
 * Récupère les données de monitoring opérationnel (Stocks, WA, Commandes Live)
 */
export async function getGlobalMonitoringData() {
  try {
    await ensureSuperAdmin();

    const [
      criticalStocks,
      allStocks,
      waStats,
      activeOrdersCount,
      totalPointsDistributed
    ] = await Promise.all([
      prisma.articleStock.findMany({
        where: { stockActuel: { lte: prisma.articleStock.fields.stockMin } },
        include: { restaurant: { select: { nom: true, id: true } } },
        take: 20
      }),
      prisma.articleStock.findMany({
        include: { restaurant: { select: { nom: true, id: true } } },
        orderBy: { updatedAt: 'desc' },
        take: 20
      }),
      prisma.restaurant.groupBy({
        by: ['whatsappEnabled'] as any,
        _count: { id: true }
      }),
      prisma.commande.count({
        where: { statut: { in: ["PENDING", "PREPARING", "READY"] } }
      }),
      prisma.loyaltyCustomer.aggregate({
        _sum: { points: true }
      })
    ]);

    return {
      success: true,
      criticalStocks: criticalStocks.map(s => ({
        id: s.id,
        nom: s.nom,
        actuel: s.stockActuel,
        min: s.stockMin,
        unite: s.unite,
        restaurant: s.restaurant.nom
      })),
      allStocks: allStocks.map(s => ({
        id: s.id,
        nom: s.nom,
        actuel: s.stockActuel,
        min: s.stockMin,
        unite: s.unite,
        restaurant: s.restaurant.nom,
        updatedAt: s.updatedAt
      })),
      whatsappHealth: waStats as any,
      activeOrdersCount,
      totalPointsDistributed: totalPointsDistributed._sum.points || 0,
    };
  } catch (error) {
    console.error("Global Monitoring Error:", error);
    return { success: false };
  }
}
