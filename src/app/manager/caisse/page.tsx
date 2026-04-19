"use client"

import React, { useState, useEffect } from 'react';
import { 
  getRecentCommandes, 
  updateOrderStatus,
  confirmOrderPayment 
} from "@/lib/actions";
import { getRestaurantById } from "@/lib/admin-actions";
import { 
  Wallet, 
  ChevronRight, 
  Clock, 
  CheckCircle2, 
  Info,
  DollarSign,
  CreditCard,
  Banknote,
  Send,
  Printer,
  ArrowLeft
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { printReceipt } from "@/lib/thermal-printer";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";

export default function CaissePage({ searchParams }: { searchParams: { resto_id?: string } }) {
  const router = useRouter();
  const restaurantId = searchParams.resto_id || "resto-99-default";
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [printingOrder, setPrintingOrder] = useState<any>(null);
  const [restaurantName, setRestaurantName] = useState("SmartResto");
  const { setTheme, theme } = useTheme();
  
  const fetchOrders = async () => {
    const all = await getRecentCommandes(restaurantId);
    // On ne montre à la caisse que ce qui est "SUBMITTED" (Attente validation) ou "READY" (Prêt pour paiement final/clôture)
    const filtered = all.filter((o: any) => o.statut === "SUBMITTED" || o.statut === "READY");
    setOrders(filtered);
    setLoading(false);
  };

  useEffect(() => {
    // Initial fetch of restaurant name
    getRestaurantById(restaurantId).then(r => {
      if (r) {
        const isExpired = r.subscriptionEnd ? new Date(r.subscriptionEnd) < new Date() : false;
        if (!r.active || isExpired) {
          router.push('/manager/subscription-expired');
          return;
        }
        setRestaurantName(r.nom || "SmartResto");
        if ((r as any).preferredTheme && (r as any).preferredTheme !== theme) {
            setTheme((r as any).preferredTheme);
        }
      }
    });

    fetchOrders();

    const eventSource = new EventSource(`/api/events?restaurantId=${restaurantId}`);
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "new-order" || data.type === "status-updated") {
        if (!data.restaurantId || data.restaurantId === restaurantId) {
            fetchOrders();
        }
      }
    };

    const interval = setInterval(fetchOrders, 10000);
    return () => {
      eventSource.close();
      clearInterval(interval);
    };
  }, [restaurantId]);

  const handleValidate = async (id: string) => {
    // SUBMITTED -> PREPARING (Envoi en cuisine)
    const res = await updateOrderStatus(id, "PREPARING");
    if (res.success) {
      fetchOrders();
    }
  };

  const handleComplete = async (id: string, method: string) => {
    // READY -> COMPLETED (Paiement et clôture)
    const res = await confirmOrderPayment(id, method);
    if (res.success) {
      toast.success("Commande encaissée avec succès !", { position: "top-center" });
      fetchOrders();
    } else {
      toast.error("Erreur lors de l'encaissement.");
    }
  };

  const handlePrintReceipt = (order: any) => {
    printReceipt(order, restaurantName);
  };

  return (
    <>
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 print:hidden text-foreground">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card p-8 rounded-[2rem] shadow-sm border border-border">
        <div className="flex items-center gap-5">
          <button 
            onClick={() => router.push(`/manager/selection?resto_id=${restaurantId}`)}
            className="p-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-400 hover:text-indigo-600 rounded-2xl transition-all active:scale-95 group"
            title="Changer de rôle"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          </button>
          <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200">
            <Wallet className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-foreground uppercase italic">Interface Caisse</h1>
            <p className="text-indigo-500 text-[10px] font-black uppercase tracking-[0.2em]">Validation Financière & Flux Commandes</p>
          </div>
        </div>
        <div className="flex gap-4">
           <div className="bg-indigo-500/10 px-6 py-3 rounded-2xl border border-indigo-500/20 flex flex-col items-end">
              <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">En attente</span>
              <span className="text-xl font-black text-indigo-500">{orders.filter(o => o.statut === 'SUBMITTED').length}</span>
           </div>
           <div className="bg-emerald-500/10 px-6 py-3 rounded-2xl border border-emerald-500/20 flex flex-col items-end">
              <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Prêts / À Payer</span>
              <span className="text-xl font-black text-emerald-500">{orders.filter(o => o.statut === 'READY').length}</span>
           </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Colonne 1: Nouvelles Commandes (Wait for Validation) */}
        <section className="space-y-6">
          <div className="flex items-center gap-3 px-2">
             <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
             <h2 className="text-sm font-black uppercase tracking-widest text-muted-foreground italic">Attente Validation (Client → Cuisine)</h2>
          </div>
          
          <div className="space-y-4">
            {orders.filter(o => o.statut === 'SUBMITTED').length === 0 && !loading && (
              <div className="bg-secondary/50 border-2 border-dashed border-border rounded-[2rem] py-20 flex flex-col items-center justify-center text-muted-foreground">
                 <Clock className="w-12 h-12 mb-4 opacity-20" />
                 <p className="font-bold text-xs uppercase tracking-widest">Pas de nouvelle commande</p>
              </div>
            )}
            
            {orders.filter(o => o.statut === 'SUBMITTED').map((order) => (
              <OrderCard 
                key={order.id} 
                order={order} 
                onAction={() => handleValidate(order.id)}
                actionLabel="Valider & Envoyer en cuisine"
                actionIcon={<Send className="w-4 h-4" />}
                variant="indigo"
              />
            ))}
          </div>
        </section>

        {/* Colonne 2: Commandes Prêtes (Wait for Payment) */}
        <section className="space-y-6">
           <div className="flex items-center gap-3 px-2">
             <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
             <h2 className="text-sm font-black uppercase tracking-widest text-slate-500 italic">Prêt à servir / À Encaisser</h2>
          </div>

          <div className="space-y-4">
            {orders.filter(o => o.statut === 'READY').length === 0 && !loading && (
              <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2rem] py-20 flex flex-col items-center justify-center text-slate-400">
                 <CheckCircle2 className="w-12 h-12 mb-4 opacity-20" />
                 <p className="font-bold text-xs uppercase tracking-widest">Aucune commande prête</p>
              </div>
            )}
            
            {orders.filter(o => o.statut === 'READY').map((order) => (
              <div key={order.id} className="bg-card border border-border rounded-[2.5rem] overflow-hidden shadow-sm hover:shadow-md transition-all group">
                 <div className="p-6 space-y-6">
                    <div className="flex justify-between items-start">
                       <div>
                          <p className="text-[10px] font-black text-emerald-500 uppercase tracking-tighter mb-1">Table {order.table}</p>
                          <h3 className="text-xl font-black text-foreground">#{order.id.slice(-4)} • {order.client}</h3>
                       </div>
                       <div className="bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                          <span className="text-[10px] font-black text-emerald-600 uppercase">PRÊT</span>
                       </div>
                    </div>

                    <div className="flex items-center justify-between bg-secondary p-4 rounded-2xl">
                       <span className="text-xs font-bold text-muted-foreground uppercase">Total à payer</span>
                       <span className="text-2xl font-black text-foreground italic">${order.totalUsd.toFixed(2)}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-3">
                       <button 
                        onClick={() => handleComplete(order.id, 'CASH')}
                        className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black py-4 rounded-2xl transition-all active:scale-95 text-xs uppercase tracking-widest shadow-lg shadow-emerald-500/20"
                       >
                          <Banknote className="w-4 h-4" />
                          Espèces
                       </button>
                       <button 
                        onClick={() => handleComplete(order.id, 'MOBILE')}
                        className="flex items-center justify-center gap-2 bg-foreground text-background font-black py-4 rounded-2xl transition-all active:scale-95 text-xs uppercase tracking-widest h-full"
                       >
                          <CreditCard className="w-4 h-4" />
                          Mobile
                       </button>
                    </div>
                    <button 
                      onClick={() => handlePrintReceipt(order)}
                      className="w-full flex items-center justify-center gap-2 bg-secondary hover:bg-secondary/80 text-muted-foreground font-black py-3 rounded-2xl transition-all active:scale-95 text-xs uppercase tracking-widest border border-border"
                    >
                      <Printer className="w-4 h-4" />
                      Imprimer Facture (PDF)
                    </button>
                 </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>

    </>
  );
}

function OrderCard({ order, onAction, actionLabel, actionIcon, variant }: any) {
  const isIndigo = variant === 'indigo';
  
  return (
    <div className={cn(
      "bg-card border rounded-[2rem] overflow-hidden shadow-sm hover:shadow-md transition-all group",
      isIndigo ? "border-indigo-500/20" : "border-border"
    )}>
       <div className="p-6 space-y-4">
          <div className="flex justify-between items-start">
             <div>
                <p className={cn("text-[10px] font-black uppercase tracking-tighter mb-1", isIndigo ? "text-indigo-500" : "text-muted-foreground")}>Table {order.table}</p>
                <h3 className="text-lg font-black text-foreground">#{order.id.slice(-4)} • {order.client}</h3>
                <p className="text-[10px] text-muted-foreground font-bold italic">{format(new Date(order.createdAt), "HH:mm '•' d MMMM", { locale: fr })}</p>
             </div>
             <div className="text-right">
                <span className="text-xl font-black text-foreground">${order.totalUsd.toFixed(2)}</span>
                <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest">Total Estimé</p>
             </div>
          </div>

          <div className="bg-secondary/50 rounded-2xl p-4 border border-border/50">
             <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">Détail commande</p>
             <div className="space-y-2">
                {order.items?.map((item: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between text-xs">
                     <div className="flex items-center gap-2">
                        <span className="font-black text-indigo-500">{item.quantite}x</span>
                        <span className="font-bold text-foreground italic">{item.plat.nom}</span>
                     </div>
                     <span className="text-muted-foreground font-medium">${(item.plat.prixUsd * item.quantite).toFixed(2)}</span>
                  </div>
                ))}
             </div>
          </div>

          {order.noteSpeciale && (
            <div className="flex items-center gap-2 text-amber-600 bg-amber-50 p-2 rounded-xl border border-amber-100">
               <Info className="w-3 h-3 flex-shrink-0" />
               <p className="text-[10px] font-bold italic truncate">"{order.noteSpeciale}"</p>
            </div>
          )}

          <button 
            onClick={onAction}
            className={cn(
              "w-full flex items-center justify-center gap-2 font-black py-4 rounded-2xl transition-all active:scale-95 mt-4 text-xs uppercase tracking-widest shadow-xl",
              isIndigo ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/10" : "bg-foreground text-background"
            )}
          >
             {actionIcon}
             {actionLabel}
             <ChevronRight className="w-4 h-4 ml-1" />
          </button>
       </div>
    </div>
  );
}
