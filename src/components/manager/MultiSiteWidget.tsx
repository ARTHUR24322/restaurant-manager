"use client"

import React, { useState, useEffect } from "react";
import { getMultiSiteStats } from "@/lib/multi-site-actions";
import { 
  Building2, 
  MapPin, 
  DollarSign, 
  ShoppingCart, 
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Globe,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";

export function MultiSiteWidget({ proprietorEmail, currentRestoId }: { proprietorEmail: string, currentRestoId: string }) {
  const [stats, setStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      setLoading(true);
      const data = await getMultiSiteStats(proprietorEmail);
      // Filtrer le restaurant actuel pour ne montrer que les AUTRES
      setStats(data.filter(r => r.id !== currentRestoId));
      setLoading(false);
    }
    loadStats();
    
    const interval = setInterval(loadStats, 30000); // Refresh all 30s
    return () => clearInterval(interval);
  }, [proprietorEmail, currentRestoId]);

  if (loading && stats.length === 0) {
    return (
      <div className="bg-card rounded-3xl p-8 border border-border shadow-sm flex flex-col items-center justify-center min-h-[200px]">
        <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
        <p className="text-sm text-muted-foreground animate-pulse">Chargement de vos autres établissements...</p>
      </div>
    );
  }

  if (stats.length === 0) return null;

  return (
    <div className="bg-card rounded-3xl p-8 border border-emerald-500/20 shadow-xl shadow-emerald-500/5 overflow-hidden relative group">
      {/* Background Decoration */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-bl-[5rem] pointer-events-none" />
      
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Globe className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-black text-white italic uppercase tracking-tighter">Multi-Établissements</h3>
            <p className="text-[10px] text-emerald-500 font-black uppercase tracking-widest">Vue d'ensemble en temps réel</p>
          </div>
        </div>
        <div className="px-3 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/20">
           <span className="text-[10px] font-black text-emerald-500 uppercase tracking-tighter animate-pulse">LIVE</span>
        </div>
      </div>

      <div className="space-y-4">
        {stats.map((resto) => (
          <div 
            key={resto.id}
            className="group/item flex flex-col md:flex-row items-center justify-between bg-zinc-900/40 hover:bg-zinc-900/80 border border-white/[0.03] hover:border-emerald-500/30 p-5 rounded-2xl transition-all duration-300"
          >
            <div className="flex items-center gap-4 w-full md:w-1/3">
               <div className="w-12 h-12 bg-zinc-800 rounded-xl flex items-center justify-center border border-white/5 group-hover/item:border-emerald-500/30 transition-colors">
                  <Building2 className="w-6 h-6 text-zinc-500 group-hover/item:text-emerald-500 transition-colors" />
               </div>
               <div>
                  <h4 className="font-bold text-white leading-tight">{resto.nom}</h4>
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-1">
                    <MapPin className="w-3 h-3" /> {resto.ville}
                  </p>
               </div>
            </div>

            <div className="flex items-center justify-around w-full md:w-1/2 py-4 md:py-0">
               <div className="text-center">
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Commandes</p>
                  <div className="flex items-center justify-center gap-1.5">
                     <ShoppingCart className="w-3 h-3 text-emerald-500" />
                     <span className="font-black text-sm text-white">{resto.dailyOrders}</span>
                  </div>
               </div>
               <div className="w-px h-8 bg-white/5" />
               <div className="text-center">
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">CA Aujourd'hui</p>
                  <div className="flex items-center justify-center gap-1.5">
                     <span className="text-emerald-500 font-black text-sm">${resto.dailyRevenue.toFixed(2)}</span>
                     <TrendingUp className="w-3 h-3 text-emerald-500" />
                  </div>
               </div>
            </div>

            <button 
              onClick={() => window.open(`/manager/dashboard?resto_id=${resto.id}`, '_blank')}
              className="w-full md:w-auto px-5 py-2.5 bg-zinc-800 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 group-hover/item:shadow-lg group-hover/item:shadow-emerald-500/20"
            >
              Suivre <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>

      <div className="mt-6 pt-6 border-t border-white/5 flex items-center justify-between">
         <p className="text-[10px] text-muted-foreground font-medium italic">
           Total cumulé (Multi-site) : <span className="text-emerald-500 font-bold">${stats.reduce((acc, r) => acc + r.dailyRevenue, 0).toFixed(2)}</span>
         </p>
         <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
               <div className="w-2 h-2 bg-emerald-500 rounded-full" />
               <span className="text-[9px] font-black text-muted-foreground uppercase tracking-tighter">Synchronisé</span>
            </div>
         </div>
      </div>
    </div>
  );
}
