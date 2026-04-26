
import { unstable_cache } from "next/cache";
import { prisma } from "./prisma";

/**
 * --- CACHE LAYER ---
 * Optimise les performances en mémorisant les résultats des requêtes DB
 * particulièrement lentes ou fréquentes (ex: le menu du restaurant).
 */

// Cache pour le profil du restaurant
export const getCachedRestaurant = (id: string) => 
  unstable_cache(
    async () => {
      console.log(`[CACHE MISS] Fetching restaurant ${id}`);
      return prisma.restaurant.findUnique({
        where: { id },
        select: { 
          id: true, 
          nom: true, 
          plan: true, 
          active: true, 
          tauxChange: true,
          preferredTheme: true,
          logoUrl: true
        }
      });
    },
    [`restaurant-${id}`],
    { revalidate: 3600, tags: [`restaurant-${id}`] } // Revalide toutes les heures ou via tag
  )();

// Cache pour les plats (le menu)
export const getCachedPlats = (restaurantId: string) =>
  unstable_cache(
    async () => {
      console.log(`[CACHE MISS] Fetching plats for ${restaurantId}`);
      const plats = await prisma.plat.findMany({
        where: { restaurantId, disponible: true },
        orderBy: { categorie: "asc" },
        include: { 
          options: true,
          recetteItems: {
            include: {
              article: true
            }
          }
        }
      });

      return plats.map(plat => {
        let isAvailable = plat.disponible;
        // Vérification dynamique du stock
        if (isAvailable && plat.recetteItems && plat.recetteItems.length > 0) {
          for (const recette of plat.recetteItems) {
            if (recette.article && recette.article.stockActuel < recette.quantite) {
              isAvailable = false;
              break; // Rupture d'un des ingrédients => Plat en rupture
            }
          }
        }
        return { ...plat, disponible: isAvailable };
      });
    },
    [`menu-${restaurantId}`],
    { revalidate: 600, tags: [`menu-${restaurantId}`] } // Revalide toutes les 10 min
  )();

// Cache pour les statistiques simples (Dashboard)
export const getCachedStats = (restaurantId: string) =>
  unstable_cache(
    async () => {
      console.log(`[CACHE MISS] Fetching stats for ${restaurantId}`);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [orderCount, revenue] = await Promise.all([
        prisma.commande.count({
          where: { restaurantId, createdAt: { gte: today } }
        }),
        prisma.commande.aggregate({
          where: { 
            restaurantId, 
            createdAt: { gte: today },
            statut: "COMPLETED"
          },
          _sum: { totalUsd: true }
        })
      ]);

      return {
        orderCount,
        dailyRevenue: revenue._sum.totalUsd || 0
      };
    },
    [`stats-${restaurantId}`],
    { revalidate: 60, tags: [`stats-${restaurantId}`] } // Stats revalidées chaque minute
  )();
