"use server";

import { prisma } from "./prisma";
import { revalidatePath } from "next/cache";

export async function getNotifications(restaurantId: string) {
  try {
    return await prisma.notification.findMany({
      where: { restaurantId },
      orderBy: { createdAt: "desc" },
      take: 20
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return [];
  }
}

export async function markAsRead(id: string) {
  try {
    await prisma.notification.update({
      where: { id },
      data: { read: true }
    });
    revalidatePath("/manager/dashboard");
    return { success: true };
  } catch (error) {
    return { success: false };
  }
}

export async function clearAllNotifications(restaurantId: string) {
    try {
        await prisma.notification.deleteMany({
            where: { restaurantId }
        });
        revalidatePath("/manager/dashboard");
        return { success: true };
    } catch (error) {
        return { success: false };
    }
}

/**
 * Utilitaire interne pour créer une notification
 */
export async function createNotification(data: {
  restaurantId: string;
  title: string;
  message: string;
  type?: "INFO" | "WARNING" | "SUCCESS" | "URGENT";
}) {
  try {
    const notif = await prisma.notification.create({
      data: {
        restaurantId: data.restaurantId,
        title: data.title,
        message: data.message,
        type: data.type || "INFO",
      }
    });
    revalidatePath("/manager/dashboard");
    return notif;
  } catch (error) {
    console.error("Failed to create notification:", error);
    return null;
  }
}

/**
 * Vérifie si une alerte d'abonnement doit être générée
 */
export async function checkSubscriptionAlerts(restaurantId: string) {
  try {
    const resto = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { subscriptionEnd: true, nom: true }
    });

    if (!resto || !resto.subscriptionEnd) return;

    const now = new Date();
    const end = new Date(resto.subscriptionEnd);
    const diffDays = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    // Cas 1 : Déjà expiré
    if (diffDays <= 0) {
      const existing = await prisma.notification.findFirst({
        where: {
          restaurantId,
          type: "URGENT",
          title: { contains: "Expiré" },
          createdAt: { gte: new Date(Date.now() - 12 * 60 * 60 * 1000) }
        }
      });

      if (!existing) {
        await createNotification({
          restaurantId,
          title: "⚠️ Abonnement Expiré",
          message: `Votre abonnement a expiré. Veuillez régulariser l'accès pour continuer à utiliser toutes les fonctionnalités de SmartResto.`,
          type: "URGENT"
        });
      }
      return;
    }

    // Cas 2 : Expiration imminente (Moins de 3 jours) -> URGENT
    if (diffDays <= 3) {
      const existing = await prisma.notification.findFirst({
        where: {
          restaurantId,
          type: "URGENT",
          createdAt: { gte: new Date(Date.now() - 12 * 60 * 60 * 1000) }
        }
      });

      if (!existing) {
        await createNotification({
          restaurantId,
          title: "🚨 ACTION URGENTE : Abonnement",
          message: `Votre abonnement expire dans ${diffDays} jours. Renouvelez maintenant pour éviter une coupure de service.`,
          type: "URGENT"
        });
      }
    } 
    // Cas 3 : Expiration proche (Moins de 7 jours) -> WARNING
    else if (diffDays <= 7) {
      const existing = await prisma.notification.findFirst({
        where: {
          restaurantId,
          type: "WARNING",
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        }
      });

      if (!existing) {
        await createNotification({
          restaurantId,
          title: "Abonnement expire bientôt",
          message: `Votre abonnement pour ${resto.nom} prendra fin le ${end.toLocaleDateString('fr-FR')}. Pensez à renouveler !`,
          type: "WARNING"
        });
      }
    }
  } catch (_error) {
    console.error("Error checking sub alerts:", _error);
  }
}
