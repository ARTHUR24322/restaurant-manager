"use server";

import { prisma } from "./prisma";

export async function getMultiSiteStats(proprietorEmail: string) {
  try {
    if (!proprietorEmail) return [];

    const restaurants = await prisma.restaurant.findMany({
      where: { email: proprietorEmail },
      select: {
        id: true,
        nom: true,
        ville: true,
        plan: true,
        active: true,
        pinCode: true,
        createdAt: true,
        _count: {
          select: {
            commandes: {
              where: {
                createdAt: {
                  gte: new Date(new Date().setHours(0, 0, 0, 0))
                }
              }
            }
          }
        },
        commandes: {
          where: {
            createdAt: {
              gte: new Date(new Date().setHours(0, 0, 0, 0))
            }
          },
          select: {
            totalUsd: true
          }
        }
      }
    });

    const stats = restaurants.map(r => {
      const dailyRevenue = r.commandes.reduce((acc, curr) => acc + curr.totalUsd, 0);
      return {
        id: r.id,
        nom: r.nom,
        ville: r.ville,
        plan: r.plan,
        active: r.active,
        // pinCode: r.pinCode, // On ne renvoie plus le PIN au client pour sécurité
        createdAt: r.createdAt,
        dailyOrders: r._count.commandes,
        dailyRevenue: dailyRevenue
      };
    });

    return stats;
  } catch (error) {
    console.error("[Multi-Site] Error fetching stats:", error);
    return [];
  }
}

export async function verifyEstablishmentPin(restoId: string, pin: string) {
  try {
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restoId },
      select: { pinCode: true }
    });

    if (!restaurant) return { success: false, error: "Établissement introuvable." };

    if (restaurant.pinCode === pin) {
      return { success: true };
    } else {
      return { success: false, error: "Code PIN incorrect." };
    }
  } catch (error) {
    console.error("[Multi-Site] Error verifying PIN:", error);
    return { success: false, error: "Erreur technique lors de la vérification." };
  }
}

export async function updateChildPin(childId: string, newPin: string) {
  try {
    if (!newPin || newPin.length !== 6) {
      return { success: false, error: "Le PIN doit faire exactement 6 chiffres." };
    }

    await prisma.restaurant.update({
      where: { id: childId },
      data: { pinCode: newPin }
    });

    return { success: true };
  } catch (error) {
    console.error("[Multi-Site] Error updating child PIN:", error);
    return { success: false, error: "Erreur lors de la mise à jour du PIN." };
  }
}

export async function toggleChildStatus(childId: string, active: boolean) {
  try {
    // Note: Dans un environnement de production, on vérifierait ici que 
    // le restoId de la session est bien la MÈRE de ce childId.
    await prisma.restaurant.update({
      where: { id: childId },
      data: { active }
    });

    return { success: true };
  } catch (error) {
    console.error("[Multi-Site] Error toggling child status:", error);
    return { success: false, error: "Erreur lors du changement de statut." };
  }
}
