// Singleton for Server-Sent Events (SSE) broadcasting isolated by restaurant
if (!(global as any).EVENT_STREAMS) {
  (global as any).EVENT_STREAMS = new Map<string, Set<(data: any) => void>>();
}

export function getStreamsForRestaurant(restaurantId: string): Set<(data: any) => void> {
  const streams = (global as any).EVENT_STREAMS as Map<string, Set<(data: any) => void>>;
  if (!streams.has(restaurantId)) {
    streams.set(restaurantId, new Set());
  }
  return streams.get(restaurantId)!;
}

export function broadcastEvent(type: string, data: any = {}) {
  const restaurantId = data.restaurantId;
  if (!restaurantId) {
    console.warn("[SSE] Attempted to broadcast without restaurantId:", type);
    return;
  }

  const clients = getStreamsForRestaurant(restaurantId);
  if (clients) {
    const deadClients: ((data: any) => void)[] = [];
    
    clients.forEach((send: any) => {
      try {
        send({ type, ...data });
      } catch (e) {
        deadClients.push(send);
      }
    });

    // Cleanup dead connections
    deadClients.forEach(client => clients.delete(client));
  }
}
