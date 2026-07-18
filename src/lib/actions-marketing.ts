"use server";

import { prisma } from "./prisma";
import { ensureManager } from "./auth-actions";

export interface MarketingContact {
  phone: string;
  name: string;
  source: "loyalty" | "orders" | "both";
  points?: number;
  lastOrderDate?: Date;
}

/**
 * Nettoie et formate un numéro de téléphone pour WhatsApp (Congolais par défaut).
 * Si le numéro commence par 0, on le remplace par 243.
 * Enlève les espaces et caractères spéciaux, puis ajoute le `+` si non présent.
 * Mais pour wa.me, il faut souvent un numéro sans `+`. (ex: 243...)
 */
function formatWhatsAppNumber(phone: string): string {
    if (!phone) return "";
    let clean = phone.replace(/[^+0-9]/g, '');
    
    // Si c'est un numéro local RDC qui commence par 0, ex: 081... 099...
    if (clean.startsWith('0') && clean.length === 10) {
        clean = "243" + clean.substring(1);
    } 
    // S'il commence par un +
    else if (clean.startsWith('+')) {
        clean = clean.substring(1);
    }

    return clean;
}

export async function getMarketingContacts(restaurantId: string): Promise<{ success: boolean; contacts?: MarketingContact[]; error?: string }> {
    try {
        await ensureManager(restaurantId);

        // Fetch de la base de données
        const [loyaltyCustomers, orders] = await Promise.all([
            prisma.loyaltyCustomer.findMany({
                where: { restaurantId },
                select: { phone: true, name: true, points: true, updatedAt: true }
            }),
            prisma.commande.findMany({
                where: { restaurantId, phone: { not: null } },
                select: { phone: true, client: true, createdAt: true },
                orderBy: { createdAt: 'desc' }
            })
        ]);

        const contactsMap = new Map<string, MarketingContact>();

        // Intégrer les clients fidélité
        loyaltyCustomers.forEach(lc => {
            if (!lc.phone) return;
            const fmtPhone = formatWhatsAppNumber(lc.phone);
            if (!fmtPhone) return;

            contactsMap.set(fmtPhone, {
                phone: fmtPhone,
                name: lc.name || "Client Fidèle",
                source: "loyalty",
                points: lc.points,
                lastOrderDate: lc.updatedAt
            });
        });

        // Intégrer les clients des commandes (historique)
        orders.forEach(order => {
            if (!order.phone) return;
            const fmtPhone = formatWhatsAppNumber(order.phone);
            if (!fmtPhone) return;

            const existing = contactsMap.get(fmtPhone);
            if (existing) {
                // Mettre à jour si la commande est plus récente
                if (!existing.lastOrderDate || order.createdAt > existing.lastOrderDate) {
                    existing.lastOrderDate = order.createdAt;
                }
                existing.source = "both";
                if (existing.name === "Client Fidèle" && order.client) {
                    existing.name = order.client;
                }
            } else {
                contactsMap.set(fmtPhone, {
                    phone: fmtPhone,
                    name: order.client || "Client",
                    source: "orders",
                    lastOrderDate: order.createdAt
                });
            }
        });

        const sortedContacts = Array.from(contactsMap.values()).sort((a, b) => {
            const dateA = a.lastOrderDate?.getTime() || 0;
            const dateB = b.lastOrderDate?.getTime() || 0;
            return dateB - dateA; // Plus récents d'abord
        });

        return { success: true, contacts: sortedContacts };

    } catch (error) {
        console.error("Erreur lors de la récupération des contacts marketing:", error);
        return { success: false, error: "Erreur serveur de récupération" };
    }
}
