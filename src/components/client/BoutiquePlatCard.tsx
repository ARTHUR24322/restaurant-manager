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
        <div className="relative bg-card border border-border rounded-[2rem] overflow-hidden flex flex-col h-full shadow-lg hover:shadow-xl transition-all duration-300 group hover:border-primary/30">
            {/* Section Image avec fondu en bas */}
            <div className="aspect-[4/3] w-full relative shrink-0">
                <img 
                    src={plat.image || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c"} 
                    alt={plat.nom} 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                />
                
                {/* Dégradé pour effet fondu vers la couleur de la carte */}
                <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent pointer-events-none" />
                <div className="absolute inset-x-0 bottom-0 h-[40%] bg-gradient-to-t from-card to-transparent pointer-events-none" />
                
                {/* Indication épuisé */}
                {(!plat.disponible || (plat.trackStock && (plat.stockQuantity || 0) <= 0)) && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <span className="text-[10px] font-black uppercase text-white tracking-widest bg-black/50 px-4 py-2 rounded-full backdrop-blur-md">Épuisé</span>
                    </div>
                )}
            </div>

            {/* Contenu */}
            <div className="flex flex-col flex-1 p-5 -mt-6 relative z-10 gap-1.5">
                <h3 className="font-black text-foreground text-[15px] leading-tight line-clamp-2 group-hover:text-primary transition-colors">
                    {plat.nom}
                </h3>
                <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                    {plat.description || "Une création savoureuse par notre chef."}
                </p>
                
                <div className="flex justify-between items-center pt-3 mt-auto">
                    <span className="font-black text-primary text-xl tracking-tight">{formattedPrice}</span>
                    <button 
                        onClick={(e) => {
                            e.stopPropagation(); // Avoid triggering card click if added later
                            if (plat.disponible) handleAddToCart();
                        }}
                        disabled={Boolean(!plat.disponible || (plat.trackStock && (plat.stockQuantity || 0) <= 0))}
                        className="bg-primary text-primary-foreground flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl transition-all hover:scale-105 active:scale-95 shadow-lg shadow-primary/20 font-black text-[10px] uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <ShoppingCart className="w-4 h-4" />
                        <span className="hidden sm:inline">Ajouter</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
