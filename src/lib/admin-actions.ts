"use server";

import { prisma } from "./prisma";
import { revalidatePath } from "next/cache";
import { writeFile } from "fs/promises";
import { join } from "path";
import { slugify } from "./utils/slugify";
import { hashPassword } from "./auth";
import { ensureSuperAdmin } from "./auth-actions";
import { PLAN_PRICES } from "./constants";
import { createNotification } from "./notification-actions";

/**
 * Action Super-Admin : Création d'un nouveau restaurant
 * Inclut l'initialisation automatique (Étape 3 du plan)
 */
export async function createRestaurant(formData: FormData) {
  console.log("[SaaS-Server] Début createRestaurant");
  try {
    await ensureSuperAdmin();
    const nom = formData.get("nom") as string;
    const email = formData.get("email") as string;
    const telephone = formData.get("telephone") as string;
    const plan = formData.get("plan") as string || "STANDARD";
    
    // Logique Logo : Fichier importé en priorité, sinon URL
    const logoFile = formData.get("logoFile") as File;
    let finalLogoUrl = formData.get("logoUrl") as string || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=200";

    if (logoFile && logoFile.size > 0) {
      console.log("[SaaS-Server] Détection d'un fichier logo local...");
      const bytes = await logoFile.arrayBuffer();
      const buffer = Buffer.from(bytes);
      
      const fileName = `${Date.now()}-${logoFile.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
      const publicPath = join(process.cwd(), "public", "uploads", fileName);
      
      await writeFile(publicPath, buffer);
      finalLogoUrl = `/uploads/${fileName}`; 
      console.log("[SaaS-Server] Fichier sauvegardé vers:", finalLogoUrl);
    }

    const tempPassword = formData.get("adminPassword") as string || Math.random().toString(36).substr(2, 8);
    const pinCode = formData.get("pinCode") as string || "0000";
    const ville = formData.get("ville") as string || "Lubumbashi";

    // Générer un slug unique
    let baseSlug = slugify(nom);
    let uniqueSlug = baseSlug;
    let counter = 1;
    while (true) {
        const conflict = await (prisma as any).restaurant.findUnique({
            where: { slug: uniqueSlug },
            select: { id: true }
        });
        if (!conflict) break;
        uniqueSlug = `${baseSlug}-${counter}`;
        counter++;
    }

    // Déterminer s'il s'agit d'un enfant (email existe déjà)
    const motherResto = await (prisma as any).restaurant.findFirst({
        where: { email },
        orderBy: { createdAt: 'asc' }
    });
    const isChild = !!motherResto;

    // RÈGLE STRICTE : Un email ne peut servir à plusieurs établissements que si c'est du PLATINUM
    if (isChild && motherResto.plan !== "PLATINUM") {
        return { success: false, error: "Cet email appartient déjà à un restaurant Standard/Pro. Le multi-site est réservé au plan PLATINUM." };
    }

    // L'enfant utilise le même mot de passe que la mère (mutualisé par email)
    let hashedPassword;
    if (isChild) {
        hashedPassword = motherResto.adminPassword;
    } else {
        hashedPassword = await hashPassword(tempPassword);
    }

    console.log("[SaaS-Server] Données finales:", { nom, slug: uniqueSlug, email, telephone, ville, plan, finalLogoUrl });

    // 1. Créer le restaurant
    console.log("[SaaS-Server] Création du restaurant en DB...");
    const resto = await (prisma as any).restaurant.create({
      data: { 
        nom, 
        slug: uniqueSlug,
        email, 
        telephone,
        ville,
        plan, 
        logoUrl: finalLogoUrl, 
        adminPassword: hashedPassword,
        pinCode,
        monthlyPrice: PLAN_PRICES[plan] || 0,
        createdAt: new Date(),
        subscriptionEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      }
    });
    console.log("[SaaS-Server] Restaurant créé avec succès:", resto.id);

    // 2. Setup Automatique (Menu par défaut)
    console.log("[SaaS-Server] Initialisation du menu par défaut...");
    const initialPlats = [
      {
        restaurantId: resto.id,
        nom: "Dégustation " + nom,
        description: "Un aperçu de nos spécialités.",
        prixUsd: 10.0,
        categorie: "ENTREE",
        image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=800"
      },
      {
        restaurantId: resto.id,
        nom: "Plat du Chef",
        description: "Préparé avec amour dès votre première connexion.",
        prixUsd: 22.0,
        categorie: "PLAT",
        image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=800"
      }
    ];

    for (const p of initialPlats) {
      await (prisma as any).plat.create({ data: p });
    }
    console.log("[SaaS-Server] Menu initialisé.");

    revalidatePath("/super-admin");
    return { success: true, restoId: resto.id, password: tempPassword };
  } catch (error: any) {
    console.error("[SaaS-Server] CRITICAL ERROR:", error);
    return { success: false, error: error.message || "Erreur serveur lors de la création." };
  }
}

export async function updateRestaurant(id: string, formData: FormData) {
    console.log("[SaaS-Server] Mise à jour restaurant:", id);
    try {
        await ensureSuperAdmin();
        const nom = formData.get("nom") as string;
        const email = formData.get("email") as string;
        const telephone = formData.get("telephone") as string;
        const plan = formData.get("plan") as string;
        
        // Logique Logo : Idem que création
        const logoFile = formData.get("logoFile") as File;
        let finalLogoUrl = formData.get("logoUrl") as string;

        if (logoFile && logoFile.size > 0) {
            const bytes = await logoFile.arrayBuffer();
            const buffer = Buffer.from(bytes);
            const fileName = `${Date.now()}-${logoFile.name.replaceAll(" ", "_")}`;
            const publicPath = join(process.cwd(), "public", "uploads", fileName);
            await writeFile(publicPath, buffer);
            finalLogoUrl = `/uploads/${fileName}`;
        }

        const ville = formData.get("ville") as string;
        const subscriptionEndStr = formData.get("subscriptionEnd") as string;
        const newPassword = formData.get("newPassword") as string;
        const pinCode = formData.get("pinCode") as string;

        const updateData: any = { nom, email, plan };
        updateData.monthlyPrice = PLAN_PRICES[plan] || 0;

        if (ville) updateData.ville = ville;
        if (telephone) updateData.telephone = telephone;
        if (finalLogoUrl) updateData.logoUrl = finalLogoUrl;
        if (subscriptionEndStr) updateData.subscriptionEnd = new Date(subscriptionEndStr);

        if (newPassword && newPassword.trim().length >= 4) {
            updateData.adminPassword = await hashPassword(newPassword.trim());
        }

        if (pinCode && pinCode.trim().length >= 4) {
            updateData.pinCode = pinCode.trim();
        }

        await (prisma as any).restaurant.update({
            where: { id },
            data: updateData
        });

        // NOTIFICATION : Site mis à jour
        await createNotification({
            restaurantId: id,
            title: "Établissement mis à jour",
            message: "Vos informations (nom, plan ou date d'expiration) ont été mises à jour par l'administrateur.",
            type: "INFO"
        });

        // NOTIFICATION : Renouvellement (Détection)
        if (subscriptionEndStr) {
            await createNotification({
                restaurantId: id,
                title: "Abonnement Renouvelé",
                message: `Votre abonnement a été prolongé jusqu'au ${new Date(subscriptionEndStr).toLocaleDateString('fr-FR')}.`,
                type: "SUCCESS"
            });
        }

        // Règle Métier : Si le restaurant principal perd son plan PLATINUM, on désactive ses enfants
        if (plan !== "PLATINUM") {
            const isMain = await checkIsMainAccount(id);
            if (isMain) {
                await (prisma as any).restaurant.updateMany({
                    where: { email, id: { not: id } },
                    data: { active: false }
                });
            }
        }

        revalidatePath("/super-admin");
        return { success: true };
    } catch (error) {
        console.error("[SaaS-Server] Erreur update:", error);
        return { success: false, error: "Erreur lors de la mise à jour." };
    }
}

