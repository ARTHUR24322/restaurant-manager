"use client"

import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Users, 
  DollarSign, 
  Activity, 
  Calendar, 
  ChevronUp, 
  ChevronDown,
  Clock,
  LayoutDashboard,
  Utensils,
  CreditCard,
  Smartphone,
  Banknote,
  MoreVertical,
  Filter,
  Printer,
  Power,
  Package,
  RefreshCw,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getRecentCommandes, updateOrderStatus, confirmOrderPayment, getPlats, getRestaurantStatus } from "@/lib/actions";
import { updateRestaurantTauxChange } from "@/lib/actions-settings";
import { checkIsMainAccount } from "@/lib/admin-actions";
import { getManagerAnalytics } from "@/lib/analytics-actions";
import { printInvoice } from "@/lib/thermal-printer";
import { MultiSiteWidget } from "@/components/manager/MultiSiteWidget";
import { toast } from "sonner";

import { getManagerSession } from "@/lib/manager-actions";

// --- Mock Data ---
// --- Constants & Color Config ---
const PAYMENT_METHOD_CONFIG: Record<string, { label: string, color: string, icon: any }> = {
  PAID_CASH: { label: "Cash", color: "bg-emerald-500", icon: Banknote },
  PAID_MOBILE: { label: "Mobile", color: "bg-indigo-500", icon: Smartphone },
  UNPAID: { label: "En attente", color: "bg-amber-500", icon: Clock }
};

const DAILY_SALES = [
  { day: "Lun", val: 45 },
  { day: "Mar", val: 78 },
  { day: "Mer", val: 65 },
  { day: "Jeu", val: 82 },
  { day: "Ven", val: 95 },
  { day: "Sam", val: 110 },
  { day: "Dim", val: 88 }
];

// --- Mini Components ---

const StatCard = ({ title, value, icon: Icon, trend, prefix = "$" }: any) => (
  <div className="bg-card rounded-2xl p-6 shadow-sm border border-border/50 hover:shadow-md transition-shadow">
    <div className="flex justify-between items-start mb-4">
      <div className="p-2 bg-primary/10 rounded-xl">
        <Icon className="w-6 h-6 text-primary" />
      </div>
      {trend && (
        <span className={cn(
          "flex items-center text-xs font-bold px-2 py-1 rounded-full",
          trend > 0 ? "bg-emerald-500/10 text-emerald-500" : "bg-destructive/10 text-destructive"
        )}>
          {trend > 0 ? <ChevronUp className="w-3 h-3 mr-0.5" /> : <ChevronDown className="w-3 h-3 mr-0.5" />}
          {Math.abs(trend)}%
        </span>
      )}
    </div>
    <div className="space-y-1">
      <p className="text-sm font-medium text-muted-foreground">{title}</p>
      <h3 className="text-2xl font-bold tracking-tight">
        {prefix}{typeof value === 'number' ? value.toLocaleString() : value}
      </h3>
    </div>
  </div>
);

const CustomBarChart = ({ data }: any) => (
  <div className="flex items-end justify-between h-48 gap-2 pt-6">
    {data.map((item: any, idx: number) => (
      <div key={idx} className="flex-1 flex flex-col items-center group">
        <div 
          className="w-full bg-primary/20 hover:bg-primary/40 rounded-t-lg transition-all relative"
          style={{ height: `${item.val}%` }}
        >
          <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-popover text-popover-foreground text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-sm border border-border">
            {item.val * 15} USD
          </div>
        </div>
        <span className="text-[10px] font-bold text-muted-foreground mt-2">{item.day}</span>
      </div>
    ))}
  </div>
);

