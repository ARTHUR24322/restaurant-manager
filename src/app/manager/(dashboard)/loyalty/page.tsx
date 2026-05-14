"use client"

import React, { useState, useEffect } from 'react';
import {
  Gift, Phone, Search, Users, Crown,
  TrendingUp, Loader2, ChevronRight, X, 
  Star, Award, Clock, Ticket, Calendar,
  Plus, Trash2, Settings, PlusCircle, CheckCircle2,
  AlertCircle, Utensils
} from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  getLoyaltyCustomers, 
  getLoyaltyCustomerDetails 
} from "@/lib/actions";
import { 
  addToRewardCatalog, 
  deleteFromRewardCatalog, 
  getClientLoyalty 
} from "@/lib/actions-loyalty";
import { getManagerSession } from "@/lib/manager-actions";
import { getPlats } from "@/lib/actions";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { SubmitButton } from "@/components/manager/SubmitButton";

export default function LoyaltyAdvancedPage({ searchParams }: { searchParams: { resto_id?: string } }) {
  const [restaurantId, setRestaurantId] = useState<string>(searchParams.resto_id || "");
  const [activeTab, setActiveTab] = useState<'customers' | 'catalog' | 'settings'>('customers');
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState<any[]>([]);
  const [catalog, setCatalog] = useState<any[]>([]);
  const [plats, setPlats] = useState<any[]>([]);
  const [config, setConfig] = useState<any>(null);
  
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
                      <tr key={customer.id} className="hover:bg-secondary/20 transition-all cursor-pointer group">
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
    </div>
  );
}
