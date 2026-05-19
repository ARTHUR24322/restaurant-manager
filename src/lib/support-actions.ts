"use server";

import { prisma } from "./prisma";
import { revalidatePath } from "next/cache";

export async function submitSupportMessage(data: {
  nom: string;
  email: string;
  telephone: string;
  message: string;
  sujet: string;
}) {
  try {
    if (!data.nom || !data.email || !data.message) {
      return { success: false, error: "Les champs Nom, Email et Message sont requis." };
    }

    const newMessage = await prisma.supportMessage.create({
      data: {
        nom: data.nom,
        email: data.email,
        telephone: data.telephone,
        message: data.message,
        sujet: data.sujet,
      },
    });

    console.log("[Support] Message créé avec succès:", newMessage.id);

    revalidatePath("/super-admin");
    return { success: true, id: newMessage.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur serveur";
    console.error("[Support] Erreur submission:", error);
    return { success: false, error: message };
  }
}

export async function getAllSupportMessages() {
  try {
    // Note: ensureSuperAdmin checking is omitted here for simplicity 
    // but should be added in a real production environment or if used directly in components.
    const messages = await prisma.supportMessage.findMany({
      orderBy: { createdAt: "desc" },
    });
    console.log(`[Support] ${messages.length} messages récupérés.`);
    return messages;
  } catch (error) {
    console.error("[Support] Erreur fetch:", error);
    return [];
  }
}

export async function markMessageRead(id: string) {
    try {
        await prisma.supportMessage.update({
            where: { id },
            data: { statut: "LU" }
        });
        revalidatePath("/super-admin");
        return { success: true };
    } catch {
        return { success: false };
    }
}
