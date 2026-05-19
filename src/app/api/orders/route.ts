import { NextResponse } from "next/server";
 
export const dynamic = "force-dynamic";

// Simuler Pusher pour le moment
export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // 1. Sauvegarder en BDD via Prisma (simulé ici)
    const nouvelleCommande = {
      id: "cmd_" + Math.random().toString(36).substr(2, 9),
      ...body,
      statut: "SUBMITTED",
      createdAt: new Date().toISOString()
    };

    // 2. Déclencher le temps réel (Pusher)
    // await pusher.trigger('kitchen-channel', 'new-order', nouvelleCommande);

    return NextResponse.json({ success: true, commande: nouvelleCommande }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
