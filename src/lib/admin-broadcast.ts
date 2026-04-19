"use server";

import { prisma } from "./prisma";
import { ensureSuperAdmin } from "./auth-actions";
import { revalidatePath } from "next/cache";

/**
 * Envoie une notification à tous les restaurants actifs de la plateforme.
 */
export async function sendBroadcastNotification(data: {
  title: string;
  message: string;
  type?: "INFO" | "WARNING" | "SUCCESS" | "URGENT";
}) {
  try {
    await ensureSuperAdmin();

    const activeRestaurants = await (prisma as any).restaurant.findMany({
      where: { active: true },
      select: { id: true }
    });

    if (activeRestaurants.length === 0) {
      return { success: false, error: "Aucun restaurant actif trouvé." };
    }

    // Création massive des notifications
    const notifications = activeRestaurants.map((resto: any) => ({
      restaurantId: resto.id,
      title: data.title,
      message: data.message,
      type: data.type || "INFO",
    }));

    await (prisma as any).notification.createMany({
      data: notifications
    });

    revalidatePath("/manager/dashboard");
    revalidatePath("/super-admin");

    return { success: true, count: activeRestaurants.length };
  } catch (error: any) {
    console.error("Broadcast Error:", error);
    return { success: false, error: error.message || "Erreur lors de l'envoi du broadcast." };
  }
}
