"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { comparePassword } from "@/lib/auth";
import { encrypt, decrypt } from "@/lib/jwt";
import { cookies } from "next/headers";

const loginSchema = z.object({
  email: z.string().email("Format d'email invalide"),
  password: z.string().min(1, "Mot de passe requis"),
});

/**
 * Vérifie si la session actuelle appartient à un Super-Admin
 */
export async function ensureSuperAdmin() {
  const session = cookies().get("admin_session")?.value;
  if (!session) throw new Error("Accès refusé : Session administrateur manquante");

  const payload = await decrypt(session);
  if (!payload || payload.role !== "SUPER_ADMIN") {
    throw new Error("Accès refusé : Privilèges administrateur insuffisants");
  }
  return payload;
}

/**
 * Vérifie si la session actuelle appartient à un Manager ou un Super-Admin impersonnant
 */
export async function ensureManager(targetRestoId?: string) {
  const session = cookies().get("session")?.value;
  if (!session) {
    // Si pas de session manager, on vérifie si c'est un admin (cas possible selon le routing)
    const adminRef = await getSuperAdminSession();
    if (adminRef.success) return { role: "SUPER_ADMIN", email: adminRef.email };
    
    throw new Error("Accès refusé : Session requise");
  }

  const payload = await decrypt(session);
  if (!payload || (payload.role !== "MANAGER" && payload.role !== "SUPER_ADMIN")) {
    throw new Error("Accès refusé : Privilèges insuffisants");
  }
  
  // Sécurité renforcée : On vérifie que le manager accède bien à SON restaurant
  if (targetRestoId && payload.role === "MANAGER" && payload.restoId !== targetRestoId) {
     // Pour les comptes multi-sites, on autorise si l'établissement appartient au même propriétaire (même email)
     const targetResto = await prisma.restaurant.findUnique({
         where: { id: targetRestoId },
         select: { email: true }
     });

     if (!targetResto || targetResto.email !== payload.email) {
         throw new Error("Accès refusé : Vous n'avez pas l'autorisation pour cet établissement");
     }
  }
  
  return payload;
}

export async function authenticateManager(formData: FormData) {
  try {
    const rawEmail = formData.get("email") as string;
    const rawPassword = formData.get("password") as string;

    const validated = loginSchema.safeParse({ email: rawEmail, password: rawPassword });
    
    if (!validated.success) {
      return { success: false, error: validated.error.issues[0].message };
    }

    const { email, password } = validated.data;

    const restaurant = await prisma.restaurant.findFirst({
      where: { email },
    });

    if (!restaurant) {
      return { success: false, error: "Identifiants invalides." }; // Generic error to prevent email enumeration
    }

    if (!restaurant.active) {
      return { success: false, error: "Compte inactif. Veuillez contacter le support." };
    }

    // Sécurité : On compare TOUJOURS avec bcrypt. Les mots de passe en clair ne sont plus autorisés.
    const isValid = await comparePassword(password, restaurant.adminPassword);

    if (!isValid) {
      return { success: false, error: "Identifiants invalides." };
    }

    // Créer la session
    const session = await encrypt({
      restoId: restaurant.id,
      email: restaurant.email,
      role: "MANAGER"
    });

    cookies().set("session", session, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict", // Passé de lax à strict pour plus de sécurité
      maxAge: 60 * 60 * 2, // 2 heures
      path: "/",
    });

    return { success: true, restoId: restaurant.id };
  } catch (error) {
    console.error("Login Error:", error);
    return { success: false, error: "Une erreur est survenue lors de la connexion." };
  }
}

export async function authenticateSuperAdmin(formData: FormData) {
  try {
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
    const ADMIN_PASS = process.env.ADMIN_PASSWORD;

    if (!ADMIN_EMAIL || !ADMIN_PASS) {
       console.error("CRITICAL: ADMIN_EMAIL or ADMIN_PASSWORD not set in environment.");
       return { success: false, error: "Configuration administrateur incomplète." };
    }

    if (email === ADMIN_EMAIL && password === ADMIN_PASS) {
      // Étape 1 réussie : Créer un jeton temporaire (valide 5 min)
      const preAuthToken = await encrypt({
        email,
        role: "PRE_AUTH_ADMIN",
      });

      cookies().set("pre_auth_admin", preAuthToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 60 * 5, // 5 minutes
        path: "/",
      });

      return { success: true, requiresPin: true };
    }

    return { success: false, error: "Identifiants administrateur incorrects." };
  } catch (error) {
    return { success: false, error: "Erreur serveur." };
  }
}

