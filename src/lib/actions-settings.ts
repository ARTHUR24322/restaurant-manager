"use server";

import { prisma } from "./prisma";
import { revalidatePath } from "next/cache";
import { hashPassword, comparePassword } from "./auth";

/**
 * Mise à jour du mot de passe admin du restaurant
 * Requiert la vérification de l'ancien mot de passe
 */
export async function updateRestaurantPassword(restaurantId: string, oldPassword: string, newPassword: string) {
    try {
        if (!oldPassword) {
            return { success: false, error: "Vous devez entrer votre mot de passe actuel." };
        }
        if (!newPassword || newPassword.length < 4) {
            return { success: false, error: "Le nouveau mot de passe doit faire au moins 4 caractères." };
        }

        // Vérifier l'ancien mot de passe
        const restaurant = await (prisma as any).restaurant.findUnique({
            where: { id: restaurantId }
        });

        if (!restaurant) {
            return { success: false, error: "Restaurant introuvable." };
        }

        let isOldValid = false;
        if (restaurant.adminPassword.startsWith("$2a$") || restaurant.adminPassword.startsWith("$2b$")) {
            isOldValid = await comparePassword(oldPassword, restaurant.adminPassword);
        } else {
            isOldValid = restaurant.adminPassword === oldPassword;
        }

        if (!isOldValid) {
            return { success: false, error: "Mot de passe actuel incorrect." };
        }

        // Hasher le nouveau mot de passe
        const hashedNewPassword = await hashPassword(newPassword);

        // Mettre à jour
        await (prisma as any).restaurant.update({
            where: { id: restaurantId },
            data: { adminPassword: hashedNewPassword }
        });

        revalidatePath("/manager/dashboard");
        return { success: true };
    } catch (e) {
        console.error(e);
        return { success: false, error: "Erreur lors de la mise à jour." };
    }
}

/**
 * Mise à jour du profil du restaurant (Nom, Logo)
 */
export async function updateRestaurantProfile(restaurantId: string, formData: FormData) {
    try {
        const nom = formData.get("nom") as string;
        const logoUrl = formData.get("logoUrl") as string;

        if (!nom) {
            return { success: false, error: "Le nom de l'établissement est requis." };
        }

        await (prisma as any).restaurant.update({
            where: { id: restaurantId },
            data: { 
                nom,
                ...(logoUrl ? { logoUrl } : {})
            }
        });

        revalidatePath("/manager/dashboard");
        revalidatePath("/client/menu");
        return { success: true };
    } catch (e) {
        console.error(e);
        return { success: false, error: "Erreur lors de la mise à jour du profil." };
    }
}
/**
 * Mise à jour du code PIN (4 chiffres)
 */
export async function updateRestaurantPin(restaurantId: string, newPin: string) {
    try {
        if (!newPin || !/^\d{4}$/.test(newPin)) {
            return { success: false, error: "Le code PIN doit comporter exactement 4 chiffres." };
        }

        await (prisma as any).restaurant.update({
            where: { id: restaurantId },
            data: { pinCode: newPin }
        });

        revalidatePath("/manager/dashboard");
        return { success: true };
    } catch (e) {
        console.error(e);
        return { success: false, error: "Erreur lors de la mise à jour du code PIN." };
    }
}

/**
 * Mise à jour du taux de change USD → CDF du restaurant
 */
export async function updateRestaurantTauxChange(restaurantId: string, taux: number) {
    try {
        if (!taux || taux <= 0 || isNaN(taux)) {
            return { success: false, error: "Le taux doit être un nombre positif." };
        }

        await (prisma as any).restaurant.update({
            where: { id: restaurantId },
            data: { tauxChange: taux }
        });

        revalidatePath("/manager/dashboard");
        return { success: true };
    } catch (e) {
        console.error(e);
        return { success: false, error: "Erreur lors de la sauvegarde du taux." };
    }
}

export async function updateRestaurantTheme(restaurantId: string, theme: string) {
    try {
        await (prisma as any).restaurant.update({
            where: { id: restaurantId },
            data: { preferredTheme: theme }
        });
        
        revalidatePath("/manager/dashboard");
        return { success: true };
    } catch (e) {
        console.error(e);
        return { success: false, error: "Erreur lors de la sauvegarde du thème." };
    }
}
