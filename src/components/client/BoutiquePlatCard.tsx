"use client";
/* eslint-disable @next/next/no-img-element */

import { ShoppingCart } from "lucide-react";
import { type Plat } from "@/types";
import { useCartStore } from "@/store/cartStore";
import { toast } from "sonner";
import { useCurrencyStore } from "./CurrencyBadge";

export function BoutiquePlatCard({ plat, exchangeRate = 2800 }: { plat: Plat, exchangeRate?: number }) {
    const { addItem } = useCartStore();
    const { currency } = useCurrencyStore();

    const price = plat.prixUsd;
    let formattedPrice = `$${price.toFixed(2)}`;
    
    if (currency === 'FC') {
        if (plat.devise === 'FC') formattedPrice = `${price.toLocaleString()} FC`;
        else formattedPrice = `${(price * exchangeRate).toLocaleString()} FC`;
    } else {
        if (plat.devise === 'FC') formattedPrice = `$${(price / exchangeRate).toFixed(2)}`;
    }

    const handleAddToCart = () => {
        addItem({
            cartItemId: `${plat.id}-${Date.now()}`,
            plat: plat,
            quantite: 1,
            selectedOptions: {}
        });
        toast.success(`${plat.nom} ajouté au panier !`);
    };

    return (
        <div className="bg-card border border-border rounded-[2rem] p-4 flex flex-col h-full shadow-lg hover:shadow-xl transition-all duration-300 gap-4 group">
            <div className="flex gap-4">
                <img src={plat.image || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c"} alt={plat.nom} className="w-24 h-24 rounded-2xl object-cover bg-secondary flex-shrink-0 shadow-sm" />
                <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-foreground text-sm leading-tight line-clamp-2 group-hover:text-primary transition-colors">{plat.nom}</h3>
                    <p className="text-[11px] text-muted-foreground line-clamp-3 mt-1.5 leading-relaxed">{plat.description}</p>
                </div>
            </div>
            
            <div className="flex justify-between items-center pt-3 border-t border-border mt-auto">
                <span className="font-black text-primary text-lg">{formattedPrice}</span>
                <button 
                    onClick={handleAddToCart}
                    className="bg-primary text-primary-foreground flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl transition-all hover:scale-105 active:scale-95 shadow-lg shadow-primary/20 font-black text-[10px] uppercase tracking-widest"
                >
                    <ShoppingCart className="w-4 h-4" />
                    Ajouter
                </button>
            </div>
        </div>
    );
}
