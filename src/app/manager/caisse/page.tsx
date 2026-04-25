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
  ArrowLeft,
  Loader2
} from "lucide-react";
import { cn, safeJsonParse } from "@/lib/utils";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { printReceipt } from "@/lib/thermal-printer";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { ConfirmModal } from "@/components/manager/ConfirmModal";

export default function CaissePage({ searchParams }: { searchParams: { resto_id?: string } }) {
  const router = useRouter();
  const [restaurantId, setRestaurantId] = useState<string>(searchParams.resto_id || "");
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [restaurantName, setRestaurantName] = useState("SmartResto");
  const [restaurantTel, setRestaurantTel] = useState("");
  const { setTheme, theme } = useTheme();

  // --- ETATS MODALE ---
  const [modalConfig, setModalConfig] = useState<{
    show: boolean;
    title: string;
    message: string;
    onConfirm: () => Promise<void>;
    variant: "info" | "success" | "danger";
    confirmLabel: string;
  }>({
    show: false,
    title: "",
    message: "",
    onConfirm: async () => {},
    variant: "info",
    confirmLabel: "Confirmer"
  });
  const [actionLoading, setActionLoading] = useState(false);
  
  const fetchOrders = async (id: string) => {
    const all = await getRecentCommandes(id);
    const filtered = all.filter((o: any) => o.statut === "SUBMITTED" || o.statut === "READY");
    setOrders(filtered);
    setLoading(false);
  };

  useEffect(() => {
    async function init() {
      let id = searchParams.resto_id;
      if (!id) {
        const { getManagerSession } = await import("@/lib/manager-actions");
        const session = await getManagerSession() as any;
        id = session?.id || "";
        if (id) setRestaurantId(id);
      }
      if (!id) return;

      const cached = sessionStorage.getItem(`resto_profile_${id}`);
      if (cached) {
        const r = safeJsonParse(cached);
        if (!r) {
           sessionStorage.removeItem(`resto_profile_${id}`);
           return;
        }
        const isExpired = r.subscriptionEnd ? new Date(r.subscriptionEnd) < new Date() : false;
        if (!r.active || isExpired) {
          router.push('/manager/subscription-expired');
          return;
        }
        setRestaurantName(r.nom || "SmartResto");
        setRestaurantTel((r as any).telephone || "");
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
            setRestaurantName(r.nom || "SmartResto");
            setRestaurantTel((r as any).telephone || "");
            if ((r as any).preferredTheme && (r as any).preferredTheme !== theme) {
              setTheme((r as any).preferredTheme);
            }
          }
        });
      }

      fetchOrders(id);

      const eventSource = new EventSource(`/api/events?restaurantId=${id}`);
      
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "new-order" || data.type === "status-updated") {
            fetchOrders(id!);
          }
        } catch (e) {
          console.error("SSE Message Error:", e);
        }
      };

      eventSource.onerror = (err) => {
        console.error("SSE Connection Error:", err);
        // On ne plante pas l'interface, le polling de 10s prendra le relais
      };

      const interval = setInterval(() => fetchOrders(id!), 10000);
      return () => {
        eventSource.close();
        clearInterval(interval);
      };
    }
    init();
  }, [searchParams.resto_id]);

  const handleValidateRequest = (id: string, table: string) => {
    setModalConfig({
      show: true,
      title: "Validation Cuisine",
      message: `Voulez-vous envoyer la commande de la Table ${table} en cuisine ?`,
      confirmLabel: "Envoyer en cuisine",
      variant: "info",
      onConfirm: async () => {
        setActionLoading(true);
        const res = await updateOrderStatus(id, "PREPARING");
        if (res.success) {
          toast.success("Commande envoyée en cuisine !");
          fetchOrders(restaurantId);
        }
        setActionLoading(false);
        setModalConfig(prev => ({ ...prev, show: false }));
      }
    });
  };

  const handlePaymentRequest = (id: string, table: string, total: number, method: string) => {
    const methodName = method === 'CASH' ? 'en ESPÈCES' : 'par MOBILE MONEY';
    setModalConfig({
      show: true,
      title: "Confirmation Paiement",
      message: `Confirmez-vous l'encaissement de ${total.toFixed(2)}$ ${methodName} pour la Table ${table} ?`,
      confirmLabel: "Confirmer l'encaissement",
      variant: "success",
      onConfirm: async () => {
        setActionLoading(true);
        const res = await confirmOrderPayment(id, method);
        if (res.success) {
          toast.success("Encaissement enregistré !");
          fetchOrders(restaurantId);
        }
        setActionLoading(false);
        setModalConfig(prev => ({ ...prev, show: false }));
      }
    });
  };

  if (loading) {
      return (
          <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4">
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
              <p className="text-zinc-500 text-[10px] font-black uppercase mt-4 tracking-widest">Initialisation Caisse...</p>
          </div>
      );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-8 space-y-8 animate-in fade-in duration-200">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-zinc-900 border border-zinc-800 p-8 rounded-[2.5rem] shadow-2xl">
        <div className="flex items-center gap-6">
          <button 
            onClick={() => router.push(`/manager/selection?resto_id=${restaurantId}`)}
            className="p-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-2xl transition-all active:scale-95 group border border-zinc-700"
            title="Changer de rôle"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          </button>
          <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Wallet className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tighter text-white uppercase italic">Console Caisse</h1>
            <p className="text-indigo-500 text-[10px] font-black uppercase tracking-[0.2em]">Flux Financier • {restaurantName}</p>
          </div>
        </div>
        <div className="flex gap-4">
           <div className="bg-indigo-500/5 px-6 py-3 rounded-2xl border border-indigo-500/10 flex flex-col items-end">
              <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Attente</span>
              <span className="text-2xl font-black text-white">{orders.filter(o => o.statut === 'SUBMITTED').length}</span>
           </div>
           <div className="bg-emerald-500/5 px-6 py-3 rounded-2xl border border-emerald-500/10 flex flex-col items-end">
              <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">À Encaisser</span>
              <span className="text-2xl font-black text-white">{orders.filter(o => o.statut === 'READY').length}</span>
           </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Colonne 1: Nouvelles Commandes */}
        <section className="space-y-6">
          <div className="flex items-center justify-between px-2">
             <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 italic">Validation Entrante</h2>
             </div>
          </div>
          
          <div className="space-y-6">
            {orders.filter(o => o.statut === 'SUBMITTED').length === 0 && (
              <div className="bg-zinc-900/50 border-2 border-dashed border-zinc-800 rounded-[2.5rem] py-24 flex flex-col items-center justify-center text-zinc-600">
                 <Clock className="w-16 h-16 mb-4 opacity-5" />
                 <p className="font-black text-[10px] uppercase tracking-widest opacity-50">Aucune commande à valider</p>
              </div>
            )}
            
            {orders.filter(o => o.statut === 'SUBMITTED').map((order) => (
              <OrderCard 
                key={order.id} 
                order={order} 
                onAction={() => handleValidateRequest(order.id, order.table)}
                actionLabel="Envoyer en cuisine"
                actionIcon={<Send className="w-4 h-4" />}
                variant="indigo"
              />
            ))}
          </div>
        </section>

        {/* Colonne 2: Commandes Prêtes */}
        <section className="space-y-6">
           <div className="flex items-center justify-between px-2">
             <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 italic">Prêt à Encaisser</h2>
             </div>
          </div>

          <div className="space-y-6">
            {orders.filter(o => o.statut === 'READY').length === 0 && (
              <div className="bg-zinc-900/50 border-2 border-dashed border-zinc-800 rounded-[2.5rem] py-24 flex flex-col items-center justify-center text-zinc-600">
                 <CheckCircle2 className="w-16 h-16 mb-4 opacity-5" />
                 <p className="font-black text-[10px] uppercase tracking-widest opacity-50">Aucun paiement en attente</p>
              </div>
            )}
            
            {orders.filter(o => o.statut === 'READY').map((order) => (
              <div key={order.id} className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] overflow-hidden shadow-2xl hover:border-emerald-500/30 transition-all group animate-in slide-in-from-bottom-4 duration-200">
                 <div className="p-8 space-y-8">
                    <div className="flex justify-between items-start">
                       <div>
                          <p className="text-[10px] font-black text-emerald-500 uppercase tracking-tighter mb-1">Table {order.table}</p>
                          <h3 className="text-2xl font-black text-white italic tracking-tight">#{order.id.slice(-4)} • {order.client}</h3>
                       </div>
                       <div className="bg-emerald-500/10 px-4 py-1.5 rounded-full border border-emerald-500/20">
                          <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">PRÊT</span>
                       </div>
                    </div>

                    <div className="flex items-center justify-between bg-zinc-950 p-6 rounded-3xl border border-zinc-800">
                       <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Total Facturé</span>
                       <span className="text-3xl font-black text-white italic tracking-tighter">${order.totalUsd.toFixed(2)}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                       <button 
                        onClick={() => handlePaymentRequest(order.id, order.table, order.totalUsd, 'CASH')}
                        className="flex items-center justify-center gap-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black py-5 rounded-[2rem] transition-all active:scale-95 text-[10px] uppercase tracking-widest shadow-xl shadow-emerald-900/40"
                       >
                          <Banknote className="w-5 h-5 opacity-50" />
                          Espèces
                       </button>
                       <button 
                        onClick={() => handlePaymentRequest(order.id, order.table, order.totalUsd, 'MOBILE')}
                        className="flex items-center justify-center gap-3 bg-white hover:bg-zinc-200 text-black font-black py-5 rounded-[2rem] transition-all active:scale-95 text-[10px] uppercase tracking-widest"
                       >
                          <CreditCard className="w-5 h-5 opacity-50" />
                          Mobile
                       </button>
                    </div>
                    
                    <button 
                      onClick={() => printReceipt(order, restaurantName, restaurantTel)}
                      className="w-full flex items-center justify-center gap-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white font-black py-4 rounded-2xl transition-all active:scale-95 text-[10px] uppercase tracking-widest border border-zinc-700"
                    >
                      <Printer className="w-5 h-5" />
                      Imprimer Ticket
                    </button>
                 </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <ConfirmModal
        show={modalConfig.show}
        onClose={() => setModalConfig(prev => ({ ...prev, show: false }))}
        onConfirm={modalConfig.onConfirm}
        title={modalConfig.title}
        message={modalConfig.message}
        confirmLabel={modalConfig.confirmLabel}
        variant={modalConfig.variant}
        isLoading={actionLoading}
      />
    </div>
  );
}

