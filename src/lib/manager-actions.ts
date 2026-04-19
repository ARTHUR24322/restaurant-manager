"use server";

import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { decrypt } from "@/lib/jwt";

export async function verifyManagerPin(pin: string) {
  try {
    const session = cookies().get("session")?.value;
    if (!session) {
      return { success: false, error: "Session non trouvée. Veuillez vous reconnecter." };
    }

    const payload = await decrypt(session);
    if (!payload || !payload.restoId || !payload.email) {
      return { success: false, error: "Session invalide." };
    }

    // Sécurité maximale : On vérifie que le PIN correspond à l'ID ET à l'email du proprio
    const restaurant = await prisma.restaurant.findUnique({
      where: { 
        id: payload.restoId,
        email: payload.email // Liaison stricte au compte propriétaire
      },
      select: { pinCode: true }
    });

    if (!restaurant) {
      return { success: false, error: "Accès non autorisé ou établissement introuvable." };
    }

    if (restaurant.pinCode === pin) {
      return { success: true };
    } else {
      return { success: false, error: "Code PIN incorrect." };
    }
  } catch (error) {
    console.error("PIN Verification Error:", error);
    return { success: false, error: "Une erreur est survenue lors de la vérification." };
  }
}

export async function getManagerSession() {
  try {
    const session = cookies().get("session")?.value;
    if (!session) return null;

    const payload = await decrypt(session);
    if (!payload || !payload.restoId) return null;

    const restaurant = await (prisma as any).restaurant.findUnique({
      where: { id: payload.restoId },
      select: { id: true, nom: true, email: true, plan: true, active: true, subscriptionEnd: true, preferredTheme: true, tauxChange: true }
    });

    return restaurant;
  } catch (error) {
    return null;
  }
}

/**
 * Récupère tous les établissements liés au même email (mère + enfants)
 * Utilisé pour la sélection multi-sites des comptes PLATINUM
 */
export async function getLinkedEstablishments() {
  try {
    const session = cookies().get("session")?.value;
    if (!session) return [];

    const payload = await decrypt(session);
    if (!payload || !payload.restoId) return [];

    // Récupère l'email du restaurant lié à la session
    const mainResto = await prisma.restaurant.findUnique({
      where: { id: payload.restoId },
      select: { email: true }
    });

    if (!mainResto) return [];

    // Récupère tous les restaurants avec cet email, triés par date de création
    const all = await prisma.restaurant.findMany({
      where: { email: mainResto.email, active: true },
      orderBy: { createdAt: "asc" },
      select: { id: true, nom: true, ville: true, logoUrl: true, plan: true, createdAt: true }
    });

    return all;
  } catch (error) {
    console.error("getLinkedEstablishments error:", error);
    return [];
  }
}
