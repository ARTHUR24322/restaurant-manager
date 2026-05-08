"use client"

import { useState, useEffect } from "react";
import { type Plat, type CartItem } from "@/types";
import { useCartStore } from "@/store/cartStore";
import { 
  Plus, Info, Utensils, Coffee, Soup, Clock, CheckCircle2, Flame, Search, ChevronRight,
  Beef, Wine, Beer, GlassWater, IceCream, CupSoda, Cherry
} from "lucide-react";
import { cn, safeJsonParse } from "@/lib/utils";
import { PlateOptionsModal } from "@/components/client/PlateOptionsModal";
import { getRecentCommandes } from "@/lib/actions";
import { toast } from "sonner";

interface Props {
  initialPlats: Plat[];
  tableNumber: string;
  restaurantId: string;
}

export default function ClientMenuContent({ initialPlats, tableNumber, restaurantId }: Props) {
  const [activeCategory, setActiveCategory] = useState<string>("ALL");
  const [selectedPlat, setSelectedPlat] = useState<Plat | null>(null);
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const [activeOrder, setActiveOrder] = useState<any>(null);
  const [isExpired, setIsExpired] = useState(false);
  const [timeLeft, setTimeLeft] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  
  const { addItem, submittedOrderIds } = useCartStore();

  useEffect(() => {
    const fetchMyOrder = async () => {
      if (!restaurantId || !submittedOrderIds.length) {
        setActiveOrder(null);
        return;
      }
      
      const all = await getRecentCommandes(restaurantId);
      const myOrder = all.find((o: any) => 
        o.table === tableNumber && 
        o.statut !== "COMPLETED" && 
        submittedOrderIds.includes(o.id)
      );
      setActiveOrder(myOrder || null);
    };

    fetchMyOrder();

    // Connexion Temps Réel (SSE)
    const eventSource = new EventSource(`/api/events?restaurantId=${restaurantId}`);
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "new-order" || data.type === "status-updated") {
          if (!data.restaurantId || data.restaurantId === restaurantId) {
              fetchMyOrder();
          }
        }
      } catch (e) {
        console.error("SSE Client JSON Error:", e);
      }
    };

    const interval = setInterval(fetchMyOrder, 10000); 

    return () => {
      eventSource.close();
      clearInterval(interval);
    };
  }, [restaurantId, tableNumber, submittedOrderIds]);

  useEffect(() => {

    // Gestion de Session de 1 heure (Sécurité)
    const SESSION_DURATION_MS = 1 * 60 * 60 * 1000; // 1 heure
    const RESET_AFTER_MS = 6 * 60 * 60 * 1000; // Si le scan a lieu 6 heures plus tard, on considère que c'est une nouvelle visite
    const sessionKey = `smartresto_session_${restaurantId}_${tableNumber}`;
    
    let startTime = localStorage.getItem(sessionKey);
    
    if (startTime) {
       const elapsedSinceStart = Date.now() - parseInt(startTime);
       if (elapsedSinceStart > RESET_AFTER_MS) {
           startTime = Date.now().toString();
           localStorage.setItem(sessionKey, startTime);
       }
    } else {
       startTime = Date.now().toString();
       localStorage.setItem(sessionKey, startTime);
    }

    const checkSession = () => {
      const elapsed = Date.now() - parseInt(startTime!);
      const remaining = SESSION_DURATION_MS - elapsed;
      
      if (remaining <= 0) {
        setIsExpired(true);
        setTimeLeft("00:00");
      } else {
        const m = Math.floor(remaining / 60000);
        const s = ((remaining % 60000) / 1000).toFixed(0);
        setTimeLeft(`${m.toString().padStart(2, '0')}:${parseInt(s) < 10 ? '0' : ''}${s}`);
      }
    };

    checkSession();
    const sessionInterval = setInterval(checkSession, 1000);

    return () => {
      clearInterval(sessionInterval);
    };
  }, []);

  const categoryMap: Record<string, { label: string, icon: any }> = {
    "ALL": { label: "Tout le Menu", icon: Utensils },
    "ENTREE": { label: "Entrées", icon: Soup },
    "PLAT": { label: "Plats", icon: Beef },
    "DESSERT": { label: "Dessert", icon: IceCream },
    "SOFT": { label: "Soft Drinks", icon: CupSoda },
    "JUS": { label: "Jus", icon: Cherry },
    "VIN": { label: "Vins", icon: Wine },
    "WHISKY": { label: "Whisky", icon: Wine }, 
    "CHAMPAGNE": { label: "Champagnes", icon: Wine },
    "BIERE": { label: "Bières", icon: Beer },
    "VIANDE": { label: "Viandes", icon: Beef },
    "POISSON": { label: "Poisson", icon: Soup }, 
    "LEGUME": { label: "Légumes", icon: Soup },
    "GARNITURE": { label: "Garnitures", icon: Soup },
    "SODA": { label: "Sodas", icon: CupSoda },
    "EAU": { label: "Eaux", icon: GlassWater },
    "CAFE": { label: "Cafés", icon: Coffee },
    "COCKTAIL": { label: "Cocktails", icon: GlassWater }
  };

  // Extraire les catégories uniques présentes dans les plats
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

  const handleOpenOptions = (plat: Plat) => {
    setSelectedPlat(plat);
    setIsOptionsOpen(true);
  };

  const handleConfirmAdd = (selectedOptions: string[]) => {
    if (!selectedPlat) return;

    const newItem: CartItem = {
      cartItemId: Math.random().toString(36).substring(7),
      plat: selectedPlat,
      quantite: 1,
      selectedOptions: { detail: selectedOptions }, 
    };
    addItem(newItem);
    toast.success(`${selectedPlat.nom} ajouté au panier ! 🛒`, {
       position: "top-center",
       className: "bg-background text-foreground border-border",
    });
    setSelectedPlat(null);
  };

  return (
    <>
      {isExpired && (
        <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-200">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
            <Clock className="w-10 h-10 text-primary animate-pulse" />
          </div>
          <h2 className="text-3xl font-black mb-4">Temps Écoulé</h2>
          <p className="text-muted-foreground mb-8 text-lg max-w-sm">
            Par mesure de sécurité, votre session de commande a expiré (1 heure maximum).
          </p>
          <div className="bg-card w-full max-w-sm p-6 rounded-3xl border shadow-xl flex flex-col items-center">
            <Clock className="w-8 h-8 text-muted-foreground mb-4" />
            <p className="text-sm font-bold uppercase tracking-widest text-primary mb-2">Comment réactiver ?</p>
            <p className="text-xs text-muted-foreground">Fermez cet onglet et scannez à nouveau le QR Code présent sur votre table avec l'appareil photo de votre téléphone pour reprendre votre commande.</p>
          </div>
        </div>
      )}

      {/* Timer Flottant 
      <div className="fixed top-4 right-4 z-50 bg-background/80 backdrop-blur-md border px-3 py-1.5 rounded-full flex items-center gap-2 shadow-lg">
        <Clock className={cn("w-4 h-4", isExpired ? "text-red-500" : "text-primary")} />
        <span className="font-mono text-xs font-bold tracking-widest">{timeLeft}</span>
      </div>
      */}

      <PlateOptionsModal 
        plat={selectedPlat}
        isOpen={isOptionsOpen}
        onClose={() => setIsOptionsOpen(false)}
        onConfirm={handleConfirmAdd}
      />

      {/* Bandeau de Statut Temps Réel */}
      {activeOrder && (
        <div className="mb-8 animate-in slide-in-from-top-4 duration-200">
            <div className={cn(
             "p-4 rounded-3xl border flex items-center justify-between shadow-lg",
             activeOrder.statut === "SUBMITTED" && "bg-blue-500/10 border-blue-500/20 text-blue-600",
             activeOrder.statut === "PREPARING" && "bg-orange-500/10 border-orange-500/20 text-orange-600",
             activeOrder.statut === "READY" && "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 animate-pulse"
           )}>
              <div className="flex items-center gap-4">
                 <div className="w-12 h-12 rounded-2xl bg-white/50 backdrop-blur-md flex items-center justify-center">
                    {activeOrder.statut === "SUBMITTED" && <Clock className="w-6 h-6" />}
                    {activeOrder.statut === "PREPARING" && <Flame className="w-6 h-6 animate-bounce" />}
                    {activeOrder.statut === "READY" && <CheckCircle2 className="w-6 h-6" />}
                 </div>
                 <div>
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-70">État de votre commande</p>
                    <h4 className="text-sm font-bold">
                       {activeOrder.statut === "SUBMITTED" && "En attente de validation..."}
                       {activeOrder.statut === "PREPARING" && "Chef en action 👨‍🍳"}
                       {activeOrder.statut === "READY" && "C'est prêt ! On arrive à votre table... 🚀"}
                    </h4>
                 </div>
              </div>
              <div className="text-right hidden sm:block">
                 <p className="text-[10px] font-black uppercase opacity-50">Récupération</p>
                 <p className="text-xs font-bold font-mono">#{activeOrder?.id?.slice(-4) || "..."}</p>
              </div>
           </div>
        </div>
      )}

      {/* Barre de Recherche Flottante */}
      <div className="sticky top-6 z-40 mb-8 transition-transform">
        <div className="relative w-full shadow-2xl shadow-black/20 rounded-full group">
          <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full opacity-0 group-focus-within:opacity-100 transition-opacity" />
          <div className="relative bg-zinc-900/80 backdrop-blur-2xl border border-white/10 rounded-full flex items-center">
             <Search className="absolute left-5 w-5 h-5 text-zinc-400 group-focus-within:text-primary transition-colors" />
             <input 
               type="text" 
               placeholder="Rechercher un plat, une boisson..."
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
               className="w-full bg-transparent pl-14 pr-6 py-4.5 h-14 text-sm font-medium focus:outline-none text-white placeholder:text-zinc-500"
             />
          </div>
        </div>
      </div>

      {/* Sélecteur de catégories Horizontal (Pills) */}
      <div className="flex gap-3 mb-10 overflow-x-auto pb-6 pt-2 scrollbar-none no-scrollbar snap-x -mx-6 px-6">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={cn(
              "flex items-center gap-2.5 px-6 py-3.5 rounded-full whitespace-nowrap transition-all duration-300 snap-center shrink-0 border",
              activeCategory === cat.id 
                ? "bg-primary text-black border-primary font-black shadow-lg shadow-primary/20 scale-105" 
                : "bg-zinc-900/50 text-zinc-400 border-white/5 font-bold hover:bg-zinc-800 hover:text-white"
            )}
          >
            <cat.icon className={cn("w-4 h-4", activeCategory === cat.id && "animate-pulse")} />
            <span className="tracking-wide text-xs uppercase">{cat.label}</span>
          </button>
        ))}
      </div>

      {/* Grille de Plats Moderne */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {filteredPlats.map((plat) => {
          const isOutOfStock = plat.trackStock && (plat.stockQuantity || 0) <= 0;

          return (
            <div 
              key={plat.id} 
              onClick={() => !isOutOfStock && handleOpenOptions(plat)}
              className={cn(
                "group relative bg-zinc-900 border border-zinc-800/80 rounded-[2rem] overflow-hidden hover:shadow-[0_20px_40px_-15px_rgba(var(--primary),0.15)] hover:border-primary/30 transition-all duration-500 cursor-pointer flex flex-col",
                isOutOfStock ? "opacity-70 grayscale-[0.6] cursor-not-allowed" : "hover:-translate-y-1.5"
              )}
            >
              {/* Image Container Edge-to-Edge */}
              <div className="relative h-64 overflow-hidden">
                 <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-transparent to-transparent z-10 opacity-90" />
                 <img 
                   src={plat.image} 
                   alt={plat.nom}
                   className={cn(
                     "w-full h-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.33,1,0.68,1)]",
                     !isOutOfStock && "group-hover:scale-105"
                   )}
                 />
                 
                 {/* Badge Epuisé */}
                 {isOutOfStock && (
                    <div className="absolute inset-0 z-20 bg-black/40 backdrop-blur-[2px] flex items-center justify-center">
                        <span className="bg-red-500/90 text-white text-[10px] font-black uppercase tracking-[0.2em] px-5 py-2.5 rounded-full shadow-2xl border border-red-400/20">
                           Épuisé pour le moment
                        </span>
                    </div>
                 )}

                 {/* Tags (Top Left) - Optional */}
                 <div className="absolute top-5 left-5 z-20 flex gap-2">
                     {/* On pourrait mettre "Populaire" ou d'autres badges ici si on avait un champ */}
                     <span className="bg-black/50 backdrop-blur-md text-white text-[9px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest border border-white/10">
                        {plat.categorie}
                     </span>
                 </div>
              </div>
  
              {/* Infos & Content */}
              <div className="p-6 relative flex flex-col grow bg-gradient-to-b from-zinc-900 to-zinc-950">
                {/* Floating Add Button / Price (Sublime) */}
                <div className="absolute -top-8 right-6 z-30">
                    {!isOutOfStock ? (
                      <div className="bg-primary text-black h-16 min-w-[4.5rem] px-4 rounded-2xl flex flex-col items-center justify-center shadow-[0_10px_20px_-10px_rgba(var(--primary),0.5)] group-hover:shadow-[0_10px_30px_-5px_rgba(var(--primary),0.6)] group-hover:-translate-y-1 transition-all duration-300">
                          <span className="font-black text-lg">{plat.devise === "USD" ? "$" : ""}{plat.prixUsd.toFixed(2)}{plat.devise === "FC" ? " FC" : ""}</span>
                          <span className="text-[8px] font-black uppercase tracking-widest opacity-60 mt-0.5">Ajouter</span>
                      </div>
                    ) : (
                      <div className="bg-zinc-800 text-zinc-500 h-16 min-w-[4.5rem] px-4 rounded-2xl flex items-center justify-center border border-zinc-700">
                          <span className="font-black text-lg">{plat.devise === "USD" ? "$" : ""}{plat.prixUsd.toFixed(2)}{plat.devise === "FC" ? " FC" : ""}</span>
                      </div>
                    )}
                </div>

                {/* Text Content */}
                <div className="pr-20 mb-2">
                  <h3 className="text-xl font-black tracking-tight text-white group-hover:text-primary transition-colors line-clamp-1">{plat.nom}</h3>
                </div>
                
                <p className="text-sm text-zinc-400 line-clamp-2 leading-relaxed flex-grow">
                  {plat.description || "Laissez-vous tenter par cette spécialité préparée avec soin par notre chef."}
                </p>
                
                {/* Ligne Subtile d'Action */}
                {!isOutOfStock && (
                  <div className="mt-6 flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-zinc-500 group-hover:text-primary transition-colors duration-300">
                    <div className="w-10 h-[2px] bg-zinc-800 group-hover:bg-primary transition-colors rounded-full" />
                    <span>Commander</span>
                    <Plus className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0 transform" />
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {filteredPlats.length === 0 && (
           <div className="col-span-full py-20 text-center flex flex-col items-center">
             <Utensils className="w-16 h-16 text-muted-foreground/20 mb-4" />
             <h3 className="text-xl font-bold mb-1">Pas de plats ici pour le moment</h3>
             <p className="text-muted-foreground">Revenez plus tard pour voir nos spécialités.</p>
           </div>
        )}
      </div>
    </>
  );
}
