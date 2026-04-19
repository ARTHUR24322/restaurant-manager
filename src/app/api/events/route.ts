import { NextRequest } from "next/server";
import { getStreamsForRestaurant } from "@/lib/sse";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const restaurantId = searchParams.get("restaurantId");

  if (!restaurantId) {
    return new Response("restaurantId is required", { status: 400 });
  }

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      
      const sendEvent = (data: any) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch (e) {
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
        } catch (e) {
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