function OrderCard({ order, onAction, actionLabel, actionIcon, variant }: any) {
  const isIndigo = variant === 'indigo';
  
  return (
    <div className={cn(
      "bg-zinc-900 border rounded-[2.5rem] overflow-hidden shadow-2xl transition-all group animate-in slide-in-from-bottom-4 duration-200",
      isIndigo ? "border-indigo-500/20 hover:border-indigo-500/40" : "border-zinc-800"
    )}>
       <div className="p-8 space-y-6">
          <div className="flex justify-between items-start">
             <div>
                <p className={cn("text-[10px] font-black uppercase tracking-tighter mb-1", isIndigo ? "text-indigo-500" : "text-zinc-500")}>Table {order.table}</p>
                <h3 className="text-xl font-black text-white italic tracking-tight">#{order.id.slice(-4)} • {order.client}</h3>
                <p className="text-[10px] text-zinc-600 font-bold italic mt-1">{format(new Date(order.createdAt), "HH:mm '•' d MMMM", { locale: fr })}</p>
             </div>
             <div className="text-right">
                <span className="text-2xl font-black text-white italic tracking-tighter">${order.totalUsd.toFixed(2)}</span>
                <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest">Total</p>
             </div>
          </div>

          <div className="bg-zinc-950/50 rounded-3xl p-6 border border-zinc-800/50">
             <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-4">Détails de la Commande</p>
             <div className="space-y-3">
                {order.items?.map((item: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between text-sm">
                     <div className="flex items-center gap-3">
                        <span className="font-black text-indigo-500">{item.quantite}x</span>
                        <span className="font-bold text-zinc-300 italic">{item.plat.nom}</span>
                     </div>
                     <span className="text-zinc-500 font-bold">${(item.plat.prixUsd * item.quantite).toFixed(2)}</span>
                  </div>
                ))}
             </div>
          </div>

          {order.noteSpeciale && (
            <div className="flex items-center gap-3 text-amber-500 bg-amber-500/5 p-3 rounded-2xl border border-amber-500/10">
               <Info className="w-4 h-4 flex-shrink-0" />
               <p className="text-[10px] font-bold italic truncate text-amber-200/70">"{order.noteSpeciale}"</p>
            </div>
          )}

          <button 
            onClick={onAction}
            className={cn(
              "w-full flex items-center justify-center gap-3 font-black py-5 rounded-[2rem] transition-all active:scale-95 mt-4 text-[10px] uppercase tracking-widest shadow-2xl",
              isIndigo ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-900/40" : "bg-white text-black"
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
