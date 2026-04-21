"use client"

import { useState, useEffect } from "react";
import { type Plat, type CartItem } from "@/types";
import { useCartStore } from "@/store/cartStore";
import { 
  Plus, Info, Utensils, Coffee, Soup, Clock, CheckCircle2, Flame, Search, ChevronRight,
  Beef, Wine, Beer, GlassWater, IceCream, CupSoda, Cherry
} from "lucide-react";
import { cn } from "@/lib/utils";
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
  
  const { addItem } = useCartStore();

  useEffect(() => {
    const fetchMyOrder = async () => {
      const all = await getRecentCommandes(restaurantId);
      const myOrder = all.find((o: any) => o.table === tableNumber && o.statut !== "COMPLETED");
      setActiveOrder(myOrder || null);
    };

    fetchMyOrder();

    // Connexion Temps Réel (SSE)
    const eventSource = new EventSource(`/api/events?restaurantId=${restaurantId}`);
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "new-order" || data.type === "status-updated") {
        // Filtrage SaaS : Le client ne voit que le statut de ses commandes sur ce restaurant
        if (!data.restaurantId || data.restaurantId === restaurantId) {
            fetchMyOrder();
        }
      }
    };

    const interval = setInterval(fetchMyOrder, 10000); // Polling de secours

    // Gestion de Session de 1 heure (Sécurité)
    const SESSION_DURATION_MS = 1 * 60 * 60 * 1000;
    const sessionKey = `smartresto_session_${restaurantId}_${tableNumber}`;
    let startTime = sessionStorage.getItem(sessionKey);
    
    if (!startTime) {
      startTime = Date.now().toString();
      sessionStorage.setItem(sessionKey, startTime);
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
      eventSource.close();
      clearInterval(interval);
      clearInterval(sessionInterval);
    };
  }, []);

  const categoryMap: Record<string, { label: string, icon: any }> = {
    "ALL": { label: "Tout le Menu", icon: Utensils },
    "ENTREE": { label: "Entrées", icon: Soup },
    "PLAT": { label: "Plats", icon: Beef },
    "DESSERT": { label: "Dessert", icon: IceCream },
    "JUS": { label: "Jus", icon: Cherry },
    "VIN": { label: "Vins", icon: Wine },
    "BIERE": { label: "Bières", icon: Beer },
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
                 <p className="text-xs font-bold font-mono">#{activeOrder.id.slice(-4)}</p>
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
                "group relative bg-zinc-900/40 backdrop-blur-sm border border-white/5 rounded-[2.5rem] overflow-hidden hover:shadow-2xl hover:shadow-primary/5 transition-all duration-300 cursor-pointer",
                isOutOfStock ? "opacity-70 grayscale-[0.3] cursor-not-allowed" : "hover:-translate-y-2 hover:bg-zinc-900/80"
              )}
            >
              {/* Image Container avec effet de flottement */}
              <div className="relative h-56 p-2 overflow-hidden">
                 <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent z-10" />
                 <img 
                   src={plat.image} 
                   alt={plat.nom}
                   className={cn(
                     "w-full h-full object-cover rounded-[2rem] transition-transform duration-700 ease-out",
                     !isOutOfStock && "group-hover:scale-110"
                   )}
                 />
                 
                 {/* Badge Epuisé */}
                 {isOutOfStock && (
                    <div className="absolute inset-0 z-20 bg-black/50 backdrop-blur-sm flex items-center justify-center rounded-[2rem] m-2">
                        <span className="bg-red-500 text-white text-[10px] font-black uppercase tracking-[0.2em] px-4 py-2 rounded-full shadow-xl">
                           Bientôt de retour
                        </span>
                    </div>
                 )}

                 {/* Bulle de Prix Glassmorphism */}
                 <div className="absolute bottom-6 right-6 z-20 bg-black/60 backdrop-blur-xl px-4 py-2 rounded-full border border-white/10 shadow-lg group-hover:bg-primary group-hover:text-black transition-colors duration-300">
                    <span className="font-black text-lg">${plat.prixUsd.toFixed(2)}</span>
                 </div>
              </div>
  
              {/* Infos */}
              <div className="px-6 py-5 pb-6">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-xl font-black tracking-tight text-white/90 group-hover:text-primary transition-colors">{plat.nom}</h3>
                </div>
                <p className="text-sm text-zinc-500 mb-6 line-clamp-2 leading-relaxed">
                  {plat.description || "Une spécialité de la maison préparée avec soin."}
                </p>
  
                {/* Bouton d'action subtil */}
                {!isOutOfStock && (
                  <div className="flex items-center justify-between mt-4 text-xs font-black uppercase tracking-widest text-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform translate-y-4 group-hover:translate-y-0">
                      <span>Commander</span>
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                          <Plus className="w-4 h-4" />
                      </div>
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
