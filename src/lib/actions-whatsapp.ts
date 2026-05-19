/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
"use server";

import { prisma } from "./prisma";
import { encrypt } from "./encryption";
import { sendWhatsAppTemplate } from "./whatsapp-service";
import { revalidatePath } from "next/cache";
import { ensureManager } from "./auth-actions";

/**
 * Sauvegarde les credentials WhatsApp d'un restaurant
 */
export async function updateWhatsAppSettings(restaurantId: string, data: {
    accessToken: string;
    phoneNumberId: string;
    businessAccountId: string;
    enabled: boolean;
}) {
    try {
        await ensureManager(restaurantId);
        // On ne rechiffre que si le token est fourni (pas vide)
        const updateData: any = {
            whatsappPhoneNumberId: data.phoneNumberId,
            whatsappBusinessAccountId: data.businessAccountId,
            whatsappEnabled: data.enabled
        };

        if (data.accessToken && !data.accessToken.includes(':')) {
            updateData.whatsappAccessToken = encrypt(data.accessToken);
        }

        await prisma.restaurant.update({
            where: { id: restaurantId },
            data: updateData
        });

        revalidatePath("/manager/settings");
        return { success: true };
    } catch (error) {
        console.error("Erreur sauvegarde WhatsApp:", error);
        return { success: false, error: "Erreur lors de la sauvegarde." };
    }
}

/**
 * Récupère les paramètres WhatsApp (sans le token en clair)
 */
export async function getWhatsAppSettings(restaurantId: string) {
    try {
        await ensureManager(restaurantId);
        const settings = await prisma.restaurant.findUnique({
            where: { id: restaurantId },
            select: {
                whatsappAccessToken: true,
                whatsappPhoneNumberId: true,
                whatsappBusinessAccountId: true,
                whatsappEnabled: true
            }
        });

        return {
            success: true,
            data: {
                ...settings,
                hasToken: !!settings?.whatsappAccessToken,
                whatsappAccessToken: "" // On ne renvoie jamais le token
            }
        };
    } catch (error) {
        return { success: false };
    }
}

/**
 * Test la connexion en envoyant un message "Hello World"
 */
export async function testWhatsAppConnection(restaurantId: string, testPhone: string) {
    if (!testPhone) return { success: false, error: "Numéro de téléphone requis pour le test." };

    try {
        await ensureManager(restaurantId);
        const res = await sendWhatsAppTemplate(
            restaurantId, 
            testPhone, 
            "connection_test",
            "fr"
        );

        return res;
    } catch (error) {
        return { success: false, error: "Échec du test." };
    }
}
