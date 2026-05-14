import { prisma } from "./prisma";
import { decrypt } from "./encryption";

/**
 * Service WhatsApp Cloud API Multi-Tenant
 * Gère l'envoi de messages via les credentials propres à chaque restaurant.
 */

interface WhatsAppConfig {
  accessToken: string;
  phoneNumberId: string;
}

async function getRestaurantWhatsAppConfig(restaurantId: string): Promise<WhatsAppConfig | null> {
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: {
      whatsappAccessToken: true,
      whatsappPhoneNumberId: true,
      whatsappEnabled: true
    }
  });

  if (!restaurant || !restaurant.whatsappEnabled || !restaurant.whatsappAccessToken || !restaurant.whatsappPhoneNumberId) {
    return null;
  }

  const decryptedToken = decrypt(restaurant.whatsappAccessToken);
  if (!decryptedToken) return null;

  return {
    accessToken: decryptedToken,
    phoneNumberId: restaurant.whatsappPhoneNumberId
  };
}

/**
 * Envoie un message via l'API WhatsApp Cloud (Meta)
 */
async function sendMetaWhatsAppRequest(config: WhatsAppConfig, to: string, payload: any) {
  const url = `https://graph.facebook.com/v21.0/${config.phoneNumberId}/messages`;
  
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${config.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: to.replace(/\s+/g, ""), // Nettoyage numéro
        ...payload
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Erreur WhatsApp API Feedback:", data);
      return { success: false, error: data };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Erreur réseau WhatsApp API:", error);
    return { success: false, error };
  }
}

/**
 * Envoie un message de type TEMPLATE (Recommandé par Meta)
 */
export async function sendWhatsAppTemplate(
  restaurantId: string, 
  to: string, 
  templateName: string, 
  languageCode: string = "fr",
  components: any[] = []
) {
  const config = await getRestaurantWhatsAppConfig(restaurantId);
  if (!config) return { success: false, error: "WhatsApp non configuré ou désactivé pour ce restaurant." };

  const payload = {
    type: "template",
    template: {
      name: templateName,
      language: { code: languageCode },
      components: components
    }
  };

  return sendMetaWhatsAppRequest(config, to, payload);
}

/**
 * Envoie un message TEXTE libre (Seulement si une session de 24h est ouverte)
 */
export async function sendWhatsAppText(restaurantId: string, to: string, message: string) {
    const config = await getRestaurantWhatsAppConfig(restaurantId);
    if (!config) return { success: false, error: "WhatsApp non configuré." };

    const payload = {
        type: "text",
        text: { body: message }
    };

    return sendMetaWhatsAppRequest(config, to, payload);
}

/**
 * NOTIFICATION : Commande Prête
 */
export async function notifyOrderReady(order: any) {
    if (!order.phone) return;

    return sendWhatsAppTemplate(
        order.restaurantId,
        order.phone,
        "order_ready", // Nom du template à créer sur Meta
        "fr",
        [
            {
                type: "body",
                parameters: [
                    { type: "text", text: `Table ${order.table}` },
                    { type: "text", text: order.totalUsd.toString() }
                ]
            }
        ]
    );
}

/**
 * NOTIFICATION : Reçu Numérique après paiement
 */
export async function sendDigitalReceipt(order: any) {
    if (!order.phone) return;

    return sendWhatsAppTemplate(
        order.restaurantId,
        order.phone,
        "digital_receipt", // Nom du template à créer sur Meta
        "fr",
        [
            {
                type: "body",
                parameters: [
                    { type: "text", text: order.id.substring(0, 8).toUpperCase() },
                    { type: "text", text: order.totalUsd.toString() }
                ]
            }
        ]
    );
}

/**
 * PROMOTION : Fidélité
 */
export async function sendLoyaltyPromotion(restaurantId: string, phone: string, points: number, giftName: string) {
    return sendWhatsAppTemplate(
        restaurantId,
        phone,
        "loyalty_promotion",
        "fr",
        [
            {
                type: "body",
                parameters: [
                    { type: "text", text: points.toString() },
                    { type: "text", text: giftName }
                ]
            }
        ]
    );
}