/**
 * Étape 2 : Vérification du code PIN à 6 chiffres
 */
export async function verifySuperAdminPin(pin: string) {
  try {
    // 1. Vérifier si on a un jeton pré-auth
    const preAuthToken = cookies().get("pre_auth_admin")?.value;
    if (!preAuthToken) return { success: false, error: "Session expirée. Reconnectez-vous." };

    const payload = await decrypt(preAuthToken);
    if (!payload || payload.role !== "PRE_AUTH_ADMIN") return { success: false, error: "Non autorisé." };

    // 2. Récupérer le PIN configuré (défaut: 123456 pour Arthur)
    let config = await prisma.systemConfig.findUnique({
      where: { key: "admin_pin" }
    });

    const correctPin = config?.value || "123456";

    if (pin === correctPin) {
      // 3. PIN correct : Créer la session finale
      const session = await encrypt({
        email: payload.email,
        role: "SUPER_ADMIN",
      });

      cookies().set("admin_session", session, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 60 * 60 * 4,
        path: "/",
      });

      // Nettoyer le jeton temporaire
      cookies().delete("pre_auth_admin");

      return { success: true };
    }

    return { success: false, error: "Code PIN incorrect." };
  } catch (error) {
    console.error("PIN Verification Error:", error);
    return { success: false, error: "Erreur technique." };
  }
}

/**
 * Mise à jour du code PIN par un Admin authentifié
 */
export async function updateAdminPin(oldPin: string, newPin: string) {
    try {
        await ensureSuperAdmin();

        if (newPin.length !== 6 || !/^\d+$/.test(newPin)) {
            return { success: false, error: "Le PIN doit contenir 6 chiffres." };
        }

        let config = await prisma.systemConfig.findUnique({
            where: { key: "admin_pin" }
        });

        const currentPin = config ? config.value : "123456";

        if (oldPin !== currentPin) {
            return { success: false, error: "L'ancien code PIN est incorrect." };
        }

        await prisma.systemConfig.upsert({
            where: { key: "admin_pin" },
            update: { value: newPin },
            create: { key: "admin_pin", value: newPin }
        });

        return { success: true };
    } catch (error) {
        return { success: false, error: "Échec de la mise à jour." };
    }
}

export async function logoutManager() {
  cookies().delete("session");
}

/**
 * Cette fonction est CRITIQUE. Elle ne doit être accessible que par un Super-Admin.
 */
export async function impersonateRestaurant(restoId: string) {
  try {
    // Vérification stricte du rôle Super-Admin
    await ensureSuperAdmin();

    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restoId },
    });

    if (!restaurant) {
      return { success: false, error: "Restaurant introuvable." };
    }

    // Créer la session pour ce restaurant spécifique (rôle MANAGER)
    const session = await encrypt({
      restoId: restaurant.id,
      email: restaurant.email,
      role: "MANAGER"
    });

    cookies().set("session", session, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 2,
      path: "/",
    });

    return { success: true };
  } catch (error: any) {
    console.error("Impersonation Error:", error);
    return { success: false, error: error.message || "Non autorisé." };
  }
}

export async function getSuperAdminSession() {
  try {
    const payload = await ensureSuperAdmin();
    return { success: true, email: payload.email };
  } catch (error) {
    return { success: false };
  }
}

/**
 * Permet à un manager multi-sites d'interchanger son établissement actif
 * sans avoir à se reconnecter (basé sur le même email de session)
 */
export async function switchSelectedRestaurant(newRestoId: string) {
  try {
      const session = cookies().get("session")?.value;
      if (!session) return { success: false, error: "Session non trouvée." };

      const payload = await decrypt(session);
      if (!payload) return { success: false, error: "Session invalide." };

      if (payload.role !== "MANAGER" && payload.role !== "SUPER_ADMIN") {
          return { success: false, error: "Non autorisé." };
      }

      // 1. Vérifier si le nouveau restaurant appartient bien à cet email
      const targetResto = await prisma.restaurant.findUnique({
          where: { id: newRestoId },
          select: { id: true, email: true }
      });

      if (!targetResto || targetResto.email !== payload.email) {
          return { success: false, error: "Accès refusé à cet établissement." };
      }

      // 2. Mettre à jour le cookie de session
      const newSession = await encrypt({
          ...payload,
          restoId: targetResto.id
      });

      cookies().set("session", newSession, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "strict",
          maxAge: 60 * 60 * 2, // 2 heures
          path: "/",
      });

      return { success: true };
  } catch (e) {
      console.error("[Auth-Actions] Switch Error:", e);
      return { success: false, error: "Erreur lors du changement d'établissement." };
  }
}