"use server"

import { prisma } from "@/lib/prisma";

const PAYPAL_CLIENT_ID = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;
const PAYPAL_API = process.env.NODE_ENV === "production" 
    ? "https://api-m.paypal.com" 
    : "https://api-m.sandbox.paypal.com";

async function getAccessToken() {
    if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
        throw new Error("Identifiants PayPal manquants dans le fichier .env");
    }

    const auth = Buffer.from(PAYPAL_CLIENT_ID + ":" + PAYPAL_CLIENT_SECRET).toString("base64");
    
    const response = await fetch(`${PAYPAL_API}/v1/oauth2/token`, {
        method: "POST",
        body: "grant_type=client_credentials",
        headers: {
            Authorization: `Basic ${auth}`,
            "Content-Type": "application/x-www-form-urlencoded",
        },
    });

    if (!response.ok) {
        throw new Error("Échec de l'obtention du token de session PayPal");
    }

    const data = await response.json();
    return data.access_token;
}

/**
 * Crée une commande PayPal sur le serveur
 */
export async function createPayPalOrder(amount: number) {
    try {
        const accessToken = await getAccessToken();
        const response = await fetch(`${PAYPAL_API}/v2/checkout/orders`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
                intent: "CAPTURE",
                purchase_units: [
                    {
                        amount: {
                            currency_code: "USD",
                            value: amount.toFixed(2),
                        },
                    },
                ],
            }),
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Erreur lors de la création de la commande");
        
        return { success: true, orderID: data.id };
    } catch (error) {
        console.error("PayPal Create Order Error:", error);
        return { success: false, error: "Impossible de générer le paiement PayPal." };
    }
}

/**
 * Capture le paiement une fois approuvé par l'utilisateur
 */
export async function capturePayPalOrder(orderID: string, demandeId: string) {
    try {
        const accessToken = await getAccessToken();
        const response = await fetch(`${PAYPAL_API}/v2/checkout/orders/${orderID}/capture`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`,
            },
        });

        const data = await response.json();

        if (data.status === "COMPLETED") {
            // Mettre à jour le statut de la demande dans la base de données
            await prisma.demandeAbonnement.update({
                where: { id: demandeId },
                data: { statut: "PAYÉ" }
            });
            return { success: true };
        }

        return { success: false, error: "Le paiement n'a pas pu être complété." };
    } catch (error) {
        console.error("PayPal Capture Error:", error);
        return { success: false, error: "Erreur lors de la validation du paiement." };
    }
}
