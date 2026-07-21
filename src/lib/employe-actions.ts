/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { prisma } from "./prisma";
import { revalidatePath } from "next/cache";

// ============================================================
// CRUD EMPLOYÉS
// ============================================================

export async function getEmployes(restaurantId: string) {
  try {
    const employes = await prisma.employe.findMany({
      where: { restaurantId },
      orderBy: [{ actif: "desc" }, { nom: "asc" }],
    });
    return { success: true, employes };
  } catch (e) {
    console.error("[Employe] getEmployes:", e);
    return { success: false, employes: [] };
  }
}

export async function createEmploye(data: {
  restaurantId: string;
  nom: string;
  codePin: string;
  role: "MANAGER" | "CAISSIER" | "CUISINIER" | "SERVEUR" | "LIVREUR";
}) {
  try {
    if (!data.nom || data.nom.trim().length < 2) {
      return { success: false, error: "Le nom doit faire au moins 2 caractères." };
    }
    if (!data.codePin || !/^\d{4,6}$/.test(data.codePin)) {
      return { success: false, error: "Le code PIN doit être de 4 à 6 chiffres." };
    }

    // Vérifier si le PIN est déjà utilisé dans ce restaurant
    const existing = await prisma.employe.findFirst({
      where: { restaurantId: data.restaurantId, codePin: data.codePin },
    });
    if (existing) {
      return { success: false, error: "Ce code PIN est déjà utilisé par un autre employé." };
    }

    const employe = await prisma.employe.create({
      data: {
        nom: data.nom.trim(),
        codePin: data.codePin,
        role: data.role,
        restaurantId: data.restaurantId,
        actif: true,
      },
    });
    revalidatePath("/manager/equipe");
    return { success: true, employe };
  } catch (e) {
    console.error("[Employe] createEmploye:", e);
    return { success: false, error: "Erreur lors de la création." };
  }
}

export async function updateEmploye(
  id: string,
  data: {
    nom?: string;
    codePin?: string;
    role?: "MANAGER" | "CAISSIER" | "CUISINIER" | "SERVEUR" | "LIVREUR";
    actif?: boolean;
  }
) {
  try {
    if (data.codePin && !/^\d{4,6}$/.test(data.codePin)) {
      return { success: false, error: "Le code PIN doit être de 4 à 6 chiffres." };
    }

    // Vérifier si le nouveau PIN est déjà pris par un autre employé du même restaurant
    if (data.codePin) {
      const employe = await prisma.employe.findUnique({ where: { id } });
      if (employe) {
        const conflict = await prisma.employe.findFirst({
          where: {
            restaurantId: employe.restaurantId,
            codePin: data.codePin,
            id: { not: id },
          },
        });
        if (conflict) {
          return { success: false, error: "Ce code PIN est déjà utilisé par un autre employé." };
        }
      }
    }

    const updated = await prisma.employe.update({ where: { id }, data });
    revalidatePath("/manager/equipe");
    return { success: true, employe: updated };
  } catch (e) {
    console.error("[Employe] updateEmploye:", e);
    return { success: false, error: "Erreur lors de la mise à jour." };
  }
}

export async function deleteEmploye(id: string) {
  try {
    await prisma.employe.delete({ where: { id } });
    revalidatePath("/manager/equipe");
    return { success: true };
  } catch (e) {
    console.error("[Employe] deleteEmploye:", e);
    return { success: false, error: "Erreur lors de la suppression." };
  }
}

// ============================================================
// CONNEXION PAR PIN (pour le POS / KDS)
// ============================================================

export async function loginEmployeByPin(restaurantId: string, codePin: string) {
  try {
    const employe = await prisma.employe.findFirst({
      where: { restaurantId, codePin, actif: true },
    });
    if (!employe) {
      return { success: false, error: "Code PIN incorrect ou employé inactif." };
    }
    return { success: true, employe };
  } catch (e) {
    console.error("[Employe] loginEmployeByPin:", e);
    return { success: false, error: "Erreur serveur." };
  }
}

// ============================================================
// GESTION DES SHIFTS (CAISSE)
// ============================================================

