"use client"

import React, { useState, useEffect } from 'react';
import { 
  getRecentCommandes, 
  updateOrderStatus 
} from "@/lib/actions";
import { getRestaurantById } from "@/lib/admin-actions";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { 
  ChefHat, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Timer,
  ArrowLeft
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function CuisinePage({ searchParams }: { searchParams: { resto_id?: string } }) {
  const router = useRouter();
  const [restoId, setRestoId] = useState<string>(searchParams.resto_id || "");
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [finishingId, setFinishingId] = useState<string | null>(null);
  const { setTheme, theme } = useTheme();

  const fetchProductionOrders = async (id: string) => {
    const all = await getRecentCommandes(id);
    const production = all.filter((o: any) => o.statut === "SUBMITTED" || o.statut === "PREPARING");
    setOrders(production);
    setLoading(false);
  };

  useEffect(() => {
    async function init() {
      let id = searchParams.resto_id;
      if (!id) {
        const { getManagerSession } = await import("@/lib/manager-actions");
        const session = await getManagerSession() as any;
        id = session?.id || "";
        if (id) setRestoId(id);
      }
      if (!id) return;

      getRestaurantById(id).then(r => {
        if (r) {
          const isExpired = r.subscriptionEnd ? new Date(r.subscriptionEnd) < new Date() : false;
          if (!r.active || isExpired) {
            router.push('/manager/subscription-expired');
            return;
          }
          if ((r as any).preferredTheme && (r as any).preferredTheme !== theme) {
            setTheme((r as any).preferredTheme);
          }
        }
      });

      fetchProductionOrders(id);

      const eventSource = new EventSource(`/api/events?restaurantId=${id}`);
      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === "new-order" || data.type === "status-updated") {
          fetchProductionOrders(id!);
        }
      };

      const interval = setInterval(() => fetchProductionOrders(id!), 4000);
      return () => {
        eventSource.close();
        clearInterval(interval);
      };
    }
    init();
  }, [searchParams.resto_id]);

  const handleFinish = async (id: string) => {
    setFinishingId(id);
    try {
        const res = await updateOrderStatus(id, "READY");
        if (res.success) {
            toast.success("Ticket marqué comme prêt !");
            fetchProductionOrders(restoId);
        } else {
            toast.error("Erreur lors de la mise à jour");
        }
    } catch (e) {
        toast.error("Une erreur technique est survenue");
    } finally {
        setFinishingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-6 flex flex-col gap-6">
      <header className="flex justify-between items-center bg-card border border-border p-6 rounded-3xl shadow-2xl">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.push(`/manager/selection?resto_id=${restoId}`)}
            className="p-3 bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground rounded-2xl transition-all active:scale-95 group"
            title="Changer de rôle"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          </button>
          <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <ChefHat className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tighter uppercase">Console Cuisine</h1>
            <p className="text-muted-foreground text-xs font-bold tracking-widest">SmartResto • Production en direct</p>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
            <div className="text-right">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">En cours</p>
                <p className="text-2xl font-black text-emerald-500">{orders.length}</p>
            </div>
            <div className="w-px h-10 bg-border" />
            <Clock className="w-6 h-6 text-muted-foreground" />
        </div>
      </header>

      <main className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 content-start">
        {orders.length === 0 && !loading && (
          <div className="col-span-full py-32 flex flex-col items-center justify-center text-muted-foreground">
             <Timer className="w-20 h-20 mb-4 opacity-10 animate-pulse" />
             <h2 className="text-xl font-bold uppercase tracking-widest">Aucun ticket en attente</h2>
             <p className="text-sm">Reposez-vous, chef. Le calme avant la tempête !</p>
          </div>
        )}

        {orders.map((order) => (
          <div 
            key={order.id} 
            className="bg-card border-2 border-border rounded-[2.5rem] p-6 flex flex-col gap-6 shadow-xl hover:border-emerald-500/50 transition-all group animate-in zoom-in-95 duration-300"
          >
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-black bg-secondary text-muted-foreground px-2 py-1 rounded-full uppercase tracking-tighter mb-2 inline-block">
                  #{order.id.slice(-4)}
                </span>
                <h3 className="text-4xl font-black italic tracking-tighter text-foreground">Table {order.table}</h3>
              </div>
              <div className="bg-secondary p-2 rounded-xl group-hover:bg-emerald-500/10 transition-colors">
                <AlertCircle className="w-5 h-5 text-muted-foreground group-hover:text-emerald-500" />
              </div>
            </div>

            <div className="flex-1 space-y-4">
               <div className="space-y-1">
                  <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Client</p>
                  <p className="font-bold text-zinc-200">{order.client}</p>
               </div>
               
               {/* Vrais plats de la commande */}
               <div className="bg-zinc-800/50 p-4 rounded-3xl border border-zinc-800/50">
                  <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-2">Ticket Cuisine</p>
                  <ul className="space-y-2">
                     {order.items?.length > 0 ? order.items.map((item: any, idx: number) => {
                        let selectedOpts = [];
                        try {
                          if (item.options) {
                            const parsed = JSON.parse(item.options);
                            selectedOpts = parsed.detail || [];
                          }
                        } catch (e) {}

                        return (
                          <li key={idx} className="flex flex-col gap-1 border-b border-zinc-800/20 pb-2 last:border-0 last:pb-0">
                             <div className="flex justify-between items-center text-sm">
                                <div className="flex items-center gap-2">
                                   <span className="font-black text-emerald-400">{item.quantite}x</span>
                                   <span className="font-bold text-white italic">{item.plat?.nom || "Plat"}</span>
                                </div>
                                {item.plat?.prixUsd && (
                                  <span className="text-[9px] text-zinc-500 font-bold">${(item.plat.prixUsd * item.quantite).toFixed(2)}</span>
                                )}
                             </div>
                             {selectedOpts.length > 0 && (
                               <div className="flex flex-wrap gap-1">
                                 {selectedOpts.map((opt: string, i: number) => (
                                   <span key={i} className="text-[9px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full font-black uppercase">
                                     {opt}
                                   </span>
                                 ))}
                               </div>
                             )}
                          </li>
                        );
                     }) : (
                       <li className="text-xs text-zinc-600 italic">Détails non disponibles</li>
                     )}
                  </ul>
               </div>

               {order.noteSpeciale && (
                 <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-2xl">
                    <p className="text-[8px] font-black text-amber-500 uppercase tracking-widest mb-1">Note Spéciale</p>
                    <p className="text-xs text-amber-200 italic">"{order.noteSpeciale}"</p>
                 </div>
               )}
            </div>

            <button 
              onClick={() => handleFinish(order.id)}
              disabled={finishingId === order.id}
              className={cn(
                  "w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-5 rounded-[2rem] flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-emerald-900/40 uppercase tracking-widest text-sm",
                  finishingId === order.id && "opacity-50 cursor-not-allowed"
              )}
            >
              {finishingId === order.id ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                  <CheckCircle2 className="w-5 h-5" />
              )}
              {finishingId === order.id ? "Traitement..." : "Terminé"}
            </button>
          </div>
        ))}
      </main>

      <footer className="h-10 flex items-center justify-between px-4 text-[10px] font-bold text-zinc-600 uppercase tracking-[0.2em]">
         <div className="flex gap-4">
            <span>Server: ON</span>
            <span>Database: MEMORY_SYNC</span>
         </div>
         <div>SmartResto v1.0.4</div>
      </footer>
    </div>
  );
}
