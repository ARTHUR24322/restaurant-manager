import { create } from "zustand";
import { type CartItem } from "@/types";

interface CartStore {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, quantite: number) => void;
  clearCart: () => void;
  getTotalUsd: () => number;
}

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],
  addItem: (item) => set((state) => {
    const existingIndex = state.items.findIndex((i) => 
      i.plat.id === item.plat.id && 
      JSON.stringify(i.selectedOptions) === JSON.stringify(item.selectedOptions)
    );

    if (existingIndex > -1) {
      const newItems = [...state.items];
      newItems[existingIndex] = { 
        ...newItems[existingIndex], 
        quantite: newItems[existingIndex].quantite + item.quantite 
      };
      return { items: newItems };
    }
    
    return { items: [...state.items, item] };
  }),
  removeItem: (id) =>
    set((state) => ({ items: state.items.filter((i) => i.cartItemId !== id) })),
  updateQuantity: (id, quantite) =>
    set((state) => ({
      items: state.items.map((i) =>
        i.cartItemId === id ? { ...i, quantite } : i
      ),
    })),
  clearCart: () => set({ items: [] }),
  getTotalUsd: () => {
    const items = get().items;
    return items.reduce((total, item) => total + item.plat.prixUsd * item.quantite, 0);
  },
}));