const PieChartPlaceholder = ({ data }: any) => (
  <div className="space-y-4 py-4">
    <div className="flex items-center justify-center py-6">
      <div className="relative w-40 h-40 rounded-full border-[12px] border-indigo-500/10 flex items-center justify-center">
         <div className="absolute inset-[-12px] rounded-full border-[12px] border-emerald-500 border-l-transparent border-b-transparent transform rotate-12" />
         <div className="absolute inset-[-12px] rounded-full border-[12px] border-indigo-500 border-t-transparent border-r-transparent border-b-transparent transform -rotate-45" />
         <div className="text-center">
            <p className="text-2xl font-bold">100%</p>
            <p className="text-[10px] text-muted-foreground font-bold">PAIEMENTS</p>
         </div>
      </div>
    </div>
    <div className="grid grid-cols-3 gap-2">
      {data.map((item: any, idx: number) => (
        <div key={idx} className="flex flex-col items-center">
          <div className={cn("w-2 h-2 rounded-full mb-1", item.color)} />
          <span className="text-[10px] font-bold">{item.label}</span>
          <span className="text-xs text-muted-foreground">{item.value}%</span>
        </div>
      ))}
    </div>
  </div>
);

// --- Main Page ---

export default function DashboardPage({ searchParams }: { searchParams: { resto_id?: string } }) {
  const [restaurantId, setRestaurantId] = useState<string>(searchParams.resto_id || "");
  const [orders, setOrders] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [filter, setFilter] = useState('day');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [printingOrder, setPrintingOrder] = useState<any>(null);
  const [showFullHistory, setShowFullHistory] = useState(false);
  const [restoStatus, setRestoStatus] = useState<any>(null);
  const [lowStockItems, setLowStockItems] = useState<any[]>([]);
  const [exchangeRate, setExchangeRate] = useState<number>(2800);
  const [showTauxModal, setShowTauxModal] = useState(false);
  const [newTaux, setNewTaux] = useState<string>("");
  const [tauxLoading, setTauxLoading] = useState(false);
  const [isMainAccount, setIsMainAccount] = useState(false);

  useEffect(() => {
    // Si l'ID est absent au montage (ex: clic depuis la sidebar sans le paramètre), le récuperer de la session !
    async function loadSession() {
      if (!searchParams.resto_id) {
        const session = await getManagerSession();
        if (session) {
          setRestaurantId(session.id);
        }
      }
      
      // Cas du Multi-Site : Déterminer si c'est la mère
      if (restaurantId) {
        const isMain = await checkIsMainAccount(restaurantId);
        setIsMainAccount(isMain);
      }
    }
    loadSession();
  }, [searchParams.resto_id, restaurantId]);

  const fetchAllOrders = async (currentFilter: string) => {
    if (!restaurantId) return;

    setIsRefreshing(true);
    
    // 1. Commandes Récentes (Live Feed) - Toujours les 20 dernières
    const recent = await getRecentCommandes(restaurantId);
    setOrders(recent);

    // 2. Analytiques Dynamiques (Basés sur le filtre)
    const stats = await getManagerAnalytics(restaurantId, currentFilter as any);
    if (stats.success) {
        setAnalytics(stats);
    }

    const platos = await getPlats(restaurantId);
    if (Array.isArray(platos)) {
      setLowStockItems(platos.filter((p: any) => p.trackStock && (p.stockQuantity || 0) <= 5));
    }
    
    const current = await getRestaurantStatus(restaurantId);
    setRestoStatus(current);
    const session = await getManagerSession();
    if (session?.tauxChange) {
      setExchangeRate(session.tauxChange);
      setNewTaux(String(session.tauxChange));
    }
    
    setIsRefreshing(false);
  };

  useEffect(() => {
    if (!restaurantId) return;

    fetchAllOrders(filter);
    
    const eventSource = new EventSource(`/api/events?restaurantId=${restaurantId}`);
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "new-order" || data.type === "status-updated") {
        if (!data.restaurantId || data.restaurantId === restaurantId) {
            fetchAllOrders(filter);
        }
      }
    };

    const interval = setInterval(() => fetchAllOrders(filter), 10000); 
    return () => {
      eventSource.close();
      clearInterval(interval);
    };
  }, [filter, restaurantId]);

  const handlePrint = (order: any) => {
    printInvoice(order, restoStatus?.nom || "SmartResto", restoStatus?.telephone || "");
  };

  const handleValidate = async (id: string) => {
    await updateOrderStatus(id, "PREPARING");
    fetchAllOrders(filter);
  };

  const handlePay = async (id: string, method: string) => {
    await confirmOrderPayment(id, method);
    fetchAllOrders(filter);
  };

  const pending = orders.filter(o => o.statut === "SUBMITTED" || o.statut === "PREPARING");
  const ready = orders.filter(o => o.statut === "READY");
  const closed = orders.filter(o => o.statut === "COMPLETED");

  // Données issues de l'analytics serveur
  const totalPaidRevenue = analytics?.totalRevenue || 0;
  const growthRate = analytics?.growth || 0;
  const closedCount = analytics?.orderCount || 0;
  const dynamicTopDishes = analytics?.topDishes || [];
  const dynamicDailyChart = analytics?.chartData || [];

  const activeClients = orders.filter(o => o.statut !== "COMPLETED").length;
  const potentialRevenue = orders.filter(o => o.statut !== "COMPLETED").reduce((acc, curr) => acc + (curr.totalUsd || 0), 0);
  const avgTicket = closedCount > 0 ? totalPaidRevenue / closedCount : 0;

  // Les calculs de charts locaux sont supprimés car fournis par le serveur

  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-8 space-y-8 max-w-[1600px] mx-auto animate-in fade-in duration-300 relative">
      
      {/* SaaS Guard Overlay (Subscription Suspension) */}
      {restoStatus && restoStatus.active === false && (
        <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-xl flex items-center justify-center p-6 text-center">
            <div className="max-w-md bg-card border-2 border-destructive/20 p-12 rounded-[3rem] shadow-2xl shadow-destructive/10 animate-in zoom-in-95 duration-200">
                <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-8">
                    <Power className="w-10 h-10 text-destructive animate-pulse" />
                </div>
                <h1 className="text-3xl font-black text-white italic uppercase tracking-tighter mb-4">Accès Suspendu</h1>
                <p className="text-muted-foreground text-sm leading-relaxed mb-8">
                    Votre abonnement SmartResto est actuellement inactif. 
                    Veuillez contacter l'administrateur de la plateforme pour régulariser votre situation.
                </p>
                <div className="pt-6 border-t border-border">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Support Technique</p>
                    <p className="text-primary font-bold">arthuradmindev@gmail.com</p>
                </div>
            </div>
        </div>
      )}
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-indigo-600 bg-clip-text text-transparent italic tracking-tighter">Réception & Comptabilité</h1>
          <p className="text-muted-foreground">{restoStatus?.nom || "SmartResto"} • Validation et Encaissement</p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
           {/* Widget Taux Rapide */}
           <button 
             onClick={() => setShowTauxModal(true)}
             className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-2xl hover:bg-emerald-500/20 transition-all group"
           >
              <div className="p-1.5 bg-emerald-500/20 rounded-lg group-hover:rotate-180 transition-transform duration-200">
                <RefreshCw className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-left">
                <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest leading-none mb-1">Taux USD/CDF</p>
                <p className="text-sm font-black text-white leading-none">1$ = <span className="text-emerald-400">{exchangeRate} FC</span></p>
              </div>
           </button>
        </div>

        <div className="flex items-center gap-2 bg-card p-1.5 rounded-2xl border border-border shadow-sm">
          {['day', 'week', 'month'].map((p) => (
            <button
              key={p}
              onClick={() => setFilter(p)}
              className={cn(
                "px-4 py-2 text-sm font-bold rounded-xl transition-all",
                filter === p ? "bg-primary text-primary-foreground shadow-lg" : "hover:bg-secondary text-muted-foreground"
              )}
            >
              {p === 'day' ? 'Jour' : p === 'week' ? 'Semaine' : 'Mois'}
            </button>
          ))}
          <div className="w-px h-6 bg-border mx-1" />
          <button className="p-2 hover:bg-secondary rounded-xl transition-colors">
            <Filter className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* KPI Cards Dynamiques */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Chiffre d'Affaires Réel"
          value={totalPaidRevenue}
          trend={growthRate}
          icon={DollarSign}
        />
        <StatCard 
          title="Revenu Prévisionnel"
          value={potentialRevenue}
          trend={0}
          icon={Activity}
          prefix="$"
        />
        <StatCard 
          title="Clients/Tables Actives"
          value={activeClients}
          icon={Users}
          prefix=""
        />
        <StatCard 
          title="Commandes Clôturées"
          value={closedCount}
          icon={TrendingUp}
          prefix=""
        />
      </div>

      {/* Multi-Site Widget (SaaS Platinum Tier) */}
      {restoStatus?.plan === "PLATINUM" && (
        <MultiSiteWidget 
          proprietorEmail={restoStatus.email} 
          currentRestoId={restaurantId} 
          isMainAccount={isMainAccount}
        />
      )}

      {/* Stock Alerts (New Section) */}
      {lowStockItems.length > 0 && (
        <div className="bg-red-500/10 border-2 border-red-500/20 p-6 rounded-[2rem] animate-in slide-in-from-right-4 duration-200">
           <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-500 rounded-2xl flex items-center justify-center shadow-lg shadow-red-500/20">
                 <Package className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-lg font-black text-white uppercase tracking-tighter italic">Alertes de Stock Critique</h3>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {lowStockItems.map((item) => (
                <div key={item.id} className="bg-black/20 p-4 rounded-2xl flex items-center justify-between border border-red-500/10">
                   <div>
                      <p className="font-bold text-white uppercase text-xs">{item.nom}</p>
                      <p className="text-[10px] text-red-500 font-black uppercase tracking-widest mt-1">Plus que {item.stockQuantity} restant{item.stockQuantity > 1 ? 's' : ''}</p>
                   </div>
                   <div className="bg-red-500/20 px-3 py-1 rounded-full">
                      <span className="text-[10px] font-black text-red-500 animate-pulse">ACTION REQUISE</span>
                   </div>
                </div>
              ))}
           </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Section 1: Validation Réception */}
        <div className="bg-card rounded-3xl p-8 border border-border shadow-sm">
            <h3 className="text-lg font-bold flex items-center gap-2 mb-6">
                <Smartphone className="w-5 h-5 text-indigo-500" /> Nouvelles Commandes ({pending.length})
            </h3>
            <div className="space-y-4">
                {pending.length === 0 ? (
                    <div className="py-12 text-center text-muted-foreground italic text-sm">
                        Aucune commande en attente de validation.
                    </div>
                ) : (
                    pending.map(order => (
                        <div key={order.id} className="flex flex-col md:flex-row items-start md:items-center justify-between bg-secondary/30 p-4 rounded-2xl border border-border/50 gap-4">
                            <div>
                                <p className="font-bold">Table {order.table} • <span className="text-primary">${order.totalUsd}</span></p>
                                <p className="text-xs text-muted-foreground">{order.client} • {new Date(order.createdAt).toLocaleTimeString()}</p>
                            </div>
                            <button 
                                onClick={() => handleValidate(order.id)}
                                className="w-full md:w-auto bg-primary text-primary-foreground font-bold px-6 py-2 rounded-xl text-sm shadow-lg shadow-primary/20 hover:scale-105 transition-all"
                            >
                                Valider Cuisine
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>

        {/* Section 2: Encaissement */}
        <div className="bg-card rounded-3xl p-8 border border-border shadow-sm">
            <h3 className="text-lg font-bold flex items-center gap-2 mb-6">
                <Banknote className="w-5 h-5 text-emerald-500" /> Prêt à Encaisser ({ready.length})
            </h3>
            <div className="space-y-4">
                {ready.length === 0 ? (
                    <div className="py-12 text-center text-muted-foreground italic text-sm">
                        Aucune commande en attente de paiement.
                    </div>
                ) : (
                    ready.map(order => (
                        <div key={order.id} className="flex flex-col md:flex-row items-center justify-between bg-emerald-500/5 p-4 rounded-2xl border border-emerald-500/20 gap-4">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-emerald-500 text-white rounded-full flex items-center justify-center font-bold">
                                    {order.table}
                                </div>
                                <div>
                                    <p className="font-bold text-emerald-600">${order.totalUsd}</p>
                                    <p className="text-[10px] uppercase font-black text-muted-foreground">Prêt / À Servir</p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                               <button 
                                 onClick={() => handlePrint(order)}
                                 className="p-2.5 bg-secondary text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-xl transition-all"
                                 title="Imprimer Facture"
                               >
                                 <Printer className="w-5 h-5" />
                               </button>
                               <button 
                                 onClick={() => handlePay(order.id, 'CASH')}
                                 className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95"
                               >
                                 <Banknote className="w-4 h-4" />
                                 Cash
                               </button>
                               <button 
                                 onClick={() => handlePay(order.id, 'MOBILE')}
                                 className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95"
                               >
                                 <Smartphone className="w-4 h-4" />
                                 M-Pesa
                               </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
      </div>

      {/* KPI Cards (Row 2 - Real-time) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title={`Encaissement total`}
          value={totalPaidRevenue}
          trend={growthRate}
          icon={DollarSign}
        />
        <StatCard 
          title="Clients Actifs"
          value={activeClients}
          trend={0}
          icon={Users}
          prefix=""
        />
        <StatCard 
          title="Ticket Moyen (Payé)"
          value={avgTicket}
          trend={0}
          icon={Activity}
        />
        <StatCard 
          title="Encaissements"
          value={closedCount}
          icon={TrendingUp}
          prefix=""
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Main Sales Chart */}
        <div className="lg:col-span-2 bg-card rounded-3xl p-8 shadow-sm border border-border/50">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-500" /> Flux de Ventes (Hebdo)
            </h3>
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Total Payé: {totalPaidRevenue.toFixed(2)} USD</span>
          </div>
          <CustomBarChart data={dynamicDailyChart} />
          <div className="mt-8 pt-8 border-t border-border flex items-center justify-between bg-primary/5 p-4 rounded-2xl">
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase">Résumé Auto</p>
                <p className="text-sm font-medium mt-1">
                  La performance actuelle est {growthRate >= 0 ? 'en hausse' : 'en baisse'} de <span className={cn("font-bold", growthRate >= 0 ? "text-emerald-500" : "text-destructive")}>{Math.abs(growthRate).toFixed(1)}%</span> par rapport à la période précédente.
                </p>
              </div>
              {growthRate >= 0 ? <ChevronUp className="w-5 h-5 text-emerald-500" /> : <ChevronDown className="w-5 h-5 text-destructive" />}
          </div>
        </div>

        {/* Payments Breakdown */}
        <div className="bg-card rounded-3xl p-8 shadow-sm border border-border/50 flex flex-col">
          <h3 className="text-lg font-bold flex items-center gap-2 mb-2">
             <CreditCard className="w-5 h-5 text-primary" /> Modes de Paiement
          </h3>
          <p className="text-sm text-muted-foreground mb-6 italic">Basé sur les transactions clôturées ({filter === 'day' ? 'jour' : 'mois'})</p>
          <div className="flex-1 flex items-center justify-center py-12 text-zinc-500 italic text-sm border-2 border-dashed border-border rounded-2xl">
              Analyse des modes bientôt disponible
          </div>
        </div>

      </div>

      {/* Top Products Table & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-12">
        <div className="lg:col-span-2 bg-card rounded-3xl p-8 shadow-sm border border-border/50">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Utensils className="w-5 h-5 text-indigo-500" /> Plats les Plus Commandés
            </h3>
            <button className="text-sm font-bold text-primary hover:underline">Tout voir</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-xs text-muted-foreground uppercase font-bold border-b border-border">
                  <th className="pb-4 pr-4">Produit</th>
                  <th className="pb-4 px-4 text-center">Commandes</th>
                  <th className="pb-4 px-4 text-center">Prix Unitaire</th>
                  <th className="pb-4 pl-4 text-right">Evolution</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {dynamicTopDishes.length === 0 ? (
                  <tr><td colSpan={4} className="py-8 text-center text-muted-foreground italic">Aucune vente enregistrée pour le moment.</td></tr>
                ) : (
                  dynamicTopDishes.map((dish: any, i: number) => (
                    <tr key={i} className="group hover:bg-secondary/50 transition-colors">
                      <td className="py-4 pr-4">
                        <div className="flex items-center gap-3">
                           <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center font-bold text-primary">
                              {i + 1}
                           </div>
                           <span className="font-bold">{dish.name}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center font-medium">{dish.orders}</td>
                      <td className="py-4 px-4 text-center font-medium">${dish.price}</td>
                      <td className="py-4 pl-4 text-right">
                         <span className="text-xs font-bold text-emerald-500">Stable</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Real-time Activity Feed */}
        <div className="bg-card rounded-3xl p-8 shadow-sm border border-border/50 overflow-hidden flex flex-col">
           <div className="flex items-center justify-between mb-8">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Activity className="w-5 h-5 text-emerald-500" /> Activité en direct
              </h3>
              <div className="flex items-center gap-1.5">
                 <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                 <span className="text-[10px] font-bold text-muted-foreground uppercase">Live</span>
              </div>
           </div>
           
           <div className="space-y-6 flex-1 overflow-y-auto pr-2 custom-scrollbar">
              {orders.length === 0 ? (
                <div className="text-center py-12 opacity-50 italic text-sm">
                   Aucune commande pour le moment
                </div>
              ) : (
                orders.slice(0, showFullHistory ? undefined : 5).map((order, i) => (
                  <div key={order.id} className="relative pl-6 pb-6 border-l-2 border-border last:pb-0">
                    <div className="absolute left-[-9px] top-0 w-4 h-4 rounded-full bg-background border-2 border-primary" />
                    <div className="flex justify-between items-start mb-1">
                       <span className="text-xs font-bold text-muted-foreground">
                          {new Date(order.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                       </span>
                       <span className="text-[10px] font-black px-2 py-0.5 rounded bg-primary/10 text-primary uppercase">
                          Table {order.table}
                       </span>
                    </div>
                    <p className="font-bold text-sm">{order.statut === 'COMPLETED' ? 'Paiement reçu' : 'Nouvelle commande'} : <span className="text-emerald-500">${order.totalUsd}</span></p>
                    <p className="text-xs text-muted-foreground mt-1">Client: {order.client}</p>
                    {order.noteSpeciale && (
                        <div className="mt-2 text-[10px] bg-secondary/50 p-2 rounded-lg italic">
                           "{order.noteSpeciale}"
                        </div>
                    )}
                  </div>
                ))
              )}
           </div>

           <div className="mt-8 pt-6 border-t border-border">
              <button 
                onClick={() => setShowFullHistory(!showFullHistory)}
                className="w-full py-4 bg-secondary hover:bg-secondary/80 rounded-2xl text-xs font-bold uppercase tracking-widest transition-colors"
              >
                 {showFullHistory ? "Réduire la liste" : "Historique complet"}
              </button>
           </div>
        </div>
      </div>

      {/* Taux Change Quick Update Modal */}
      {showTauxModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-sm bg-card border border-border rounded-[2.5rem] p-8 shadow-2xl relative animate-in zoom-in-95 duration-300">
            <h3 className="text-xl font-bold italic tracking-tighter mb-4 text-foreground flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-emerald-500" /> Taux du Jour
            </h3>
            <p className="text-xs text-muted-foreground mb-6">Mettez à jour le taux de conversion pour les factures.</p>
            
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-muted-foreground uppercase ml-2 tracking-widest">1 USD = ? CDF</label>
                <div className="relative">
                  <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
                  <input 
                    type="number"
                    value={newTaux}
                    onChange={(e) => setNewTaux(e.target.value)}
                    className="w-full bg-secondary border-border rounded-xl py-3 pl-12 text-sm text-foreground focus:ring-2 focus:ring-emerald-500/50 outline-none transition-all font-black"
                    placeholder="Ex: 2850"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => setShowTauxModal(false)}
                  className="flex-1 py-3 bg-secondary text-muted-foreground font-bold rounded-xl text-xs uppercase tracking-widest hover:bg-secondary/80 transition-all"
                >
                  Annuler
                </button>
                <button 
                  disabled={tauxLoading || !newTaux}
                  onClick={async () => {
                    const rate = parseFloat(newTaux);
                    if (isNaN(rate) || rate <= 0) {
                      toast.error("Taux invalide");
                      return;
                    }
                    setTauxLoading(true);
                    const res = await updateRestaurantTauxChange(restaurantId, rate);
                    setTauxLoading(false);
                    if (res.success) {
                      setExchangeRate(rate);
                      setShowTauxModal(false);
                      toast.success(`Taux mis à jour : ${rate} FC`);
                    } else {
                      toast.error("Erreur mise à jour");
                    }
                  }}
                  className="flex-1 py-3 bg-emerald-600 text-white font-bold rounded-xl text-xs uppercase tracking-widest hover:bg-emerald-500 shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
                >
                  {tauxLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Appliquer"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
