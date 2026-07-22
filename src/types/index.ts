/* eslint-disable @typescript-eslint/no-explicit-any */
export type Categorie = "ENTREE" | "PLAT" | "DESSERT" | "JUS" | "VIN" | "BIERE" | "SODA" | "EAU" | "CAFE" | "COCKTAIL" | "SOFT" | "WHISKY" | "CHAMPAGNE" | "VIANDE" | "LEGUME" | "GARNITURE" | "POISSON" | "FAST_FOOD";

// SUBMITTED (Attente Caisse) -> PREPARING (En Cuisine) -> READY (Prêt à servir) -> COMPLETED (Payé/Clôturé) | CANCELLED (Annulé)
export type CommandeStatut = "SUBMITTED" | "PREPARING" | "READY" | "COMPLETED" | "CANCELLED";

export type PaiementStatut = "UNPAID" | "PAID_CASH" | "PAID_MOBILE" | "PAYMENT_REQUESTED";

export interface Option {
  id: string;
  nom: string;
  type: string;
  choix: string;
  platId?: string;
}

export interface Plat {
  id: string;
  nom: string;
  description: string | null;
  prixUsd: number;
  devise: string;
  image: string;
  categorie: string;
  options: Option[];
  stockQuantity: number | null | undefined;
  trackStock: boolean | null | undefined;
  disponible: boolean;
  isLoyaltyReward: boolean;
  isAvailableOnline?: boolean;
  restaurantId: string;
}

export interface CartItem {
  cartItemId: string; 
  plat: Plat;
  quantite: number;
  selectedOptions: Record<string, string | string[]>;
}

export interface Commande {
  id: string;
  table: string;
  client: string | null;
  phone: string | null;
  statut: CommandeStatut;
  noteSpeciale: string | null;
  totalUsd: number;
  tauxChange: number;
  paiementStatus: PaiementStatut;
  transactionId: string | null;
  items: any[]; // Using any because of complex nested structure for now
  restaurantId: string;
  createdAt: Date;
  updatedAt: Date;
  restaurant?: { nom: string; telephone: string | null };
}

export interface Restaurant {
  id: string;
  nom: string;
  slug: string | null;
  email: string;
  ville: string;
  plan: string;
  logoUrl: string | null;
  active: boolean;
  billingCycle: string;
  monthlyPrice: number;
  subscriptionEnd: Date | string | null;
  createdAt: Date | string;
  telephone: string | null;
  isBoutiqueEnabled?: boolean;
  boutiqueSlug?: string | null;
  parentId?: string | null;
  firstLogin?: boolean;
}

export interface DemandeAbonnement {
  id: string;
  nomRestaurant: string;
  nomProprietaire: string;
  email: string;
  telephone: string;
  ville: string;
  plan: string;
  cycle: string;
  montant: number;
  statut: string;
  createdAt: Date | string;
}

export interface RecoveryRequest {
  id: string;
  nomRestaurant: string;
  email: string;
  telephone: string;
  statut: string;
  createdAt: Date | string;
}

export interface SupportMessage {
  id: string;
  nom: string;
  email: string;
  telephone: string;
  message: string;
  sujet: string;
  statut: string;
  createdAt: Date | string;
}

export interface SubscriptionLog {
  id: string;
  restaurantId: string;
  oldPlan: string | null;
  newPlan: string;
  type: string;
  amount: number;
  monthlyPrice: number;
  createdAt: Date | string;
  restaurant?: { nom: string };
}

export interface ArticleStock {
  id: string;
  nom: string;
  reference: string | null;
  codeBarres: string | null;
  description: string | null;
  categorie: string | null;
  prixAchat: number;
  prixVente: number | null;
  stockActuel: number;
  stockMin: number;
  stockMax: number | null;
  unite: string;
  restaurantId: string;
  emplacementId: string | null;
  fournisseurId: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface SessionPayload {
  role: "MANAGER" | "SUPER_ADMIN" | "PRE_AUTH_MANAGER" | "PRE_AUTH_ADMIN";
  restoId?: string;
  email: string;
  version?: number;
  [key: string]: any; 
}

export interface ClientReward {
  id: string;
  customerId: string;
  restaurantId: string;
  type: string;
  productId: string | null;
  promoCode: string | null;
  discountValue: number | null;
  isUsed: boolean;
  allowedDays: string[];
  expiresAt: Date | string | null;
  createdAt: Date | string;
}
