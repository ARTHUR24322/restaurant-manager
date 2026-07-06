import { NextRequest } from "next/server";
import { getStreamsForRestaurant } from "@/lib/sse";
import { cookies } from "next/headers";
import { decrypt } from "@/lib/jwt";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const restaurantId = searchParams.get("restaurantId");

  if (!restaurantId) {
    return new Response("restaurantId is required", { status: 400 });
  }

  // SÉCURITÉ : Vérifier l'authentification avant d'autoriser la connexion SSE
  const sessionCookie = cookies().get("session")?.value;
  const adminCookie = cookies().get("admin_session")?.value;

  let authorized = false;

  if (adminCookie) {
    const adminPayload = await decrypt(adminCookie);
    if (adminPayload && adminPayload.role === "SUPER_ADMIN") {
      authorized = true;
    }
  }

  if (!authorized && sessionCookie) {
    const payload = await decrypt(sessionCookie);
    if (payload && payload.restoId === restaurantId) {
      authorized = true;
    }
  }

  if (!authorized) {
    return new Response(JSON.stringify({ error: "Non autorisé" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      
      const sendEvent = (data: unknown) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          // Stream might be closed
        }
      };

      // On enregistre ce flux dans notre gestionnaire global isolé par restaurant
      const restaurantStreams = getStreamsForRestaurant(restaurantId);
      restaurantStreams.add(sendEvent);

      // Ping régulier pour garder la connexion vivante
      const keepAlive = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: keep-alive\n\n`));
        } catch {
          clearInterval(keepAlive);
        }
      }, 5000);

      req.signal.addEventListener("abort", () => {
        clearInterval(keepAlive);
        restaurantStreams.delete(sendEvent);
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
    },
  });
}
