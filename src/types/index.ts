export type Categorie = "ENTREE" | "PLAT" | "BOISSON";

// SUBMITTED (Attente Caisse) -> PREPARING (En Cuisine) -> READY (Prêt à servir) -> COMPLETED (Payé/Clôturé)
export type CommandeStatut = "SUBMITTED" | "PREPARING" | "READY" | "COMPLETED";

export type PaiementStatut = "UNPAID" | "PAID_CASH" | "PAID_MOBILE";

export interface Option {
  id: string;
  nom: string;
  type: "RADIO" | "CHECKBOX";
  choix: string[]; // parsed from JSON
}

export interface Plat {
  id: string;
  nom: string;
  description?: string;
  prixUsd: number;
  image: string;
  categorie: Categorie;
  options: Option[];
  stockQuantity?: number;
  trackStock?: boolean;
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
  client?: string;
  statut: CommandeStatut;
  noteSpeciale?: string;
  totalUsd: number;
  tauxChange: number;
  paiementStatus: PaiementStatut;
  transactionId?: string;
  items: CartItem[];
  restaurantId: string;
  createdAt: Date;
  updatedAt: Date;
}
