"use client"

import React, { useState, useEffect } from 'react';
import { 
  getRecentCommandes, 
  updateOrderStatus 
} from "@/lib/actions";
import { 
  ChefHat, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Timer,
  Printer
} from "lucide-react";
import { cn } from "@/lib/utils";
import { logoutManager } from "@/lib/auth-actions";
import { printKitchenTicket } from "@/lib/thermal-printer";
import { toast } from "sonner";

export default function CuisinePageStandalone({ searchParams }: { searchParams: { resto_id?: string } }) {
  const restaurantId = searchParams.resto_id || "resto-99-default";
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const fetchProductionOrders = async () => {
    try {
      const all = await getRecentCommandes(restaurantId);
      const production = all.filter((o: any) => o.statut === "PREPARING");
      setOrders(production);
    } catch (error) {
      console.error("Cuisine: Failed to fetch orders", error);
      toast.error("Erreur de connexion au serveur.");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = (order: any) => {
    printKitchenTicket(order);
  };

  useEffect(() => {
    fetchProductionOrders();

    const eventSource = new EventSource(`/api/events?restaurantId=${restaurantId}`);
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "new-order" || data.type === "status-updated") {
          // Filtrage SaaS : Le chef ne voit que ses propres commandes
          if (!data.restaurantId || data.restaurantId === restaurantId) {
              fetchProductionOrders();
              if (data.type === "new-order") {
                 toast.info("Nouveau ticket en cuisine ! 👨‍🍳", { duration: 5000, position: "bottom-right" });
              }
          }
        }
      } catch (e) {
        console.error("SSE Parse Error", e);
      }
    };

    const interval = setInterval(fetchProductionOrders, 10000);
    return () => {
      eventSource.close();
      clearInterval(interval);
    };
  }, [restaurantId]);

  const handleFinish = async (id: string) => {
    try {
      const res = await updateOrderStatus(id, "READY");
      if (res.success) {
        toast.success("Commande prête ! Le serveur est notifié.", { position: "bottom-right" });
        fetchProductionOrders();
      } else {
        toast.error("Erreur de synchronisation.");
      }
    } catch (error) {
      toast.error("Une erreur est survenue.");
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6 flex flex-col gap-6 font-sans">
      <header className="flex justify-between items-center bg-zinc-900 border border-zinc-800 p-6 rounded-3xl shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <ChefHat className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tighter uppercase">Console Cuisine</h1>
            <p className="text-zinc-500 text-xs font-bold tracking-widest">SmartResto • Flux Direct Terminé</p>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
            <div className="text-right">
                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Commandes en cours</p>
                <p className="text-2xl font-black text-emerald-500">{orders.length}</p>
            </div>
            <div className="w-px h-10 bg-zinc-800" />
            <Clock className="w-6 h-6 text-zinc-500" />
        </div>
      </header>

      <main className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 content-start">
        {orders.length === 0 && !loading && (
          <div className="col-span-full py-40 flex flex-col items-center justify-center text-zinc-700">
             <Timer className="w-24 h-24 mb-6 opacity-10 animate-pulse" />
             <h2 className="text-2xl font-black uppercase tracking-widest italic">Aucun ticket</h2>
             <p className="text-zinc-500 font-medium">Tout est sous contrôle, chef.</p>
          </div>
        )}

        {orders.map((order) => (
          <div 
            key={order.id} 
            className="bg-zinc-900 border-2 border-zinc-800 rounded-[2.5rem] p-6 flex flex-col gap-6 shadow-xl hover:border-emerald-500/50 transition-all group animate-in zoom-in-95 duration-300"
          >
            <div className="flex justify-between items-start">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-black bg-zinc-800 text-zinc-400 px-2 py-1 rounded-full uppercase tracking-tighter w-fit">
                  #{order.id.slice(-4)}
                </span>
                <h3 className="text-4xl font-black italic tracking-tighter text-white">Table {order.table}</h3>
              </div>
              <div className="flex flex-col items-end gap-2">
                 <div className="flex items-center gap-2 bg-zinc-800/50 px-3 py-1.5 rounded-xl border border-zinc-700/50">
                    <Clock className="w-3.5 h-3.5 text-orange-500 animate-pulse" />
                    <span className="text-xs font-black text-orange-500 tabular-nums">
                       {Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 60000)}m écoulé
                    </span>
                 </div>
                 <button 
                  onClick={() => handlePrint(order)}
                  className="p-3 bg-zinc-800 rounded-2xl hover:bg-emerald-500/20 hover:text-emerald-500 transition-all text-zinc-400"
                  title="Imprimer Bon"
                >
                  <Printer className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 space-y-4">
               <div className="space-y-1">
                  <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Client</p>
                  <p className="font-bold text-zinc-200 text-lg">{order.client}</p>
               </div>
               
               <div className="bg-zinc-800/50 p-5 rounded-3xl border border-zinc-800/50">
                  <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-3">Articles à préparer</p>
                  <div className="space-y-4">
                     {order.items && order.items.length > 0 ? (
                       order.items.map((item: any, idx: number) => (
                         <div key={idx} className="space-y-1">
                           <div className="flex items-center gap-3">
                              <div className="w-6 h-6 bg-emerald-500/20 text-emerald-500 rounded-lg flex items-center justify-center font-black text-xs italic">{item.quantite}x</div>
                              <span className="font-bold text-zinc-100 text-lg italic uppercase tracking-tighter">{item.plat.nom}</span>
                           </div>
                           {item.selectedOptions?.detail?.length > 0 && (
                             <div className="flex flex-wrap gap-1 ml-9">
                                {item.selectedOptions.detail.map((opt: string, oIdx: number) => (
                                  <span key={oIdx} className="text-[9px] bg-zinc-700 text-zinc-300 font-bold px-2 py-0.5 rounded uppercase">{opt}</span>
                                ))}
                             </div>
                           )}
                         </div>
                       ))
                     ) : (
                       <div className="flex items-center gap-3">
                          <div className="w-6 h-6 bg-zinc-700 rounded-lg flex items-center justify-center font-bold text-xs italic">1x</div>
                          <span className="font-bold text-zinc-100 italic">Dégustation Royale</span>
                       </div>
                     )}
                  </div>
               </div>

               {order.noteSpeciale && (
                 <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-2xl">
                    <p className="text-[8px] font-black text-amber-500 uppercase tracking-widest mb-1">Indications</p>
                    <p className="text-xs text-amber-200 italic font-medium">"{order.noteSpeciale}"</p>
                 </div>
               )}
            </div>

            <button 
              onClick={() => handleFinish(order.id)}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-6 rounded-[2rem] flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-emerald-900/40 uppercase tracking-widest text-sm"
            >
              <CheckCircle2 className="w-5 h-5" />
              Marquer comme Terminé
            </button>
          </div>
        ))}
      </main>

      <footer className="h-12 flex items-center justify-between px-4 text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em] border-t border-zinc-900/50">
         <div className="flex gap-6">
            <span className="flex items-center gap-2 text-emerald-500 font-black"><div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"/> Live Kitchen</span>
            <span>Table Sync Active</span>
         </div>
         <div className="italic">SmartResto OS v1.2</div>
      </footer>


    </div>
  );
}
