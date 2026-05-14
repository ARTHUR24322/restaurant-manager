"use client"

import React, { useState, useEffect } from 'react';
import { 
  Phone, Star, Gift, Ticket, Loader2, 
  ChevronRight, Calendar, ArrowRight, CheckCircle2,
  AlertCircle, X, Clock
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getClientLoyalty, claimRewardAction } from "@/lib/actions-loyalty";
import { toast } from "sonner";

export default function LoyaltyClientContent({ 
  restaurantId, 
  initialPhone 
}: { 
  restaurantId: string; 
  initialPhone?: string;
}) {
  const [phone, setPhone] = useState(initialPhone || "");
  const [isLoggedIn, setIsLoggedIn] = useState(!!initialPhone);
  const [loading, setLoading] = useState(false);
  const [claiming, setClaiming] = useState(false);
  
  const [loyaltyData, setLoyaltyData] = useState<any>(null);

  const daysLabels: Record<string, string> = {
    "Monday": "Lundi",
    "Tuesday": "Mardi",
    "Wednesday": "Mercredi",
    "Thursday": "Jeudi",
    "Friday": "Vendredi",
    "Saturday": "Samedi",
    "Sunday": "Dimanche"
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.length < 5) return;
    setLoading(true);
    const res = await getClientLoyalty(restaurantId, phone);
    if (res.success) {
      setLoyaltyData(res);
      setIsLoggedIn(true);
    } else {
      toast.error("Une erreur est survenue.");
    }
    setLoading(false);
  };

  const handleClaim = async (catalogId: string) => {
    if (claiming) return;
    setClaiming(true);
    const res = await claimRewardAction(restaurantId, phone, catalogId);
    if (res.success) {
      toast.success("Récompense débloquée ! Retrouvez-la dans 'Mes Cadeaux'");
      // Refresh
      const updated = await getClientLoyalty(restaurantId, phone);
      setLoyaltyData(updated);
    } else {
      toast.error(res.error || "Erreur");
    }
    setClaiming(false);
  };

  if (!isLoggedIn) {
    return (
      <div className="bg-card border border-border rounded-[2.5rem] p-8 shadow-2xl animate-in slide-in-from-bottom-4 duration-500">
         <div className="text-center space-y-4 mb-8">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
               <Star className="w-8 h-8 text-primary animate-pulse" />
            </div>
            <h3 className="text-xl font-black uppercase italic tracking-tighter">Accédez à votre espace</h3>
            <p className="text-xs text-muted-foreground font-medium px-4">
               Entrez votre numéro de téléphone pour voir vos points et échanger vos récompenses.
            </p>
         </div>

         <form onSubmit={handleLogin} className="space-y-4">
            <div className="relative">
               <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
               <input 
                  type="tel"
                  placeholder="08X XXX XX XX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-secondary border border-border rounded-2xl py-4 pl-12 pr-4 text-lg font-black outline-none focus:ring-4 focus:ring-primary/20 transition-all placeholder:text-zinc-700"
                  required
               />
            </div>
            <button 
               type="submit"
               disabled={loading}
               className="w-full bg-primary hover:bg-primary/90 text-black font-black py-4 rounded-2xl flex items-center justify-center gap-3 shadow-lg shadow-primary/20 active:scale-95 transition-all text-xs uppercase tracking-widest disabled:opacity-50"
            >
               {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Découvrir mes points <ArrowRight className="w-4 h-4" /></>}
            </button>
         </form>

         <p className="mt-8 text-[9px] text-center text-zinc-600 font-bold uppercase tracking-widest">
            Fidélité propulsée par SmartResto
         </p>
      </div>
    );
  }

  const currentPoints = loyaltyData?.points || 0;
  const myRewards = loyaltyData?.myRewards || [];
  const catalog = loyaltyData?.catalog || [];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Points Card */}
      <div className="bg-card border border-border rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden group">
         <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-[40px] rounded-full group-hover:scale-150 transition-transform duration-1000" />
         
         <div className="relative z-10 flex flex-col items-center text-center">
            <div className="flex items-center gap-2 mb-2">
               <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
               <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Solde actuel</span>
            </div>
            
            <div className="flex items-end gap-2 mb-6">
                <span className="text-6xl font-black italic text-primary tracking-tighter drop-shadow-2xl">
                   {currentPoints}
                </span>
                <span className="text-xl font-bold text-zinc-500 mb-2 italic">PTS</span>
            </div>

            <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-4">
               {loyaltyData?.totalEarned} points cumulés à vie
            </p>

            <button 
               onClick={() => { setIsLoggedIn(false); setLoyaltyData(null); }}
               className="text-[9px] font-black uppercase text-zinc-700 hover:text-primary transition-colors border border-zinc-800 px-4 py-2 rounded-full"
            >
               Déconnexion ({phone})
            </button>
         </div>
      </div>

      {/* Mes Récompenses (Codes Promo / Produits Prêts) */}
      {myRewards.length > 0 && (
         <div className="space-y-4">
            <h4 className="px-4 text-[10px] font-black uppercase text-primary tracking-widest flex items-center gap-2">
               <Ticket className="w-3 h-3" /> Mes privilèges actifs ({myRewards.length})
            </h4>
            <div className="space-y-3">
               {myRewards.map((reward: any) => (
                  <div key={reward.id} className="bg-zinc-900 border-2 border-primary/20 rounded-3xl p-5 relative overflow-hidden group shadow-xl">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 blur-2xl rounded-full" />
                      
                      <div className="flex items-center justify-between gap-4">
                         <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center text-black shadow-lg shadow-primary/20">
                               {reward.type === 'PROMO_CODE' ? <Ticket className="w-6 h-6" /> : <Gift className="w-6 h-6" />}
                            </div>
                            <div>
                               <p className="text-lg font-black italic text-white uppercase leading-tight">
                                  {reward.type === 'PROMO_CODE' ? 'Réduction immédiate' : 'Produit Offert'}
                               </p>
                               <div className="flex items-center gap-2 mt-1">
                                  <Clock className="w-3 h-3 text-zinc-500" />
                                  <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Valide par période</span>
                               </div>
                            </div>
                         </div>
                      </div>

                      <div className="mt-5 pt-5 border-t border-white/5 flex items-center justify-between">
                         {reward.promoCode ? (
                            <div className="flex flex-col gap-2 w-full">
                               <div className="bg-black/50 border border-white/10 rounded-xl p-4 text-center select-all cursor-pointer group active:scale-95 transition-all">
                                  <span className="text-xl font-black tracking-[0.2em] text-primary group-hover:text-amber-400">
                                     {reward.promoCode}
                                  </span>
                                  <p className="text-[8px] font-black text-zinc-600 uppercase mt-2">Cliquez pour copier</p>
                               </div>
                               <div className="flex items-center gap-2 px-2">
                                  <Calendar className="w-3 h-3 text-zinc-700" />
                                  <span className="text-[8px] font-black text-zinc-600 uppercase">Utilisable le : {reward.allowedDays.map((d: string) => daysLabels[d] || d).join(', ')}</span>
                               </div>
                            </div>
                         ) : (
                            <div className="w-full">
                               <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-xl p-3 text-center">
                                  <p className="text-xs font-black uppercase italic">Dites "SmartReward" à la caisse 🍔</p>
                                  <p className="text-[9px] opacity-70 mt-1 uppercase font-bold tracking-widest">ID: {reward.id.slice(-6).toUpperCase()}</p>
                                </div>
                            </div>
                         )}
                      </div>
                  </div>
               ))}
            </div>
         </div>
      )}

      {/* Catalogue de récompenses */}
      <div className="space-y-4">
         <h4 className="px-4 text-[10px] font-black uppercase text-zinc-500 tracking-widest flex items-center gap-2">
            <Star className="w-3 h-3" /> Boutique Fidélité
         </h4>
         
         <div className="space-y-3">
            {catalog.map((item: any) => {
               const isLocked = currentPoints < item.requiredPoints;
               return (
                  <div key={item.id} className={cn(
                     "bg-card border border-border rounded-3xl p-5 transition-all group",
                     isLocked ? "opacity-60" : "hover:scale-[1.02] border-primary/30"
                  )}>
                     <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                           <div className={cn(
                             "w-12 h-12 rounded-2xl flex items-center justify-center font-black",
                             isLocked ? "bg-secondary text-zinc-600" : "bg-primary/10 text-primary"
                           )}>
                              {item.type === 'PRODUCT' ? <Gift className="w-6 h-6" /> : <Ticket className="w-6 h-6" />}
                           </div>
                           <div>
                              <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">
                                 {item.requiredPoints} POINTS REQUIS
                              </p>
                              <p className="text-sm font-black italic uppercase italic leading-tight text-white group-hover:text-primary transition-colors">
                                 {item.type === 'PRODUCT' ? "Produit au choix" : `-${item.discountValue}% sur l'addition`}
                              </p>
                           </div>
                        </div>

                        {!isLocked ? (
                           <button 
                              onClick={() => handleClaim(item.id)}
                              disabled={claiming}
                              className="bg-primary text-black w-10 h-10 rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 hover:scale-110 active:scale-95 transition-all"
                           >
                              {claiming ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />}
                           </button>
                        ) : (
                           <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center text-zinc-600">
                              <Star className="w-5 h-5 opacity-30" />
                           </div>
                        )}
                     </div>
                  </div>
               );
            })}

            {catalog.length === 0 && (
               <p className="text-center text-[10px] text-zinc-600 font-bold uppercase py-8">Aucune récompense disponible pour le moment.</p>
            )}
         </div>
      </div>

      <div className="bg-zinc-900/50 border border-white/5 rounded-3xl p-6 flex gap-4">
         <AlertCircle className="w-6 h-6 text-zinc-700 shrink-0" />
         <div>
            <p className="text-[10px] font-black text-zinc-500 uppercase">Comment ça marche ?</p>
            <p className="text-[10px] text-zinc-600 leading-relaxed mt-1">
               Accumulez des points à chaque repas. Une fois le seuil atteint, échangez-les contre un cadeau. 
               Les récompenses sont valables 30 jours.
            </p>
         </div>
      </div>
    </div>
  );
}
