"use client";
/* eslint-disable react-hooks/exhaustive-deps, @typescript-eslint/no-explicit-any */

import React, { useState, useEffect } from "react";
import {
  ShoppingBag, CheckCircle2, XCircle, MapPin, Phone, User, Clock,
  Loader2, ArrowLeft, RefreshCw, PackageCheck, Inbox, Truck, UserCheck,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { getRecentCommandes, validateBoutiqueOrder, cancelOrder, assignLivreur, markDelivered } from "@/lib/actions";
import { cn } from "@/lib/utils";

function GestionBoutiqueInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [restaurantId, setRestaurantId] = useState<string>("");
  const [pendingOrders, setPendingOrders] = useState<any[]>([]);
  const [readyOrders, setReadyOrders] = useState<any[]>([]);
  const [deliveringOrders, setDeliveringOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [livreurNames, setLivreurNames] = useState<Record<string, string>>({});

  const fetchOrders = async (id: string) => {
    const all = await getRecentCommandes(id);
    setPendingOrders((all as any[]).filter((o) => o.statut === "PENDING_BOUTIQUE"));
    setReadyOrders((all as any[]).filter((o) => o.statut === "READY_FOR_DELIVERY"));
    setDeliveringOrders((all as any[]).filter((o) => o.statut === "DELIVERING"));
    setLoading(false);
  };

  useEffect(() => {
    async function init() {
      let id = searchParams.get("resto_id");
      if (!id) {
        const { getManagerSession } = await import("@/lib/manager-actions");
        const session = await getManagerSession() as any;
        id = session?.id || "";
      }
      if (!id) { router.push("/manager/login"); return; }
      setRestaurantId(id);
      fetchOrders(id);

      const eventSource = new EventSource(`/api/events?restaurantId=${id}`);
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "new-order" || data.type === "status-updated") fetchOrders(id!);
        } catch {}
      };
      const interval = setInterval(() => fetchOrders(id!), 8000);
      return () => { eventSource.close(); clearInterval(interval); };
    }
    init();
  }, []);

  const handleValidate = async (orderId: string) => {
    setActionLoading(orderId + "_v");
    const res = await validateBoutiqueOrder(orderId);
    if (res.success) toast.success("✅ Commande transmise à la Caisse !");
    else toast.error("Erreur lors de la validation.");
    fetchOrders(restaurantId);
    setActionLoading(null);
  };

  const handleCancel = async (orderId: string) => {
    setActionLoading(orderId + "_c");
    const res = await cancelOrder(orderId);
    if (res.success) toast.success("Commande annulée.");
    else toast.error("Erreur lors de l'annulation.");
    fetchOrders(restaurantId);
    setActionLoading(null);
  };

  const handleAssignLivreur = async (orderId: string) => {
    const name = livreurNames[orderId]?.trim();
    if (!name) { toast.error("Entrez le nom du livreur."); return; }
    setActionLoading(orderId + "_l");
    const res = await assignLivreur(orderId, name);
    if (res.success) {
      toast.success(`🚚 ${name} est en route !`);
      setLivreurNames(prev => { const n = {...prev}; delete n[orderId]; return n; });
    } else {
      toast.error("Erreur.");
    }
    fetchOrders(restaurantId);
    setActionLoading(null);
  };

  const handleMarkDelivered = async (orderId: string) => {
    setActionLoading(orderId + "_d");
    const res = await markDelivered(orderId);
    if (res.success) toast.success("📦 Livraison confirmée !");
    else toast.error("Erreur.");
    fetchOrders(restaurantId);
    setActionLoading(null);
  };

  const totalActive = pendingOrders.length + readyOrders.length + deliveringOrders.length;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-violet-500 animate-spin" />
          <p className="text-muted-foreground text-[10px] font-black uppercase tracking-widest">Chargement Boutique...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-card/80 backdrop-blur-xl border-b border-border px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push(`/manager/selection?resto_id=${restaurantId}`)} className="p-2.5 bg-secondary hover:bg-secondary/80 rounded-xl transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-violet-500 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/20">
              <ShoppingBag className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-black uppercase italic tracking-tighter">Gestion Boutique</h1>
              <p className="text-violet-500 text-[9px] font-black uppercase tracking-[0.2em]">Commandes En Ligne</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className={cn("flex items-center gap-2 px-4 py-2 rounded-xl border", totalActive > 0 ? "bg-violet-500/10 border-violet-500/20" : "bg-secondary border-border")}>
            <div className={cn("w-2 h-2 rounded-full", totalActive > 0 ? "bg-violet-400 animate-pulse" : "bg-zinc-600")} />
            <span className={cn("text-[10px] font-black uppercase tracking-widest", totalActive > 0 ? "text-violet-400" : "text-muted-foreground")}>
              {totalActive} actif{totalActive > 1 ? "s" : ""}
            </span>
          </div>
          <button onClick={() => fetchOrders(restaurantId)} className="p-2.5 bg-secondary hover:bg-secondary/80 rounded-xl transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto p-6 space-y-10">

        {/* SECTION 1 : Nouvelles commandes */}
        <Section
          icon={<ShoppingBag className="w-4 h-4" />}
          title="Nouvelles Commandes"
          color="violet"
          count={pendingOrders.length}
          empty="Aucune nouvelle commande en ligne."
        >
          {pendingOrders.map((order) => (
            <OrderCard key={order.id} order={order}>
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button onClick={() => handleCancel(order.id)} disabled={!!actionLoading} className="flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all disabled:opacity-50">
                  {actionLoading === order.id + "_c" ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                  Refuser
                </button>
                <button onClick={() => handleValidate(order.id)} disabled={!!actionLoading} className="flex items-center justify-center gap-2 bg-violet-500 hover:bg-violet-400 text-white py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all disabled:opacity-50 shadow-lg shadow-violet-500/20 active:scale-95">
                  {actionLoading === order.id + "_v" ? <Loader2 className="w-4 h-4 animate-spin" /> : <PackageCheck className="w-4 h-4" />}
                  Envoyer à la Caisse
                </button>
              </div>
            </OrderCard>
          ))}
        </Section>

        {/* SECTION 2 : Prêtes à livrer */}
        <Section
          icon={<Truck className="w-4 h-4" />}
          title="Prêtes à Livrer"
          color="emerald"
          count={readyOrders.length}
          empty="Aucune commande prête à livrer."
        >
          {readyOrders.map((order) => (
            <OrderCard key={order.id} order={order} accent="emerald">
              <div className="space-y-3 pt-2">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <UserCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Nom du livreur..."
                      value={livreurNames[order.id] || ""}
                      onChange={e => setLivreurNames(prev => ({ ...prev, [order.id]: e.target.value }))}
                      className="w-full bg-background border border-border rounded-xl pl-10 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <button
                    onClick={() => handleAssignLivreur(order.id)}
                    disabled={!!actionLoading || !livreurNames[order.id]?.trim()}
                    className="flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white px-5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all disabled:opacity-50 active:scale-95 shadow-lg shadow-emerald-500/20"
                  >
                    {actionLoading === order.id + "_l" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Truck className="w-4 h-4" />}
                    Envoyer
                  </button>
                </div>
              </div>
            </OrderCard>
          ))}
        </Section>

        {/* SECTION 3 : En livraison */}
        <Section
          icon={<Truck className="w-4 h-4" />}
          title="En Livraison"
          color="amber"
          count={deliveringOrders.length}
          empty="Aucune commande en cours de livraison."
        >
          {deliveringOrders.map((order) => (
            <OrderCard key={order.id} order={order} accent="amber">
              <div className="flex items-center justify-between bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 mb-3">
                <div className="flex items-center gap-2 text-amber-400">
                  <Truck className="w-4 h-4" />
                  <span className="text-sm font-black">{(order as any).livreur || "Livreur non renseigné"}</span>
                </div>
                <span className="text-[9px] font-black text-amber-400 uppercase tracking-widest">En route</span>
              </div>
              <button
                onClick={() => handleMarkDelivered(order.id)}
                disabled={!!actionLoading}
                className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all disabled:opacity-50 active:scale-95"
              >
                {actionLoading === order.id + "_d" ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Confirmer la livraison
              </button>
            </OrderCard>
          ))}
        </Section>

        {totalActive === 0 && !loading && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-24 h-24 bg-violet-500/10 border-2 border-dashed border-violet-500/20 rounded-3xl flex items-center justify-center mb-6">
              <Inbox className="w-10 h-10 text-violet-500/40" />
            </div>
            <h2 className="text-xl font-black text-foreground">Tout est calme</h2>
            <p className="text-muted-foreground text-sm mt-2">Les commandes en ligne apparaîtront ici.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ icon, title, color, count, empty, children }: {
  icon: React.ReactNode; title: string; color: string; count: number; empty: string; children: React.ReactNode;
}) {
  const colorMap: Record<string, string> = {
    violet: "text-violet-400 bg-violet-500/10 border-violet-500/20",
    emerald: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    amber: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  };
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className={cn("flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-widest", colorMap[color])}>
          {icon} {title}
        </div>
        {count > 0 && <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-black", colorMap[color])}>{count}</span>}
      </div>
      {count === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-border rounded-2xl text-muted-foreground text-sm font-medium">{empty}</div>
      ) : (
        <div className="space-y-4">{children}</div>
      )}
    </div>
  );
}

