"use client"
/* eslint-disable @typescript-eslint/no-explicit-any, react/no-unescaped-entities */

import React, { useState, useEffect } from 'react';
import { 
  Package, 
  Plus, 
  ArrowUpRight, 
  ArrowDownLeft, 
  AlertTriangle, 
  Search, 
  Filter, 
  Truck, 
  MapPin, 
  Barcode,
  TrendingUp,
  History,
  Loader2,
  ChevronRight,
  MoreHorizontal,
  X,
  LineChart
} from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  getInventory, 
  getInventoryStats, 
  getLocations, 
  getSuppliers,
  createArticle,
  recordMovement,
  createSupplier,
  createLocation,
  deleteSupplier,
  deleteLocation
} from "@/lib/inventory-actions";
import { toast } from "sonner";
import { useSearchParams } from 'next/navigation';
import { getManagerSession } from "@/lib/manager-actions";
import { SubmitButton } from "@/components/manager/SubmitButton";

interface InventoryArticle {
  id: string;
  nom: string;
  reference?: string | null;
  categorie?: string | null;
  stockActuel: number;
  stockMin: number;
  unite: string;
  emplacement?: { nom: string } | null;
}

interface InventoryStats {
  totalItems: number;
  totalValue: number;
  lowStockCount: number;
}

