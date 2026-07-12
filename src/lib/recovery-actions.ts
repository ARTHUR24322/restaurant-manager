"use server";

import { prisma } from "./prisma";
import { revalidatePath } from "next/cache";
import { hashPassword } from "./auth";
import { ensureSuperAdmin } from "./auth-actions";

/**
 * Soumettre une demande de récupération (Côté Gérant)
 */
export async function submitRecoveryRequest(formData: FormData) {
  try {
    const nomRestaurant = formData.get("nomRestaurant") as string;
    const email = formData.get("email") as string;
    const telephone = formData.get("telephone") as string;

    if (!nomRestaurant || !email || !telephone) {
      return { success: false, error: "Tous les champs sont requis." };
    }

    await prisma.recoveryRequest.create({
      data: {
        nomRestaurant,
        email,
        telephone,
        statut: "EN_ATTENTE"
      }
    });

    return { success: true };
  } catch (error) {
    console.error("[Recovery-Actions] Submit Error:", error);
    return { success: false, error: "Erreur lors de l'envoi de la demande." };
  }
}

/**
 * Récupérer toutes les demandes (Côté Super-Admin)
 */
export async function getAllRecoveryRequests() {
  try {
    await ensureSuperAdmin();
    return await prisma.recoveryRequest.findMany({
      orderBy: { createdAt: "desc" }
    });
  } catch (error) {
    console.error("[Recovery-Actions] Get Error:", error);
    return [];
  }
}

/**
 * Résoudre une demande de récupération (Côté Super-Admin)
 */
export async function resolveRecoveryRequest(requestId: string, newPassword?: string, action: "APPROVE" | "REJECT" = "APPROVE") {
  try {
    await ensureSuperAdmin();

    const request = await prisma.recoveryRequest.findUnique({
      where: { id: requestId }
    });

    if (!request) return { success: false, error: "Demande introuvable." };

    if (action === "REJECT") {
      await prisma.recoveryRequest.update({
        where: { id: requestId },
        data: { statut: "REJETE" }
      });
      revalidatePath("/mokolositekisumbule");
      return { success: true, message: "Demande rejetée." };
    }

    // Si on approuve, on change le mot de passe de l'établissement
    if (!newPassword) return { success: false, error: "Un nouveau mot de passe est requis pour l'approbation." };

    const hashedPassword = await hashPassword(newPassword);

    // Mettre à jour tous les restaurants liés à cet email
    await prisma.restaurant.updateMany({
      where: { email: request.email },
      data: { 
        adminPassword: hashedPassword,
        sessionVersion: { increment: 1 } // Invalide les sessions en passant
      }
    });

    // Marquer la demande comme traitée
    await prisma.recoveryRequest.update({
      where: { id: requestId },
      data: { statut: "TRAITE" }
    });

    revalidatePath("/mokolositekisumbule");
    return { success: true, message: "Mot de passe réinitialisé avec succès." };
  } catch (error) {
    console.error("[Recovery-Actions] Resolve Error:", error);
    return { success: false, error: "Erreur lors de la résolution." };
  }
}
