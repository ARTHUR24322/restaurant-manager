"use server";

import { prisma } from "./prisma";
import { revalidatePath } from "next/cache";
import { ensureSuperAdmin } from "./auth-actions";

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

    revalidatePath("/mokolositekisumbule");
    return { success: true, id: newMessage.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur serveur";
    console.error("[Support] Erreur submission:", error);
    return { success: false, error: message };
  }
}

export async function getAllSupportMessages() {
  try {
    await ensureSuperAdmin();
    const messages = await prisma.supportMessage.findMany({
      orderBy: { createdAt: "desc" },
    });
    return messages;
  } catch (error) {
    console.error("[Support] Erreur fetch:", error);
    return [];
  }
}

export async function markMessageRead(id: string) {
  try {
    await ensureSuperAdmin();
    await prisma.supportMessage.update({
      where: { id },
      data: { statut: "LU" }
    });
    revalidatePath("/mokolositekisumbule");
    return { success: true };
  } catch (error) {
    console.error("[Support] Erreur markMessageRead:", error);
    return { success: false };
  }
}
