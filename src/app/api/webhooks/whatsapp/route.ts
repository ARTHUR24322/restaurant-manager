import { NextResponse } from "next/server";
import crypto from "crypto";

// Verify Token défini sur l'interface Meta Facebook pour la phase de handshake GET
const WHATSAPP_WEBHOOK_SECRET = process.env.WHATSAPP_WEBHOOK_SECRET;
// App Secret Meta utilisé pour signer les payloads POST via X-Hub-Signature-256
const WHATSAPP_APP_SECRET = process.env.WHATSAPP_APP_SECRET || process.env.WHATSAPP_WEBHOOK_SECRET;

if (!WHATSAPP_WEBHOOK_SECRET) {
  console.warn("⚠️ WHATSAPP_WEBHOOK_SECRET not set. Webhook verification will be disabled.");
}

/**
 * Valide la signature HMAC SHA-256 envoyée par Meta dans l'en-tête X-Hub-Signature-256
 */
function verifyMetaSignature(payload: string, signatureHeader: string | null, appSecret: string): boolean {
  if (!signatureHeader || !appSecret) return false;
  
  const parts = signatureHeader.split("=");
  if (parts.length !== 2 || parts[0] !== "sha256") return false;
  
  const expectedSignature = parts[1];
  const hmac = crypto.createHmac("sha256", appSecret);
  hmac.update(payload, "utf-8");
  const calculatedDigest = hmac.digest("hex");

  try {
    const expectedBuffer = Buffer.from(expectedSignature, "hex");
    const calculatedBuffer = Buffer.from(calculatedDigest, "hex");
    if (expectedBuffer.length !== calculatedBuffer.length) return false;
    return crypto.timingSafeEqual(expectedBuffer, calculatedBuffer);
  } catch {
    return false;
  }
}

/**
 * Endpoint GET : Requis par Meta pour la vérification du Webhook
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");

  if (mode && token) {
    if (mode === "subscribe" && token === WHATSAPP_WEBHOOK_SECRET) {
      const challenge = url.searchParams.get("hub.challenge") as string;
      return new Response(challenge, { status: 200 });
    } else {
      console.error("🔴 WEBHOOK_VERIFICATION_FAILED: Token invalide");
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
    const rawBody = await request.text();

    // SÉCURITÉ : Vérification de l'authenticité de l'expéditeur via la signature HMAC
    if (WHATSAPP_APP_SECRET) {
      const signature = request.headers.get("x-hub-signature-256");
      const isValid = verifyMetaSignature(rawBody, signature, WHATSAPP_APP_SECRET);
      if (!isValid) {
        console.error("🔴 WEBHOOK_SECURITY_ERROR: Signature HMAC X-Hub-Signature-256 invalide ou absente");
        return new NextResponse("Unauthorized: Invalid signature", { status: 401 });
      }
    }

    const body = JSON.parse(rawBody);

    // Vérifier s'il s'agit d'un événement WhatsApp API
    if (body.object === "whatsapp_business_account") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      body.entry?.forEach((entry: { changes?: Array<{ value: any }> }) => {
        const changes = entry.changes?.[0]?.value;
        if (!changes) return;

        // 1. Réception d'un statut (Sent, Delivered, Read, Failed)
        if (changes.statuses) {
          const status = changes.statuses[0];
          console.log(`[WhatsApp Status] Message ID ${status.id}: ${status.status}`);
          
          if (status.status === "failed") {
            const error = status.errors?.[0];
            console.error(`[WhatsApp Error] Erreur d'envoi à ${status.recipient_id}. Code: ${error?.code}, Details: ${error?.details}`);
          }
        }

        // 2. Réception d'un message entrant (Un client répond au bot)
        if (changes.messages) {
          const message = changes.messages[0];
          const phone = message.from; // Numéro du client
          console.log(`[WhatsApp Inbound] Nouveau message de ${phone}:`, message.text?.body || message.type);
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
