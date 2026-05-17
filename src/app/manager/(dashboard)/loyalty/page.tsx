"use client"

import React, { useState, useEffect } from 'react';
import {
  Gift, Phone, Search, Users, Crown,
  TrendingUp, Loader2, ChevronRight, X, 
  Star, Award, Clock, Ticket, Calendar,
  Plus, Trash2, Settings, PlusCircle, CheckCircle2,
  AlertCircle, Utensils, Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { 
  getLoyaltyCustomers, 
  getLoyaltyCustomerDetails,
  getRandomRewardProducts,
  redeemLoyaltyGift 
} from "@/lib/actions";
import { 
  addToRewardCatalog, 
  deleteFromRewardCatalog, 
  getClientLoyalty,
  redeemRewardAsManager
} from "@/lib/actions-loyalty";
import { getManagerSession } from "@/lib/manager-actions";
import { getPlats } from "@/lib/actions";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { SubmitButton } from "@/components/manager/SubmitButton";

export default function LoyaltyAdvancedPage({ searchParams }: { searchParams: { resto_id?: string } }) {
  const router = useRouter();
  const [restaurantId, setRestaurantId] = useState<string>(searchParams.resto_id || "");
  const [activeTab, setActiveTab] = useState<'customers' | 'catalog' | 'settings'>('customers');
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState<any[]>([]);
  const [catalog, setCatalog] = useState<any[]>([]);
  const [plats, setPlats] = useState<any[]>([]);
  const [config, setConfig] = useState<any>(null);
  const [plan, setPlan] = useState<string>('STANDARD');
  
  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  
  // Modals
  const [showAddReward, setShowAddReward] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [customerDetails, setCustomerDetails] = useState<any>(null);
  
  // Form State
  const [rewardType, setRewardType] = useState<'PRODUCT' | 'PROMO_CODE'>('PRODUCT');
  const [reqPoints, setReqPoints] = useState("100");
  const [selectedPlatId, setSelectedPlatId] = useState("");
  const [discountValue, setDiscountValue] = useState("");
  const [allowedDays, setAllowedDays] = useState<string[]>(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]);
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [redeemedReward, setRedeemedReward] = useState<any>(null);
  
  // Random Rewards State
  const [randomProducts, setRandomProducts] = useState<any[]>([]);
  const [isFetchingRandom, setIsFetchingRandom] = useState(false);
  const [showRandomChoice, setShowRandomChoice] = useState(false);

  const daysOfWeek = [
    { id: "Monday", label: "Lun" },
    { id: "Tuesday", label: "Mar" },
    { id: "Wednesday", label: "Mer" },
    { id: "Thursday", label: "Jeu" },
    { id: "Friday", label: "Ven" },
    { id: "Saturday", label: "Sam" },
    { id: "Sunday", label: "Dim" }
  ];

  useEffect(() => {
    async function init() {
      let id = searchParams.resto_id;
      if (!id) {
        const session = await getManagerSession();
        id = session?.id || "";
      }
      if (id) {
        setRestaurantId(id);
        await refreshData(id);
        const p = await getPlats(id);
        setPlats(p);
      }
    }
    init();
  }, [searchParams.resto_id]);

  const refreshData = async (id: string) => {
    setLoading(true);
    const result = await getLoyaltyCustomers(id);
    if (result.success) {
      setCustomers(result.customers);
      setConfig(result.config);
      setPlan(result.plan);
    }
    // Charger le catalogue via notre nouvelle action
    const loyaltyInfo = await getClientLoyalty(id, "dummy"); // On détourne juste pour avoir le catalogue
    if (loyaltyInfo.success) {
      setCatalog(loyaltyInfo.catalog);
    }
    setLoading(false);
  };

  const handleAddReward = async (e: React.FormEvent) => {
    e.preventDefault();
    if (plan === 'STANDARD') {
      toast.error("Veuillez passer en PRO pour gérer le catalogue.");
      return;
    }
    const res = await addToRewardCatalog(restaurantId, {
      type: rewardType,
      requiredPoints: reqPoints,
      productId: selectedPlatId,
      discountValue: discountValue,
      allowedDays: allowedDays
    });
    if (res.success) {
      toast.success("Récompense ajoutée au catalogue !");
      setShowAddReward(false);
      refreshData(restaurantId);
    } else {
      toast.error(res.error || "Erreur");
    }
  };

  const handleRedeem = async (catalogId: string) => {
    if (!selectedCustomer) return;
    
    if (plan === 'STANDARD') {
      toast.error("Veuillez passer en PRO pour utiliser l'échange cadeau.");
      return;
    }
    setIsRedeeming(true);
    const res = await redeemRewardAsManager(restaurantId, selectedCustomer.phone, catalogId);
    setIsRedeeming(false);
    
    if (res.success) {
      toast.success("Récompense accordée avec succès !");
      const product = plats.find(p => p.id === res.reward.productId);
      setRedeemedReward({ ...res.reward, platName: product?.nom, platImage: product?.image });
      setSelectedCustomer(null);
      refreshData(restaurantId);
    } else {
      toast.error(res.error || "Erreur lors de l'échange.");
    }
  };

  const handleStartRandomRedeem = async () => {
    setIsFetchingRandom(true);
    if (plan === 'STANDARD') {
      toast.error("Veuillez passer en PRO pour utiliser l'échange cadeau.");
      return;
    }
    setIsFetchingRandom(true);
    const res = await getRandomRewardProducts(restaurantId);
    setIsFetchingRandom(false);
    if (res.success) {
      setRandomProducts(res.products);
      setShowRandomChoice(true);
    } else {
      toast.error(res.error || "Erreur lors de la récupération des cadeaux.");
    }
  };

  const handleConfirmRandomRedeem = async (platId: string) => {
    setIsRedeeming(true);
    const res = await redeemLoyaltyGift(restaurantId, selectedCustomer.id, platId);
    setIsRedeeming(false);
    if (res.success) {
      toast.success(`Cadeau "${res.giftName}" accordé !`);
      setRedeemedReward({ type: 'PRODUCT', platName: res.giftName, platImage: res.giftImage });
      setShowRandomChoice(false);
      setSelectedCustomer(null);
      refreshData(restaurantId);
    } else {
      toast.error(res.error || "Erreur.");
    }
  };

  const toggleDay = (day: string) => {
    setAllowedDays(prev => 
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-4">
        <Loader2 className="w-10 h-10 text-pink-500 animate-spin" />
        <p className="text-muted-foreground text-xs mt-4 font-black uppercase tracking-widest">Initialisation du système de fidélité...</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Plan Restriction Banner */}
      {plan === 'STANDARD' && (
        <div className="bg-amber-500/10 border-2 border-amber-500/30 rounded-[2rem] p-8 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden shadow-2xl">
           <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 blur-[100px] rounded-full" />
           <div className="flex items-center gap-6 relative z-10">
              <div className="w-16 h-16 bg-amber-500 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/20 rotate-3">
                 <Crown className="w-8 h-8 text-black" />
              </div>
              <div>
                 <h2 className="text-xl font-black uppercase italic tracking-tighter text-amber-500">Fonctionnalité PRO</h2>
                 <p className="text-sm font-bold text-zinc-400 uppercase tracking-widest max-w-lg leading-relaxed">
                    Le programme de fidélité avancé (points, cadeaux, codes promo) est réservé aux comptes <span className="text-white">PRO</span> et <span className="text-white">PLATINUM</span>.
                 </p>
              </div>
           </div>
           <button 
             onClick={() => router.push('/manager/pricing')}
             className="bg-amber-500 text-black font-black px-8 py-4 rounded-2xl text-[10px] uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-amber-500/20 relative z-10"
           >
              Passer en PRO
           </button>
        </div>
      )}
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black italic tracking-tighter text-foreground uppercase flex items-center gap-4">
            <div className="w-14 h-14 bg-pink-500/10 rounded-[1.5rem] flex items-center justify-center border border-pink-500/20 shadow-lg shadow-pink-500/5">
              <Gift className="w-8 h-8 text-pink-500" />
            </div>
            Programme Fidélité <span className="text-pink-500">Pro</span>
          </h1>
          <p className="text-muted-foreground font-bold mt-2 flex items-center gap-2">
            <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
            Activez la croissance de votre restaurant par la fidélisation client.
          </p>
        </div>

        <div className="flex bg-card border border-border p-1 rounded-2xl shadow-xl">
           <button 
             onClick={() => setActiveTab('customers')}
             className={cn(
               "px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
               activeTab === 'customers' ? "bg-pink-500 text-white shadow-lg shadow-pink-500/20" : "text-muted-foreground hover:bg-secondary"
             )}
           >
             Clients
           </button>
           <button 
             onClick={() => setActiveTab('catalog')}
             className={cn(
               "px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
               activeTab === 'catalog' ? "bg-pink-500 text-white shadow-lg shadow-pink-500/20" : "text-muted-foreground hover:bg-secondary"
             )}
           >
             Catalogue
           </button>
           <button 
             onClick={() => setActiveTab('settings')}
             className={cn(
               "px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
               activeTab === 'settings' ? "bg-pink-500 text-white shadow-lg shadow-pink-500/20" : "text-muted-foreground hover:bg-secondary"
             )}
           >
              Config
           </button>
        </div>
      </div>

      {activeTab === 'customers' && (
         <div className="space-y-6">
            {/* Search & Stats */}
            <div className="flex flex-col md:flex-row gap-6 items-end">
               <div className="flex-1 w-full space-y-2">
                  <label className="text-[10px] font-black uppercase text-muted-foreground ml-2">Rechercher un client</label>
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Nom ou numéro de téléphone..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-card border border-border rounded-2xl py-4 pl-12 pr-4 text-sm focus:ring-2 focus:ring-pink-500/50 outline-none transition-all shadow-sm"
                    />
                  </div>
               </div>
               <div className="flex gap-4">
                  <div className="bg-card border border-border rounded-2xl px-6 py-3 min-w-[150px] shadow-sm">
                     <p className="text-[9px] font-black text-muted-foreground uppercase mb-1">Total Points</p>
                     <p className="text-xl font-black italic text-foreground">
                        {customers.reduce((acc, c) => acc + c.points, 0).toLocaleString()}
                     </p>
                  </div>
               </div>
            </div>

            {/* Customers List */}
            <div className="bg-card border border-border rounded-[2.5rem] overflow-hidden shadow-2xl">
               <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-secondary/30">
                      <th className="px-8 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Client</th>
                      <th className="px-8 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest text-center">Points</th>
                      <th className="px-8 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest text-center">Gains Totaux</th>
                      <th className="px-8 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest text-right">Dernière Visite</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {customers.filter(c => c.phone.includes(searchQuery) || c.name?.toLowerCase().includes(searchQuery.toLowerCase())).map((customer) => (
                      <tr 
                        key={customer.id} 
                        onClick={() => setSelectedCustomer(customer)}
                        className="hover:bg-secondary/20 transition-all cursor-pointer group"
                      >
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-pink-500/10 text-pink-500 rounded-xl flex items-center justify-center font-black">
                              {customer.name?.charAt(0) || "C"}
                            </div>
                            <div>
                               <p className="font-black text-sm group-hover:text-pink-500 transition-colors uppercase italic">{customer.name || 'Anonyme'}</p>
                               <p className="text-[10px] font-mono text-muted-foreground">{customer.phone}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-5 text-center">
                           <span className="bg-amber-500/10 text-amber-600 px-3 py-1 rounded-lg text-sm font-black italic">
                              {customer.points}
                           </span>
                        </td>
                        <td className="px-8 py-5 text-center text-xs font-bold text-muted-foreground">
                           {customer.totalPointsEarned || customer.points} pts
                        </td>
                        <td className="px-8 py-5 text-right text-[10px] font-black text-muted-foreground uppercase">
                           {format(new Date(customer.updatedAt || customer.createdAt), "d MMM yyyy", { locale: fr })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
               </div>
            </div>
         </div>
      )}

      {activeTab === 'catalog' && (
         <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-300">
            {/* Catalog Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               {/* Add New Reward Card */}
               <button 
                 onClick={() => setShowAddReward(true)}
                 className="bg-card border-2 border-dashed border-pink-500/30 hover:border-pink-500 rounded-[2.5rem] p-8 flex flex-col items-center justify-center gap-4 transition-all group hover:bg-pink-500/5 min-h-[300px]"
               >
                  <div className="w-16 h-16 bg-pink-500/10 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                     <Plus className="w-8 h-8 text-pink-500" />
                  </div>
                  <div className="text-center">
                    <p className="font-black uppercase tracking-tighter italic text-lg">Nouvelle Récompense</p>
                    <p className="text-[10px] text-muted-foreground font-bold uppercase mt-1">Produit gratuit ou Code promo</p>
                  </div>
               </button>

               {catalog.map((item) => (
                  <div key={item.id} className="bg-card border border-border rounded-[2.5rem] p-8 relative overflow-hidden group shadow-xl">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-pink-500/5 blur-[50px] rounded-full" />
                      
                      <button 
                        onClick={async () => {
                           if (confirm("Supprimer cette récompense ?")) {
                              await deleteFromRewardCatalog(item.id, restaurantId);
                              refreshData(restaurantId);
                           }
                        }}
                        className="absolute top-6 right-6 p-2 text-muted-foreground hover:text-red-500 transition-colors"
                      >
                         <Trash2 className="w-4 h-4" />
                      </button>

                      <div className="flex flex-col h-full gap-6">
                         <div className="flex items-center gap-4">
                            <div className={cn(
                              "w-12 h-12 rounded-2xl flex items-center justify-center",
                              item.type === 'PRODUCT' ? "bg-amber-500/10 text-amber-500" : "bg-emerald-500/10 text-emerald-500"
                            )}>
                               {item.type === 'PRODUCT' ? <Utensils className="w-6 h-6" /> : <Ticket className="w-6 h-6" />}
                            </div>
                            <div>
                               <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{item.type === 'PRODUCT' ? 'Produit Gratuit' : 'Code Promo'}</p>
                               <p className="text-xl font-black italic uppercase tracking-tighter">
                                  {item.type === 'PRODUCT' ? (plats.find(p => p.id === item.productId)?.nom || "Plat inconnu") : `${item.discountValue}% de réduction`}
                               </p>
                            </div>
                         </div>

                         <div className="flex-1 space-y-4">
                            <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-2xl">
                               <span className="text-[10px] font-black text-muted-foreground uppercase">Points requis</span>
                               <span className="text-lg font-black text-pink-500 italic">{item.requiredPoints} pts</span>
                            </div>

                            <div className="space-y-2">
                               <p className="text-[10px] font-black text-muted-foreground uppercase flex items-center gap-2">
                                  <Calendar className="w-3 h-3" /> Validité :
                               </p>
                               <div className="flex flex-wrap gap-1">
                                  {item.allowedDays.length === 7 ? (
                                    <span className="text-[9px] font-bold bg-secondary px-2 py-1 rounded-md">Tous les jours</span>
                                  ) : (
                                    item.allowedDays.map((d: string) => (
                                      <span key={d} className="text-[9px] font-black uppercase bg-secondary px-2 py-1 rounded-md text-zinc-500">{d.slice(0,3)}</span>
                                    ))
                                  )}
                               </div>
                            </div>
                         </div>
                      </div>
                  </div>
               ))}
            </div>

            {/* Empty State */}
            {catalog.length === 0 && (
               <div className="py-20 flex flex-col items-center text-center">
                  <Ticket className="w-16 h-16 text-zinc-800 mb-4" />
                  <p className="text-zinc-500 font-bold uppercase text-xs">Le catalogue est vide.</p>
               </div>
            )}
         </div>
      )}

      {activeTab === 'settings' && (
         <div className="max-w-xl mx-auto space-y-6 animate-in slide-in-from-bottom-4 duration-300">
            <div className="bg-card border border-border rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-pink-500/5 blur-[100px] rounded-full" />
                <h3 className="text-xl font-black italic uppercase tracking-tighter mb-6 flex items-center gap-3">
                   <Settings className="w-6 h-6 text-pink-500" /> Ratios de Fidélité
                </h3>
                
                <div className="space-y-6 relative z-10">
                   <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-muted-foreground ml-2">Points par USD dépensé</label>
                      <div className="relative">
                        <input 
                          type="number"
                          value={config?.pointsPerUsd || 1}
                          className="w-full bg-secondary/50 border border-border rounded-2xl py-4 px-6 text-lg font-black outline-none focus:ring-2 focus:ring-pink-500/50 transition-all font-mono"
                        />
                        <span className="absolute right-6 top-1/2 -translate-y-1/2 text-xs font-black text-muted-foreground uppercase">Points / $</span>
                      </div>
                   </div>

                   <button className="w-full bg-pink-500 hover:bg-pink-600 text-white font-black py-4 rounded-2xl shadow-lg shadow-pink-500/20 active:scale-95 transition-all uppercase tracking-widest text-xs">
                      Enregistrer les réglages
                   </button>
                </div>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/20 rounded-[2rem] p-6 flex gap-4">
               <AlertCircle className="w-6 h-6 text-amber-500 shrink-0" />
               <div>
                  <p className="text-xs font-black text-foreground uppercase tracking-tight">Règle de conversion</p>
                  <p className="text-[10px] text-muted-foreground mt-1">Le ratio de points est appliqué lors du paiement de la facture. Les décimales sont arrondies à l'unité inférieure.</p>
               </div>
            </div>
         </div>
      )}

      {/* --- ADD REWARD MODAL --- */}
      {showAddReward && (
        <div className="fixed inset-0 bg-background/90 backdrop-blur-xl z-[100] flex items-center justify-center p-4">
           <div className="bg-card border-border border-2 rounded-[3rem] p-10 max-w-lg w-full shadow-2xl animate-in zoom-in-95 duration-300 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-pink-500/5 blur-[100px] rounded-full" />
              
              <button 
                onClick={() => setShowAddReward(false)}
                className="absolute top-8 right-8 p-2 text-muted-foreground hover:text-pink-500 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>

              <h2 className="text-2xl font-black italic uppercase tracking-tighter mb-8 flex items-center gap-3">
                 <PlusCircle className="w-8 h-8 text-pink-500" /> Créer une récompense
              </h2>

              <form onSubmit={handleAddReward} className="space-y-6 relative z-10">
                 {/* Type Choice */}
                 <div className="grid grid-cols-2 gap-3">
                    <button 
                      type="button"
                      onClick={() => setRewardType('PRODUCT')}
                      className={cn(
                        "p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2",
                        rewardType === 'PRODUCT' ? "border-pink-500 bg-pink-500/5 text-pink-500" : "border-border text-muted-foreground hover:bg-secondary"
                      )}
                    >
                       <Utensils className="w-5 h-5" />
                       <span className="text-[10px] font-black uppercase tracking-widest">Produit</span>
                    </button>
                    <button 
                      type="button"
                      onClick={() => setRewardType('PROMO_CODE')}
                      className={cn(
                        "p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2",
                        rewardType === 'PROMO_CODE' ? "border-pink-500 bg-pink-500/5 text-pink-500" : "border-border text-muted-foreground hover:bg-secondary"
                      )}
                    >
                       <Ticket className="w-5 h-5" />
                       <span className="text-[10px] font-black uppercase tracking-widest">Code Promo</span>
                    </button>
                 </div>

                 {/* Points Required */}
                 <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-muted-foreground ml-2">Points requis pour débloquer</label>
                    <input 
                      type="number"
                      required
                      value={reqPoints}
                      onChange={(e) => setReqPoints(e.target.value)}
                      className="w-full bg-secondary/50 border border-border rounded-2xl py-4 px-6 text-sm font-black outline-none focus:ring-2 focus:ring-pink-500/50 transition-all font-mono"
                      placeholder="Ex: 100"
                    />
                 </div>

                 {rewardType === 'PRODUCT' ? (
                   <div className="space-y-2 animate-in fade-in duration-200">
                      <label className="text-[10px] font-black uppercase text-muted-foreground ml-2">Sélectionner le produit</label>
                      <select 
                        required
                        value={selectedPlatId}
                        onChange={(e) => setSelectedPlatId(e.target.value)}
                        className="w-full bg-secondary/50 border border-border rounded-2xl py-4 px-6 text-sm font-black outline-none focus:ring-2 focus:ring-pink-500/50 transition-all"
                      >
                         <option value="">Choisir un plat...</option>
                         {plats.map(p => (
                            <option key={p.id} value={p.id}>{p.nom} (${p.prixUsd})</option>
                         ))}
                      </select>
                   </div>
                 ) : (
                   <div className="space-y-2 animate-in fade-in duration-200">
                      <label className="text-[10px] font-black uppercase text-muted-foreground ml-2">Valeur de réduction (%)</label>
                      <div className="relative">
                        <input 
                          type="number"
                          required
                          value={discountValue}
                          onChange={(e) => setDiscountValue(e.target.value)}
                          className="w-full bg-secondary/50 border border-border rounded-2xl py-4 px-6 text-sm font-black outline-none focus:ring-2 focus:ring-pink-500/50 transition-all font-mono"
                          placeholder="Ex: 15"
                        />
                        <span className="absolute right-6 top-1/2 -translate-y-1/2 font-black text-pink-500">%</span>
                      </div>
                   </div>
                 )}

                 {/* Days allowed */}
                 <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase text-muted-foreground ml-2 flex items-center gap-2">
                       <Calendar className="w-3 h-3" /> Jours de validité
                    </label>
                    <div className="flex flex-wrap gap-2">
                       {daysOfWeek.map(day => (
                          <button
                            key={day.id}
                            type="button"
                            onClick={() => toggleDay(day.id)}
                            className={cn(
                               "px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-tighter transition-all border",
                               allowedDays.includes(day.id) 
                                 ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-500" 
                                 : "bg-secondary border-border text-muted-foreground"
                            )}
                          >
                             {day.label}
                          </button>
                       ))}
                    </div>
                 </div>

                 <SubmitButton 
                   className="w-full bg-pink-500 hover:bg-pink-600 text-white font-black py-5 rounded-2xl shadow-xl shadow-pink-500/20 text-xs uppercase tracking-widest mt-4"
                   loadingText="Création..."
                 >
                    Créer la récompense
                 </SubmitButton>
              </form>
           </div>
        </div>
      )}
      {/* --- SELECTED CUSTOMER MODAL (REDEMPTION) --- */}
      {selectedCustomer && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
           <div className="bg-card border-border border rounded-[3rem] p-10 max-w-2xl w-full shadow-2xl animate-in zoom-in-95 duration-300 relative overflow-hidden">
               <button 
                 onClick={() => setSelectedCustomer(null)}
                 className="absolute top-8 right-8 p-2 text-muted-foreground hover:text-pink-500 transition-colors"
               >
                 <X className="w-6 h-6" />
               </button>

               <div className="flex items-center gap-6 mb-10">
                  <div className="w-20 h-20 bg-pink-500/10 text-pink-500 rounded-[2rem] flex items-center justify-center text-3xl font-black italic">
                    {selectedCustomer.name?.charAt(0) || "C"}
                  </div>
                  <div>
                     <h2 className="text-3xl font-black italic uppercase tracking-tighter text-white">{selectedCustomer.name || 'Client Anonyme'}</h2>
                     <p className="font-mono text-zinc-500">{selectedCustomer.phone}</p>
                     <div className="flex items-center gap-2 mt-2">
                        <div className="bg-amber-500/10 border border-amber-500/20 px-4 py-1 rounded-full flex items-center gap-2">
                            <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                            <span className="text-sm font-black italic text-amber-500">{selectedCustomer.points} Points disponibles</span>
                        </div>
                     </div>
                  </div>
               </div>

               <div className="space-y-4">
                  <h3 className="text-xs font-black uppercase text-muted-foreground tracking-widest flex items-center justify-between gap-2 mb-4">
                     <div className="flex items-center gap-2">
                        <Award className="w-4 h-4" /> Récompenses Éligibles
                     </div>
                     <span className="text-[10px] font-bold text-pink-500">Seuil : {config?.rewardThreshold || 100} pts</span>
                  </h3>

                  <div className="grid grid-cols-1 gap-3 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                     {/* Random Reward Option (sur demande du client) */}
                     <div className={cn(
                        "p-6 rounded-3xl border-2 border-dashed flex items-center justify-between transition-all",
                        selectedCustomer.points >= (config?.rewardThreshold || 100)
                          ? "bg-pink-500/5 border-pink-500/30"
                          : "bg-card border-border opacity-50"
                     )}>
                        <div className="flex items-center gap-4">
                           <div className="w-12 h-12 rounded-2xl bg-pink-500/20 text-pink-500 flex items-center justify-center">
                              <Sparkles className="w-6 h-6" />
                           </div>
                           <div>
                              <p className="text-lg font-black italic uppercase tracking-tighter text-white">Échange Surprise 🎁</p>
                              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Choisir entre 2 cadeaux au hasard</p>
                           </div>
                        </div>
                        <button 
                          onClick={handleStartRandomRedeem}
                          disabled={selectedCustomer.points < (config?.rewardThreshold || 100) || isFetchingRandom}
                          className={cn(
                            "px-6 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all",
                            selectedCustomer.points >= (config?.rewardThreshold || 100)
                              ? "bg-pink-500 text-white hover:scale-105" 
                              : "bg-zinc-800 text-zinc-600"
                          )}
                        >
                           {isFetchingRandom ? <Loader2 className="w-3 h-3 animate-spin" /> : "Découvrir"}
                        </button>
                     </div>

                     <div className="flex items-center gap-4 py-2">
                        <div className="h-px flex-1 bg-border" />
                        <span className="text-[10px] font-black text-muted-foreground uppercase">Ou Catalogue fixe</span>
                        <div className="h-px flex-1 bg-border" />
                     </div>
                     {catalog.map((item) => {
                        const canAfford = selectedCustomer.points >= item.requiredPoints;
                        return (
                           <div key={item.id} className={cn(
                             "p-6 rounded-3xl border flex items-center justify-between transition-all",
                             canAfford ? "bg-secondary/50 border-border" : "bg-card border-border opacity-50"
                           )}>
                              <div className="flex items-center gap-4">
                                 <div className={cn(
                                   "w-12 h-12 rounded-2xl flex items-center justify-center",
                                   item.type === 'PRODUCT' ? "bg-amber-500/20 text-amber-500" : "bg-emerald-500/20 text-emerald-500"
                                 )}>
                                    {item.type === 'PRODUCT' ? <Utensils className="w-6 h-6" /> : <Ticket className="w-6 h-6" />}
                                 </div>
                                 <div>
                                    <p className="text-lg font-black italic uppercase tracking-tighter text-white">
                                       {item.type === 'PRODUCT' ? (plats.find(p => p.id === item.productId)?.nom || "Produit") : `${item.discountValue}% Réduction`}
                                    </p>
                                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{item.requiredPoints} points requis</p>
                                 </div>
                              </div>

                              <button 
                                onClick={() => handleRedeem(item.id)}
                                disabled={!canAfford || isRedeeming}
                                className={cn(
                                  "px-6 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all",
                                  canAfford 
                                    ? "bg-pink-500 text-white hover:scale-105 active:scale-95 shadow-lg shadow-pink-500/20" 
                                    : "bg-zinc-800 text-zinc-600 cursor-not-allowed"
                                )}
                              >
                                 {isRedeeming ? <Loader2 className="w-3 h-3 animate-spin" /> : "Échanger"}
                              </button>
                           </div>
                        );
                     })}
                     {catalog.length === 0 && (
                        <div className="text-center py-12 bg-secondary/20 rounded-3xl border border-dashed border-border">
                            <Ticket className="w-10 h-10 text-muted-foreground mx-auto mb-4 opacity-20" />
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Aucune récompense configurée</p>
                        </div>
                     )}
                  </div>
               </div>

               <p className="text-[10px] text-zinc-500 italic mt-8 text-center uppercase font-bold tracking-widest">
                  Note: L'échange est irréversible. Les points seront déduits immédiatement.
               </p>
           </div>
        </div>
      )}

      {/* --- RANDOM CHOICE MODAL --- */}
      {showRandomChoice && (
        <div className="fixed inset-0 bg-background/95 backdrop-blur-2xl z-[120] flex items-center justify-center p-4">
           <div className="bg-card border-zinc-800 border-2 rounded-[3.5rem] p-10 max-w-2xl w-full shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-300">
               <div className="absolute top-0 right-0 w-64 h-64 bg-pink-500/10 blur-[100px] rounded-full" />
               
               <button 
                onClick={() => setShowRandomChoice(false)}
                className="absolute top-8 right-8 p-2 text-muted-foreground hover:text-white transition-colors"
               >
                <X className="w-6 h-6" />
               </button>

               <div className="text-center mb-10">
                  <div className="w-16 h-16 bg-pink-500/20 text-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                     <Gift className="w-8 h-8" />
                  </div>
                  <h2 className="text-3xl font-black italic uppercase tracking-tighter text-white">Le hasard a choisi...</h2>
                  <p className="text-zinc-500 font-bold uppercase text-[10px] tracking-[0.2em] mt-2">Le client peut choisir un seul produit parmi les deux</p>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {randomProducts.map((p, idx) => (
                     <div key={p.id} className="group bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-6 flex flex-col items-center text-center hover:border-pink-500/50 transition-all hover:-translate-y-2">
                        <div className="w-24 h-24 rounded-3xl bg-secondary mb-4 overflow-hidden border border-border">
                           <img src={p.image} className="w-full h-full object-cover" alt={p.nom} />
                        </div>
                        <p className="text-xs font-black text-pink-500 uppercase tracking-widest mb-1">{p.categorie}</p>
                        <h4 className="text-xl font-black italic text-white uppercase tracking-tighter mb-6">{p.nom}</h4>
                        
                        <button 
                          onClick={() => handleConfirmRandomRedeem(p.id)}
                          disabled={isRedeeming}
                          className="w-full bg-white text-black font-black py-4 rounded-2xl text-[10px] uppercase tracking-widest hover:bg-pink-500 hover:text-white transition-all active:scale-95 flex items-center justify-center gap-2"
                        >
                           {isRedeeming ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Choisir ce cadeau"}
                        </button>
                     </div>
                  ))}
               </div>

               {randomProducts.length === 0 && (
                  <div className="text-center py-20">
                     <p className="text-muted-foreground font-black uppercase text-xs">Aucun produit cadeau disponible pour le moment.</p>
                  </div>
               )}
           </div>
        </div>
      )}

      {/* --- REDEMPTION SUCCESS MODAL --- */}
      {redeemedReward && (
        <div className="fixed inset-0 bg-background/90 backdrop-blur-2xl z-[130] flex items-center justify-center p-4">
           <div className="bg-card border-emerald-500/30 border-2 rounded-[3.5rem] p-12 max-w-lg w-full shadow-2xl text-center relative overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 blur-[100px] rounded-full" />
                
                <div className="w-24 h-24 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
                    <CheckCircle2 className="w-12 h-12" />
                </div>

                <h2 className="text-3xl font-black italic uppercase tracking-tighter text-white mb-2">ÉCHANGE RÉUSSI !</h2>
                <p className="text-zinc-500 font-medium mb-8 uppercase text-[10px] font-black tracking-[0.2em]">
                  {redeemedReward.platName ? `PRODUIT ACCORDÉ : ${redeemedReward.platName}` : "LA RÉCOMPENSE A ÉTÉ GÉNÉRÉE."}
                </p>

                {redeemedReward.type === 'PROMO_CODE' ? (
                    <div className="space-y-6">
                        <div className="p-8 bg-zinc-900 border-2 border-dashed border-emerald-500/30 rounded-3xl relative group">
                            <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-2">CODE PROMO UNIQUE</p>
                            <p className="text-5xl font-black text-white italic tracking-widest font-mono group-hover:scale-110 transition-transform cursor-copy" onClick={() => {
                                navigator.clipboard.writeText(redeemedReward.promoCode);
                                toast.success("Code copié !");
                            }}>
                                {redeemedReward.promoCode}
                            </p>
                        </div>
                        <div className="flex gap-2 items-start justify-center p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/10">
                            <AlertCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                            <p className="text-[10px] text-zinc-400 font-bold uppercase leading-relaxed text-left">
                                Ce code est à usage unique. Il est valide seulement le(s) : <br/>
                                <span className="text-emerald-500">{redeemedReward.allowedDays?.join(", ") || "Tous les jours"}</span>
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="p-8 bg-zinc-900 border border-zinc-800 rounded-3xl group">
                         {redeemedReward.platImage ? (
                            <div className="w-24 h-24 rounded-2xl overflow-hidden mx-auto mb-6 border-2 border-emerald-500/20 shadow-xl group-hover:scale-110 transition-transform duration-500">
                                <img src={redeemedReward.platImage} className="w-full h-full object-cover" alt={redeemedReward.platName} />
                            </div>
                         ) : (
                            <Utensils className="w-12 h-12 text-amber-500 mx-auto mb-4" />
                         )}
                         <p className="text-sm font-black text-white uppercase italic">{redeemedReward.platName || "Produit Gratuit Accordé"}</p>
                         <p className="text-[10px] text-zinc-500 mt-2 font-bold uppercase tracking-widest italic">Le produit a été marqué comme servi au comptoir.</p>
                    </div>
                )}

                <button 
                  onClick={() => setRedeemedReward(null)}
                  className="w-full bg-white text-black font-black py-5 rounded-[2rem] mt-10 hover:bg-zinc-200 transition-all active:scale-95 shadow-xl shadow-white/5 uppercase tracking-[0.3em] text-[10px]"
                >
                    TERMINER
                </button>
           </div>
        </div>
      )}
    </div>
  );
}
