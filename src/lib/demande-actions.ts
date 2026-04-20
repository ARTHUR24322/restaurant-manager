"use server";

import { prisma } from "./prisma";
import { revalidatePath } from "next/cache";
import { slugify } from "./utils/slugify";
import { ensureSuperAdmin } from "./auth-actions";
import { hashPassword } from "./auth";

/**
 * Soumettre une demande d'abonnement depuis la page pricing
 */
export async function submitSubscriptionRequest(data: {
  nomRestaurant: string;
  nomProprietaire: string;
  email: string;
  telephone: string;
  ville: string;
  plan: string;
  cycle: string;
  montant: number;
}) {
  try {
    if (!data.nomRestaurant || !data.nomProprietaire || !data.email || !data.telephone) {
      return { success: false, error: "Tous les champs sont requis." };
    }

    // Vérifier si une demande en attente existe déjà pour ce restaurant précis
    const existing = await (prisma as any).demandeAbonnement.findFirst({
      where: {
        email: data.email,
        nomRestaurant: data.nomRestaurant,
        statut: "EN_ATTENTE",
      },
    });

    if (existing) {
      return { success: false, error: "Une demande est déjà en cours de traitement pour cet email." };
    }

    const newDemande = await (prisma as any).demandeAbonnement.create({
      data: {
        nomRestaurant: data.nomRestaurant,
        nomProprietaire: data.nomProprietaire,
        email: data.email,
        telephone: data.telephone,
        ville: data.ville,
        plan: data.plan,
        cycle: data.cycle,
        montant: data.montant,
      },
    });

    revalidatePath("/super-admin");
    return { success: true, id: newDemande.id };
  } catch (error: any) {
    console.error("[Demande] Erreur:", error);
    return { success: false, error: error.message || "Erreur serveur." };
  }
}

/**
 * Récupérer toutes les demandes d'abonnement (Super-Admin)
 */
export async function getAllDemandes() {
  try {
    await ensureSuperAdmin();
    return await (prisma as any).demandeAbonnement.findMany({
      orderBy: { createdAt: "desc" },
    });
  } catch (error) {
    console.error("[Demande] Erreur fetch:", error);
    return [];
  }
}

/**
 * Approuver une demande et créer le restaurant
 */
