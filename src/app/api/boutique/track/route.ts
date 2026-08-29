import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Rate limiting simple en mémoire pour limiter les requêtes de recherche automatisées
const trackRateLimitMap = new Map<string, { count: number; lastRequest: number }>();
let lastCleanup = Date.now();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  if (now - lastCleanup > 5 * 60 * 1000) {
    lastCleanup = now;
    for (const [key, record] of Array.from(trackRateLimitMap.entries())) {
      if (now - record.lastRequest > 2 * 60 * 1000) {
        trackRateLimitMap.delete(key);
      }
    }
  }

  const windowMs = 60 * 1000; // 1 minute
  const maxAttempts = 15; // 15 requêtes max par IP / minute

  const record = trackRateLimitMap.get(ip);
  if (!record) {
    trackRateLimitMap.set(ip, { count: 1, lastRequest: now });
    return false;
  }

  if (now - record.lastRequest > windowMs) {
    record.count = 1;
    record.lastRequest = now;
    return false;
  }

  record.count++;
  record.lastRequest = now;
  return record.count > maxAttempts;
}

export async function GET(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "anonymous";

  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Trop de requêtes. Veuillez patienter avant de réessayer." },
      { status: 429 }
    );
  }

  const { searchParams } = new URL(req.url);
  const phone = searchParams.get("phone")?.trim();
  const restaurantId = searchParams.get("restaurantId")?.trim();

  if (!phone || !restaurantId) {
    return NextResponse.json({ error: "Paramètres 'phone' et 'restaurantId' requis" }, { status: 400 });
  }

  // Validation basique de la longueur pour éviter les requêtes abusives
  if (phone.length < 6 || phone.length > 20 || restaurantId.length > 50) {
    return NextResponse.json({ error: "Paramètres invalides" }, { status: 400 });
  }

  try {
    const orders = await prisma.commande.findMany({
      where: {
        phone,
        restaurantId,
        // Limiter aux commandes récentes (7 derniers jours)
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        statut: true,
        totalUsd: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ orders });
  } catch (error) {
    console.error("Track order error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
