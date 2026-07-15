/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { prisma } from "./prisma";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { uploadImageToSupabase } from "./supabase-storage";
import { slugify } from "./utils/slugify";
import { hashPassword } from "./auth";
import { ensureSuperAdmin } from "./auth-actions";
import { PLAN_PRICES } from "./constants";
import { createNotification } from "./notification-actions";
import { validateUploadFile } from "./upload-validator";

/**
 * Helper SÉCURITÉ: Tracer l'activité des super administrateurs
 */
async function logSuperAdminAction(action: string, details: string, targetId?: string) {
    try {
        const h = headers();
        const ip = h.get("x-forwarded-for") || h.get("x-real-ip") || "Unknown";
        await prisma.actionLog.create({
            data: {
                action,
                details,
                performedBy: "SuperAdmin",
                targetId,
                ipAddress: ip
            }
        });
    } catch(e) {
        console.error("Erreur logSuperAdminAction:", e);
    }
}

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
      // SÉCURITÉ M4 : Validation du fichier uploadé
      const validation = validateUploadFile(logoFile);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      console.log("[SaaS-Server] Détection d'un fichier logo local...");
      const bytes = await logoFile.arrayBuffer();
      const buffer = Buffer.from(bytes);
      
      finalLogoUrl = await uploadImageToSupabase(buffer, logoFile.name, "logos");
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
        subscriptionEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        // Lier automatiquement à la mère si c'est un enfant
        parentId: isChild ? motherResto!.id : null,
        firstLogin: true,
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

    await logSuperAdminAction("CREATE_RESTAURANT", `A créé un nouveau restaurant : ${finalNom || nom} (email: ${email}) | Plan: ${plan}`, resto.id);

    revalidatePath("/mokolositekisumbule");
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
            // SÉCURITÉ M4 : Validation du fichier uploadé
            const validation = validateUploadFile(logoFile);
            if (!validation.valid) {
              return { success: false, error: validation.error };
            }

            const bytes = await logoFile.arrayBuffer();
            const buffer = Buffer.from(bytes);
            
            finalLogoUrl = await uploadImageToSupabase(buffer, logoFile.name, "logos");
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

        const restoBefore = await prisma.restaurant.findUnique({ where: { id }, select: { nom: true, plan: true } });
        const planChanged = restoBefore && plan && plan !== restoBefore.plan;
        await logSuperAdminAction(
            "UPDATE_RESTAURANT",
            planChanged
                ? `Plan de ${restoBefore?.nom} changé de ${restoBefore?.plan} vers ${plan}`
                : `Informations du restaurant ${restoBefore?.nom} mises à jour`,
            id
        );

        revalidatePath("/mokolositekisumbule");
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

        revalidatePath("/mokolositekisumbule");
        await logSuperAdminAction(
            "TOGGLE_SUBSCRIPTION",
            active
                ? `A réactivé l'abonnement du restaurant ${target.email} (ID: ${id})`
                : `A suspendu l'abonnement du restaurant ${target.email} (ID: ${id})`,
            id
        );
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
        const resto = await prisma.restaurant.findUnique({ where: { id }, select: { nom: true, email: true } });
        await prisma.restaurant.delete({
            where: { id }
        });
        if (resto) {
            await logSuperAdminAction("DELETE_RESTAURANT", `A supprimé le restaurant : ${resto.nom} (${resto.email})`, id);
        }
        revalidatePath("/mokolositekisumbule");
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
 * Vérifie si un restaurant est le compte "Mère" via parentId
 * Un compte mère = parentId null
 */
export async function checkIsMainAccount(id: string) {
    try {
        const target = await prisma.restaurant.findUnique({
            where: { id },
            select: { parentId: true }
        });
        if (!target) return false;
        // Mère = pas de parentId
        return target.parentId === null;
    } catch (e) {
        console.error("[SaaS-Server] Erreur checkIsMainAccount:", e);
        return false;
    }
}

/**
 * Super-Admin : Rattacher manuellement un restaurant enfant à sa mère
 */