export async function ouvrirShift(restaurantId: string, employeId: string, fondsInitial: number) {
  try {
    // Vérifier qu'il n'y a pas un shift ouvert pour cet employé aujourd'hui
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const shiftExistant = await prisma.shiftCaisse.findFirst({
      where: {
        employeId,
        restaurantId,
        heureOuverture: { gte: today },
        heureFermeture: null, // shift encore ouvert
      },
    });

    if (shiftExistant) {
      return { success: true, shift: shiftExistant, alreadyOpen: true };
    }

    const shift = await prisma.shiftCaisse.create({
      data: {
        employeId,
        restaurantId,
        fondsInitial,
      },
    });
    return { success: true, shift, alreadyOpen: false };
  } catch (e) {
    console.error("[Shift] ouvrirShift:", e);
    return { success: false, error: "Erreur lors de l'ouverture du shift." };
  }
}

export async function fermerShift(shiftId: string, fondsFinal: number) {
  try {
    const shift = await prisma.shiftCaisse.update({
      where: { id: shiftId },
      data: {
        heureFermeture: new Date(),
        fondsFinal,
      },
    });
    return { success: true, shift };
  } catch (e) {
    console.error("[Shift] fermerShift:", e);
    return { success: false, error: "Erreur lors de la fermeture du shift." };
  }
}

export async function getShiftActif(restaurantId: string, employeId: string) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const shift = await prisma.shiftCaisse.findFirst({
      where: {
        restaurantId,
        employeId,
        heureOuverture: { gte: today },
        heureFermeture: null,
      },
      include: { employe: true },
    });
    return { success: true, shift };
  } catch {
    return { success: false, shift: null };
  }
}

export async function getShiftsJour(restaurantId: string, date?: Date) {
  try {
    const target = date ? new Date(date) : new Date();
    target.setHours(0, 0, 0, 0);
    const endOfDay = new Date(target);
    endOfDay.setHours(23, 59, 59, 999);

    const shifts = await prisma.shiftCaisse.findMany({
      where: {
        restaurantId,
        heureOuverture: { gte: target, lte: endOfDay },
      },
      include: { employe: true },
      orderBy: { heureOuverture: "desc" },
    });

    return { success: true, shifts };
  } catch (e) {
    console.error("[Shift] getShiftsJour:", e);
    return { success: false, shifts: [] };
  }
}

// ============================================================
// STATISTIQUES PAR EMPLOYÉ
// ============================================================

export async function getStatsEmployes(restaurantId: string, periode: "day" | "week" | "month" = "day") {
  try {
    const now = new Date();
    const startDate = new Date();

    if (periode === "day") {
      startDate.setHours(0, 0, 0, 0);
    } else if (periode === "week") {
      startDate.setDate(now.getDate() - 7);
    } else if (periode === "month") {
      startDate.setDate(now.getDate() - 30);
    }

    const employes = await prisma.employe.findMany({
      where: { restaurantId },
      include: {
        commandesCaisse: {
          where: {
            createdAt: { gte: startDate },
            paiementStatus: "PAID",
          },
          select: { totalUsd: true, id: true },
        },
        commandesCrees: {
          where: { createdAt: { gte: startDate } },
          select: { id: true },
        },
        commandesCuisine: {
          where: { createdAt: { gte: startDate } },
          select: { id: true },
        },
        sessionsCaisse: {
          where: { heureOuverture: { gte: startDate } },
          select: { id: true, heureOuverture: true, heureFermeture: true, fondsInitial: true, fondsFinal: true },
        },
      },
    });

    const stats = employes.map((emp: typeof employes[0]) => ({
      id: emp.id,
      nom: emp.nom,
      role: emp.role,
      actif: emp.actif,
      ventesCaisse: emp.commandesCaisse.reduce((sum: number, c: { totalUsd: number }) => sum + c.totalUsd, 0),
      nbCommandesCaisse: emp.commandesCaisse.length,
      nbCommandesCrees: emp.commandesCrees.length,
      nbCommandesCuisine: emp.commandesCuisine.length,
      nbShifts: emp.sessionsCaisse.length,
      derniereActivite: emp.sessionsCaisse[0]?.heureOuverture || null,
    }));

    return { success: true, stats };
  } catch (e) {
    console.error("[Employe] getStatsEmployes:", e);
    return { success: false, stats: [] };
  }
}
