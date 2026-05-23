"use client"

import React, { useState } from 'react';
import { Ticket, X, Loader2, Copy, CheckCircle2 } from "lucide-react";
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
      toast.success("Code copié !");
      setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-primary hover:bg-primary hover:text-black transition-all duration-300"
        title="Mes codes promos"
      >
        <Ticket className="w-4 h-4" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setIsOpen(false)} />
          
          <div className="relative bg-card border border-border shadow-2xl rounded-3xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[80vh]">
            
            <div className="flex items-center justify-between p-6 pb-4 border-b border-border/50">
              <div>
                <h3 className="text-xl font-bold flex items-center gap-2">
                    <Ticket className="w-5 h-5 text-primary" /> Mes codes promos
                </h3>
                <p className="text-xs text-muted-foreground mt-1">Saisissez votre numéro pour consulter vos codes exclusifs.</p>
              </div>
              <button 
                  onClick={() => setIsOpen(false)}
                  className="bg-secondary hover:bg-secondary/80 p-2 rounded-full transition-colors self-start"
              >
                  <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto">
                <div className="flex gap-2">
                  <input
                    type="tel"
                    placeholder="Votre numéro de téléphone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="flex-1 bg-secondary/50 border border-border rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-1 focus:ring-primary"
                  />
                  <button 
                    onClick={fetchCodes}
                    disabled={isLoading || !phone}
                    className="bg-primary text-black px-4 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] disabled:opacity-50 min-w-[90px] flex justify-center items-center"
                  >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Rechercher"}
                  </button>
                </div>

                {hasSearched && (
                    <div className="mt-4 space-y-3">
                        {myRewards.length === 0 ? (
                            <div className="text-center py-6 bg-secondary/30 rounded-2xl border border-dashed border-border">
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Aucun code disponible</p>
                            </div>
                        ) : (
                            myRewards.map((reward) => (
                                <div key={reward.id} className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-black uppercase text-foreground tracking-wider">{reward.promoCode}</p>
                                        <p className="text-[10px] font-bold text-primary mt-0.5">Réduction de -{reward.discountValue}%</p>
                                    </div>
                                    <button 
                                        onClick={() => handleCopy(reward.id, reward.promoCode)}
                                        className={cn(
                                            "w-10 h-10 rounded-xl flex items-center justify-center transition-colors border",
                                            copiedId === reward.id 
                                                ? "bg-emerald-500 text-black border-emerald-500" 
                                                : "bg-secondary text-muted-foreground border-border hover:text-foreground hover:bg-secondary/80"
                                        )}
                                    >
                                        {copiedId === reward.id ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>

          </div>
        </div>
      )}
    </>
  );
}
