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

    // Classement des restaurants (Limit 10)
    const visitStats = await prisma.visite.groupBy({
      by: ['restaurantId'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10
    });

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

    // Calcul du revenu global sur toute la plateforme (GMV)
    const aggOrders = await prisma.commande.aggregate({
      _sum: { totalUsd: true },
      where: { statut: "COMPLETED" }
    });
    const globalRevenue = aggOrders._sum.totalUsd || 0;

    // Calcul du revenu SaaS (MRR) - Dynamique
    const aggSaaS = await prisma.restaurant.aggregate({
      _sum: { monthlyPrice: true },
      where: { active: true }
    });
    const saasRevenue = aggSaaS._sum.monthlyPrice || 0;

    // Group by pour les statistiques Plan & Villes
    const planGroup = await prisma.restaurant.groupBy({
        by: ['plan'],
        _count: { id: true },
    });
    const planDistribution = planGroup.map(g => ({ name: g.plan, value: g._count.id }));

    const cityGroup = await prisma.restaurant.groupBy({
        by: ['ville'],
        _count: { id: true }
    });
    const cityDistribution = cityGroup.map(g => ({ name: g.ville, value: g._count.id }));

    // Récupérer les 10 derniers logs d'abonnement pour le flux d'activité
    const recentLogs = await prisma.subscriptionLog.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
          restaurant: { select: { nom: true } }
      }
    });

    // Enrichir les logs
    const logsWithRestos = recentLogs.map((log: any) => ({
        ...log,
        restaurantNom: log.restaurant?.nom || "Inconnu"
    }));

    return {
      success: true,
      totalVisites,
      visitesJour,
      topRestaurants,
      globalRevenue,
      saasRevenue,
      planDistribution,
      cityDistribution,
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
    let startDate = new Date();

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