export async function linkChildToParent(childId: string, parentId: string) {
    try {
        await ensureSuperAdmin();
        if (childId === parentId) return { success: false, error: "Un restaurant ne peut pas être son propre parent." };
        await prisma.restaurant.update({
            where: { id: childId },
            data: { parentId }
        });
        await logSuperAdminAction("LINK_CHILD_TO_PARENT", `A rattaché le restaurant ${childId} au parent ${parentId}`, childId);
        revalidatePath("/mokolositekisumbule");
        return { success: true };
    } catch (e) {
        console.error("[SaaS-Server] Erreur linkChildToParent:", e);
        return { success: false, error: "Erreur lors du rattachement." };
    }
}

/**
 * Marque la première connexion comme effectuée
 */
export async function markFirstLoginDone(restoId: string) {
    try {
        await prisma.restaurant.update({
            where: { id: restoId },
            data: { firstLogin: false }
        });
        return { success: true };
    } catch (e) {
        console.error("[Auth] Erreur markFirstLoginDone:", e);
        return { success: false };
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

        await logSuperAdminAction("RENEW_SUBSCRIPTION", `A renouvelé l'abonnement du restaurant ${resto.nom} pour ${durationDays} jours`, restaurantId);

        revalidatePath("/mokolositekisumbule");
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
            subscriptionLogs,
            systemConfigsRaw,
            securityLogs,
            actionLogsRaw
        ] = await Promise.all([
            prisma.restaurant.findMany({ orderBy: { createdAt: 'desc' } }),
            prisma.demandeAbonnement.findMany({ orderBy: { createdAt: 'desc' } }),
            prisma.recoveryRequest.findMany({ orderBy: { createdAt: 'desc' } }),
            prisma.supportMessage.findMany({ orderBy: { createdAt: 'desc' } }),
            prisma.subscriptionLog.findMany({ 
                orderBy: { createdAt: 'desc' }, 
                take: 50,
                include: { restaurant: { select: { nom: true } } }
            }),
            prisma.systemConfig.findMany({
                where: {
                    key: {
                        in: ["MAINTENANCE_MULTISITE", "MAINTENANCE_BOUTIQUE", "MAINTENANCE_COMMANDE", "MAINTENANCE_FIDELITE", "MAINTENANCE_WHATSAPP"]
                    }
                }
            }),
            prisma.securityLog.findMany({
                orderBy: { createdAt: 'desc' },
                take: 100
            }),
            prisma.actionLog.findMany({
                orderBy: { createdAt: 'desc' },
                take: 100
            })
        ]);

        // Reconstruit la variable systemConfigs depuis un tableau
        const securityLogsData = securityLogs;
        const actionLogs = actionLogsRaw;

        const systemConfigs = systemConfigsRaw.reduce((acc: any, curr) => {
            acc[curr.key] = curr.value === "true";
            return acc;
        }, {
            MAINTENANCE_MULTISITE: false,
            MAINTENANCE_BOUTIQUE: false,
            MAINTENANCE_COMMANDE: false,
            MAINTENANCE_FIDELITE: false,
            MAINTENANCE_WHATSAPP: false
        });

        return {
            success: true,
            restaurants,
            demandes,
            recoveryRequests,
            supportMessages,
            subscriptionLogs: subscriptionLogs.map((log: any) => ({
                ...log,
                restaurantNom: log.restaurant?.nom || "Inconnu"
            })),
            systemConfigs,
            securityLogs: securityLogsData,
            actionLogs
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

        // 3. Anomalies & Erreurs (Images, Comptes, Commandes)
        const [imageIssues, accountIssues, orderIssues] = await Promise.all([
            // Plats avec images par défaut (unsplash) ou vides (signalent un échec d'upload ou oubli)
            prisma.plat.findMany({
                where: { OR: [{ image: "" }, { image: { startsWith: "https://images.unsplash.com" } }] },
                include: { restaurant: { select: { nom: true } } },
                take: 50 // Limit to avoid massive payloads, we mainly need count + sample
            }),
            // Comptes inactifs ou expirés
            prisma.restaurant.findMany({
                where: { OR: [{ active: false }, { subscriptionEnd: { lt: new Date() } }] },
                select: { id: true, nom: true, email: true, active: true, subscriptionEnd: true }
            }),
            // Commandes bloquées en PENDING ou non payées depuis plus de 2 heures
            prisma.commande.findMany({
                where: { 
                    statut: { in: ["PENDING", "PREPARING"] }, 
                    createdAt: { lt: new Date(Date.now() - 2 * 60 * 60 * 1000) } 
                },
                include: { restaurant: { select: { nom: true } } },
                orderBy: { createdAt: 'desc' },
                take: 20
            })
        ]);

        // 4. Infos Système / Runtime
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
                anomalies: {
                    images: imageIssues,
                    imagesCount: await prisma.plat.count({ where: { OR: [{ image: "" }, { image: { startsWith: "https://images.unsplash.com" } }] } }),
                    accounts: accountIssues,
                    accountsCount: accountIssues.length,
                    orders: orderIssues,
                    ordersCount: await prisma.commande.count({ where: { statut: { in: ["PENDING", "PREPARING"] }, createdAt: { lt: new Date(Date.now() - 2 * 60 * 60 * 1000) } } })
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

/**
 * Récupère les configurations de maintenance globales
 */
export async function getMaintenanceConfig() {
    try {
        await ensureSuperAdmin();
        const configs = await prisma.systemConfig.findMany({
            where: {
                key: {
                    in: ["MAINTENANCE_MULTISITE", "MAINTENANCE_BOUTIQUE", "MAINTENANCE_COMMANDE", "MAINTENANCE_FIDELITE", "MAINTENANCE_WHATSAPP"]
                }
            }
        });
        const configMap = configs.reduce((acc: any, curr) => {
            acc[curr.key] = curr.value === "true";
            return acc;
        }, {
            MAINTENANCE_MULTISITE: false,
            MAINTENANCE_BOUTIQUE: false,
            MAINTENANCE_COMMANDE: false,
            MAINTENANCE_FIDELITE: false,
            MAINTENANCE_WHATSAPP: false
        });
        return { success: true, data: configMap };
    } catch (e) {
        console.error("[Maintenance] Erreur:", e);
        return { success: false, error: "Erreur lors de la récupération de la configuration" };
    }
}

/**
 * Mise à jour d'un statut de maintenance
 */
export async function updateMaintenanceConfig(key: string, value: boolean) {
    try {
        await ensureSuperAdmin();
        await prisma.systemConfig.upsert({
            where: { key },
            update: { value: value.toString() },
            create: { key, value: value.toString() }
        });
        
        // --- NOTIFICATION AUTOMATIQUE ---
        // Si on bloque (true), on envoie un broadcast d'information ou warning global.
        if (value === true) {
            const { sendBroadcastNotification } = await import('./admin-broadcast');
            let featureName = key;
            if (key === "MAINTENANCE_MULTISITE") featureName = "Multi-Sites";
            if (key === "MAINTENANCE_BOUTIQUE") featureName = "Boutique en Ligne";
            if (key === "MAINTENANCE_COMMANDE") featureName = "Commandes";
            if (key === "MAINTENANCE_FIDELITE") featureName = "Fidélité";
            if (key === "MAINTENANCE_WHATSAPP") featureName = "WhatsApp";

            await sendBroadcastNotification({
                title: `Maintenance : ${featureName}`,
                message: `La fonctionnalité ${featureName} est actuellement en maintenance pour environ 24h. Merci de votre patience.`,
                type: "WARNING"
            });
        }
        
        revalidatePath("/mokolositekisumbule");
        await logSuperAdminAction("TOGGLE_MAINTENANCE", `A ${value ? 'activé' : 'désactivé'} la maintenance : ${key}`);
        return { success: true };
    } catch (e) {
        console.error("[Maintenance] Erreur:", e);
        return { success: false, error: "Erreur lors de la mise à jour" };
    }
}
