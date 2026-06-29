import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const phone = searchParams.get("phone");
  const restaurantId = searchParams.get("restaurantId");

  if (!phone || !restaurantId) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  try {
    const orders = await prisma.commande.findMany({
      where: {
        phone,
        restaurantId,
        // Show orders from last 7 days
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        statut: true,
        totalUsd: true,
        createdAt: true,
        livreur: true,
        adresseLivraison: true,
        client: true,
      },
    });

    return NextResponse.json({ orders });
  } catch (error) {
    console.error("Track order error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
