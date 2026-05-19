/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { prisma } from "./prisma";
import { ensureSuperAdmin } from "./auth-actions";
import { revalidatePath } from "next/cache";

/**
 * Envoie une notification à tous les restaurants actifs ou à un restaurant spécifique.
 */
export async function sendBroadcastNotification(data: {
  title: string;
  message: string;
  type?: "INFO" | "WARNING" | "SUCCESS" | "URGENT";
  restaurantId?: string; // Optionnel : cible spécifique
}) {
  try {
    await ensureSuperAdmin();

    let targetRestaurants = [];

    if (data.restaurantId) {
      // Envoyer à un restaurant spécifique (même s'il est inactif, l'admin peut vouloir lui parler)
      const targetResto = await prisma.restaurant.findUnique({
        where: { id: data.restaurantId },
        select: { id: true }
      });
      if (!targetResto) {
        return { success: false, error: "Restaurant ciblé introuvable." };
      }
      targetRestaurants = [targetResto];
    } else {
      // Broadcast Global (uniquement aux actifs)
      targetRestaurants = await prisma.restaurant.findMany({
        where: { active: true },
        select: { id: true }
      });
      if (targetRestaurants.length === 0) {
        return { success: false, error: "Aucun restaurant actif trouvé pour le broadcast global." };
      }
    }

    // Création massive des notifications
    const notifications = targetRestaurants.map((resto: any) => ({
      restaurantId: resto.id,
      title: data.title,
      message: data.message,
      type: data.type || "INFO",
    }));

    await prisma.notification.createMany({
      data: notifications
    });

    revalidatePath("/manager/dashboard");
    revalidatePath("/super-admin");

    return { success: true, count: targetRestaurants.length };
  } catch (error: unknown) {
    console.error("Broadcast Error:", error);
    const message = error instanceof Error ? error.message : "Erreur lors de l'envoi du broadcast.";
    return { success: false, error: message };
  }
}
