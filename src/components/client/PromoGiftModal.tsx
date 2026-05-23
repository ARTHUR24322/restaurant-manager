"use client"

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Ticket, X, Loader2, Copy, CheckCircle2, Sparkles, Phone } from "lucide-react";
import { cn } from "@/lib/utils";
import { getClientLoyalty } from '@/lib/actions-loyalty';
import { type ClientReward } from '@/types';
import { toast } from "sonner";

export function PromoGiftModal({ restaurantId }: { restaurantId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [myRewards, setMyRewards] = useState<ClientReward[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const fetchCodes = async () => {
    if (!phone) {
        toast.error("Veuillez entrer votre numéro");
        return;
    }
    setIsLoading(true);
    setHasSearched(false);
    try {
        const res = await getClientLoyalty(restaurantId, phone);
        if (res.success) {
            setMyRewards(res.myRewards || []);
        } else {
            toast.error("Erreur lors de la récupération");
        }
    } catch {
        toast.error("Problème de connexion");
    }
    setHasSearched(true);
    setIsLoading(false);
  };

  const handleCopy = (id: string, code: string | null) => {
      if (!code) return;
      navigator.clipboard.writeText(code);
      setCopiedId(id);
      toast.success("Code promo copié !");
      setTimeout(() => setCopiedId(null), 2000);
  };

  const modalContent = isOpen && isMounted ? (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-background/90 backdrop-blur-md animate-in fade-in duration-300" 
        onClick={() => setIsOpen(false)} 
      />
      
      {/* Modal Container */}
      <div className="relative w-full max-w-sm bg-zinc-950 border border-white/10 shadow-[0_0_50px_-12px_rgba(0,0,0,1)] rounded-[2rem] overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[85vh]">
        
        {/* Decorative Top Glow */}
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
        <div className="absolute top-0 inset-x-0 h-32 bg-primary/5 blur-3xl rounded-full" />

        {/* Header */}
        <div className="relative z-10 flex items-center justify-between p-6 pb-4">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-2xl bg-primary/20 flex flex-col items-center justify-center border border-primary/20">
                <Sparkles className="w-5 h-5 text-primary drop-shadow-[0_0_8px_rgba(var(--primary),0.5)]" />
             </div>
             <div>
               <h3 className="text-lg font-black text-white italic tracking-tighter leading-none">
                  Cadeaux
               </h3>
               <p className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest mt-1">
                  Vos codes promos
               </p>
             </div>
          </div>
          <button 
              onClick={() => setIsOpen(false)}
              className="w-8 h-8 flex items-center justify-center bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white rounded-full transition-all"
          >
              <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="relative z-10 p-6 space-y-6 overflow-y-auto no-scrollbar">
            
            {/* Input Section */}
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase text-zinc-400 tracking-widest px-1">
                 Confirmez votre identité
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                   <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                   <input
                     type="tel"
                     placeholder="Numéro de tél..."
                     value={phone}
                     onChange={(e) => setPhone(e.target.value)}
                     className="w-full bg-zinc-900 border border-white/5 rounded-2xl pl-10 pr-4 py-3.5 text-sm font-black text-white outline-none focus:ring-1 focus:ring-primary focus:border-primary/50 transition-all placeholder:text-zinc-600"
                   />
                </div>
                <button 
                  onClick={fetchCodes}
                  disabled={isLoading || !phone}
                  className="bg-primary hover:bg-primary/90 text-black px-5 rounded-2xl font-black uppercase tracking-widest text-[10px] disabled:opacity-50 transition-all flex justify-center items-center active:scale-95 shadow-xl shadow-primary/20"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Go"}
                </button>
              </div>
            </div>

            {hasSearched && (
                <div className="space-y-4 animate-in slide-in-from-bottom-2 duration-300">
                    <h4 className="text-[10px] font-black uppercase text-zinc-500 tracking-[0.2em] px-1">
                      Codes Disponibles
                    </h4>
                    {myRewards.length === 0 ? (
                        <div className="text-center p-6 bg-zinc-900/50 rounded-3xl border border-white/5">
                            <Ticket className="w-8 h-8 text-zinc-700 mx-auto mb-3" />
                            <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
                                Aucun code trouvé
                            </p>
                            <p className="text-[10px] text-zinc-600 mt-1">
                                Commandez pour en gagner !
                            </p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-3">
                            {myRewards.map((reward) => (
                                <div key={reward.id} className="relative group bg-zinc-900 border border-white/5 rounded-3xl p-4 flex items-center justify-between overflow-hidden transition-all hover:bg-zinc-800/80 hover:border-white/10">
                                    <div className="absolute inset-y-0 left-0 w-1 bg-emerald-500 rounded-l-3xl" />
                                    
                                    <div className="pl-3">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-sm font-black text-white tracking-widest font-mono">
                                                {reward.promoCode}
                                            </span>
                                        </div>
                                        <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest flex items-center gap-1">
                                           <Ticket className="w-3 h-3" /> Réduction -{reward.discountValue}%
                                        </p>
                                    </div>
                                    <button 
                                        onClick={() => handleCopy(reward.id, reward.promoCode)}
                                        className={cn(
                                            "w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-lg",
                                            copiedId === reward.id 
                                                ? "bg-emerald-500 text-black scale-110 shadow-emerald-500/20" 
                                                : "bg-white/5 text-zinc-400 hover:text-white hover:bg-primary/20 hover:text-primary active:scale-95"
                                        )}
                                    >
                                        {copiedId === reward.id ? <CheckCircle2 className="w-5 h-5 animate-in zoom-in" /> : <Copy className="w-5 h-5" />}
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-primary group hover:bg-primary transition-all duration-300 shadow-[0_0_15px_rgba(255,255,255,0.05)] hover:shadow-[0_0_20px_rgba(255,215,0,0.3)] relative overflow-hidden"
        title="Mes codes promos"
      >
        <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
        <Ticket className="w-5 h-5 text-white group-hover:text-black relative z-10 transition-colors" />
      </button>

      {/* Render the modal inside a Portal to fix z-index overlay issues */}
      {isMounted && document.body ? createPortal(modalContent, document.body) : null}
    </>
  );
}
