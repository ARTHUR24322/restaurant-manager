"use client"
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  TrendingUp, 
  Users, 
  DollarSign, 
  Activity, 
  Calendar, 
  ChevronUp, 
  ChevronDown,
  Clock,
  Utensils,
  CreditCard,
  Smartphone,
  Banknote,
  Printer,
  Power,
  Package,
  RefreshCw,
  Loader2,
  FileSpreadsheet,
  FileText
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Plat, Commande } from "@/types";
import { getRecentCommandes, updateOrderStatus, confirmOrderPayment, getPlats, getRestaurantStatus } from "@/lib/actions";
import { updateRestaurantTauxChange } from "@/lib/actions-settings";
import { checkIsMainAccount } from "@/lib/admin-actions";
import { getManagerAnalytics, getReportData } from "@/lib/analytics-actions";
import { exportToExcel, exportToPDF, formatOrderForReport, calculateSummary } from "@/lib/report-exporter";
import { printInvoice } from "@/lib/thermal-printer";
import { MultiSiteWidget } from "@/components/manager/MultiSiteWidget";
import { toast } from "sonner";
import { getManagerSession } from "@/lib/manager-actions";

// --- Mini Components ---

const StatCard = ({ title, value, icon: Icon, trend, prefix = "$", subtitle }: { title: string, value: string | number, icon: React.ElementType, trend?: number, prefix?: string, subtitle?: string }) => (
  <div className="bg-card rounded-2xl p-6 shadow-sm border border-border/50 hover:shadow-md transition-shadow relative overflow-hidden group">
    <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 blur-2xl rounded-full -mr-12 -mt-12 group-hover:bg-primary/10 transition-colors" />
    <div className="flex justify-between items-start mb-4 relative z-10">
      <div className="p-2 bg-primary/10 rounded-xl">
        <Icon className="w-6 h-6 text-primary" />
      </div>
      {trend !== undefined && (
        <span className={cn(
          "flex items-center text-xs font-bold px-2 py-1 rounded-full",
          trend > 0 ? "bg-emerald-500/10 text-emerald-500" : trend < 0 ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"
        )}>
          {trend > 0 ? <ChevronUp className="w-3 h-3 mr-0.5" /> : trend < 0 ? <ChevronDown className="w-3 h-3 mr-0.5" /> : null}
          {Math.abs(trend)}%
        </span>
      )}
    </div>
    <div className="space-y-1 relative z-10">
      <p className="text-sm font-medium text-muted-foreground">{title}</p>
      <h3 className="text-2xl font-bold tracking-tight">
        {prefix}{typeof value === 'number' ? value.toLocaleString() : value}
      </h3>
      {subtitle && <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{subtitle}</p>}
    </div>
  </div>
);

