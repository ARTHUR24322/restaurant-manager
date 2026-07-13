"use client";

import { useState, useRef } from "react";
import { type Plat } from "@/types";
import { Search, Utensils, Soup, Beef, IceCream, CupSoda, Wine, Beer, Coffee, X, Pizza } from "lucide-react";
import { cn } from "@/lib/utils";
import { BoutiquePlatCard } from "./BoutiquePlatCard";

interface Props {
  initialPlats: Plat[];
  exchangeRate?: number;
}

export function BoutiqueMenuContent({ initialPlats, exchangeRate = 2800 }: Props) {
  const [activeCategory, setActiveCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const categoryMap: Record<string, { label: string, icon: React.ElementType }> = {
    "ALL": { label: "Tout", icon: Utensils },
    "FAST_FOOD": { label: "Fast Food", icon: Pizza },
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
      {/* ─── Sticky Search + Categories ──────────────────────────── */}
      <div className="sticky top-0 z-40 pt-4 pb-2 -mx-4 px-4 sm:-mx-0 sm:px-0" style={{ background: "linear-gradient(to bottom, hsl(var(--background)) 85%, transparent 100%)" }}>
        {/* Search Bar */}
        <div className="relative group mb-4">
          <div className={cn(
            "absolute inset-0 rounded-2xl blur-2xl transition-opacity duration-500",
            isSearchFocused ? "opacity-100 bg-primary/15" : "opacity-0 bg-primary/10"
          )} />
          <div className={cn(
            "relative bg-card/80 backdrop-blur-2xl border rounded-2xl flex items-center h-14 px-5 shadow-lg transition-all duration-300",
            isSearchFocused ? "border-primary/40 shadow-xl shadow-primary/5" : "border-border"
          )}>
            <Search className={cn(
              "w-5 h-5 transition-colors duration-300 flex-shrink-0",
              isSearchFocused ? "text-primary" : "text-muted-foreground"
            )} />
            <input 
              ref={searchRef}
              type="text" 
              placeholder="Rechercher un plat, une boisson..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
              className="flex-1 bg-transparent border-none focus:ring-0 focus:outline-none text-sm font-medium text-foreground placeholder:text-muted-foreground/50 ml-3"
            />
            {searchQuery && (
              <button 
                onClick={() => { setSearchQuery(""); searchRef.current?.focus(); }}
                className="p-1.5 rounded-full bg-secondary hover:bg-secondary/80 transition-colors flex-shrink-0"
              >
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>

        {/* Category Pills — Horizontal Scroll */}
        <div className="flex gap-2 overflow-x-auto pb-3 no-scrollbar snap-x">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-full whitespace-nowrap transition-all duration-300 snap-center shrink-0 border text-xs font-bold",
                  isActive 
                    ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20" 
                    : "bg-card text-muted-foreground border-border hover:bg-secondary hover:text-foreground"
                )}
              >
                <Icon className={cn("w-3.5 h-3.5", isActive && "animate-pulse")} />
                <span className="uppercase tracking-wider">{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── Product List ─────────────────────────────────────── */}
      <div className="space-y-10 mt-6">
        {activeCategory === "ALL" 
          ? categories.filter(c => c.id !== "ALL").map(cat => {
              const catPlats = filteredPlats.filter(p => p.categorie === cat.id);
              if (catPlats.length === 0) return null;
              const Icon = cat.icon;
              
              return (
                <div key={cat.id} className="space-y-4">
                  <div className="flex items-center gap-3 px-1">
                    <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Icon className="w-4 h-4 text-primary" />
                    </div>
                    <h2 className="text-lg font-black uppercase tracking-widest text-foreground">{cat.label}</h2>
                    <div className="flex-1 h-px bg-border ml-2" />
                    <span className="text-xs text-muted-foreground font-bold">{catPlats.length}</span>
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
             <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-40" />
             <p className="text-sm font-black uppercase text-muted-foreground tracking-widest">Aucun plat trouvé</p>
             <p className="text-xs text-muted-foreground/60 mt-2">Essayez avec un autre terme de recherche</p>
             {searchQuery && (
               <button 
                 onClick={() => setSearchQuery("")}
                 className="mt-4 px-6 py-2 bg-primary/10 text-primary rounded-full text-xs font-bold hover:bg-primary/20 transition-colors"
               >
                 Effacer la recherche
               </button>
             )}
           </div>
        )}
      </div>
    </div>
  );
}
