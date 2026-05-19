"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { comparePassword, hashPassword } from "@/lib/auth";
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

  // Vérification de la version globale SuperAdmin
  const config = await prisma.systemConfig.findUnique({
    where: { key: "admin_session_version" }
  });
  const currentVersion = config ? parseInt(config.value) : 1;
  if (payload.version !== currentVersion) {
    cookies().delete("admin_session");
    throw new Error("Session administrateur expirée (déconnexion globale)");
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

  // Vérification de la version de session (Déconnexion Globale)
  if (payload.role === "MANAGER") {
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: payload.restoId },
      select: { sessionVersion: true, active: true }
    });
    if (!restaurant || !restaurant.active || restaurant.sessionVersion !== payload.version) {
      cookies().delete("session");
      throw new Error("Session expirée ou établissement inactif");
    }
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
      return { success: false, error: "Identifiants invalides." };
    }

    if (!restaurant.active) {
      return { success: false, error: "Compte inactif. Veuillez contacter le support." };
    }

    const isValid = await comparePassword(password, restaurant.adminPassword);

    if (!isValid) {
      return { success: false, error: "Identifiants invalides." };
    }

    // Étape 1 réussie : Créer un jeton temporaire en attente du PIN (valide 5 min)
    const preAuthToken = await encrypt({
      restoId: restaurant.id,
      email: restaurant.email,
      role: "PRE_AUTH_MANAGER",
      version: restaurant.sessionVersion,
    });

    cookies().set("manager_pre_auth", preAuthToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 5, // 5 minutes
      path: "/",
    });

    return { success: true, requiresPin: true, restoId: restaurant.id };
  } catch (error) {
    console.error("Login Error:", error);
    return { success: false, error: "Une erreur est survenue lors de la connexion." };
  }
}

const RDC_CITIES = [
  "Lubumbashi", "Kinshasa", "Goma", "Bukavu", 
  "Mbuji-Mayi", "Kolwezi", "Likasi", "Matadi", 
  "Kikwit", "Kananga", "Kisangani"
];

const registerSchema = z.object({
  nom: z.string().min(2, "Le nom doit avoir au moins 2 caractères"),
  email: z.string().email("Format d'email invalide"),
  password: z.string().min(6, "Le mot de passe doit avoir au moins 6 caractères"),
  adresse: z.string().min(5, "L'adresse est requise"),
  ville: z.string().min(1, "La ville est requise"),
  pays: z.string().refine(val => val === "République Démocratique du Congo", "Seule la RDC est acceptée"),
});

import { slugify } from "./utils/slugify";

export async function registerRestaurant(formData: FormData) {
  try {
    const rawData = {
      nom: formData.get("nom") as string,
      email: formData.get("email") as string,
      password: formData.get("password") as string,
      adresse: formData.get("adresse") as string,
      ville: formData.get("ville") as string,
      pays: formData.get("pays") as string,
    };

    const validated = registerSchema.safeParse(rawData);
    if (!validated.success) {
      return { success: false, error: validated.error.issues[0].message };
    }

    const { nom, email, password, adresse, ville, pays } = validated.data;

    // 1. Vérifier si l'email existe déjà
    const existing = await prisma.restaurant.findFirst({
      where: { email }
    });

    if (existing) {
      return { success: false, error: "Cet email est déjà associé à un compte." };
    }

    // 2. Préparer les données
    const hashedPassword = await hashPassword(password);
    let baseSlug = slugify(nom);
    let uniqueSlug = baseSlug;
    let counter = 1;
    
    while (true) {
      const conflict = await (prisma as any).restaurant.findFirst({
        where: { slug: uniqueSlug },
        select: { id: true }
      });
      if (!conflict) break;
      uniqueSlug = `${baseSlug}-${counter}`;
      counter++;
    }

    // 3. Créer le restaurant directement avec TRIAL 14 jours
    const restaurant = await (prisma as any).restaurant.create({
      data: {
        nom,
        slug: uniqueSlug,
        email,
        adminPassword: hashedPassword,
        ville,
        pays,
        plan: "TRIAL",
        active: true,
        tauxChange: 2800,
        pinCode: "000000",
        subscriptionEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 jours
        logoUrl: "/logo.svg",
      }
    });

    // 4. Initialisation du menu de base
    const initialPlats = [
      {
        restaurantId: restaurant.id,
        nom: "Menu découverte " + nom,
        description: "Premier plat créé automatiquement.",
        prixUsd: 10.0,
        categorie: "PLAT",
        image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=800",
      }
    ];

    for (const p of initialPlats) {
      await (prisma as any).plat.create({ data: p });
    }

    return { success: true, restoId: restaurant.id };
  } catch (error: any) {
    console.error("Registration Error:", error);
    return { success: false, error: "Une erreur est survenue lors de l'inscription." };
  }
}

/**
 * Vérifie le code PIN et crée la session finale
 */