export default function InventoryPage() {
  const searchParams = useSearchParams();
  const [restoId, setRestoId] = useState<string | null>(searchParams.get("resto_id"));
  
  const [loading, setLoading] = useState(true);
  const [articles, setArticles] = useState<InventoryArticle[]>([]);
  const [stats, setStats] = useState<InventoryStats | null>(null);
  const [locations, setLocations] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [plan, setPlan] = useState<string>("STANDARD");
  
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("ALL");
  
  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
  const [isSupModalOpen, setIsSupModalOpen] = useState(false);
  const [isLocModalOpen, setIsLocModalOpen] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<InventoryArticle | null>(null);
  const [activeTab, setActiveTab] = useState<'articles' | 'suppliers' | 'locations' | 'predictions'>('articles');
  const [predictions, setPredictions] = useState<any[]>([]);
  
  // Paywall state
  const isLocked = plan !== "PRO" && plan !== "PLATINUM";
  const [isPaywallOpen, setIsPaywallOpen] = useState(false);

  useEffect(() => {
    async function loadResto() {
      if (!searchParams.get("resto_id")) {
        const session = await getManagerSession();
        if (session) setRestoId(session.id);
      }
    }
    loadResto();
  }, [searchParams]);

  const fetchData = React.useCallback(async () => {
    if (!restoId) return;
    setLoading(true);
    
    // Récupérer le plan depuis la BD pour éviter les sessions obsolètes
    const { getRestaurantById } = await import("@/lib/admin-actions");
    const profile = await getRestaurantById(restoId);
    if (profile) {
      setPlan(profile.plan);
    }

    const [invData, statsData, locData, supData, predData] = await Promise.all([
      getInventory(restoId),
      getInventoryStats(restoId),
      getLocations(restoId),
      getSuppliers(restoId),
      import("@/lib/stock-predictive-actions").then(m => m.getPredictiveStockReport(restoId))
    ]);
    setArticles(invData as InventoryArticle[]);
    setStats(statsData as InventoryStats);
    setLocations(locData);
    setSuppliers(supData);
    if (predData && predData.success) setPredictions(predData.predictions || []);
    setLoading(false);
  }, [restoId]);

  useEffect(() => {
    if (restoId) {
      fetchData();
    }
  }, [restoId, fetchData]);

  const categories = ["ALL", ...Array.from(new Set(articles.map(a => a.categorie).filter((c): c is string => !!c)))];
  
  const filteredArticles = articles.filter(art => {
    const matchesSearch = art.nom.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         art.reference?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === "ALL" || art.categorie === filterCategory;
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-[1600px] mx-auto">
      {/* Header & Title */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-black italic tracking-tighter text-white uppercase">Gestion de Stock</h1>
          <p className="text-zinc-500 font-medium">Contrôlez vos approvisionnements et évitez les ruptures.</p>
        </div>
        
        <div className="flex flex-wrap gap-4">
          <button 
            onClick={() => {
                if(isLocked) return setIsPaywallOpen(true);
                if(activeTab === 'articles') setIsAddModalOpen(true);
                if(activeTab === 'suppliers') setIsSupModalOpen(true);
                if(activeTab === 'locations') setIsLocModalOpen(true);
            }}
            className="bg-primary hover:bg-primary/90 text-black font-black py-3 px-6 rounded-2xl transition-all shadow-lg shadow-primary/10 flex items-center gap-2 active:scale-95 text-xs uppercase tracking-widest"
          >
            <Plus className="w-4 h-4" /> 
            {activeTab === 'articles' ? "Nouvel Article" : activeTab === 'suppliers' ? "Nouveau Fournisseur" : "Nouvel Emplacement"}
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 bg-zinc-900 p-1.5 rounded-2xl border border-zinc-800 w-fit">
         {[
           { id: 'articles', label: 'Inventaire', icon: Package },
           { id: 'suppliers', label: 'Fournisseurs', icon: Truck },
           { id: 'locations', label: 'Emplacements', icon: MapPin },
           { id: 'predictions', label: 'Prévisions', icon: LineChart },
         ].map(tab => (
           <button
             key={tab.id}
             onClick={() => setActiveTab(tab.id as any)}
             className={cn(
               "flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
               activeTab === tab.id ? "bg-zinc-800 text-primary border border-zinc-700 shadow-xl shadow-black/20" : "text-zinc-500 hover:text-white"
             )}
           >
             <tab.icon className="w-4 h-4" /> {tab.label}
           </button>
         ))}
      </div>

      {activeTab === 'articles' && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-200">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-[2rem] flex items-center gap-5">
               <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center border border-indigo-500/20">
                  <Package className="w-6 h-6 text-indigo-400" />
               </div>
               <div>
                  <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Valeur Totale</p>
                  <p className="text-2xl font-black text-white italic">${stats?.totalValue?.toFixed(2) || "0.00"}</p>
               </div>
            </div>
            
            <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-[2rem] flex items-center gap-5">
               <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center border border-amber-500/20">
                  <AlertTriangle className="w-6 h-6 text-amber-400" />
               </div>
               <div>
                  <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Alertes Stock Faible</p>
                  <p className="text-2xl font-black text-amber-400 italic">{stats?.lowStockCount || 0}</p>
               </div>
            </div>

            <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-[2rem] flex items-center gap-5">
               <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center border border-emerald-500/20">
                  <TrendingUp className="w-6 h-6 text-emerald-400" />
               </div>
               <div>
                  <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Articles en Stock</p>
                  <p className="text-2xl font-black text-white italic">{stats?.totalItems || 0}</p>
               </div>
            </div>
          </div>

          {/* Filters & Table */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-6 md:p-8 space-y-6">
            <div className="flex flex-col md:flex-row justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input 
                  type="text"
                  placeholder="Rechercher par nom ou référence..."
                  value={searchQuery}
                  onChange={(e) => {
                      if(isLocked) return setIsPaywallOpen(true);
                      setSearchQuery(e.target.value);
                  }}
                  readOnly={isLocked}
                  onClick={() => { if(isLocked) setIsPaywallOpen(true); }}
                  className="w-full bg-zinc-800 border-zinc-700 rounded-2xl py-3 pl-12 pr-4 text-sm text-white focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-zinc-600"
                />
              </div>
              
              <div className="flex items-center gap-3">
                 <div className="flex items-center gap-2 bg-zinc-800 px-4 py-2 rounded-xl border border-zinc-700">
                   <Filter className="w-4 h-4 text-zinc-500" />
                   <select 
                     value={filterCategory}
                     onChange={(e) => {
                         if(isLocked) return;
                         setFilterCategory(e.target.value);
                     }}
                     onClick={(e) => {
                         if(isLocked) {
                             e.preventDefault();
                             setIsPaywallOpen(true);
                         }
                     }}
                     className="bg-transparent text-xs font-bold text-white outline-none uppercase tracking-tight cursor-pointer"
                   >
                     {categories.map(c => (
                       <option key={c} value={c} className="bg-zinc-900">{c}</option>
                     ))}
                   </select>
                 </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-zinc-800 pb-4">
                    <th className="px-4 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Article</th>
                    <th className="px-4 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Catégorie</th>
                    <th className="px-4 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-center">Stock Actuel</th>
                    <th className="px-4 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Statut</th>
                    <th className="px-4 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {filteredArticles.map((art) => {
                    const isLow = art.stockActuel <= art.stockMin;
                    const isEmpty = art.stockActuel <= 0;
                    
                    return (
                      <tr key={art.id} className="group hover:bg-zinc-800/20 transition-colors">
                        <td className="px-4 py-5 font-medium">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-zinc-800 rounded-xl flex items-center justify-center border border-zinc-700 group-hover:border-primary/30">
                              <Barcode className="w-5 h-5 text-zinc-500" />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-white uppercase italic">{art.nom}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <p className="text-[10px] text-zinc-500">REF: {art.reference || "N/A"}</p>
                                {art.emplacement && (
                                    <>
                                        <span className="w-1 h-1 bg-zinc-700 rounded-full" />
                                        <div className="flex items-center gap-1 text-[9px] text-zinc-500 font-bold uppercase tracking-tight">
                                            <MapPin className="w-2.5 h-2.5" /> {art.emplacement.nom}
                                        </div>
                                    </>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-5 text-xs text-zinc-400 font-bold uppercase tracking-tight">
                          {art.categorie || "Général"}
                        </td>
                        <td className="px-4 py-5 text-center">
                          <div className="inline-flex flex-col items-center">
                             <span className={cn("text-lg font-black italic", isLow ? (isEmpty ? "text-red-500" : "text-amber-500") : "text-white")}>
                               {art.stockActuel}
                             </span>
                             <span className="text-[8px] text-zinc-500 font-black uppercase">{art.unite}</span>
                          </div>
                        </td>
                        <td className="px-4 py-5">
                           {isEmpty ? (
                             <span className="px-3 py-1 bg-red-500/10 text-red-500 text-[10px] font-black uppercase rounded-lg border border-red-500/20">Rupture</span>
                           ) : isLow ? (
                             <span className="px-3 py-1 bg-amber-500/10 text-amber-500 text-[10px] font-black uppercase rounded-lg border border-amber-500/20">Critique</span>
                           ) : (
                             <span className="px-3 py-1 bg-emerald-500/10 text-emerald-500 text-[10px] font-black uppercase rounded-lg border border-emerald-500/20">En Stock</span>
                           )}
                        </td>
                        <td className="px-4 py-5 text-right">
                           <div className="flex items-center justify-end gap-2">
                              <button 
                                onClick={() => { 
                                    if(isLocked) return setIsPaywallOpen(true);
                                    setSelectedArticle(art); setIsMovementModalOpen(true); 
                                }}
                                className="bg-zinc-800 hover:bg-zinc-700 p-2.5 rounded-xl border border-zinc-700 text-zinc-400 hover:text-white transition-all"
                                title="Nouveau Mouvement"
                              >
                                <History className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => { if(isLocked) setIsPaywallOpen(true); }}
                                className="bg-zinc-800 hover:bg-zinc-700 p-2.5 rounded-xl border border-zinc-700 text-zinc-400 hover:text-white transition-all"
                              >
                                <MoreHorizontal className="w-4 h-4" />
                              </button>
                           </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filteredArticles.length === 0 && (
                <div className="py-20 text-center space-y-3">
                   <Package className="w-12 h-12 text-zinc-700 mx-auto" />
                   <p className="text-zinc-500 text-sm font-medium italic">Aucun article trouvé dans votre inventaire.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'suppliers' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-200">
             <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {suppliers.map(sup => (
                        <div key={sup.id} className="bg-zinc-800/50 border border-zinc-700 rounded-[2rem] p-6 space-y-4 hover:border-primary/30 transition-all group">
                            <div className="flex justify-between items-start">
                                <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center border border-primary/20 group-hover:bg-primary transition-all">
                                    <Truck className="w-6 h-6 text-primary group-hover:text-black transition-all" />
                                </div>
                                <button 
                                    onClick={async () => {
                                        if(isLocked) return setIsPaywallOpen(true);
                                        if(confirm("Supprimer ce fournisseur ?")) {
                                            await deleteSupplier(sup.id);
                                            fetchData();
                                        }
                                    }}
                                    className="p-2 text-zinc-600 hover:text-red-500 rounded-xl"
                                >
                                    <ArrowDownLeft className="w-4 h-4 rotate-45" />
                                </button>
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-white uppercase italic">{sup.nom}</h3>
                                <p className="text-xs text-zinc-500 font-bold">{sup.contact || "Pas de contact"}</p>
                            </div>
                            <div className="space-y-2 pt-2 border-t border-zinc-700/50 text-[10px] text-zinc-400 font-bold uppercase tracking-tight">
                                {sup.telephone && <p>📞 {sup.telephone}</p>}
                                {sup.email && <p>✉️ {sup.email}</p>}
                            </div>
                        </div>
                    ))}
                    <button 
                        onClick={() => {
                            if(isLocked) return setIsPaywallOpen(true);
                            setIsSupModalOpen(true);
                        }}
                        className="bg-zinc-900 border-2 border-dashed border-zinc-800 rounded-[2rem] p-8 flex flex-col items-center justify-center gap-4 hover:border-primary/50 hover:bg-zinc-800/20 transition-all text-zinc-600 hover:text-primary min-h-[200px]"
                    >
                        <Plus className="w-10 h-10" />
                        <span className="text-xs font-black uppercase tracking-widest">Nouveau Fournisseur</span>
                    </button>
                </div>
             </div>
          </div>
      )}

      {activeTab === 'locations' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-200">
             <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {locations.map(loc => (
                        <div key={loc.id} className="bg-zinc-800/50 border border-zinc-700 rounded-[2rem] p-6 space-y-4 hover:border-primary/30 transition-all group relative overflow-hidden">
                             <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 -mr-8 -mt-8 rounded-full blur-2xl" />
                             <div className="flex justify-between items-start">
                                <MapPin className="w-8 h-8 text-primary/30" />
                                <button 
                                    onClick={async () => {
                                        if(isLocked) return setIsPaywallOpen(true);
                                        if(confirm("Supprimer cet emplacement ?")) {
                                            await deleteLocation(loc.id);
                                            fetchData();
                                        }
                                    }}
                                    className="p-1 text-zinc-600 hover:text-red-500 rounded-lg group-hover:bg-zinc-700"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                             </div>
                             <div>
                                <h3 className="text-lg font-black text-white uppercase italic">{loc.nom}</h3>
                                <p className="text-xs text-zinc-500 font-medium line-clamp-2">{loc.description || "Aucune description"}</p>
                             </div>
                             <div className="pt-4 border-t border-zinc-700/50 flex justify-between items-center">
                                 <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Zone Activable</span>
                                 <ChevronRight className="w-4 h-4 text-zinc-700" />
                             </div>
                        </div>
                    ))}
                    <button 
                        onClick={() => {
                            if(isLocked) return setIsPaywallOpen(true);
                            setIsLocModalOpen(true);
                        }}
                        className="bg-zinc-900 border-2 border-dashed border-zinc-800 rounded-[2rem] p-8 flex flex-col items-center justify-center gap-4 hover:border-primary/50 hover:bg-zinc-800/20 transition-all text-zinc-600 hover:text-primary min-h-[180px]"
                    >
                        <Plus className="w-8 h-8" />
                        <span className="text-xs font-black uppercase tracking-widest text-center">Nouvel Emplacement</span>
                    </button>
                </div>
             </div>
          </div>
      )}

      {activeTab === 'predictions' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-200">
             <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-6 md:p-8 space-y-6">
                <div className="flex items-center gap-4 mb-8">
                  <div className="p-3 bg-indigo-500/10 rounded-2xl">
                    <LineChart className="w-6 h-6 text-indigo-500" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Prévisions de Rupture</h2>
                    <p className="text-sm text-zinc-400">Analyse basée sur la consommation des 14 derniers jours.</p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-zinc-800 pb-4">
                        <th className="px-4 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Article</th>
                        <th className="px-4 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-center">Stock</th>
                        <th className="px-4 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-center">Consommation / jour</th>
                        <th className="px-4 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-center">Jours Restants</th>
                        <th className="px-4 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-right">Date Estimée</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/50">
                      {predictions.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-12 text-center text-zinc-500">Aucune donnée suffisante.</td>
                        </tr>
                      ) : (
                        predictions.map(pred => (
                          <tr key={pred.articleId} className="group hover:bg-zinc-800/20 transition-colors">
                            <td className="px-4 py-5 font-bold text-white uppercase italic text-sm">
                               {pred.nom}
                            </td>
                            <td className="px-4 py-5 text-center text-zinc-300 font-bold">
                               {pred.stockActuel} <span className="text-[10px] text-zinc-500 uppercase">{pred.unite}</span>
                            </td>
                            <td className="px-4 py-5 text-center text-zinc-400 font-medium">
                               {pred.dailyConsumptionRate > 0 ? pred.dailyConsumptionRate.toFixed(2) : "-"}
                            </td>
                            <td className="px-4 py-5 text-center">
                               {pred.daysRemaining === -1 ? (
                                 <span className="text-zinc-600 font-bold">Stable</span>
                               ) : pred.daysRemaining === 0 ? (
                                 <span className="px-3 py-1 bg-red-500/10 text-red-500 text-[10px] font-black uppercase rounded-lg border border-red-500/20">Aujourd'hui</span>
                               ) : (
                                 <span className={cn("text-lg font-black italic", pred.isCritical ? "text-amber-500" : "text-emerald-500")}>
                                   {pred.daysRemaining} <span className="text-[10px] uppercase font-bold text-zinc-500 not-italic">Jours</span>
                                 </span>
                               )}
                            </td>
                            <td className="px-4 py-5 text-right">
                               {pred.stockoutDate ? (
                                  <span className="text-sm font-medium text-zinc-300">
                                     {new Date(pred.stockoutDate).toLocaleDateString()}
                                  </span>
                               ) : (
                                  <span className="text-zinc-600">-</span>
                               )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
             </div>
          </div>
      )}
      
      {/* ─── MODAL: AJOUT ARTICLE ─── */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
             <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                <div className="p-8 border-b border-zinc-800 bg-gradient-to-r from-zinc-900 to-black flex justify-between items-center">
                    <div>
                       <h2 className="text-xl font-black italic tracking-tighter text-white uppercase">Nouvel Article</h2>
                       <p className="text-xs text-zinc-500">Ajoutez une nouvelle référence à votre stock.</p>
                    </div>
                    <button onClick={() => setIsAddModalOpen(false)} className="p-2 hover:bg-zinc-800 rounded-xl text-zinc-500"><X /></button>
                </div>
                
                <form 
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    const res = await createArticle(restoId!, {
                      nom: formData.get("nom") as string,
                      reference: formData.get("reference") as string,
                      prixAchat: parseFloat(formData.get("prixAchat") as string) || 0,
                      stockMin: parseFloat(formData.get("stockMin") as string) || 5,
                      unite: formData.get("unite") as string,
                      categorie: formData.get("categorie") as string,
                      emplacementId: (formData.get("emplacementId") as string) || null,
                      fournisseurId: (formData.get("fournisseurId") as string) || null,
                      stockActuel: parseFloat(formData.get("stockInitial") as string) || 0,
                    });
                    if(res.success) {
                      toast.success("Article ajouté !");
                      setIsAddModalOpen(false);
                      fetchData();
                    } else {
                      toast.error("Erreur : " + res.error);
                    }
                  }}
                  className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[70vh] overflow-y-auto"
                >
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-zinc-500 uppercase ml-2">Nom de l'article</label>
                        <input name="nom" required className="w-full bg-zinc-800 border-zinc-700 rounded-xl py-3 px-4 text-xs text-white focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-zinc-600" placeholder="Ex: Sac de Riz 25Kg" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-zinc-500 uppercase ml-2">Référence / SKU</label>
                        <input name="reference" className="w-full bg-zinc-800 border-zinc-700 rounded-xl py-3 px-4 text-xs text-white focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-zinc-600" placeholder="Ex: RIZ-BAS-001" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-zinc-500 uppercase ml-2">Catégorie</label>
                        <input name="categorie" className="w-full bg-zinc-800 border-zinc-700 rounded-xl py-3 px-4 text-xs text-white focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-zinc-600" placeholder="Ex: Épicerie" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-zinc-500 uppercase ml-2">Unité de mesure</label>
                        <input name="unite" defaultValue="Unité" className="w-full bg-zinc-800 border-zinc-700 rounded-xl py-3 px-4 text-xs text-white focus:ring-1 focus:ring-primary outline-none transition-all" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-zinc-500 uppercase ml-2">Prix d'Achat (Unit.)</label>
                        <input name="prixAchat" type="number" step="0.01" required className="w-full bg-zinc-800 border-zinc-700 rounded-xl py-3 px-4 text-xs text-white focus:ring-1 focus:ring-primary outline-none transition-all" />
                    </div>
                    
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-zinc-500 uppercase ml-2">Stock Initial</label>
                        <input name="stockInitial" type="number" step="0.01" defaultValue="0" className="w-full bg-zinc-800 border-zinc-700 rounded-xl py-3 px-4 text-xs text-white focus:ring-1 focus:ring-primary outline-none transition-all" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-zinc-500 uppercase ml-2">Seuil Alerte (Min)</label>
                        <input name="stockMin" type="number" defaultValue="5" className="w-full bg-zinc-800 border-zinc-700 rounded-xl py-3 px-4 text-xs text-white focus:ring-1 focus:ring-primary outline-none transition-all" />
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-zinc-500 uppercase ml-2">Emplacement</label>
                        <select name="emplacementId" className="w-full bg-zinc-800 border-zinc-700 rounded-xl py-3 px-4 text-xs text-white focus:ring-1 focus:ring-primary outline-none appearance-none">
                            <option value="">Aucun</option>
                            {locations.map(loc => (
                                <option key={loc.id} value={loc.id} className="bg-zinc-900">{loc.nom}</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-zinc-500 uppercase ml-2">Fournisseur</label>
                        <select name="fournisseurId" className="w-full bg-zinc-800 border-zinc-700 rounded-xl py-3 px-4 text-xs text-white focus:ring-1 focus:ring-primary outline-none appearance-none">
                            <option value="">Aucun</option>
                            {suppliers.map(sup => (
                                <option key={sup.id} value={sup.id} className="bg-zinc-900">{sup.nom}</option>
                            ))}
                        </select>
                    </div>
                    
                    <SubmitButton loadingText="Création en cours...">
                        Créer la fiche Article
                    </SubmitButton>
                </form>
             </div>
        </div>
      )}

      {/* ─── MODAL: MOUVEMENT STOCK ─── */}
      {isMovementModalOpen && selectedArticle && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
             <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                <div className="p-8 border-b border-zinc-800 bg-zinc-950 flex flex-col gap-2">
                    <History className="w-8 h-8 text-primary/50 mb-2" />
                    <h2 className="text-xl font-black italic tracking-tighter text-white uppercase">Mouvement : {selectedArticle.nom}</h2>
                    <p className="text-xs text-zinc-500 uppercase font-bold tracking-widest">Stock actuel : {selectedArticle.stockActuel} {selectedArticle.unite}</p>
                </div>
                
                <form 
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    const res = await recordMovement({
                      articleId: selectedArticle.id,
                      restaurantId: restoId!,
                      type: formData.get("type") as any,
                      quantite: parseFloat(formData.get("quantite") as string) || 0,
                      note: formData.get("note") as string
                    });
                    if(res.success) {
                      toast.success("Stock mis à jour !");
                      setIsMovementModalOpen(false);
                      fetchData();
                    } else {
                      toast.error("Erreur : " + res.error);
                    }
                  }}
                  className="p-8 space-y-6"
                >
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-zinc-500 uppercase ml-2">Type d'opération</label>
                        <div className="grid grid-cols-2 gap-2">
                            <label className="relative cursor-pointer">
                                <input name="type" type="radio" value="ENTREE" defaultChecked className="peer sr-only" />
                                <div className="peer-checked:bg-emerald-600/20 peer-checked:border-emerald-500 peer-checked:text-emerald-500 border border-zinc-800 bg-zinc-800/50 p-3 rounded-xl text-center text-[10px] font-black uppercase transition-all flex items-center justify-center gap-2">
                                  <ArrowUpRight className="w-4 h-4" /> Entrée
                                </div>
                            </label>
                            <label className="relative cursor-pointer">
                                <input name="type" type="radio" value="SORTIE" className="peer sr-only" />
                                <div className="peer-checked:bg-red-600/20 peer-checked:border-red-500 peer-checked:text-red-500 border border-zinc-800 bg-zinc-800/50 p-3 rounded-xl text-center text-[10px] font-black uppercase transition-all flex items-center justify-center gap-2">
                                  <ArrowDownLeft className="w-4 h-4" /> Sortie
                                </div>
                            </label>
                            <label className="relative cursor-pointer">
                                <input name="type" type="radio" value="PERTE" className="peer sr-only" />
                                <div className="peer-checked:bg-amber-600/20 peer-checked:border-amber-500 peer-checked:text-amber-500 border border-zinc-800 bg-zinc-800/50 p-3 rounded-xl text-center text-[10px] font-black uppercase transition-all flex items-center justify-center gap-2">
                                  <AlertTriangle className="w-4 h-4" /> Perte
                                </div>
                            </label>
                            <label className="relative cursor-pointer">
                                <input name="type" type="radio" value="AJUSTEMENT" className="peer sr-only" />
                                <div className="peer-checked:bg-zinc-600/20 peer-checked:border-zinc-500 peer-checked:text-zinc-500 border border-zinc-800 bg-zinc-800/50 p-3 rounded-xl text-center text-[10px] font-black uppercase transition-all flex items-center justify-center gap-2">
                                  <Filter className="w-4 h-4" /> Ajuster
                                </div>
                            </label>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-zinc-500 uppercase ml-2">Quantité ({selectedArticle.unite})</label>
                        <input name="quantite" type="number" step="0.01" required className="w-full bg-zinc-800 border-zinc-700 rounded-xl py-3 px-4 text-xs text-white focus:ring-1 focus:ring-primary outline-none transition-all" />
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-zinc-500 uppercase ml-2">Note / Raison</label>
                        <textarea name="note" className="w-full bg-zinc-800 border-zinc-700 rounded-xl py-3 px-4 text-xs text-white focus:ring-1 focus:ring-primary outline-none transition-all h-20 placeholder:text-zinc-600" placeholder="Ex: Réception commande fournisseur #123..." />
                    </div>
                    
                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={() => setIsMovementModalOpen(false)} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 font-black py-4 rounded-2xl transition-all uppercase tracking-widest text-[10px]">Annuler</button>
                        <SubmitButton className="flex-[2] bg-white hover:bg-zinc-200 text-black shadow-lg" loadingText="Enregistrement...">
                            Enregistrer
                        </SubmitButton>
                    </div>
                </form>
             </div>
        </div>
      )}

      {/* ─── MODAL: NOUVEAU FOURNISSEUR ─── */}
      {isSupModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
             <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-300 shadow-2xl">
                <div className="p-8 border-b border-zinc-800 bg-zinc-950">
                    <h2 className="text-xl font-black text-white italic uppercase tracking-tighter flex items-center gap-2">
                        <Truck className="w-6 h-6 text-primary" /> Nouveau Fournisseur
                    </h2>
                </div>
                <form 
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    const res = await createSupplier(restoId!, {
                      nom: formData.get("nom") as string,
                      contact: formData.get("contact") as string,
                      telephone: formData.get("telephone") as string,
                      email: formData.get("email") as string,
                    });
                    if(res.success) {
                      toast.success("Fournisseur créé !");
                      setIsSupModalOpen(false);
                      fetchData();
                    }
                  }}
                  className="p-8 space-y-4"
                >
                    <input name="nom" required placeholder="Nom de l'entreprise" className="w-full bg-zinc-800 border-zinc-700 rounded-xl py-3 px-4 text-xs text-white outline-none focus:ring-1 focus:ring-primary placeholder:text-zinc-600" />
                    <input name="contact" placeholder="Personne de contact" className="w-full bg-zinc-800 border-zinc-700 rounded-xl py-3 px-4 text-xs text-white outline-none focus:ring-1 focus:ring-primary placeholder:text-zinc-600" />
                    <input name="telephone" placeholder="Téléphone" className="w-full bg-zinc-800 border-zinc-700 rounded-xl py-3 px-4 text-xs text-white outline-none focus:ring-1 focus:ring-primary placeholder:text-zinc-600" />
                    <input name="email" placeholder="Email" className="w-full bg-zinc-800 border-zinc-700 rounded-xl py-3 px-4 text-xs text-white outline-none focus:ring-1 focus:ring-primary placeholder:text-zinc-600" />
                    <div className="flex gap-2 pt-4">
                        <button type="button" onClick={() => setIsSupModalOpen(false)} className="flex-1 bg-zinc-800 py-4 rounded-xl text-xs font-black uppercase text-zinc-500">Annuler</button>
                        <SubmitButton loadingText="Création...">
                            Enregistrer
                        </SubmitButton>
                    </div>
                </form>
             </div>
        </div>
      )}

      {/* ─── MODAL: NOUVEL EMPLACEMENT ─── */}
      {isLocModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
             <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-300 shadow-2xl">
                <div className="p-8 border-b border-zinc-800 bg-zinc-950">
                    <h2 className="text-xl font-black text-white italic uppercase tracking-tighter flex items-center gap-2">
                        <MapPin className="w-6 h-6 text-primary" /> Nouvel Emplacement
                    </h2>
                </div>
                <form 
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    const res = await createLocation(restoId!, {
                      nom: formData.get("nom") as string,
                      description: formData.get("description") as string,
                    });
                    if(res.success) {
                      toast.success("Emplacement créé !");
                      setIsLocModalOpen(false);
                      fetchData();
                    }
                  }}
                  className="p-8 space-y-4"
                >
                    <input name="nom" required placeholder="Nom (Ex: Réserve Centrale, Frigo A...)" className="w-full bg-zinc-800 border-zinc-700 rounded-xl py-3 px-4 text-xs text-white outline-none focus:ring-1 focus:ring-primary placeholder:text-zinc-600" />
                    <textarea name="description" placeholder="Description courte..." className="w-full bg-zinc-800 border-zinc-700 rounded-xl py-3 px-4 text-xs text-white outline-none focus:ring-1 focus:ring-primary h-24 placeholder:text-zinc-600" />
                    <div className="flex gap-2 pt-4">
                        <button type="button" onClick={() => setIsLocModalOpen(false)} className="flex-1 bg-zinc-800 py-4 rounded-xl text-xs font-black uppercase text-zinc-500">Annuler</button>
                        <SubmitButton loadingText="Création...">
                            Enregistrer
                        </SubmitButton>
                    </div>
                </form>
             </div>
        </div>
      )}

      {/* ─── MODAL PAYWALL ─── */}
      {isPaywallOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[150] flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="max-w-2xl w-full bg-zinc-900 border border-zinc-800 rounded-[3rem] p-10 md:p-16 text-center shadow-2xl relative overflow-hidden group animate-in zoom-in-95 duration-300">
                <button onClick={() => setIsPaywallOpen(false)} className="absolute top-6 right-6 text-zinc-500 hover:text-white transition-colors z-20">
                    <X className="w-5 h-5" />
                </button>
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-primary/10 blur-[100px] rounded-full pointer-events-none group-hover:bg-primary/20 transition-all duration-300" />
                
                <div className="relative z-10 space-y-8">
                    <div className="w-24 h-24 bg-zinc-800 rounded-[2.5rem] flex items-center justify-center mx-auto border border-zinc-700 shadow-xl group-hover:scale-110 transition-transform duration-200">
                        <Package className="w-12 h-12 text-zinc-600" />
                        <div className="absolute -top-2 -right-2 bg-primary text-black p-2 rounded-xl shadow-lg">
                            <ArrowUpRight className="w-4 h-4" />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h2 className="text-4xl font-black italic tracking-tighter text-white uppercase leading-none">Fonctionnalité PRO</h2>
                        <p className="text-zinc-500 font-medium text-lg leading-relaxed">
                            L'interaction avec la gestion de stock est une exclusivité des plans <span className="text-primary font-bold">PRO & PLATINIUM</span>. 
                            Optimisez vos marges et évitez les ruptures dès maintenant.
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                        <button 
                            onClick={() => window.location.href = '/manager/settings?tab=subscription'}
                            className="bg-primary hover:bg-primary/90 text-black font-black py-4 px-10 rounded-2xl transition-all shadow-lg shadow-primary/10 flex items-center justify-center gap-3 uppercase tracking-widest text-xs active:scale-95 w-full sm:w-auto"
                        >
                            Changer de plan
                        </button>
                        <button 
                            onClick={() => window.location.href = '/pricing'}
                            className="bg-zinc-800 hover:bg-zinc-700 text-white font-black py-4 px-10 rounded-2xl transition-all border border-zinc-700 flex items-center justify-center gap-3 uppercase tracking-widest text-xs active:scale-95 w-full sm:w-auto"
                        >
                            Explorer les tarifs
                        </button>
                    </div>

                    <div className="pt-8 border-t border-zinc-800 grid grid-cols-2 gap-4 text-left">
                        <div className="flex gap-3">
                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-1.5 shrink-0" />
                            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-tight">Alertes stock faible programmables</p>
                        </div>
                        <div className="flex gap-3">
                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-1.5 shrink-0" />
                            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-tight">Suivi détaillé des fournisseurs</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}
