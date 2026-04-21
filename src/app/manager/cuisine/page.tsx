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
  ArrowLeft,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ConfirmModal } from "@/components/manager/ConfirmModal";

export default function CuisinePage({ searchParams }: { searchParams: { resto_id?: string } }) {
  const router = useRouter();
  const [restoId, setRestoId] = useState<string>(searchParams.resto_id || "");
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [finishingId, setFinishingId] = useState<string | null>(null);
  const { setTheme, theme } = useTheme();

  // --- ETAT MODALE ---
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingOrder, setPendingOrder] = useState<any>(null);

  const fetchProductionOrders = async (id: string) => {
    const all = await getRecentCommandes(id);
    // On ne récupère QUE "PREPARING" pour que ça n'apparaisse pas avant la validation du Caissier ("SUBMITTED")
    const production = all.filter((o: any) => o.statut === "PREPARING");
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

      const cached = sessionStorage.getItem(`resto_profile_${id}`);
      if (cached) {
        const r = JSON.parse(cached);
        const isExpired = r.subscriptionEnd ? new Date(r.subscriptionEnd) < new Date() : false;
        if (!r.active || isExpired) {
          router.push('/manager/subscription-expired');
          return;
        }
        if (r.preferredTheme && r.preferredTheme !== theme) {
          setTheme(r.preferredTheme);
        }
      } else {
        getRestaurantById(id).then(r => {
          if (r) {
            sessionStorage.setItem(`resto_profile_${id}`, JSON.stringify(r));
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
      }

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

  const handleFinishRequest = (order: any) => {
    setPendingOrder(order);
    setShowConfirm(true);
  };

  const handleConfirmFinish = async () => {
    if (!pendingOrder) return;
    
    setFinishingId(pendingOrder.id);
    try {
        const res = await updateOrderStatus(pendingOrder.id, "READY");
        if (res.success) {
            toast.success(`Table ${pendingOrder.table} prête !`);
            fetchProductionOrders(restoId);
        } else {
            toast.error("Erreur lors de la mise à jour");
        }
    } catch (e) {
        toast.error("Une erreur technique est survenue");
    } finally {
        setFinishingId(null);
        setShowConfirm(false);
        setPendingOrder(null);
    }
  };

  if (loading && !orders.length) {
      return (
          <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4">
              <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
              <p className="text-zinc-500 text-[10px] font-black uppercase mt-4 tracking-widest">Connexion Cuisine...</p>
          </div>
      );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6 flex flex-col gap-6 animate-in fade-in duration-300">
      <header className="flex justify-between items-center bg-zinc-900 border border-zinc-800 p-8 rounded-[2.5rem] shadow-2xl">
        <div className="flex items-center gap-6">
          <button 
            onClick={() => router.push(`/manager/selection?resto_id=${restoId}`)}
            className="p-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-2xl transition-all active:scale-95 group border border-zinc-700"
            title="Changer de rôle"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          </button>
          <div className="w-14 h-14 bg-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <ChefHat className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black italic tracking-tighter uppercase text-white leading-none">Console Cuisine</h1>
            <p className="text-emerald-500 text-[10px] font-black tracking-widest mt-1 uppercase">Production en Temps Réel</p>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
            <div className="text-right">
                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Tickets Actifs</p>
                <p className="text-3xl font-black text-emerald-500 italic tracking-tighter">{orders.length}</p>
            </div>
            <div className="w-px h-10 bg-zinc-800" />
            <Clock className="w-8 h-8 text-zinc-700" />
        </div>
      </header>

      <main className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 content-start">
        {orders.length === 0 && !loading && (
          <div className="col-span-full py-48 flex flex-col items-center justify-center text-zinc-600">
             <Timer className="w-24 h-24 mb-6 opacity-5 animate-pulse" />
             <h2 className="text-xl font-black uppercase italic tracking-widest opacity-20">Calme en cuisine</h2>
             <p className="text-xs font-bold mt-2 opacity-10">En attente de nouvelles commandes...</p>
          </div>
        )}

        {orders.map((order) => (
          <div 
            key={order.id} 
            className="bg-zinc-900 border-2 border-zinc-800/50 rounded-[3rem] p-8 flex flex-col gap-6 shadow-2xl hover:border-emerald-500/30 transition-all group animate-in zoom-in-95 duration-200"
          >
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-black bg-zinc-800 text-zinc-500 px-3 py-1 rounded-full uppercase tracking-widest mb-3 inline-block">
                  #{order.id.slice(-4)}
                </span>
                <h3 className="text-5xl font-black italic tracking-tighter text-white">Table {order.table}</h3>
              </div>
              <div className="bg-zinc-800/50 p-3 rounded-2xl border border-zinc-800">
                <AlertCircle className="w-6 h-6 text-zinc-700 group-hover:text-emerald-500 transition-colors" />
              </div>
            </div>

            <div className="flex-1 space-y-6">
               <div className="space-y-1">
                  <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Client</p>
                  <p className="font-black text-zinc-300 italic text-lg uppercase tracking-tight">{order.client}</p>
               </div>
               
               <div className="bg-zinc-950 p-6 rounded-[2rem] border border-zinc-800/50">
                  <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-4">Bon de Commande</p>
                  <ul className="space-y-4">
                     {order.items?.length > 0 ? order.items.map((item: any, idx: number) => {
                        let selectedOpts = [];
                        try {
                          if (item.options) {
                            const parsed = JSON.parse(item.options);
                            selectedOpts = parsed.detail || [];
                          }
                        } catch (e) {}

                        return (
                          <li key={idx} className="flex flex-col gap-2 border-b border-zinc-800/20 pb-4 last:border-0 last:pb-0">
                             <div className="flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                   <span className="text-xl font-black text-emerald-500">{item.quantite}x</span>
                                   <span className="font-black text-white italic text-base uppercase tracking-tighter">{item.plat?.nom || "Plat"}</span>
                                </div>
                             </div>
                             {selectedOpts.length > 0 && (
                               <div className="flex flex-wrap gap-2">
                                 {selectedOpts.map((opt: string, i: number) => (
                                   <span key={i} className="text-[9px] bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full font-black uppercase tracking-widest">
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
                 <div className="bg-amber-500/5 border border-amber-500/10 p-4 rounded-2xl">
                    <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest mb-1">Instruction Spéciale</p>
                    <p className="text-xs text-amber-200/70 italic font-bold">"{order.noteSpeciale}"</p>
                 </div>
               )}
            </div>

            <button 
              onClick={() => handleFinishRequest(order)}
              disabled={finishingId === order.id}
              className={cn(
                  "w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-6 rounded-[2.5rem] flex items-center justify-center gap-3 transition-all active:scale-95 shadow-xl shadow-emerald-900/40 uppercase tracking-[0.2em] text-[10px]",
                  finishingId === order.id && "opacity-50 cursor-not-allowed"
              )}
            >
              {finishingId === order.id ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                  <CheckCircle2 className="w-5 h-5" />
              )}
              {finishingId === order.id ? "Validation..." : "Prêt pour le Service"}
            </button>
          </div>
        ))}
      </main>

      <footer className="h-16 flex items-center justify-between px-4 text-[10px] font-black text-zinc-700 uppercase tracking-[0.3em]">
         <div className="flex gap-6">
            <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> System Active</span>
            <span>Real-time Sync</span>
         </div>
         <div>SmartResto v1.0.4</div>
      </footer>

      <ConfirmModal
        show={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleConfirmFinish}
        title="Sortie Cuisine"
        message={`Confirmez-vous que la commande de la Table ${pendingOrder?.table} est prête à être servie ?`}
        confirmLabel="Terminer le ticket"
        variant="success"
        isLoading={finishingId !== null}
      />
    </div>
  );
}
