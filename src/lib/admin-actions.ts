/* eslint-disable @typescript-eslint/no-explicit-any */
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
    const pinCode = formData.get("pinCode") as string || "000000";
    const ville = formData.get("ville") as string || "Lubumbashi";

    // Générer un slug unique
    const baseSlug = slugify(nom);
    let uniqueSlug = baseSlug;
    let counter = 1;
    while (true) {
        const conflict = await prisma.restaurant.findUnique({
            where: { slug: uniqueSlug },
            select: { id: true }
        });
        if (!conflict) break;
        uniqueSlug = `${baseSlug}-${counter}`;
        counter++;
    }

    // Déterminer s'il s'agit d'un enfant (email existe déjà)
    const motherResto = await prisma.restaurant.findFirst({
        where: { email },
        orderBy: { createdAt: 'asc' }
    });
    const isChild = !!motherResto;

    // LIMITE SMARTRESTO SaaS : 5 enfants max (6 établissements au total par email)
    if (isChild) {
        const count = await prisma.restaurant.count({
            where: { email }
        });
        if (count >= 6) {
           return { success: false, error: "Limite atteinte : Vous ne pouvez pas créer plus de 5 établissements filiales (6 au total par compte)." };
        }
    }

    // Indexation du nom si c'est un enfant avec le même nom que la mère
    let finalNom = nom;
    if (isChild && motherResto.nom.toLowerCase() === nom.toLowerCase()) {
        const count = await prisma.restaurant.count({
            where: { email }
        });
        finalNom = `${nom} ${count + 1}`;
    }

    // RÈGLE STRICTE : Un email ne peut servir à plusieurs établissements que si c'est du PLATINUM ou en TRIAL
    if (isChild && motherResto.plan !== "PLATINUM" && motherResto.plan !== "TRIAL") {
        return { success: false, error: "Le multi-site est réservé au plan PLATINUM (ou essai TRIAL)." };
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
    const resto = await prisma.restaurant.create({
      data: { 
        nom: finalNom, 
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
      await prisma.plat.create({ data: p });
    }
    console.log("[SaaS-Server] Menu initialisé.");

    revalidatePath("/super-admin");
    return { success: true, restoId: resto.id, password: tempPassword };
  } catch (error) {
    console.error("[SaaS-Server] CRITICAL ERROR:", error);
    const message = error instanceof Error ? error.message : "Erreur serveur lors de la création.";
    return { success: false, error: message };
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

        if (pinCode && pinCode.trim().length >= 6) {
            updateData.pinCode = pinCode.trim();
        }

        await prisma.restaurant.update({
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
                await prisma.restaurant.updateMany({
                    where: { email, id: { not: id } },
                    data: { active: false }
                });
            }
        }

        revalidatePath("/super-admin");
        return { success: true };
     } catch (error) {
        console.error("[SaaS-Server] Erreur update:", error);
        if (error instanceof Error && (error as any).code === 'P1001') {
            return { success: false, error: "Connexion à la base de données impossible (P1001). Veuillez réessayer dans quelques instants." };
        }
        return { success: false, error: "Erreur lors de la mise à jour." };
    }
}

export async function getRestaurantById(id: string) {
    return await prisma.restaurant.findUnique({
        where: { id }
    });
}

export async function getRestaurantBySlug(slug: string) {
    try {
        const result = await prisma.restaurant.findUnique({
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
        const target = await prisma.restaurant.findUnique({
            where: { id },
            select: { email: true, createdAt: true }
        });
        
        if (!target) return { success: false };

        // Chercher tous les restos de cet email
        const allForEmail = await prisma.restaurant.findMany({
            where: { email: target.email },
            orderBy: { createdAt: 'asc' }
        });

        const isMain = allForEmail[0]?.id === id;

        if (isMain) {
            // Propager à tous
            await prisma.restaurant.updateMany({
                where: { email: target.email },
                data: { active }
            });
        } else {
            // Uniquement l'enfant
            await prisma.restaurant.update({
                where: { id },
                data: { active }
            });
        }

        revalidatePath("/super-admin");
        return { success: true };
    } catch (e) {
        console.error("[SaaS-Server] Erreur toggle:", e);
        if (e instanceof Error && (e as any).code === 'P1001') {
            return { success: false, error: "Connexion impossible (P1001)." };
        }
        return { success: false };
    }
}

export async function deleteRestaurant(id: string) {
    try {
        await ensureSuperAdmin();
        await prisma.restaurant.delete({
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
    return await prisma.restaurant.findMany();
}

export async function getAllSubscriptionLogs() {
    await ensureSuperAdmin();
    return await prisma.subscriptionLog.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
            restaurant: {
                select: { nom: true }
            }
        }
    });
}
/**
 * Vérifie si un restaurant est le compte "Mère" (le plus ancien créé avec cet email)
 */
export async function checkIsMainAccount(id: string) {
    try {
        const target = await prisma.restaurant.findUnique({
            where: { id },
            select: { email: true }
        });
        
        if (!target) return false;

        const allForEmail = await prisma.restaurant.findMany({
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

/**
 * Action Super-Admin : Réabonnement d'un restaurant
 * Remet subscriptionEnd à 30 jours à partir de maintenant
 * et enregistre un SubscriptionLog
 */
export async function renewSubscription(restaurantId: string, durationDays: number = 30) {
    try {
        await ensureSuperAdmin();

        const resto = await prisma.restaurant.findUnique({
            where: { id: restaurantId },
            select: { id: true, nom: true, plan: true, monthlyPrice: true, active: true }
        });

        if (!resto) return { success: false, error: "Restaurant introuvable." };

        const newEnd = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);

        // Mettre à jour la date d'expiration + s'assurer que le compte est actif
        await prisma.restaurant.update({
            where: { id: restaurantId },
            data: { 
                subscriptionEnd: newEnd,
                active: true
            }
        });

        // Enregistrer dans les logs d'abonnement
        await prisma.subscriptionLog.create({
            data: {
                restaurantId,
                oldPlan: resto.plan,
                newPlan: resto.plan,
                type: "RENEWAL",
                amount: resto.monthlyPrice || 0,
                monthlyPrice: resto.monthlyPrice || 0
            }
        });

        // Notification au restaurant
        await createNotification({
            restaurantId,
            title: "Abonnement Renouvelé ✅",
            message: `Votre abonnement ${resto.plan} a été renouvelé pour ${durationDays} jours. Nouvelle expiration : ${newEnd.toLocaleDateString('fr-FR')}.`,
            type: "SUCCESS"
        });

        revalidatePath("/super-admin");
        return { success: true, newEnd: newEnd.toISOString() };
    } catch (error) {
        console.error("[SaaS-Server] Erreur renewSubscription:", error);
        const message = error instanceof Error ? error.message : "Erreur lors du réabonnement.";
        return { success: false, error: message };
    }
}

/**
 * MEGA ACTION : Récupère TOUTES les données du dashboard Super Admin en un seul appel.
 * Évite l'épuisement du pool de connexions (Prisma Error P2024 / P1001).
 */
export async function getSuperAdminPageData() {
    try {
        await ensureSuperAdmin();

        // On lance tout en parallèle mais dans UN SEUL contexte de fonction serveur
        // (Note: Toujours géré par le pool Prisma, mais réduit les allers-retours client-serveur)
        const [
            restaurants,
            demandes,
            recoveryRequests,
            supportMessages,
            subscriptionLogs
        ] = await Promise.all([
            prisma.restaurant.findMany({ orderBy: { createdAt: 'desc' } }),
            prisma.demandeAbonnement.findMany({ orderBy: { createdAt: 'desc' } }),
            prisma.recoveryRequest.findMany({ orderBy: { createdAt: 'desc' } }),
            prisma.supportMessage.findMany({ orderBy: { createdAt: 'desc' } }),
            prisma.subscriptionLog.findMany({ 
                orderBy: { createdAt: 'desc' }, 
                take: 50,
                include: { restaurant: { select: { nom: true } } }
            })
        ]);

        return {
            success: true,
            restaurants,
            demandes,
            recoveryRequests,
            supportMessages,
            subscriptionLogs
        };
    } catch (e) {
        console.error("[Mega-Action] Super Admin Data Fetch Error:", e);
        const message = e instanceof Error ? e.message : "Erreur inconnue";
        return { success: false, error: message };
    }
}

/**
 * Diagnostic complet du système pour le Super-Admin
 */
export async function getSystemDiagnostic() {
    try {
        await ensureSuperAdmin();
        
        // 1. Diagnostic de la base de données
        const dbStart = Date.now();
        await prisma.$queryRaw`SELECT 1`;
        const dbLatency = Date.now() - dbStart;

        // 2. Statistiques de volume par table
        const [restos, orders, articles, visits, notifications] = await Promise.all([
            prisma.restaurant.count(),
            prisma.commande.count(),
            prisma.articleStock.count(),
            prisma.visite.count(),
            prisma.notification.count()
        ]);

        // 3. Infos Système / Runtime
        const memory = process.memoryUsage();
        const uptime = process.uptime();

        return {
            success: true,
            data: {
                database: {
                    status: "OPÉRATIONNEL",
                    latency: `${dbLatency}ms`,
                    provider: "PostgreSQL (Supabase)",
                },
                counts: {
                    restaurants: restos,
                    commandes: orders,
                    articles: articles,
                    visites: visits,
                    notifications: notifications
                },
                server: {
                    nodeVersion: process.version,
                    platform: process.platform,
                    memory: {
                        used: `${Math.round(memory.heapUsed / 1024 / 1024)} MB`,
                        allocated: `${Math.round(memory.heapTotal / 1024 / 1024)} MB`,
                        rss: `${Math.round(memory.rss / 1024 / 1024)} MB`,
                        usedRaw: memory.heapUsed,
                        totalRaw: memory.heapTotal
                    },
                    uptime: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m`,
                },
                env: {
                    DATABASE_URL: process.env.DATABASE_URL ? "DÉFINI" : "MANQUANT",
                    DIRECT_URL: process.env.DIRECT_URL ? "DÉFINI" : "MANQUANT",
                    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? "DÉFINI" : "MANQUANT",
                    WHATSAPP_CONFIG: process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID ? "COMPLET" : "INCOMPLET",
                }
            }
        };
    } catch (e) {
        console.error("[Diagnostic] Erreur:", e);
        const message = e instanceof Error ? e.message : "Erreur inconnue";
        return { success: false, error: message };
    }
}
