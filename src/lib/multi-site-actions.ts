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
        pinCode: r.pinCode,
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

export async function updateChildPin(childId: string, newPin: string) {
  try {
    if (!newPin || newPin.length < 4) {
      return { success: false, error: "Le PIN doit faire au moins 4 chiffres." };
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