function OrderCard({ order, children, accent = "violet" }: { order: any; children: React.ReactNode; accent?: string }) {
  const borderMap: Record<string, string> = {
    violet: "border-violet-500/20 hover:border-violet-500/40",
    emerald: "border-emerald-500/20 hover:border-emerald-500/40",
    amber: "border-amber-500/20 hover:border-amber-500/40",
  };
  const headerMap: Record<string, string> = {
    violet: "bg-violet-500/10",
    emerald: "bg-emerald-500/10",
    amber: "bg-amber-500/10",
  };
  const textMap: Record<string, string> = {
    violet: "text-violet-400",
    emerald: "text-emerald-400",
    amber: "text-amber-400",
  };

  return (
    <div className={cn("bg-card border rounded-2xl overflow-hidden shadow-lg transition-colors", borderMap[accent])}>
      <div className={cn("px-6 py-3 flex items-center justify-between", headerMap[accent])}>
        <span className={cn("text-[9px] font-black uppercase tracking-widest", textMap[accent])}>
          #{order.id.slice(-6).toUpperCase()} — {order.table}
        </span>
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Clock className="w-3 h-3" />
          <span className="text-[9px] font-bold">{format(new Date(order.createdAt), "HH:mm", { locale: fr })}</span>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* Client info */}
        <div className="grid grid-cols-2 gap-2">
          {order.client && (
            <div className="flex items-center gap-2 bg-secondary/50 p-2.5 rounded-xl">
              <User className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs font-bold truncate">{order.client}</span>
            </div>
          )}
          {order.phone && (
            <div className="flex items-center gap-2 bg-secondary/50 p-2.5 rounded-xl">
              <Phone className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs font-bold">{order.phone}</span>
            </div>
          )}
        </div>

        {/* Adresse */}
        {order.adresseLivraison && (
          <div className="flex items-start gap-2 bg-violet-500/5 border border-violet-500/20 p-3 rounded-xl">
            <MapPin className="w-3.5 h-3.5 text-violet-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs font-bold text-foreground leading-relaxed">{order.adresseLivraison}</p>
          </div>
        )}

        {/* Articles */}
        <div className="bg-secondary/30 rounded-xl p-3 space-y-1.5">
          {order.items?.map((item: any, idx: number) => (
            <div key={idx} className="flex justify-between text-xs">
              <span className="text-muted-foreground"><span className="font-black text-foreground">{item.quantite}x</span> {item.plat?.nom}</span>
              <span className="font-bold">${(item.plat?.prixUsd * item.quantite).toFixed(2)}</span>
            </div>
          ))}
          <div className="border-t border-border pt-2 flex justify-between">
            <span className="text-[10px] font-black uppercase text-muted-foreground">Total</span>
            <span className="font-black text-primary">${order.totalUsd.toFixed(2)}</span>
          </div>
        </div>

        {children}
      </div>
    </div>
  );
}

export default function GestionBoutiquePage() {
  return (
    <React.Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-10 h-10 text-violet-500 animate-spin" /></div>}>
      <GestionBoutiqueInner />
    </React.Suspense>
  );
}