export async function getRestaurantById(id: string) {
    return await (prisma as any).restaurant.findUnique({
        where: { id }
    });
}

export async function getRestaurantBySlug(slug: string) {
    try {
        const result = await (prisma as any).restaurant.findUnique({
            where: { slug }
        });
        return result;
    } catch (e) {
        console.error("[Admin-Actions] Error in getRestaurantBySlug:", e);
        return null;
    }
}

export async function toggleSubscription(id: string, active: boolean) {
    try {
        await ensureSuperAdmin();
        const target = await (prisma as any).restaurant.findUnique({
            where: { id },
            select: { email: true, createdAt: true }
        });
        
        if (!target) return { success: false };

        // Chercher tous les restos de cet email
        const allForEmail = await (prisma as any).restaurant.findMany({
            where: { email: target.email },
            orderBy: { createdAt: 'asc' }
        });

        const isMain = allForEmail[0]?.id === id;

        if (isMain) {
            // Propager à tous
            await (prisma as any).restaurant.updateMany({
                where: { email: target.email },
                data: { active }
            });
        } else {
            // Uniquement l'enfant
            await (prisma as any).restaurant.update({
                where: { id },
                data: { active }
            });
        }

        revalidatePath("/super-admin");
        return { success: true };
    } catch (e) {
        console.error("[SaaS-Server] Erreur toggle:", e);
        return { success: false };
    }
}

export async function deleteRestaurant(id: string) {
    try {
        await ensureSuperAdmin();
        await (prisma as any).restaurant.delete({
            where: { id }
        });
        revalidatePath("/super-admin");
        return { success: true };
    } catch (e) {
        console.error("[SaaS-Server] Erreur deletion:", e);
        return { success: false, error: "Erreur lors de la suppression." };
    }
}

export async function getAllRestaurants() {
    await ensureSuperAdmin();
    return await (prisma as any).restaurant.findMany();
}
/**
 * Vérifie si un restaurant est le compte "Mère" (le plus ancien créé avec cet email)
 */
export async function checkIsMainAccount(id: string) {
    try {
        const target = await (prisma as any).restaurant.findUnique({
            where: { id },
            select: { email: true }
        });
        
        if (!target) return false;

        const allForEmail = await (prisma as any).restaurant.findMany({
            where: { email: target.email },
            orderBy: { createdAt: 'asc' },
            select: { id: true }
        });

        return allForEmail[0]?.id === id;
    } catch (e) {
        console.error("[SaaS-Server] Erreur checkIsMainAccount:", e);
        return false;
    }
}
