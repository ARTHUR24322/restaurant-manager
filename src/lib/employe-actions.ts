/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { prisma } from "./prisma";
import { revalidatePath } from "next/cache";
import { hashPassword, comparePassword } from "./auth";
import { ensureManager } from "./auth-actions";

// ============================================================
// CRUD EMPLOYÉS
// ============================================================

export async function getEmployes(restaurantId: string) {
  try {
    await ensureManager(restaurantId);
    const employes = await prisma.employe.findMany({
      where: { restaurantId },
      select: {
        id: true,
        nom: true,
        role: true,
        actif: true,
        restaurantId: true,
        createdAt: true,
        updatedAt: true,
      },
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
    await ensureManager(data.restaurantId);

    if (!data.nom || data.nom.trim().length < 2) {
      return { success: false, error: "Le nom doit faire au moins 2 caractères." };
    }
    if (!data.codePin || !/^\d{4,6}$/.test(data.codePin)) {
      return { success: false, error: "Le code PIN doit être de 4 à 6 chiffres." };
    }

    // Vérifier si le PIN est déjà utilisé dans ce restaurant
    const allEmployees = await prisma.employe.findMany({
      where: { restaurantId: data.restaurantId },
      select: { id: true, codePin: true }
    });

    for (const emp of allEmployees) {
      let isSame = false;
      if (emp.codePin.startsWith("$2a$") || emp.codePin.startsWith("$2b$")) {
        isSame = await comparePassword(data.codePin, emp.codePin);
      } else {
        isSame = (emp.codePin === data.codePin);
      }
      if (isSame) {
        return { success: false, error: "Ce code PIN est déjà utilisé par un autre employé." };
      }
    }

    const hashedPin = await hashPassword(data.codePin);

    const employe = await prisma.employe.create({
      data: {
        nom: data.nom.trim(),
        codePin: hashedPin,
        role: data.role,
        restaurantId: data.restaurantId,
        actif: true,
      },
      select: {
        id: true,
        nom: true,
        role: true,
        restaurantId: true,
        actif: true,
        createdAt: true,
      }
    });

    revalidatePath("/manager/equipe");
    return { success: true, employe };
  } catch (e) {
    console.error("[Employe] createEmploye:", e);
    return { success: false, error: "Erreur lors de la création: " + (e as Error).message };
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
    const existingEmp = await prisma.employe.findUnique({ where: { id } });
    if (!existingEmp) {
      return { success: false, error: "Employé introuvable." };
    }

    await ensureManager(existingEmp.restaurantId);

    if (data.codePin && !/^\d{4,6}$/.test(data.codePin)) {
      return { success: false, error: "Le code PIN doit être de 4 à 6 chiffres." };
    }

    const updateData: any = {};
    if (data.nom !== undefined) updateData.nom = data.nom.trim();
    if (data.role !== undefined) updateData.role = data.role;
    if (data.actif !== undefined) updateData.actif = data.actif;

    // Vérifier si le nouveau PIN est déjà pris par un autre employé du même restaurant
    if (data.codePin) {
      const otherEmployees = await prisma.employe.findMany({
        where: {
          restaurantId: existingEmp.restaurantId,
          id: { not: id },
        },
        select: { id: true, codePin: true }
      });

      for (const other of otherEmployees) {
        let isConflict = false;
        if (other.codePin.startsWith("$2a$") || other.codePin.startsWith("$2b$")) {
          isConflict = await comparePassword(data.codePin, other.codePin);
        } else {
          isConflict = (other.codePin === data.codePin);
        }
        if (isConflict) {
          return { success: false, error: "Ce code PIN est déjà utilisé par un autre employé." };
        }
      }

      updateData.codePin = await hashPassword(data.codePin);
    }

    const updated = await prisma.employe.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        nom: true,
        role: true,
        restaurantId: true,
        actif: true,
        updatedAt: true,
      }
    });

    revalidatePath("/manager/equipe");
    return { success: true, employe: updated };
  } catch (e) {
    console.error("[Employe] updateEmploye:", e);
    return { success: false, error: "Erreur lors de la mise à jour." };
  }
}

export async function deleteEmploye(id: string) {
  try {
    const existingEmp = await prisma.employe.findUnique({ where: { id } });
    if (!existingEmp) {
      return { success: false, error: "Employé introuvable." };
    }

    await ensureManager(existingEmp.restaurantId);

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
    const employes = await prisma.employe.findMany({
      where: { restaurantId, actif: true },
    });

    let matchedEmploye: typeof employes[0] | null = null;

    for (const emp of employes) {
      if (emp.codePin.startsWith("$2a$") || emp.codePin.startsWith("$2b$")) {
        const isMatch = await comparePassword(codePin, emp.codePin);
        if (isMatch) {
          matchedEmploye = emp;
          break;
        }
      } else if (emp.codePin === codePin) {
        // Rétrocompatibilité : PIN legacy en clair. On le valide et on le migre automatiquement en bcrypt.
        matchedEmploye = emp;
        const hashed = await hashPassword(codePin);
        await prisma.employe.update({
          where: { id: emp.id },
          data: { codePin: hashed }
        }).catch((err) => console.warn("[Employe] Auto-rehashing failed:", err));
        break;
      }
    }

    if (!matchedEmploye) {
      return { success: false, error: "Code PIN incorrect ou employé inactif." };
    }

    return {
      success: true,
      employe: {
        id: matchedEmploye.id,
        nom: matchedEmploye.nom,
        role: matchedEmploye.role,
        restaurantId: matchedEmploye.restaurantId,
        actif: matchedEmploye.actif,
      }
    };
  } catch (e) {
    console.error("[Employe] loginEmployeByPin:", e);
    return { success: false, error: "Erreur serveur." };
  }
}

export async function logEmployeConnection(restaurantId: string, employeId: string, nom: string, role: string) {
  try {
    await prisma.actionLog.create({
      data: {
        action: "EMPLOYE_LOGIN",
        details: `Connexion: ${nom} (${role})`,
        performedBy: nom,
        targetId: employeId,
      },
    });
    return { success: true };
  } catch (e) {
    console.error("[Employe] logEmployeConnection:", e);
    return { success: false, error: "Erreur enregistrement log." };
  }
}

// ============================================================
// GESTION DES SHIFTS (CAISSE)
// ============================================================

export async function ouvrirShift(restaurantId: string, employeId: string, fondsInitial: number) {
  try {
    await ensureManager(restaurantId);

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
    const currentShift = await prisma.shiftCaisse.findUnique({
      where: { id: shiftId }
    });

    if (!currentShift) {
      return { success: false, error: "Shift introuvable." };
    }

    await ensureManager(currentShift.restaurantId);

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
    await ensureManager(restaurantId);

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
    await ensureManager(restaurantId);

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
    await ensureManager(restaurantId);

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
