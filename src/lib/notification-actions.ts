"use server";

import { prisma } from "./prisma";
import { revalidatePath } from "next/cache";

export async function getNotifications(restaurantId: string) {
  try {
    return await (prisma as any).notification.findMany({
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
    await (prisma as any).notification.update({
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
        await (prisma as any).notification.deleteMany({
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
    const notif = await (prisma as any).notification.create({
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

    // Si expiration dans moins de 7 jours
    if (diffDays <= 7 && diffDays > 0) {
      // Vérifier si une notification d'alerte existe déjà (pour ne pas spammer)
      const existing = await (prisma as any).notification.findFirst({
        where: {
          restaurantId,
          type: "WARNING",
          title: { contains: "Abonnement" },
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Créée il y a moins de 24h
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
  } catch (error) {
    console.error("Error checking sub alerts:", error);
  }
}
