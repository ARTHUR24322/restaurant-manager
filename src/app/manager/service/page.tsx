"use client"
/* eslint-disable @next/next/no-img-element */
/* eslint-disable react-hooks/exhaustive-deps, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Plus, 
  Minus, 
  Search, 
  ShoppingCart, 
  Package, 
  User,
  Trash2,
  Loader2,
  ArrowRight,
  Phone,
  ArrowLeft,
  UserCheck
} from "lucide-react";
import { getPlats, createCommande, getRecentCommandes } from "@/lib/actions";
import { cn, safeJsonParse } from "@/lib/utils";
import { toast } from "sonner";
import { type Plat, type Commande } from "@/types";
import { useRouter, useSearchParams } from "next/navigation";
import { useTheme } from "next-themes";
import { getRestaurantById } from "@/lib/admin-actions";

export default function ServicePage({ searchParams }: { searchParams: { resto_id?: string } }) {
  const router = useRouter();
  const [restaurantId, setRestaurantId] = useState<string>(searchParams.resto_id || "");
  const [restaurantName, setRestaurantName] = useState("SmartResto");
  const { setTheme, theme } = useTheme();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [plats, setPlats] = useState<Plat[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("Tous");
  const [cart, setCart] = useState<{ plat: Plat; quantite: number; selectedOptions: Record<string, any> }[]>([]);
  
  const [orderType, setOrderType] = useState<"SUR_PLACE" | "EMPORTER">("SUR_PLACE");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [tableNumber, setTableNumber] = useState("");

  const [orders, setOrders] = useState<Commande[]>([]);
  const [activeTab, setActiveTab] = useState<"MENU" | "ENCAISSEMENTS">("MENU");

  const categories = ["Tous", ...Array.from(new Set(plats.map(p => p.categorie)))];

  useEffect(() => {
    async function init() {
      let id = searchParams.resto_id;
      if (!id) {
        const { getManagerSession } = await import("@/lib/manager-actions");
        const session = await getManagerSession() as any;
        id = session?.id || "";
        if (id) setRestaurantId(id);
      }
      if (!id) return;

      const cached = sessionStorage.getItem(`resto_profile_${id}`);
      if (cached) {
        const r = safeJsonParse<any>(cached, null);
        if (r) {
            setRestaurantName(r.nom || "SmartResto");
            if (r.preferredTheme && r.preferredTheme !== theme) {
              setTheme(r.preferredTheme);
            }
        }
      } else {
        const r = await getRestaurantById(id);
        if (r) {
            setRestaurantName(r.nom || "SmartResto");
            if ((r as any).preferredTheme && (r as any).preferredTheme !== theme) {
              setTheme((r as any).preferredTheme);
            }
        }
      }

      const data = await getPlats(id);
      setPlats(data);

      const fetchedOrders = await getRecentCommandes(id) as unknown as Commande[];
      setOrders(fetchedOrders || []);
      setLoading(false);

      const interval = setInterval(async () => {
         const latestOrders = await getRecentCommandes(id) as unknown as Commande[];
         setOrders(latestOrders || []);
      }, 10000);

      return () => clearInterval(interval);
    }
    init();
  }, [searchParams.resto_id]);

  const addToCart = (plat: Plat) => {
    setCart(prev => {
      const existing = prev.find(item => item.plat.id === plat.id);
      if (existing) {
        return prev.map(item => 
          item.plat.id === plat.id 
            ? { ...item, quantite: item.quantite + 1 } 
            : item
        );
      }
      return [...prev, { plat, quantite: 1, selectedOptions: {} }];
    });
  };

  const removeFromCart = (platId: string) => {
    setCart(prev => {
      const existing = prev.find(item => item.plat.id === platId);
      if (existing && existing.quantite > 1) {
        return prev.map(item => 
          item.plat.id === platId 
            ? { ...item, quantite: item.quantite - 1 } 
            : item
        );
      }
      return prev.filter(item => item.plat.id !== platId);
    });
  };

  const clearCart = () => setCart([]);

  const total = cart.reduce((sum, item) => sum + (item.plat.prixUsd * item.quantite), 0);

  const handleSubmit = async () => {
    if (cart.length === 0) {
      toast.error("Le panier est vide");
      return;
    }

    if (orderType === "SUR_PLACE" && !tableNumber) {
      toast.error("Veuillez indiquer le numéro de table");
      return;
    }

    setSubmitting(true);
    try {
      const res = await createCommande({
        cartItems: cart,
        tableNumber: orderType === "EMPORTER" ? "EMPORTER" : `Table ${tableNumber}`,
        customerName: customerName || (orderType === "EMPORTER" ? "Client Emporter" : `Table ${tableNumber}`),
        totalUsd: total,
        restaurantId,
        forceStatus: "PREPARING" // Envoi direct en cuisine
      });

      if (res.success) {
        if (res.orderId && customerPhone.trim()) {
           const { assignPhoneToOrder } = await import("@/lib/actions");
           await assignPhoneToOrder(res.orderId, customerPhone.trim(), customerName);
        }
        toast.success("Commande envoyée en cuisine avec succès !");
        
        // Reset form
        setCart([]);
        setCustomerName("");
        setCustomerPhone("");
        setTableNumber("");
      } else {
        toast.error("Erreur lors de l'envoi de la commande");
      }
    } catch (error) {
      toast.error("Une erreur est survenue");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredPlats = plats.filter(p => {
    const matchesSearch = p.nom.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "Tous" || p.categorie === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-[1400px] h-[95vh] bg-zinc-900 border border-zinc-800 rounded-[3rem] shadow-2xl flex flex-col md:flex-row overflow-hidden animate-in fade-in duration-300">
        
        {/* Partie Gauche: Menu */}
        <div className="flex-[2] flex flex-col border-r border-zinc-800 h-full overflow-hidden">
          <div className="p-8 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <button 
                  onClick={() => router.push(`/manager/selection?resto_id=${restaurantId}`)}
                  className="p-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-2xl transition-all active:scale-95 group border border-zinc-700"
                  title="Retour au portail"
                >
                  <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                </button>
                <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                  <UserCheck className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-black tracking-tighter text-white uppercase italic">Service en Salle</h1>
                  <p className="text-blue-500 text-[10px] font-black uppercase tracking-[0.2em]">{restaurantName} • Prise de Commandes</p>
                </div>
              </div>
            </div>

            <div className="flex bg-zinc-950 p-2 rounded-2xl border border-zinc-800 shrink-0">
               <button onClick={() => setActiveTab('MENU')} className={cn("flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", activeTab === 'MENU' ? "bg-white text-black shadow-md" : "text-zinc-500 hover:text-white")}>
                  Menu & Commandes
               </button>
               <button onClick={() => setActiveTab('ENCAISSEMENTS')} className={cn("flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex justify-center items-center gap-2", activeTab === 'ENCAISSEMENTS' ? "bg-orange-600 text-white shadow-md shadow-orange-900/30" : "text-zinc-500 hover:text-orange-400")}>
                  Encaissements Demandés
                  {orders.filter(o => o.paiementStatus === 'PAYMENT_REQUESTED').length > 0 && (
                     <span className="bg-red-500 text-white px-2 py-0.5 rounded-full text-[9px] animate-pulse">
                        {orders.filter(o => o.paiementStatus === 'PAYMENT_REQUESTED').length}
                     </span>
                  )}
               </button>
            </div>

            {activeTab === 'MENU' && (
              <div className="flex flex-col md:flex-row gap-4 w-full">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input 
                    type="text"
                    placeholder="Rechercher un plat..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-zinc-950 flex-1 border border-zinc-800 rounded-2xl py-4 pl-12 pr-4 text-sm text-white focus:outline-none focus:border-blue-500 transition-all font-bold"
                  />
                </div>
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none flex-1">
                  {categories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={cn(
                        "px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap border transition-all shadow-md active:scale-95",
                        selectedCategory === cat 
                          ? "bg-blue-600 border-blue-500 text-white shadow-blue-500/20" 
                          : "bg-zinc-950 border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:bg-zinc-900"
                      )}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-8 pt-0">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Chargement...</p>
              </div>
            ) : activeTab === 'MENU' ? (
              filteredPlats.length === 0 ? (
                <div className="text-center py-20 text-zinc-600 italic font-bold">
                  Aucun plat trouvé dans cette catégorie.
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredPlats.map(plat => (
                    <button
                      key={plat.id}
                      onClick={() => addToCart(plat)}
                      className="group bg-zinc-950 border border-zinc-800 hover:border-blue-500/50 p-4 rounded-[2rem] text-left transition-all active:scale-95 space-y-4 hover:shadow-2xl hover:shadow-blue-900/10"
                    >
                      <div className="aspect-square rounded-[1.5rem] overflow-hidden bg-zinc-900 border border-zinc-800/50">
                        <img src={plat.image} alt={plat.nom} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-white line-clamp-2 italic">{plat.nom}</h4>
                        <p className="text-blue-500 font-black text-xl mt-1">${plat.prixUsd.toFixed(2)}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )
            ) : (
              <div className="space-y-4">
                {orders.filter(o => o.paiementStatus === 'PAYMENT_REQUESTED').length === 0 ? (
                  <div className="text-center py-20 text-zinc-600 italic font-bold">
                    Aucune demande d&apos;encaissement en cours.
                  </div>
                ) : (
                  orders.filter(o => o.paiementStatus === 'PAYMENT_REQUESTED').map(order => (
                    <div key={order.id} className="bg-zinc-900 border border-orange-500/30 p-6 rounded-[2rem] shadow-lg animate-in fade-in flex items-center justify-between">
                       <div>
                          <p className="text-[10px] font-black uppercase text-orange-500 tracking-widest mb-1">Encaissement pour la Table</p>
                          <h4 className="text-2xl font-black text-white italic">Table {order.table}</h4>
                          <p className="text-sm text-zinc-400 mt-2">Montant à récupérer : <span className="font-bold text-white">${order.totalUsd.toFixed(2)}</span></p>
                       </div>
                       <div className="bg-orange-500/10 text-orange-500 px-6 py-4 rounded-xl border border-orange-500/20 text-xs font-black uppercase tracking-widest text-center">
                          Demandez la note<br/>au client puis remettez<br/>les fonds à la caisse.
                       </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Partie Droite: Panier & Validation */}
        <div className="flex-1 max-w-[420px] bg-zinc-950/30 flex flex-col h-full border-l border-zinc-800">
          <div className="p-8 border-b border-zinc-800">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                <ShoppingCart className="w-6 h-6 text-white" />
              </div>
              <div>
                 <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter">Votre Panier</h3>
                 <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">{cart.length} article(s)</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex gap-2 bg-zinc-950 p-2 rounded-2xl border border-zinc-800">
                <button 
                  onClick={() => setOrderType("SUR_PLACE")}
                  className={cn(
                    "flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                    orderType === "SUR_PLACE" 
                      ? "bg-white text-black shadow-md" 
                      : "text-zinc-500 hover:text-white"
                  )}
                >
                  <Package className="w-4 h-4 mx-auto mb-1" />
                  Table (Sur Place)
                </button>
                <button 
                  onClick={() => setOrderType("EMPORTER")}
                  className={cn(
                    "flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                    orderType === "EMPORTER" 
                      ? "bg-white text-black shadow-md" 
                      : "text-zinc-500 hover:text-white"
                  )}
                >
                  <User className="w-4 h-4 mx-auto mb-1" />
                  À Emporter
                </button>
              </div>

              {orderType === "SUR_PLACE" && (
                <div className="relative animate-in slide-in-from-top-2">
                  <Package className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                  <input 
                    type="text"
                    placeholder="Numéro de table..."
                    value={tableNumber}
                    onChange={(e) => setTableNumber(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl py-4 pl-14 pr-4 text-sm text-white focus:outline-none focus:border-blue-500 transition-all font-black italic shadow-inner"
                  />
                </div>
              )}

              <div className="relative">
                <User className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                <input 
                  type="text"
                  placeholder="Nom du client (facultatif)..."
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl py-4 pl-14 pr-4 text-sm text-white focus:outline-none focus:border-blue-500 transition-all font-bold"
                />
              </div>

              <div className="relative gap-2 hidden group-focus-within:block">
                 <Phone className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                 <input 
                    type="tel"
                    placeholder="Téléphone (factultatif)..."
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl py-4 pl-14 pr-4 text-sm text-white focus:outline-none focus:border-blue-500 transition-all font-bold"
                 />
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-8 space-y-4">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-zinc-600 opacity-50 space-y-4">
                <ShoppingCart className="w-16 h-16" />
                <p className="text-[12px] font-black uppercase tracking-widest text-center">Sélectionnez des articles<br/>pour commencer</p>
              </div>
            ) : (
              cart.map((item, idx) => (
                <div key={idx} className="flex items-center gap-4 bg-zinc-950 p-4 rounded-[2rem] border border-zinc-800 group shadow-lg">
                   <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 border border-zinc-800/50">
                      <img src={item.plat.image} alt="" className="w-full h-full object-cover" />
                   </div>
                   <div className="flex-1">
                      <h5 className="text-xs font-black text-white italic truncate max-w-[120px]">{item.plat.nom}</h5>
                      <p className="text-zinc-500 font-bold text-xs">${item.plat.prixUsd.toFixed(2)}</p>
                   </div>
                   <div className="flex items-center gap-1 bg-zinc-900 p-1.5 rounded-2xl border border-zinc-800">
                      <button onClick={() => removeFromCart(item.plat.id)} className="w-8 h-8 rounded-xl flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors active:scale-95">
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-6 text-center text-xs font-black text-white">{item.quantite}</span>
                      <button onClick={() => addToCart(item.plat)} className="w-8 h-8 bg-blue-600/10 hover:bg-blue-600 text-blue-500 hover:text-white rounded-xl flex items-center justify-center transition-colors border border-blue-500/20 active:scale-95">
                        <Plus className="w-4 h-4" />
                      </button>
                   </div>
                </div>
              ))
            )}
          </div>

          <div className="p-8 bg-zinc-950 border-t border-zinc-800 rounded-br-[3rem] space-y-6 shadow-2xl relative z-10">
            <div className="flex flex-col gap-3">
               <div className="flex justify-between items-center text-zinc-500">
                  <span className="text-[10px] font-black uppercase tracking-widest">Articles ({cart.reduce((a,b)=>a+b.quantite, 0)})</span>
                  <span className="font-bold font-mono">${total.toFixed(2)}</span>
               </div>
               <div className="flex justify-between items-end">
                  <span className="text-[12px] font-black uppercase tracking-widest text-zinc-300">Total</span>
                  <span className="text-5xl font-black text-blue-500 italic tracking-tighter font-mono">${total.toFixed(2)}</span>
               </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <button
                onClick={handleSubmit}
                disabled={submitting || cart.length === 0}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-900 disabled:border-zinc-800 disabled:text-zinc-600 text-white font-black py-6 rounded-[2rem] transition-all active:scale-95 text-xs uppercase tracking-[0.2em] shadow-2xl shadow-blue-900/30 flex items-center justify-center gap-3 border border-blue-500/50"
              >
                {submitting ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <>
                    Envoyer en Cuisine
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
              {cart.length > 0 && (
                <button
                  onClick={clearCart}
                  className="w-full text-zinc-600 hover:text-red-500 bg-zinc-900/50 hover:bg-red-500/10 border border-zinc-800 hover:border-red-500/20 py-4 rounded-[1.5rem] text-[9px] font-black uppercase tracking-widest transition-all shadow-inner flex items-center justify-center gap-2 active:scale-95"
                >
                  <Trash2 className="w-4 h-4 opacity-50" />
                  Annuler & Vider le panier
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
