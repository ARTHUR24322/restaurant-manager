type ClientHandler = (data: Record<string, unknown>) => void;

if (!(global as any).EVENT_STREAMS) {
  (global as any).EVENT_STREAMS = new Map<string, Set<ClientHandler>>();
}

export function getStreamsForRestaurant(restaurantId: string): Set<ClientHandler> {
  const streams = (global as any).EVENT_STREAMS as Map<string, Set<ClientHandler>>;
  if (!streams.has(restaurantId)) {
    streams.set(restaurantId, new Set());
  }
  return streams.get(restaurantId)!;
}

export function broadcastEvent(type: string, data: Record<string, unknown> = {}) {
  const restaurantId = data.restaurantId as string;
  if (!restaurantId) {
    console.warn("[SSE] Attempted to broadcast without restaurantId:", type);
    return;
  }

  const clients = getStreamsForRestaurant(restaurantId);
  if (clients) {
    const deadClients: ClientHandler[] = [];
    
    clients.forEach((send: ClientHandler) => {
      try {
        send({ type, ...data });
      } catch {
        deadClients.push(send);
      }
    });

    // Cleanup dead connections
    deadClients.forEach(client => clients.delete(client));
  }
}
