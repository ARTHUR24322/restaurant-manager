import { create } from "zustand";
import { persist } from "zustand/middleware";
import { type CartItem } from "@/types";

interface OfflineOrder {
  id: string; // Temp ID
  cartItems: CartItem[];
  tableNumber: string;
  customerName?: string;
  notes?: string;
  totalUsd: number;
  restaurantId?: string;
  createdAt: string;
}

interface CartStore {
  items: CartItem[];
  offlineOrders: OfflineOrder[];
  addItem: (item: CartItem) => void;
  removeItem: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, quantite: number) => void;
  clearCart: () => void;
  getTotalUsd: () => number;
  
  // Offline support
  addOfflineOrder: (order: Omit<OfflineOrder, "id" | "createdAt">) => string;
  removeOfflineOrder: (id: string) => void;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      offlineOrders: [],
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
      
      addOfflineOrder: (orderData) => {
        const id = `off_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const newOrder: OfflineOrder = {
          ...orderData,
          id,
          createdAt: new Date().toISOString()
        };
        set((state) => ({ 
          offlineOrders: [...state.offlineOrders, newOrder] 
        }));
        return id;
      },
      
      removeOfflineOrder: (id) => set((state) => ({
        offlineOrders: state.offlineOrders.filter(o => o.id !== id)
      })),
    }),
    {
      name: "smart-resto-cart",
    }
  )
);
