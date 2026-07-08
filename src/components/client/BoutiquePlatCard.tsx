"use client";
/* eslint-disable @next/next/no-img-element */

import { ShoppingCart, Plus } from "lucide-react";
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
        <div className="group bg-card border border-border rounded-[1.5rem] overflow-hidden shadow-lg hover:shadow-2xl hover:shadow-primary/5 transition-all duration-500 hover:-translate-y-1 flex flex-col h-full">
            {/* Image section — full width with gradient fade */}
            <div className="relative w-full aspect-[16/10] overflow-hidden">
                <img 
                    src={plat.image || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c"} 
                    alt={plat.nom} 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                />
                {/* Gradient overlay for smooth transition to card body */}
                <div 
                    className="absolute inset-0 pointer-events-none" 
                    style={{ background: "linear-gradient(to bottom, transparent 40%, hsl(var(--card)) 100%)" }} 
                />
                
                {/* Category chip */}
                <div className="absolute top-3 left-3">
                    <span className="inline-block bg-black/50 backdrop-blur-lg text-white text-[9px] font-black uppercase tracking-[0.2em] px-3 py-1.5 rounded-full border border-white/10">
                        {plat.categorie}
                    </span>
                </div>

                {/* Quick Add button — floating on image */}
                <button 
                    onClick={handleAddToCart}
                    className="absolute top-3 right-3 w-10 h-10 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-xl shadow-primary/30 opacity-0 group-hover:opacity-100 scale-75 group-hover:scale-100 transition-all duration-300 hover:scale-110 active:scale-95"
                >
                    <Plus className="w-5 h-5" />
                </button>
            </div>

            {/* Content section */}
            <div className="px-5 pb-5 pt-1 flex flex-col flex-1 -mt-4 relative z-10">
                <h3 className="font-bold text-foreground text-[15px] leading-tight line-clamp-2 group-hover:text-primary transition-colors duration-300">
                    {plat.nom}
                </h3>
                {plat.description && (
                    <p className="text-[11px] text-muted-foreground line-clamp-2 mt-1.5 leading-relaxed">
                        {plat.description}
                    </p>
                )}
                
                {/* Price + Add to cart */}
                <div className="flex justify-between items-center mt-auto pt-4">
                    <span className="font-black text-primary text-lg tracking-tight">{formattedPrice}</span>
                    <button 
                        onClick={handleAddToCart}
                        className="bg-primary/10 text-primary flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl transition-all duration-300 hover:bg-primary hover:text-primary-foreground hover:shadow-lg hover:shadow-primary/20 active:scale-95 font-black text-[10px] uppercase tracking-widest border border-primary/20 hover:border-primary"
                    >
                        <ShoppingCart className="w-3.5 h-3.5" />
                        Ajouter
                    </button>
                </div>
            </div>
        </div>
    );
}
