"use client";

import { useState } from "react";
import { type Plat } from "@/types";
import { Search, Utensils, Soup, Beef, IceCream, CupSoda, Wine, Beer, Coffee } from "lucide-react";
import { cn } from "@/lib/utils";
import { BoutiquePlatCard } from "./BoutiquePlatCard";

interface Props {
  initialPlats: Plat[];
  exchangeRate?: number;
}

export function BoutiqueMenuContent({ initialPlats, exchangeRate = 2800 }: Props) {
  const [activeCategory, setActiveCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const categoryMap: Record<string, { label: string, icon: React.ElementType }> = {
    "ALL": { label: "Menu complet", icon: Utensils },
    "ENTREE": { label: "Entrées", icon: Soup },
    "PLAT": { label: "Plats", icon: Beef },
    "DESSERT": { label: "Desserts", icon: IceCream },
    "SOFT": { label: "Boissons", icon: CupSoda },
    "VIN": { label: "Vins", icon: Wine },
    "BIERE": { label: "Bières", icon: Beer },
    "CAFE": { label: "Cafés", icon: Coffee },
  };

  const availableCategories = Array.from(new Set(initialPlats.map(p => p.categorie)));
  const categories = [
    { id: "ALL", ...categoryMap["ALL"] },
    ...availableCategories.map(cat => ({
      id: cat,
      ...(categoryMap[cat] || { label: cat, icon: Utensils })
    }))
  ];

  const filteredPlats = initialPlats.filter(p => {
    const matchCategory = activeCategory === "ALL" || p.categorie === activeCategory;
    const matchSearch = p.nom.toLowerCase().includes(searchQuery.toLowerCase()) || 
                       (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchCategory && matchSearch;
  });

  return (
    <div className="w-full">
      {/* Barre de Recherche & Catégories Sticky */}
      <div className="sticky top-4 z-40 space-y-4 mb-10">
        {/* Search */}
        <div className="relative group">
           <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full opacity-0 group-focus-within:opacity-100 transition-opacity" />
           <div className="relative bg-card/80 backdrop-blur-2xl border border-border rounded-2xl flex items-center h-14 px-5 shadow-2xl focus-within:border-primary/50 transition-all">
              <Search className="w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <input 
                type="text" 
                placeholder="Rechercher un plat..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent border-none focus:ring-0 text-sm font-medium text-foreground placeholder:text-muted-foreground/60 ml-3"
              />
           </div>
        </div>

        {/* Categories Horizontal Scroll */}
        <div className="flex gap-2 overflow-x-auto pb-4 -mx-4 px-4 sm:-mx-0 sm:px-0 no-scrollbar snap-x">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={cn(
                "flex items-center gap-2.5 px-5 py-3 rounded-xl whitespace-nowrap transition-all duration-300 snap-center shrink-0 border",
                activeCategory === cat.id 
                  ? "bg-primary text-primary-foreground border-primary font-black shadow-xl shadow-primary/20" 
                  : "bg-secondary text-muted-foreground border-border font-bold hover:bg-secondary/80"
              )}
            >
              <cat.icon className={cn("w-3.5 h-3.5", activeCategory === cat.id && "animate-pulse")} />
              <span className="text-[10px] uppercase tracking-wider">{cat.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Product List */}
      <div className="space-y-12">
        {activeCategory === "ALL" 
          ? categories.filter(c => c.id !== "ALL").map(cat => {
              const catPlats = filteredPlats.filter(p => p.categorie === cat.id);
              if (catPlats.length === 0) return null;
              
              return (
                <div key={cat.id} className="space-y-4">
                  <div className="flex items-center gap-2 px-1">
                    <cat.icon className="w-5 h-5 text-primary" />
                    <h2 className="text-xl font-black uppercase tracking-widest text-foreground">{cat.label}</h2>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {catPlats.map((plat) => (
                      <BoutiquePlatCard key={plat.id} plat={plat} exchangeRate={exchangeRate} />
                    ))}
                  </div>
                </div>
              );
            })
          : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPlats.map((plat) => (
                <BoutiquePlatCard key={plat.id} plat={plat} exchangeRate={exchangeRate} />
              ))}
            </div>
          )
        }

        {filteredPlats.length === 0 && (
           <div className="py-20 text-center bg-card rounded-[2rem] border border-border">
             <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
             <p className="text-xs font-black uppercase text-muted-foreground tracking-widest">Aucun plat trouvé</p>
           </div>
        )}
      </div>
    </div>
  );
}
