"use client"
/* eslint-disable @next/next/no-img-element */

import { useState, useEffect } from "react";
import { type Plat, type CartItem } from "@/types";
import { useCartStore } from "@/store/cartStore";
import { 
  Plus, Utensils, Coffee, Soup, Clock, CheckCircle2, Flame, Search,
  Beef, Wine, Beer, CupSoda, IceCream, Heart
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PlateOptionsModal } from "@/components/client/PlateOptionsModal";
import { getRecentCommandes } from "@/lib/actions";
import { toast } from "sonner";
import { useCurrencyStore } from "@/components/client/CurrencyBadge";
import { LoyaltyQuickTrack } from "@/components/client/LoyaltyQuickTrack";

interface Props {
  initialPlats: Plat[];
  tableNumber: string;
  restaurantId: string;
}

export default function ClientMenuContent({ initialPlats, tableNumber, restaurantId }: Props) {
  const [activeCategory, setActiveCategory] = useState<string>("ALL");
  const [selectedPlat, setSelectedPlat] = useState<Plat | null>(null);
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const [activeOrder, setActiveOrder] = useState<{ id: string; statut: string; table: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  
  const { addItem, submittedOrderIds } = useCartStore();
  const { currency } = useCurrencyStore();

  useEffect(() => {
    const fetchMyOrder = async () => {
      if (!restaurantId || !submittedOrderIds.length) {
        setActiveOrder(null);
        return;
      }
      
      const all = await getRecentCommandes(restaurantId);
      const myOrder = all.find((o: { id: string; statut: string; table: string }) => 
        o.table === tableNumber && 
        o.statut !== "COMPLETED" && 
        submittedOrderIds.includes(o.id)
      );
      setActiveOrder(myOrder || null);
    };

    fetchMyOrder();

    const eventSource = new EventSource(`/api/events?restaurantId=${restaurantId}`);
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "new-order" || data.type === "status-updated") {
          if (!data.restaurantId || data.restaurantId === restaurantId) {
              fetchMyOrder();
          }
        }
      } catch {
        console.error("SSE Client JSON Error");
      }
    };

    const interval = setInterval(fetchMyOrder, 10000); 

    return () => {
      eventSource.close();
      clearInterval(interval);
    };
  }, [restaurantId, tableNumber, submittedOrderIds]);

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

  const addItemToCart = (plat: Plat, selectedOptions: string[] = []) => {
    const newItem: CartItem = {
      cartItemId: Math.random().toString(36).substring(7),
      plat: plat,
      quantite: 1,
      selectedOptions: { detail: selectedOptions }, 
    };
    addItem(newItem);
    toast.success(`${plat.nom} ajouté ! 🛒`);
  };

  const handleConfirmAdd = (selectedOptions: string[]) => {
    if (!selectedPlat) return;
    addItemToCart(selectedPlat, selectedOptions);
    setSelectedPlat(null);
    setIsOptionsOpen(false);
  };

  const formatPrice = (priceUsd: number) => {
    if (currency === 'FC') {
       const rate = 2800;
       return `${(priceUsd * rate).toLocaleString()} FC`;
    }
    return `$${priceUsd.toFixed(2)}`;
  }

  return (
    <>
      <PlateOptionsModal 
        plat={selectedPlat}
        isOpen={isOptionsOpen}
        onClose={() => setIsOptionsOpen(false)}
        onConfirm={handleConfirmAdd}
      />

      {activeOrder && (
        <div className="mb-10 animate-in slide-in-from-top-4 duration-500">
          <div className="bg-zinc-900/50 backdrop-blur-xl border border-white/5 rounded-[2rem] p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-xl">
                    <Clock className="w-5 h-5 text-primary" />
                </div>
                <div>
                   <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 leading-none">Commande en cours</p>
                   <p className="text-xs font-bold text-white mt-1">#{activeOrder.id.slice(-4).toUpperCase()}</p>
                </div>
              </div>
              <div className="px-3 py-1 bg-white/5 rounded-full border border-white/5">
                 <span className="text-[9px] font-black text-primary uppercase tracking-widest animate-pulse">
                    {activeOrder.statut === 'SUBMITTED' ? 'Validée' : activeOrder.statut === 'PREPARING' ? 'En Cuisine' : 'Prête'}
                 </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
               {[
                 { id: 'SUBMITTED', icon: CheckCircle2, label: 'Reçue' },
                 { id: 'PREPARING', icon: Flame, label: 'Préparation' },
                 { id: 'READY', icon: CheckCircle2, label: 'Prête' }
               ].map((step, idx, arr) => {
                 const isActive = activeOrder.statut === step.id || 
                                 (activeOrder.statut === 'PREPARING' && step.id === 'SUBMITTED') ||
                                 (activeOrder.statut === 'READY');

                 return (
                   <div key={step.id} className="flex-1 flex items-center gap-2">
                     <div className={cn(
                       "flex-1 h-1 rounded-full transition-all duration-1000",
                       isActive ? "bg-primary" : "bg-zinc-800"
                     )} />
                     {idx === arr.length - 1 && (
                        <div className={cn(
                          "w-2 h-2 rounded-full",
                          isActive ? "bg-primary shadow-[0_0_10px_rgba(var(--primary),0.5)]" : "bg-zinc-800"
                        )} />
                     )}
                   </div>
                 )
               })}
            </div>
            <div className="flex justify-between mt-3 px-1">
               <span className="text-[8px] font-black uppercase text-zinc-600">Reçue</span>
               <span className="text-[8px] font-black uppercase text-zinc-600">En Cuisine</span>
               <span className="text-[8px] font-black uppercase text-zinc-600">À Table</span>
            </div>
          </div>
        </div>
      )}

      <div className="mb-8">
         <LoyaltyQuickTrack restaurantId={restaurantId} />
      </div>

      {/* Barre de Recherche & Catégories Sticky */}
      <div className="sticky top-4 z-40 space-y-4 mb-10">
        {/* Search */}
        <div className="relative group">
           <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full opacity-0 group-focus-within:opacity-100 transition-opacity" />
           <div className="relative bg-zinc-950/80 backdrop-blur-2xl border border-white/5 rounded-2xl flex items-center h-14 px-5 shadow-2xl focus-within:border-primary/30 transition-all">
              <Search className="w-5 h-5 text-zinc-500 group-focus-within:text-primary transition-colors" />
              <input 
                type="text" 
                placeholder="Rechercher un plat..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent border-none focus:ring-0 text-sm font-medium text-white placeholder:text-zinc-600 ml-3"
              />
           </div>
        </div>

        {/* Categories Horizontal Scroll */}
        <div className="flex gap-2 overflow-x-auto pb-4 -mx-6 px-6 no-scrollbar snap-x">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={cn(
                "flex items-center gap-2.5 px-5 py-3 rounded-xl whitespace-nowrap transition-all duration-300 snap-center shrink-0 border",
                activeCategory === cat.id 
                  ? "bg-primary text-black border-primary font-black shadow-xl shadow-primary/10" 
                  : "bg-zinc-900/50 text-zinc-400 border-white/5 font-bold hover:bg-zinc-800"
              )}
            >
              <cat.icon className={cn("w-3.5 h-3.5", activeCategory === cat.id && "animate-pulse")} />
              <span className="text-[10px] uppercase tracking-wider">{cat.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Product List */}
      <div className="grid grid-cols-2 gap-4">
        {filteredPlats.map((plat) => {
          const isOutOfStock = !plat.disponible || (plat.trackStock && (plat.stockQuantity || 0) <= 0);

          return (
            <div 
              key={plat.id} 
              onClick={() => {
                if (isOutOfStock) return;
                const hasOptions = plat.options && plat.options.length > 0;
                if (hasOptions) {
                  setSelectedPlat(plat);
                  setIsOptionsOpen(true);
                } else {
                  addItemToCart(plat);
                }
              }}
              className={cn(
                "group relative bg-zinc-900/40 border border-white/5 rounded-[2rem] overflow-hidden hover:border-primary/20 transition-all duration-500 cursor-pointer flex flex-col",
                isOutOfStock && "opacity-50 grayscale"
              )}
            >
              {/* Image Full Width Top */}
              <div className="aspect-square w-full shrink-0 overflow-hidden relative">
                 <img 
                   src={plat.image} 
                   alt={plat.nom}
                   className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                 />
                 
                 {/* Heart Icon Overlay */}
                 <div className="absolute top-3 right-3 p-2 bg-black/20 backdrop-blur-md rounded-full border border-white/10 text-white/70 hover:text-white transition-colors">
                    <Heart className="w-3.5 h-3.5" />
                 </div>

                 {isOutOfStock && (
                   <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                     <span className="text-[8px] font-black uppercase text-white tracking-widest text-center px-2">Épuisé</span>
                   </div>
                 )}
              </div>

              {/* Content */}
              <div className="p-4 flex flex-col flex-1 gap-1">
                  <h3 className="text-[13px] font-black text-white group-hover:text-primary transition-colors leading-tight line-clamp-1">
                    {plat.nom}
                  </h3>
                  
                  <p className="text-[10px] text-zinc-500 leading-relaxed line-clamp-2 mt-0.5">
                    {plat.description || "Une création culinaire unique par notre chef."}
                  </p>
                  
                  <div className="flex items-center justify-between mt-auto pt-3">
                    <span className="text-[13px] font-black text-primary">
                      {formatPrice(plat.prixUsd)}
                    </span>
                    <div className="p-2 bg-primary/90 group-hover:bg-primary rounded-full text-black transition-colors shadow-lg shadow-primary/10">
                      <Plus className="w-4 h-4" />
                    </div>
                  </div>
              </div>
            </div>
          );
        })}

        {filteredPlats.length === 0 && (
           <div className="py-20 text-center">
             <Utensils className="w-12 h-12 text-zinc-800 mx-auto mb-4" />
             <p className="text-xs font-black uppercase text-zinc-700 tracking-widest">Aucun résultat trouvé</p>
           </div>
        )}
      </div>
    </>
  );
}
