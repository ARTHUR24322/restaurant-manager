import { NextResponse } from "next/server";

// Remplacez par votre Verify Token défini sur l'interface développeur de Meta Facebook
const WHATSAPP_WEBHOOK_SECRET = process.env.WHATSAPP_WEBHOOK_SECRET || "smartresto_secret_token";

/**
 * Endpoint GET : Requis par Meta pour la vérification du Webhook
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (mode && token) {
    if (mode === "subscribe" && token === WHATSAPP_WEBHOOK_SECRET) {
      console.log("🟢 WEBHOOK_VERIFIED");
      return new NextResponse(challenge, { status: 200 });
    } else {
      console.error("🔴 WEBHOOK_VERIFICATION_FAILED");
      return new NextResponse("Forbidden", { status: 403 });
    }
  }

  return new NextResponse("Webhook WhatsApp SmartResto", { status: 200 });
}

/**
 * Endpoint POST : Réceptionne les messages entrants ou statuts (livré/lu/échec)
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Vérifier s'il s'agit d'un événement WhatsApp API
    if (body.object === "whatsapp_business_account") {
      body.entry?.forEach((entry: any) => {
        const changes = entry.changes?.[0]?.value;
        if (!changes) return;

        // 1. Réception d'un statut (Sent, Delivered, Read, Failed)
        if (changes.statuses) {
          const status = changes.statuses[0];
          console.log(`[WhatsApp Status] Message ID ${status.id}: ${status.status}`);
          
          if (status.status === "failed") {
            const error = status.errors?.[0];
            console.error(`[WhatsApp Error] Erreur d'envoi à ${status.recipient_id}. Code: ${error?.code}, Details: ${error?.details}`);
            // Logique éventuelle pour alerter en DB qu'un numéro est invalide
          }
        }

        // 2. Réception d'un message entrant (Un client répond au bot)
        if (changes.messages) {
          const message = changes.messages[0];
          const phoneNumber = message.from; // Numéro du client
          const waId = changes.metadata.phone_number_id; // Votre ID (utile en multi-tenant)
          
          console.log(`[WhatsApp Inbound] Nouveau message de ${phoneNumber}:`, message.text?.body || message.type);

          // Piste d'amélioration: Si un client répond, on pourrait enregistrer 
          // le message dans sa commande ou envoyer une réponse automatique.
        }
      });
      return new NextResponse("EVENT_RECEIVED", { status: 200 });
    } else {
      return new NextResponse("NOT_FOUND", { status: 404 });
    }
  } catch (error) {
    console.error("Erreur de traitement du webhook WhatsApp:", error);
    return new NextResponse("INTERNAL_SERVER_ERROR", { status: 500 });
  }
}