const PeakHoursChart = ({ data }: { data: { hour: number, count: number }[] }) => {
    if (!data || data.length === 0) return null;
    const maxCount = Math.max(...data.map(d => d.count), 1);

    return (
        <div className="space-y-6">
            <div className="flex items-end justify-between h-32 gap-1 px-2">
                {data.map((item, idx) => {
                    const heightPercent = (item.count / maxCount) * 100;
                    const isVeryBusy = item.count === maxCount && item.count > 0;
                    
                    return (
                        <div key={idx} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                            <div 
                                className={cn(
                                    "w-full rounded-t-sm transition-all duration-500",
                                    isVeryBusy ? "bg-primary" : "bg-primary/20 group-hover:bg-primary/40"
                                )}
                                style={{ height: `${heightPercent}%` }}
                            />
                            {item.count > 0 && (
                                <div className="absolute opacity-0 group-hover:opacity-100 transition-opacity bottom-full mb-1 z-20">
                                    <span className="text-[8px] bg-popover px-1 rounded border border-border">{item.count}</span>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
            <div className="flex justify-between px-2 text-[8px] font-black text-muted-foreground uppercase tracking-widest">
                <span>00h</span>
                <span>06h</span>
                <span>12h</span>
                <span>18h</span>
                <span>23h</span>
            </div>
        </div>
    );
};

const CustomBarChart = ({ data }: { data: { day: string, val: number }[] }) => {
  if (!data || data.length === 0) return null;
  
  const maxVal = Math.max(...data.map((d: { val: number }) => d.val), 1);
  const avgVal = data.reduce((acc: number, d: { val: number }) => acc + d.val, 0) / data.length;

  return (
    <div className="relative h-64 mt-12 mb-8 px-2">
      {maxVal > 0 && (
        <div 
          className="absolute w-full border-t border-dashed border-primary/30 z-0 transition-all duration-1000"
          style={{ bottom: `${(avgVal / maxVal) * 90}%` }}
        >
          <span className="absolute -top-5 right-0 text-[9px] font-black text-primary/60 uppercase tracking-[0.2em] bg-background/80 px-2 rounded-full border border-primary/10">
            Moyenne: {avgVal.toFixed(2)}$
          </span>
        </div>
      )}

      <div className="flex items-end justify-between h-full gap-4 relative z-10">
        {data.map((item: any, idx: number) => {
          const isPeak = item.val === maxVal && item.val > 0;
          const heightPercent = (item.val / maxVal) * 90;
          
          return (
            <div key={idx} className="flex-1 flex flex-col items-center group relative h-full justify-end">
              {isPeak && (
                <div className="absolute -top-12 left-1/2 -translate-x-1/2 animate-bounce z-20">
                  <div className="bg-amber-500 text-white text-[8px] font-black px-2 py-0.5 rounded-md shadow-lg shadow-amber-500/40 whitespace-nowrap rotate-[-5deg]">
                    TOP PERFORMANCE
                  </div>
                </div>
              )}

              <div 
                className={cn(
                  "absolute opacity-0 group-hover:opacity-100 transition-all duration-300 bottom-full mb-2 z-20",
                  isPeak ? "opacity-100" : ""
                )}
                style={{ bottom: `${heightPercent}%` }}
              >
                 <span className={cn(
                   "text-[10px] font-bold px-2 py-1 rounded-lg shadow-sm border",
                   isPeak ? "bg-amber-500 text-white border-amber-400" : "bg-popover text-popover-foreground border-border"
                 )}>
                   {item.val.toFixed(0)}$
                 </span>
              </div>

              <div 
                className={cn(
                  "w-full rounded-t-2xl transition-all duration-700 relative cursor-pointer group-hover:scale-x-105",
                  isPeak 
                    ? "bg-gradient-to-t from-amber-600 via-amber-500 to-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.3)]" 
                    : "bg-gradient-to-t from-primary/40 to-primary/10 group-hover:from-primary/60 group-hover:to-primary/30"
                )}
                style={{ height: `${heightPercent}%` }}
              >
                <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              
              <div className={cn(
                "mt-4 transition-all duration-300 transform",
                isPeak ? "text-amber-500 font-black scale-110" : "text-muted-foreground font-bold"
              )}>
                <span className="text-[10px] uppercase tracking-widest">{item.day}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const PieChartPlaceholder = ({ data }: { data: { label: string, value: number, color: string }[] }) => (
  <div className="space-y-4 py-4">
    <div className="flex items-center justify-center py-6">
      <div className="relative w-40 h-40 rounded-full border-[12px] border-secondary flex items-center justify-center">
         {data[0] && (
           <div 
             className="absolute inset-[-12px] rounded-full border-[12px] border-emerald-500 border-l-transparent border-b-transparent transform rotate-45" 
             style={{ opacity: data[0].value / 100 }}
           />
         )}
         {data[1] && (
           <div 
             className="absolute inset-[-12px] rounded-full border-[12px] border-indigo-500 border-t-transparent border-r-transparent border-b-transparent transform -rotate-45"
             style={{ opacity: data[1].value / 100 }}
           />
         )}
         <div className="text-center">
            <p className="text-2xl font-black italic tracking-tighter">100%</p>
            <p className="text-[10px] text-muted-foreground font-bold">PAIEMENTS</p>
         </div>
      </div>
    </div>
    <div className="grid grid-cols-2 gap-2">
      {data.map((item: any, idx: number) => (
        <div key={idx} className="flex flex-col items-center p-2 rounded-xl bg-secondary/30 border border-border/50">
          <div className={cn("w-2 h-2 rounded-full mb-1", item.color)} />
          <span className="text-[10px] font-black uppercase tracking-widest">{item.label}</span>
          <span className="text-lg font-black text-white italic">{item.value}%</span>
        </div>
      ))}
    </div>
  </div>
);

// --- Main Page ---

export default function DashboardPage({ searchParams }: { searchParams: { resto_id?: string } }) {
  const [restaurantId, setRestaurantId] = useState<string>(searchParams.resto_id || "");
  const [orders, setOrders] = useState<Commande[]>([]);
  const [analytics, setAnalytics] = useState<any>(null); // Analytics object is complex, 'any' allowed if we don't have full type
  const [filter, setFilter] = useState('day');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showFullHistory, setShowFullHistory] = useState(false);
  const [restoStatus, setRestoStatus] = useState<any>(null);
  const [lowStockItems, setLowStockItems] = useState<any[]>([]);
  const [exchangeRate, setExchangeRate] = useState<number>(2800);
  const [showTauxModal, setShowTauxModal] = useState(false);
  const [newTaux, setNewTaux] = useState<string>("");
  const [tauxLoading, setTauxLoading] = useState(false);
  const [isMainAccount, setIsMainAccount] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    async function loadSession() {
      if (!searchParams.resto_id) {
        const session = await getManagerSession();
        if (session) {
          setRestaurantId(session.id);
        }
      }
      
      if (restaurantId) {
        const isMain = await checkIsMainAccount(restaurantId);
        setIsMainAccount(isMain);
      }
    }
    loadSession();
  }, [searchParams.resto_id, restaurantId]);

  const fetchAllOrders = useCallback(async (currentFilter: string) => {
    if (!restaurantId) return;

    setIsRefreshing(true);
    
    const recent = await getRecentCommandes(restaurantId);
    setOrders((recent || []) as unknown as Commande[]);

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
  }, [restaurantId]);

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
  }, [filter, restaurantId, fetchAllOrders]);

  const handlePrint = (order: Commande) => {
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

  const handleExport = async (format: 'excel' | 'pdf') => {
    if (!restaurantId) return;
    setIsExporting(true);
    try {
        const res = await getReportData(restaurantId, filter as any);
        if (res.success && res.orders && res.orders.length > 0) {
            const formatted = formatOrderForReport(res.orders);
            const summary = calculateSummary(res.orders);
            const title = `Rapport de Ventes - ${filter.toUpperCase()} - ${restoStatus?.nom || ""}`;
            const fileName = `Rapport_${filter}_${new Date().toISOString().split('T')[0]}`;
            
            if (format === 'excel') {
                exportToExcel(formatted, fileName, summary);
            } else {
                exportToPDF(formatted, fileName, title, summary);
            }
            toast.success("Rapport généré avec succès !");
        } else {
            toast.error("Aucune donnée à exporter pour cette période.");
        }
    } catch (error) {
        console.error(error);
        toast.error("Erreur lors de l'exportation.");
    } finally {
        setIsExporting(false);
    }
  };

  const pending = orders.filter(o => o.statut === "SUBMITTED" || o.statut === "PREPARING");
  const ready = orders.filter(o => o.statut === "READY");

  const totalPaidRevenue = analytics?.totalRevenue || 0;
  const growthRate = analytics?.growth || 0;
  const closedCount = analytics?.orderCount || 0;
  const dynamicTopDishes = analytics?.topDishes || [];
  const dynamicDailyChart = analytics?.chartData || [];
  const avgTicket = closedCount > 0 ? totalPaidRevenue / closedCount : 0;

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
                    Veuillez contacter l&apos;administrateur de la plateforme pour régulariser votre situation.
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
          {['day', 'week', 'month', 'year'].map((p) => (
            <button
              key={p}
              onClick={() => setFilter(p)}
              className={cn(
                "px-4 py-2 text-sm font-bold rounded-xl transition-all",
                filter === p ? "bg-primary text-primary-foreground shadow-lg" : "hover:bg-secondary text-muted-foreground"
              )}
            >
              {p === 'day' ? 'Jour' : p === 'week' ? 'Semaine' : p === 'month' ? 'Mois' : 'Année'}
            </button>
          ))}
          <div className="w-px h-6 bg-border mx-1" />
          
          <div className="flex items-center gap-1 pr-2">
            <button 
                disabled={isExporting}
                onClick={() => handleExport('excel')}
                className="p-2 hover:bg-emerald-500/10 rounded-xl transition-all text-emerald-500 hover:text-emerald-400 disabled:opacity-50"
                title="Exporter Excel"
            >
                {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
            </button>
            <button 
                disabled={isExporting}
                onClick={() => handleExport('pdf')}
                className="p-2 hover:bg-red-500/10 rounded-xl transition-all text-red-500 hover:text-red-400 disabled:opacity-50"
                title="Exporter PDF"
            >
                {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Dynamiques */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Chiffre d'Affaires"
          value={totalPaidRevenue}
          trend={growthRate}
          icon={DollarSign}
        />
        <StatCard 
          title="Profit Estimé"
          value={analytics?.totalEstimatedProfit || 0}
          trend={0}
          subtitle="Basé sur les prix d'achat"
          icon={TrendingUp}
          prefix="$"
        />
        <StatCard 
          title="Fidélisation Clients"
          value={analytics?.customerStats?.totalUnique || 0}
          subtitle={`${analytics?.customerStats?.returning || 0} clients fidélisés`}
          icon={Users}
          prefix=""
        />
        <StatCard 
          title="Ticket Moyen"
          value={avgTicket}
          icon={Activity}
          prefix="$"
        />
      </div>

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

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Sales Chart */}
        <div className="lg:col-span-2 bg-card rounded-3xl p-8 shadow-sm border border-border/50">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-bold flex items-center gap-2 text-white italic tracking-tighter">
              <Calendar className="w-5 h-5 text-indigo-500" /> Flux de Ventes (Hebdo)
            </h3>
            <div className="flex items-center gap-4">
               <span className="text-xs font-black text-muted-foreground uppercase tracking-widest hidden md:block">Volume: {closedCount} commandes</span>
               <div className="h-4 w-px bg-border" />
               <span className="text-xs font-black text-primary uppercase tracking-widest">{totalPaidRevenue.toFixed(2)} USD</span>
            </div>
          </div>
          <CustomBarChart data={dynamicDailyChart} />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8 pt-8 border-t border-border">
              <div className="bg-primary/5 p-6 rounded-[2rem] border border-primary/10">
                  <div className="flex items-start justify-between mb-2">
                    <p className="text-[10px] font-black text-primary uppercase tracking-widest">Tendance Performance</p>
                    {growthRate >= 0 ? <ChevronUp className="w-4 h-4 text-emerald-500" /> : <ChevronDown className="w-4 h-4 text-destructive" />}
                  </div>
                  <p className="text-xs font-medium leading-relaxed">
                    Performance {growthRate >= 0 ? 'en hausse' : 'en baisse'} de <span className={cn("font-black italic", growthRate >= 0 ? "text-emerald-500" : "text-destructive")}>{Math.abs(growthRate).toFixed(1)}%</span> par rapport à la période précédente.
                  </p>
              </div>

              <div className="bg-emerald-500/5 p-6 rounded-[2rem] border border-emerald-500/10">
                  <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-2">Heures de Pointe</p>
                  <PeakHoursChart data={analytics?.peakHours || []} />
              </div>
          </div>
        </div>

        {/* Payments Breakdown */}
        <div className="bg-card rounded-3xl p-8 shadow-sm border border-border/50 flex flex-col">
          <h3 className="text-lg font-bold flex items-center gap-2 mb-2 text-white italic tracking-tighter">
             <CreditCard className="w-5 h-5 text-primary" /> Modes de Paiement
          </h3>
          <p className="text-[10px] font-black text-muted-foreground mb-6 uppercase tracking-widest">Répartition des encaissements</p>
          
          <div className="flex-1">
             <PieChartPlaceholder data={analytics?.paymentDistribution || []} />
          </div>

          <div className="mt-6 pt-6 border-t border-border">
             <div className="flex items-center gap-3 p-4 bg-secondary/50 rounded-2xl">
                <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center">
                   <Smartphone className="w-5 h-5 text-indigo-500" />
                </div>
                <div>
                   <p className="text-xs font-bold">Paiement Mobile</p>
                   <p className="text-[10px] text-muted-foreground">Privilégié à {(analytics?.paymentDistribution?.[1]?.value || 0)}%</p>
                </div>
             </div>
          </div>
        </div>
      </div>

      {/* Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-12">
        <div className="lg:col-span-2 bg-card rounded-3xl p-8 shadow-sm border border-border/50">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Utensils className="w-5 h-5 text-indigo-500" /> Plats les Plus Commandés
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-xs text-muted-foreground uppercase font-bold border-b border-border">
                  <th className="pb-4 pr-4">Produit</th>
                  <th className="pb-4 px-4 text-center">Commandes</th>
                  <th className="pb-4 px-4 text-center">Prix</th>
                  <th className="pb-4 pl-4 text-right">Profit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {dynamicTopDishes.length === 0 ? (
                  <tr><td colSpan={4} className="py-8 text-center text-muted-foreground italic">Aucune vente enregistrée.</td></tr>
                ) : (
                  dynamicTopDishes.map((dish: any, i: number) => (
                    <tr key={i} className="group hover:bg-secondary/50 transition-colors">
                      <td className="py-4 pr-4 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center font-bold text-[10px] text-primary">{i + 1}</div>
                        <span className="font-bold text-sm">{dish.name}</span>
                      </td>
                      <td className="py-4 px-4 text-center font-medium">{dish.orders}</td>
                      <td className="py-4 px-4 text-center font-medium">${dish.price}</td>
                      <td className="py-4 pl-4 text-right">
                         <span className="text-[10px] font-black uppercase px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-500">
                           +{dish.profit.toFixed(1)}$
                         </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-card rounded-3xl p-8 shadow-sm border border-border/50 overflow-hidden flex flex-col">
           <h3 className="text-lg font-bold flex items-center gap-2 mb-8">
             <Activity className="w-5 h-5 text-emerald-500" /> Activité Live
           </h3>
           
           <div className="space-y-6 flex-1 overflow-y-auto pr-2 custom-scrollbar">
              {orders.slice(0, showFullHistory ? undefined : 6).map((order) => (
                <div key={order.id} className="relative pl-6 pb-6 border-l-2 border-border last:pb-0">
                  <div className="absolute left-[-9px] top-0 w-4 h-4 rounded-full bg-background border-2 border-primary" />
                  <div className="flex justify-between items-start mb-1">
                     <span className="text-xs font-bold text-muted-foreground">{new Date(order.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                     <span className="text-[10px] font-black px-2 py-0.5 rounded bg-primary/10 text-primary uppercase">Table {order.table}</span>
                  </div>
                  <p className="font-bold text-sm">{order.statut === 'COMPLETED' ? 'Paiement reçu' : 'Nouveau'} : <span className="text-emerald-500">${order.totalUsd}</span></p>
                </div>
              ))}
           </div>
           
           <button 
              onClick={() => setShowFullHistory(!showFullHistory)}
              className="mt-6 w-full py-4 bg-secondary hover:bg-zinc-800 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
           >
              {showFullHistory ? "Réduire" : "Historique complet"}
           </button>
        </div>
      </div>

      {/* Taux Change Modal */}
      {showTauxModal && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
           <div className="bg-card w-full max-w-sm rounded-[2rem] border border-border p-8 shadow-2xl animate-in zoom-in-95 duration-200">
              <h3 className="text-xl font-black italic tracking-tighter mb-2">MISE À JOUR DU TAUX</h3>
              <p className="text-xs text-muted-foreground mb-6 uppercase tracking-widest font-bold">Ajustez le taux de change local</p>
              
              <div className="space-y-4">
                 <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2 block">Nouveau Taux (1$ = ? FC)</label>
                    <input 
                      type="number"
                      value={newTaux}
                      onChange={(e) => setNewTaux(e.target.value)}
                      className="w-full bg-secondary border border-border rounded-xl py-4 px-4 text-xl font-black outline-none focus:ring-2 focus:ring-primary/50"
                      placeholder="Ex: 2850"
                    />
                 </div>
                 <div className="flex gap-3">
                    <button 
                      onClick={() => setShowTauxModal(false)}
                      className="flex-1 bg-secondary text-muted-foreground font-black py-4 rounded-xl text-[10px] uppercase tracking-widest hover:bg-zinc-800 transition-all"
                    >
                       Annuler
                    </button>
                    <button 
                      disabled={tauxLoading}
                      onClick={async () => {
                        if (!newTaux || !restaurantId) return;
                        setTauxLoading(true);
                        const res = await updateRestaurantTauxChange(restaurantId, Number(newTaux));
                        if (res.success) {
                           setExchangeRate(Number(newTaux));
                           setShowTauxModal(false);
                           toast.success("Taux mis à jour !");
                        }
                        setTauxLoading(false);
                      }}
                      className="flex-1 bg-primary text-black font-black py-4 rounded-xl text-[10px] uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
                    >
                       {tauxLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Confirmer"}
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
