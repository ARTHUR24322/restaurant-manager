import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * ROUTE DÉSACTIVÉE — La création de commandes passe par le server action 'createCommande'.
 * Cette route placeholder a été supprimée pour des raisons de sécurité.
 */
export async function POST() {
  return NextResponse.json(
    { success: false, error: "Cette route API est désactivée. Utilisez le formulaire client." },
    { status: 403 }
  );
}
