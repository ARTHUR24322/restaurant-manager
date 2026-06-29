"use server";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { prisma } from "./prisma";
import { revalidatePath } from "next/cache";
import { ensureManager } from "./auth-actions";

/**
 * Active ou désactive la boutique en ligne
 */
export async function updateBoutiqueSettings(restaurantId: string, isBoutiqueEnabled: boolean, boutiqueSlug?: string) {
    try {
        await ensureManager(restaurantId);

        // Check if slug is taken by another restaurant
        if (boutiqueSlug) {
            const existing = await (prisma as any).restaurant.findUnique({
                where: { boutiqueSlug }
            });
            if (existing && existing.id !== restaurantId) {
                return { success: false, error: "Ce lien de boutique est déjà utilisé par un autre restaurant." };
            }
        }

        await (prisma as any).restaurant.update({
            where: { id: restaurantId },
            data: { 
                isBoutiqueEnabled,
                ...(boutiqueSlug ? { boutiqueSlug } : {})
            }
        });

        revalidatePath("/manager/(dashboard)/boutique");
        return { success: true };
    } catch (e: any) {
        console.error("BOUTIQUE_SETTINGS_ERROR =>", e);
        return { success: false, error: "Erreur lors de la mise à jour des paramètres de la boutique." };
    }
}

/**
 * Change la disponibilité en ligne d'un plat
 */
export async function togglePlatOnlineVisibility(restaurantId: string, platId: string, isAvailableOnline: boolean) {
    try {
        await ensureManager(restaurantId);

        const plat = await (prisma as any).plat.findFirst({
            where: { id: platId, restaurantId }
        });

        if (!plat) {
            return { success: false, error: "Plat introuvable." };
        }

        await (prisma as any).plat.update({
            where: { id: platId },
            data: { isAvailableOnline }
        });

        revalidatePath("/manager/(dashboard)/boutique");
        return { success: true };
    } catch (e: any) {
        console.error("TOGGLE_PLAT_ONLINE_ERROR =>", e);
        return { success: false, error: "Erreur lors de la mise à jour de la visibilité du plat." };
    }
}