export async function verifyManagerPin(pin: string) {
  try {
    const preAuthCookie = cookies().get("manager_pre_auth")?.value;
    if (!preAuthCookie) {
      return { success: false, error: "Session expirée. Veuillez vous reconnecter." };
    }

    const payload = await decrypt(preAuthCookie);
    if (!payload || payload.role !== "PRE_AUTH_MANAGER") {
      cookies().delete("manager_pre_auth");
      return { success: false, error: "Session invalide. Veuillez vous reconnecter." };
    }

    // Récupérer le PIN actuel depuis la base de données
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: payload.restoId as string },
      select: { pinCode: true, sessionVersion: true, active: true }
    });

    if (!restaurant || !restaurant.active) {
      return { success: false, error: "Compte introuvable ou inactif." };
    }

    // Le PIN par défaut est "000000"
    const validPin = restaurant.pinCode || "000000";
    if (pin !== validPin) {
      return { success: false, error: "Code PIN incorrect. Réessayez." };
    }

    // PIN correct : créer la session finale
    const session = await encrypt({
      restoId: payload.restoId,
      email: payload.email,
      role: "MANAGER",
      version: restaurant.sessionVersion,
    });

    cookies().set("session", session, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 24 * 3, // 3 jours
      path: "/",
    });

    // Supprimer le jeton temporaire
    cookies().delete("manager_pre_auth");

    return { success: true, restoId: payload.restoId };
  } catch (error) {
    console.error("PIN Verification Error:", error);
    return { success: false, error: "Une erreur est survenue." };
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
      // On inclut une "version" fixe ou une clé pour le Super Admin aussi
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

    const correctPin = config?.value;

    if (!correctPin) {
      console.error("ADMIN SECURITY ALERT: No Admin PIN set in database. Default 123456 has been DISABLED.");
      return { success: false, error: "Sécurité : PIN administrateur non configuré. Contactez le développeur." };
    }

    if (pin === correctPin) {
      // 3. PIN correct : Créer la session finale
      const adminVersionConfig = await prisma.systemConfig.findUnique({
        where: { key: "admin_session_version" }
      });
      const currentAdminVersion = adminVersionConfig ? parseInt(adminVersionConfig.value) : 1;

      const session = await encrypt({
        email: payload.email,
        role: "SUPER_ADMIN",
        version: currentAdminVersion
      });

      cookies().set("admin_session", session, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 60 * 60 * 24 * 3, // 3 jours
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
 * Déconnexion GLOBALE (Invalide tous les appareils d'un manager)
 */
export async function logoutManagerGlobal(restoId: string) {
  try {
    await ensureManager(restoId);
    
    // On incrémente la version de session en base de données
    await prisma.restaurant.update({
      where: { id: restoId },
      data: { sessionVersion: { increment: 1 } }
    });

    cookies().delete("session");
    return { success: true };
  } catch (error) {
    console.error("[Logout-Global] Error:", error);
    return { success: false };
  }
}

/**
 * Déconnexion GLOBALE Super-Admin
 */
export async function logoutSuperAdminGlobal() {
  try {
    await ensureSuperAdmin();

    const config = await prisma.systemConfig.findUnique({
      where: { key: "admin_session_version" }
    });
    const nextVersion = config ? parseInt(config.value) + 1 : 2;

    await prisma.systemConfig.upsert({
      where: { key: "admin_session_version" },
      update: { value: nextVersion.toString() },
      create: { key: "admin_session_version", value: "2" }
    });

    cookies().delete("admin_session");
    return { success: true };
  } catch (error) {
    return { success: false };
  }
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
      role: "MANAGER",
      version: restaurant.sessionVersion
    });

    cookies().set("session", session, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 24 * 3, // 3 jours
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
          maxAge: 60 * 60 * 24 * 3, // 3 jours
          path: "/",
      });

      return { success: true };
  } catch (e) {
      console.error("[Auth-Actions] Switch Error:", e);
      return { success: false, error: "Erreur lors du changement d'établissement." };
  }
}

/**
 * Traite la demande de réinitialisation avec le code PIN du restaurant
 */
export async function resetPasswordWithPin(formData: FormData) {
  try {
    const email = formData.get("email") as string;
    const pinCode = formData.get("pinCode") as string;
    const newPassword = formData.get("newPassword") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (!email || !pinCode || !newPassword || !confirmPassword) {
      return { success: false, error: "Tous les champs sont requis." };
    }

    if (newPassword !== confirmPassword) {
      return { success: false, error: "Les mots de passe ne correspondent pas." };
    }

    if (newPassword.length < 6) {
      return { success: false, error: "Le mot de passe doit contenir au moins 6 caractères." };
    }

    // Chercher le restaurant par email et vérifier le PIN
    const restaurant = await prisma.restaurant.findFirst({
      where: { email },
    });

    if (!restaurant) {
      // Pour des raisons de sécurité, ne pas indiquer que l'email n'existe pas
      return { success: false, error: "Informations invalides." };
    }

    if (restaurant.pinCode === "000000") {
      return { success: false, error: "La réinitialisation est désactivée pour des raisons de sécurité (PIN par défaut). Veuillez contacter le support." };
    }

    if (restaurant.pinCode !== pinCode) {
      return { success: false, error: "Informations invalides." };
    }

    // Hacher le nouveau mot de passe
    const hashedPassword = await hashPassword(newPassword);

    // Mettre à jour le mot de passe
    // S'il s'agit d'un compte multi-sites (mother avec même email), on synchronise tous les établissements avec le même email
    await prisma.restaurant.updateMany({
      where: { email: email },
      data: { adminPassword: hashedPassword }
    });

    return { success: true };
  } catch (error) {
    console.error("Reset Password Error:", error);
    return { success: false, error: "Une erreur est survenue lors de la réinitialisation." };
  }
}