export async function approveDemande(id: string, adminPassword: string) {
  try {
    await ensureSuperAdmin();
    const demande = await (prisma as any).demandeAbonnement.findUnique({
      where: { id },
    });

    if (!demande) return { success: false, error: "Demande introuvable." };

    // Déterminer la durée de l'abonnement selon le cycle
    let durationMs: number;
    switch (demande.cycle) {
      case "semiannual":
        durationMs = 180 * 24 * 60 * 60 * 1000; // 6 mois
        break;
      case "annual":
        durationMs = 365 * 24 * 60 * 60 * 1000; // 1 an
        break;
      default:
        durationMs = 30 * 24 * 60 * 60 * 1000; // 1 mois
    }

    // Vérifier si le restaurant existe déjà (même email ET même nom)
    // Si l'email existe mais pas le nom, c'est un nouvel établissement pour le même proprio (enfant)
    const existingResto = await (prisma as any).restaurant.findFirst({
      where: { 
        email: demande.email,
        nom: demande.nomRestaurant
      }
    });

    const motherResto = await (prisma as any).restaurant.findFirst({
      where: { email: demande.email },
      orderBy: { createdAt: 'asc' }
    });

    const isChild = !!motherResto && !existingResto;

    // Calcul du MRR (Revenu mensuel lissé)
    let monthlyPrice = demande.montant;
    if (demande.cycle === "semiannual") monthlyPrice = demande.montant / 6;
    if (demande.cycle === "annual") monthlyPrice = demande.montant / 12;

    // RÈGLE STRICTE : Un email ne peut servir à plusieurs établissements que si c'est du PLATINUM
    if (isChild && motherResto.plan !== "PLATINUM") {
        return { success: false, error: "Cet email appartient déjà à un restaurant Standard/Pro. Le multi-site est réservé au plan PLATINUM." };
    }

    let resto;
    if (existingResto) {
      // Mise à jour du restaurant existant
      const oldPlan = existingResto.plan;
      resto = await (prisma as any).restaurant.update({
        where: { id: existingResto.id },
        data: {
          plan: demande.plan,
          billingCycle: demande.cycle,
          monthlyPrice: monthlyPrice,
          subscriptionEnd: new Date(Date.now() + durationMs),
          active: true,
        }
      });

      // Règle Métier : Désactivation des enfants si downgrade
      if (demande.plan !== "PLATINUM") {
         const allRestosSameEmail = await (prisma as any).restaurant.findMany({
             where: { email: demande.email },
             orderBy: { createdAt: 'asc' },
             select: { id: true }
         });
         const isMain = allRestosSameEmail[0]?.id === existingResto.id;
         if (isMain) {
             await (prisma as any).restaurant.updateMany({
                 where: { email: demande.email, id: { not: existingResto.id } },
                 data: { active: false }
             });
         }
      }

      // Logger le changement
      await (prisma as any).subscriptionLog.create({
        data: {
          restaurantId: resto.id,
          oldPlan: oldPlan,
          newPlan: demande.plan,
          type: oldPlan === demande.plan ? "RENEWAL" : (monthlyPrice > existingResto.monthlyPrice ? "UPGRADE" : "DOWNGRADE"),
          amount: demande.montant,
          monthlyPrice: monthlyPrice
        }
      });
    } else {
      // Générer un slug unique
      let baseSlug = slugify(demande.nomRestaurant);
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

      // Créer le restaurant
      // Indexation du nom si c'est un enfant avec le même nom que la mère
      let finalNom = demande.nomRestaurant;
      if (isChild && motherResto.nom.toLowerCase() === demande.nomRestaurant.toLowerCase()) {
          const count = await (prisma as any).restaurant.count({
              where: { email: demande.email }
          });
          finalNom = `${demande.nomRestaurant} ${count + 1}`;
      }

      // Si c'est un enfant, on utilise un mot de passe verrouillé (accès via mère)
      const finalPassword = isChild ? "CHILD_PROT_" + Math.random().toString(36).substring(2, 10) : adminPassword;
      const hashedPassword = await hashPassword(finalPassword);

      resto = await (prisma as any).restaurant.create({
        data: {
          nom: finalNom,
          slug: uniqueSlug,
          email: demande.email,
          ville: demande.ville,
          plan: demande.plan,
          billingCycle: demande.cycle,
          monthlyPrice: monthlyPrice,
          adminPassword: hashedPassword,
          subscriptionEnd: new Date(Date.now() + durationMs),
          active: true,
        },
      });

      // Logger la création
      await (prisma as any).subscriptionLog.create({
        data: {
          restaurantId: resto.id,
          oldPlan: null,
          newPlan: demande.plan,
          type: "NEW",
          amount: demande.montant,
          monthlyPrice: monthlyPrice
        }
      });

      // Initialisation du menu uniquement pour les NOUVEAUX restaurants
      const initialPlats = [
        {
          restaurantId: resto.id,
          nom: "Dégustation " + demande.nomRestaurant,
          description: "Un aperçu de nos spécialités.",
          prixUsd: 10.0,
          categorie: "ENTREE",
          image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=800",
        },
        {
          restaurantId: resto.id,
          nom: "Plat du Chef",
          description: "Préparé avec amour.",
          prixUsd: 22.0,
          categorie: "PLAT",
          image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=800",
        },
      ];

      for (const p of initialPlats) {
        await (prisma as any).plat.create({ data: p });
      }
    }

    // Mettre à jour le statut de la demande
    await (prisma as any).demandeAbonnement.update({
      where: { id },
      data: { statut: "APPROUVEE" },
    });

    revalidatePath("/super-admin");
    return { success: true, restoId: resto.id, isUpdate: !!existingResto };
  } catch (error: any) {
    console.error("[Demande] Approbation error:", error);
    if (error.code === 'P1001') {
      return { success: false, error: "Base de données injoignable (P1001). Veuillez réessayer." };
    }
    return { success: false, error: error.message || "Erreur serveur." };
  }
}

/**
 * Refuser une demande
 */
export async function rejectDemande(id: string) {
  try {
    await ensureSuperAdmin();
    await (prisma as any).demandeAbonnement.update({
      where: { id },
      data: { statut: "REFUSEE" },
    });
    revalidatePath("/super-admin");
    return { success: true };
  } catch (error: any) {
    console.error("[Demande] Rejet error:", error);
    return { success: false, error: error.message || "Erreur serveur." };
  }
}
