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
        <div className="bg-card border border-border rounded-xl p-4 flex gap-4 h-full shadow-sm hover:shadow-md transition-shadow">
            <img src={plat.image || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c"} alt={plat.nom} className="w-24 h-24 rounded-lg object-cover bg-secondary flex-shrink-0" />
            <div className="flex flex-col justify-between flex-1 min-w-0">
                <div>
                    <h3 className="font-bold text-foreground text-sm truncate">{plat.nom}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{plat.description}</p>
                </div>
                <div className="flex justify-between items-end mt-3">
                    <span className="font-black text-primary text-sm">{formattedPrice}</span>
                    <button 
                        onClick={handleAddToCart}
                        className="bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground p-2 rounded-lg transition-colors border border-primary/20 hover:border-primary"
                    >
                        <ShoppingCart className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}
