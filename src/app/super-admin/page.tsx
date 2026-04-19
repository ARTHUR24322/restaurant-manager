"use client"

import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Building2, 
  Users, 
  DollarSign, 
  ShieldCheck, 
  Power, 
  ExternalLink,
  Loader2,
  Mail,
  Lock,
  Globe,
  Settings,
  Pencil,
  X,
  MapPin,
  Activity,
  Bell,
  Phone,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  Search,
  RefreshCw,
  ChevronRight,
  ArrowLeft,
  Send
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createRestaurant, getAllRestaurants, toggleSubscription, updateRestaurant, deleteRestaurant } from "@/lib/admin-actions";
import { impersonateRestaurant, authenticateSuperAdmin, getSuperAdminSession, verifySuperAdminPin, updateAdminPin } from "@/lib/auth-actions";
import { getGlobalAnalytics } from "@/lib/analytics-actions";
import { getAllDemandes, approveDemande, rejectDemande } from "@/lib/demande-actions";
import { toast } from "sonner";
import { sendBroadcastNotification } from "@/lib/admin-broadcast";

// --- COMPOSANTS DE VISUALISATION (SVG) ---

function DonutChart({ data }: { data: { name: string, value: number }[] }) {
  const total = data.reduce((acc, curr) => acc + curr.value, 0);
  let currentOffset = 0;
  
  const colors = ["#818cf8", "#f472b6", "#fbbf24", "#34d399", "#a78bfa"];

  return (
    <div className="relative w-48 h-48 flex items-center justify-center">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 32 32">
        {data.map((item, idx) => {
          const percentage = (item.value / total) * 100;
          const strokeDasharray = `${percentage} ${100 - percentage}`;
          const offset = currentOffset;
          currentOffset += percentage;
          
          return (
            <circle
              key={idx}
              cx="16" cy="16" r="14"
              fill="transparent"
              stroke={colors[idx % colors.length]}
              strokeWidth="4"
              strokeDasharray={strokeDasharray}
              strokeDashoffset={-offset}
              className="transition-all duration-1000 ease-out hover:opacity-80 cursor-pointer"
            />
          );
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900 rounded-full m-8 border border-zinc-800 shadow-inner">
        <span className="text-xl font-black text-white">{total}</span>
        <span className="text-[8px] font-bold text-zinc-500 uppercase">Total Items</span>
      </div>
    </div>
  );
}

function MiniBarChart({ data }: { data: { name: string, value: number }[] }) {
  const max = Math.max(...data.map(d => d.value), 1);
  
  return (
    <div className="flex items-end gap-2 h-32 w-full pt-4">
      {data.map((item, idx) => (
        <div key={idx} className="flex-1 flex flex-col items-center gap-2 group">
          <div className="relative w-full flex items-end justify-center h-full">
            <div 
              className="w-full bg-indigo-500/20 group-hover:bg-indigo-500/40 rounded-t-lg transition-all duration-700 ease-out border-b-2 border-indigo-500"
              style={{ height: `${(item.value / max) * 100}%` }}
            >
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-zinc-800 px-2 py-0.5 rounded text-[8px] font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity">
                    {item.value}
                </div>
            </div>
          </div>
          <span className="text-[8px] font-black text-zinc-500 uppercase truncate w-full text-center">{item.name}</span>
        </div>
      ))}
    </div>
  );
}

export default function SuperAdminPage() {
  const [isLogged, setIsLogged] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");
  const [editingResto, setEditingResto] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [demandes, setDemandes] = useState<any[]>([]);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [approvePassword, setApprovePassword] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [expandedMother, setExpandedMother] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [showPinStep, setShowPinStep] = useState(false);
  const [pin, setPin] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'restaurants' | 'demandes' | 'broadcast' | 'settings'>('dashboard');
  
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [broadcastType, setBroadcastType] = useState<any>("INFO");
  const [broadcastLoading, setBroadcastLoading] = useState(false);

  const [oldPin, setOldPin] = useState("");
  const [newPin, setNewPin] = useState("");

  useEffect(() => {
    const checkSession = async () => {
      const res = await getSuperAdminSession();
      if (res.success) {
        setIsLogged(true);
        fetchRestos();
      }
    };
    checkSession();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData();
    formData.append("email", email);
    formData.append("password", password);

    const res = await authenticateSuperAdmin(formData);
    
    if (res.success && res.requiresPin) {
      setShowPinStep(true);
    } else if (res.success) {
      setIsLogged(true);
      fetchRestos();
    } else {
      setError(res.error || "Identifiants incorrects");
    }
    setLoading(false);
  };

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await verifySuperAdminPin(pin);
    if (res.success) {
      setIsLogged(true);
      fetchRestos();
    } else {
      setError(res.error || "Code PIN incorrect");
    }
    setLoading(false);
  };

  const fetchRestos = async () => {
    setLoading(true);
    try {
      const data = await getAllRestaurants();
      setRestaurants(Array.isArray(data) ? data : []);
      
      const stats = await getGlobalAnalytics();
      if(stats.success) setAnalytics(stats);

      const demandesData = await getAllDemandes();
      setDemandes(Array.isArray(demandesData) ? demandesData : []);
      
    } catch (e) {
      console.error(e);
      setRestaurants([]);
    }
    setLoading(false);
  };

  const formRef = React.useRef<HTMLFormElement>(null);

  const clientAction = async (formData: FormData) => {
    setIsCreating(true);
    try {
      const res = await createRestaurant(formData);
      if (res.success) {
        toast.success("🚀 Restaurant Déployé !", {
          description: `ID: ${res.restoId} | Mot de passe: ${res.password}`,
          duration: 10000,
        });
        formRef.current?.reset();
        await fetchRestos();
      } else {
        toast.error("Erreur: " + res.error);
      }
    } catch (err) {
      toast.error("Erreur de connexion serveur.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggle = async (id: string, current: boolean) => {
    await toggleSubscription(id, !current);
    fetchRestos();
  };

  const handleDelete = async (id: string) => {
    if (confirmDeleteId !== id) {
        setConfirmDeleteId(id);
        toast.warning("Cliquez à nouveau pour CONFIRMER la suppression DÉFINITIVE.");
        setTimeout(() => setConfirmDeleteId(null), 5000); // Reset après 5s
        return;
    }

    setLoading(true);
    const res = await deleteRestaurant(id);
    if (res.success) {
        toast.success("🔥 Établissement supprimé avec succès.");
        await fetchRestos();
    } else {
        toast.error(res.error || "Erreur lors de la suppression.");
    }
    setConfirmDeleteId(null);
    setLoading(false);
  };

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastTitle || !broadcastMessage) {
        toast.error("Veuillez remplir tous les champs.");
        return;
    }

    setBroadcastLoading(true);
    const res = await sendBroadcastNotification({
        title: broadcastTitle,
        message: broadcastMessage,
        type: broadcastType
    });
    setBroadcastLoading(false);

    if (res.success) {
        toast.success(`🚀 Broadcast envoyé à ${res.count} restaurants !`);
        setBroadcastTitle("");
        setBroadcastMessage("");
    } else {
        toast.error(res.error || "Erreur lors de l'envoi.");
    }
  };

  if (!isLogged) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-10 shadow-2xl animate-in zoom-in-95 duration-500">
             <div className="flex flex-col items-center mb-8">
                <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-primary/20">
                    <ShieldCheck className="w-8 h-8 text-black" />
                </div>
                <h1 className="text-2xl font-black text-white italic uppercase tracking-tighter">SmartResto SaaS</h1>
                <p className="text-zinc-500 text-xs font-bold tracking-widest uppercase">Propriétaire Plateforme</p>
             </div>

             {!showPinStep ? (
               <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-1">
                      <label className="text-[10px] font-black text-zinc-500 uppercase ml-4">Email Admin</label>
                      <div className="relative">
                          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                          <input 
                              type="email" 
                              required
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              className="w-full bg-zinc-800 border-zinc-700 rounded-2xl py-4 pl-12 text-sm text-white focus:ring-2 focus:ring-primary transition-all outline-none"
                              placeholder="arthur...@gmail.com"
                          />
                      </div>
                  </div>
                  <div className="space-y-1">
                      <label className="text-[10px] font-black text-zinc-500 uppercase ml-4">Mot de passe</label>
                      <div className="relative">
                          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                          <input 
                              type="password" 
                              required
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              className="w-full bg-zinc-800 border-zinc-700 rounded-2xl py-4 pl-12 text-sm text-white focus:ring-2 focus:ring-primary transition-all outline-none"
                              placeholder="••••••••"
                          />
                      </div>
                  </div>
                  {error && <p className="text-red-500 text-[10px] font-bold text-center uppercase">{error}</p>}
                  <button 
                    disabled={loading}
                    className="w-full bg-primary hover:bg-primary/90 text-black font-black py-4 rounded-2xl transition-all shadow-lg shadow-primary/10 uppercase tracking-widest text-xs flex items-center justify-center gap-2"
                  >
                      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                      Entrer dans la Forge
                  </button>
               </form>
             ) : (
               <form onSubmit={handlePinSubmit} className="space-y-6">
                  <div className="text-center space-y-2">
                    <p className="text-xs text-zinc-400 font-medium">Double Authentification Requise</p>
                    <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">Saisissez votre code PIN à 6 chiffres</p>
                  </div>
                  
                  <div className="flex justify-center">
                    <input 
                      type="text" 
                      maxLength={6}
                      required
                      autoFocus
                      value={pin}
                      onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                      className="w-48 bg-zinc-800 border-2 border-zinc-700 rounded-2xl py-4 text-center text-3xl font-black tracking-[0.5em] text-primary focus:border-primary transition-all outline-none"
                      placeholder="••••••"
                    />
                  </div>

                  {error && <p className="text-red-500 text-[10px] font-bold text-center uppercase">{error}</p>}

                  <div className="space-y-3">
                    <button 
                      disabled={loading || pin.length !== 6}
                      className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 text-black font-black py-4 rounded-2xl transition-all shadow-lg shadow-primary/10 uppercase tracking-widest text-xs flex items-center justify-center gap-2"
                    >
                        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                        Valider l'Accès
                    </button>
                    <button 
                      type="button"
                      onClick={() => setShowPinStep(false)}
                      className="w-full text-[10px] font-black text-zinc-500 uppercase hover:text-white transition-colors"
                    >
                      Retour
                    </button>
                  </div>
               </form>
             )}
          </div>
        </div>
      );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-8 space-y-8 animate-in fade-in duration-1000">
      {/* Header & Nav */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-10">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 bg-zinc-900 rounded-lg flex items-center justify-center border border-zinc-800">
                <ShieldCheck className="w-4 h-4 text-primary" />
            </div>
            <h2 className="text-sm font-black text-zinc-500 uppercase tracking-widest italic">SaaS Command Center</h2>
          </div>
          <h1 className="text-5xl font-black italic tracking-tighter text-white">Bonjour, Arthur.</h1>
        </div>

        <nav className="flex items-center bg-zinc-900/50 p-1.5 rounded-2xl border border-zinc-800/50 backdrop-blur-xl">
            {[
                { id: 'dashboard', label: 'Command Center', icon: <Activity className="w-4 h-4" /> },
                { id: 'restaurants', label: 'Restaurants', icon: <Building2 className="w-4 h-4" /> },
                { id: 'demandes', label: 'Validations', icon: <Bell className="w-4 h-4" />, count: demandes.filter(d => d.statut === "EN_ATTENTE").length },
                { id: 'broadcast', label: 'Broadcast', icon: <Globe className="w-4 h-4" /> },
                { id: 'settings', label: 'System', icon: <Settings className="w-4 h-4" /> },
            ].map((tab) => (
                <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={cn(
                        "flex items-center gap-2 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all relative overflow-hidden",
                        activeTab === tab.id 
                            ? "bg-primary text-black shadow-lg shadow-primary/20" 
                            : "text-zinc-500 hover:text-white hover:bg-zinc-800/50"
                    )}
                >
                    {tab.icon}
                    {tab.label}
                    {tab.count ? (
                        <span className={cn(
                            "absolute top-1.5 right-1.5 w-2 h-2 rounded-full",
                            activeTab === tab.id ? "bg-black" : "bg-primary animate-pulse"
                        )} />
                    ) : null}
                </button>
            ))}
        </nav>
      </div>

      {/* ─── TAB: DASHBOARD ─── */}
      {activeTab === 'dashboard' && (
        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-700">
            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                 {[
                    { label: 'Revenu SaaS Mensuel', val: `$ ${analytics?.saasRevenue?.toFixed(2)}`, color: 'text-indigo-500', icon: <Building2 className="w-5 h-5" />, trend: '+12% ce mois' },
                    { label: 'Volume d\'Affaires (GMV)', val: `$ ${analytics?.globalRevenue?.toFixed(2)}`, color: 'text-emerald-500', icon: <DollarSign className="w-5 h-5" />, trend: 'Tout le temps' },
                    { label: 'Scans QR Totaux', val: analytics?.totalVisites || 0, color: 'text-primary', icon: <Activity className="w-5 h-5" />, trend: 'Engagement global' },
                    { label: 'Inscriptions', val: restaurants.length, color: 'text-white', icon: <Users className="w-5 h-5" />, trend: 'Total Restaurants' },
                 ].map((stat, i) => (
                    <div key={i} className="bg-zinc-900 border border-zinc-800 p-8 rounded-[2.5rem] relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                            {stat.icon}
                        </div>
                        <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">{stat.label}</p>
                        <p className={cn("text-3xl font-black italic tracking-tighter mb-4", stat.color)}>{stat.val}</p>
                        <div className="flex items-center gap-2 text-[9px] font-black uppercase text-zinc-600 tracking-tight">
                            <span className="w-1 h-1 rounded-full bg-zinc-700" /> {stat.trend}
                        </div>
                    </div>
                 ))}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* Graphiques Section */}
                <div className="xl:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Donut: Plans Distribution */}
                    <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-10 flex flex-col items-center justify-center text-center">
                        <h3 className="text-sm font-black uppercase tracking-widest text-zinc-500 mb-8">Répartition des Plans</h3>
                        <DonutChart data={analytics?.planDistribution || []} />
                        <div className="grid grid-cols-2 gap-4 mt-8 w-full">
                            {(analytics?.planDistribution || []).map((d: any, i: number) => (
                                <div key={i} className="flex items-center gap-2 text-[10px] font-bold text-white uppercase">
                                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: ["#818cf8", "#f472b6", "#fbbf24", "#34d399", "#a78bfa"][i % 5] }} />
                                    {d.name} : <span className="text-zinc-500">{d.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Bars: City Distribution */}
                    <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-10 flex flex-col items-center justify-between">
                        <div className="w-full text-center">
                            <h3 className="text-sm font-black uppercase tracking-widest text-zinc-500 mb-2">Expansion Géographique</h3>
                            <p className="text-[10px] font-bold text-indigo-500 uppercase mb-8">Restaurants par Ville</p>
                        </div>
                        <MiniBarChart data={analytics?.cityDistribution || []} />
                    </div>
                </div>

                {/* Flux d'activité existant */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-8 overflow-hidden">
                    <div className="flex items-center justify-between mb-8">
                       <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                           <Clock className="w-4 h-4 text-indigo-500" /> Activité Récente
                       </h3>
                    </div>
                    <div className="space-y-4">
                        {analytics?.subscriptionActivity?.map((log: any) => (
                            <div key={log.id} className="bg-zinc-950/50 p-4 rounded-2xl border border-zinc-900">
                                <div className="flex justify-between items-start mb-2">
                                    <span className="text-[10px] font-black text-white uppercase leading-none">{log.restaurantNom}</span>
                                    <span className="text-[8px] font-bold text-zinc-600 uppercase">{new Date(log.createdAt).toLocaleDateString()}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                     <span className={cn(
                                         "text-[9px] font-black px-2 py-0.5 rounded-full uppercase",
                                         log.type === 'UPGRADE' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-zinc-800 text-zinc-400'
                                     )}>{log.type}</span>
                                     <span className="text-[10px] font-medium text-zinc-500 italic">{log.newPlan}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
      )}



      {/* ─── TAB: RESTAURANTS ─── */}
      {activeTab === 'restaurants' && (
        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-700">
            <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-8">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
                    <h3 className="text-lg font-black uppercase tracking-tighter flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-primary" /> Établissements ({restaurants?.length || 0})
                    </h3>
                    
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <div className="relative flex-1 sm:w-64">
                            <input 
                                type="text"
                                placeholder="Rechercher..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl py-2 pl-4 pr-10 text-xs text-white focus:ring-1 focus:ring-primary outline-none"
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500">
                                <Users className="w-4 h-4" />
                            </div>
                        </div>
                        <button onClick={fetchRestos} className="p-2 hover:bg-zinc-800 rounded-lg transition-colors border border-zinc-700">
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Settings className="w-4 h-4 text-zinc-400" />}
                        </button>
                    </div>
                </div>

                <div className={cn(
                    "space-y-4 pr-2 custom-scrollbar",
                    !showAll && "max-h-[600px] overflow-y-auto"
                )}>
                    {restaurants?.filter(r => 
                        r.nom.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        r.email.toLowerCase().includes(searchQuery.toLowerCase())
                    ).map(r => {
                         // Calcul hiérarchie par email
                         const ownedBySameEmail = restaurants.filter(other => other.email === r.email);
                         const sorted = [...ownedBySameEmail].sort((a,b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
                         const isMain = sorted[0]?.id === r.id;
                         const childCount = ownedBySameEmail.length - 1;
                         const children = ownedBySameEmail.filter(c => c.id !== sorted[0]?.id);
                         return { ...r, isMain, childCount, children };
                    })
                    .filter(r => r.isMain) // Uniquement les établissements mères au premier niveau
                    .slice(0, showAll ? undefined : 5).map(resto => {
                        const now = new Date();
                        const start = new Date(resto.createdAt);
                        const end = new Date(resto.subscriptionEnd || Date.now());
                        const total = end.getTime() - start.getTime();
                        const elapsed = now.getTime() - start.getTime();
                        const percent = Math.min(100, Math.max(0, (elapsed / total) * 100));
                        
                        const daysRemaining = Math.max(0, Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
                        
                        let barColor = "bg-emerald-500";
                        if (percent >= 70 && percent < 90) barColor = "bg-amber-500";
                        if (percent >= 90) barColor = "bg-red-500";

                        const isExpanded = expandedMother === resto.id;

                        return (
                        <div key={resto.id} className="space-y-4">
                            <div className="relative bg-zinc-800/30 p-5 pt-7 rounded-3xl border border-zinc-800/50 hover:bg-zinc-800/50 transition-all group overflow-hidden">
                                 {/* Subscription Progress Bar */}
                                 <div className="absolute top-0 left-0 w-full h-1 bg-zinc-800/50">
                                    <div 
                                        className={cn("h-full transition-all duration-1000 shadow-[0_0_8px]", barColor)} 
                                        style={{ width: `${percent}%` }}
                                    />
                                 </div>
                                 
                                 <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className={cn(
                                            "w-12 h-12 rounded-2xl flex items-center justify-center border transition-colors overflow-hidden shrink-0",
                                            resto.active ? "bg-emerald-500/10 border-emerald-500/20" : "bg-zinc-800 border-zinc-700 opacity-50"
                                        )}>
                                            {resto.logoUrl ? (
                                                <img src={resto.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                                            ) : (
                                                <Building2 className={cn("w-6 h-6", resto.active ? "text-emerald-500" : "text-zinc-600")} />
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                <h4 className="font-black text-white uppercase tracking-tighter truncate">{resto.nom}</h4>
                                                {resto.active ? (
                                                    <span className="text-[8px] bg-emerald-500 text-black px-1.5 py-0.5 rounded font-black uppercase">Actif</span>
                                                ) : (
                                                    <span className="text-[8px] bg-zinc-700 text-zinc-400 px-1.5 py-0.5 rounded font-black uppercase">Suspendu</span>
                                                )}
                                                {resto.plan === "PLATINUM" && resto.isMain && resto.childCount > 0 && (
                                                    <span className="text-[8px] bg-indigo-600 text-white px-2 py-0.5 rounded-full font-black uppercase flex items-center gap-1 shadow-lg shadow-indigo-500/20">
                                                        <Globe className="w-2 h-2" /> +{resto.childCount} Filiales
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-zinc-500 font-medium truncate">{resto.email}</p>
                                            <div className="flex items-center gap-1 mt-0.5">
                                                <MapPin className="w-3 h-3 text-primary/50" />
                                                <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-tight">{resto.ville || "Lubumbashi"}</span>
                                            </div>
                                            <div className="flex items-center gap-1 mt-0.5">
                                                <ShieldCheck className="w-3 h-3 text-amber-500/50" />
                                                <span className="text-[10px] text-amber-500/80 font-black tracking-widest uppercase">PIN: {resto.pinCode}</span>
                                            </div>
                                        </div>
                                    </div>
    
                                    <div className="flex flex-col items-end gap-1 shrink-0">
                                        <p className={cn("text-[9px] font-black uppercase tracking-widest leading-none", percent >= 90 ? "text-red-500 animate-pulse" : "text-zinc-500")}>
                                            {daysRemaining > 0 ? `${daysRemaining} Jours restants` : "Expiré"}
                                        </p>
                                        <div className="flex items-center gap-2 mt-1">
                                            {resto.childCount > 0 && (
                                                <button 
                                                    onClick={() => setExpandedMother(isExpanded ? null : resto.id)}
                                                    className={cn(
                                                        "p-2 px-3 rounded-xl border transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest active:scale-95",
                                                        isExpanded ? "bg-indigo-600 text-white border-indigo-500" : "bg-zinc-800/50 text-zinc-400 border-zinc-700 hover:text-primary hover:border-primary/50"
                                                    )}
                                                >
                                                    <Users className="w-4 h-4" /> {isExpanded ? "Cacher" : "Gérer Filiales"}
                                                </button>
                                            )}
                                            <button 
                                                onClick={() => setEditingResto(resto)}
                                                className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-primary rounded-xl border border-zinc-700 transition-all focus:scale-95"
                                                title="Modifier le compte"
                                            >
                                                <Pencil className="w-4 h-4" />
                                            </button>
                                            <button 
                                                onClick={() => handleToggle(resto.id, resto.active)}
                                                className={cn(
                                                    "p-2 rounded-xl border transition-all",
                                                    resto.active ? "hover:bg-red-500/10 hover:border-red-500/50 text-emerald-500" : "hover:bg-emerald-500/10 hover:border-emerald-500/50 text-zinc-600"
                                                )}
                                                title={resto.active ? "Suspendre l'abonnement" : "Réactiver l'abonnement"}
                                            >
                                                <Power className="w-4 h-4" />
                                            </button>
                                            <button 
                                                onClick={async () => {
                                                    const res = await impersonateRestaurant(resto.id);
                                                    if (res.success) {
                                                        window.open(`/manager/dashboard?resto_id=${resto.id}`, "_blank");
                                                    } else {
                                                        toast.error(res.error || "Échec de la simulation");
                                                    }
                                                }}
                                                className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-xl border border-zinc-700 transition-all focus:scale-95"
                                                title="Simuler la connexion Manager"
                                            >
                                                <ExternalLink className="w-4 h-4" />
                                            </button>
                                            <button 
                                                onClick={() => handleDelete(resto.id)}
                                                className={cn(
                                                    "p-2 rounded-xl border transition-all focus:scale-95",
                                                    confirmDeleteId === resto.id ? "bg-red-600 text-white border-red-500 animate-pulse" : "bg-zinc-800 hover:bg-red-500/10 text-zinc-600 hover:text-red-500 border-zinc-700 hover:border-red-500/50"
                                                )}
                                                title="Supprimer définitivement"
                                            >
                                                <XCircle className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                 </div>
                            </div>

                            {/* Établissements Enfants (Filiales) */}
                            {isExpanded && resto.children && (
                                <div className="ml-12 space-y-3 animate-in slide-in-from-top-4 duration-300">
                                    {resto.children.map((child: any) => (
                                        <div key={child.id} className="bg-zinc-900/50 border border-zinc-800 rounded-[1.5rem] p-4 flex items-center justify-between group/child hover:bg-zinc-900 transition-all">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-zinc-800/80 flex items-center justify-center border border-zinc-700">
                                                    <MapPin className="w-4 h-4 text-zinc-600" />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <h5 className="text-sm font-black text-white uppercase tracking-tighter">{child.nom}</h5>
                                                        <span className={cn("text-[8px] font-black uppercase px-2 py-0.5 rounded", child.active ? "bg-zinc-800 text-zinc-400" : "bg-red-500 text-white animate-pulse")}>
                                                            {child.active ? "Enfant Actif" : "Enfant Suspendu"}
                                                        </span>
                                                    </div>
                                                    <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">{child.ville} • {child.slug}</p>
                                                    <p className="text-[10px] text-amber-500/50 font-black uppercase tracking-widest mt-0.5">PIN: {child.pinCode}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 pr-2">
                                                <button 
                                                    onClick={async () => {
                                                        const res = await impersonateRestaurant(child.id);
                                                        if (res.success) window.open(`/manager/dashboard?resto_id=${child.id}`, "_blank");
                                                    }}
                                                    className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-lg transition-all"
                                                    title="S'infiltrer"
                                                >
                                                    <ExternalLink className="w-4 h-4" />
                                                </button>
                                                <button 
                                                    onClick={() => setEditingResto(child)}
                                                    className="p-2 text-zinc-600 hover:text-primary transition-all"
                                                >
                                                    <Settings className="w-4 h-4" />
                                                </button>
                                                <button 
                                                    onClick={() => handleDelete(child.id)}
                                                    className={cn(
                                                        "p-2 transition-all rounded-lg",
                                                        confirmDeleteId === child.id ? "bg-red-600 text-white animate-pulse" : "text-zinc-700 hover:text-red-500 hover:bg-red-500/10"
                                                    )}
                                                    title="Supprimer la filiale"
                                                >
                                                    <XCircle className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        );
                    })}
                    <div className="mt-6 text-center">
                        <button 
                            onClick={() => setShowAll(false)}
                            className="text-xs font-black uppercase tracking-widest text-zinc-500 hover:text-primary transition-colors py-2 px-4 rounded-xl border border-zinc-800 hover:border-primary/30"
                        >
                            Réduire l'affichage
                        </button>
                    </div>
                )}
            </div>
        </div>
      )}

      {/* ─── TAB: DEMANDES ─── */}
      {activeTab === 'demandes' && (
        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-700 max-w-4xl mx-auto">
            <div className="bg-zinc-900 border border-violet-500/30 rounded-[2.5rem] p-10 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-500 via-purple-500 to-blue-500 animate-pulse" />
                <div className="flex items-center justify-between mb-10">
                    <div>
                        <h3 className="text-2xl font-black uppercase tracking-tighter italic flex items-center gap-3">
                            <Bell className="w-8 h-8 text-violet-500" /> File de Validation
                        </h3>
                        <p className="text-zinc-500 text-xs font-bold uppercase mt-1">Approuvez les nouvelles inscriptions et upgrades</p>
                    </div>
                </div>

                <div className="space-y-4">
                    {demandes.filter(d => d.statut === "EN_ATTENTE").length === 0 ? (
                        <div className="py-20 text-center space-y-4 opacity-30">
                            <CheckCircle2 className="w-12 h-12 mx-auto" />
                            <p className="font-black text-xs uppercase tracking-widest">Aucune demande en attente</p>
                        </div>
                    ) : demandes.filter(d => d.statut === "EN_ATTENTE").map((demande: any) => {
                        const isExisting = restaurants.some(r => r.email === demande.email);
                        return (
                            <div key={demande.id} className="bg-zinc-950/50 p-6 rounded-[2rem] border border-zinc-800/80 hover:border-violet-500/30 transition-all">
                                <div className="flex flex-col md:flex-row justify-between gap-6 text-left">
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-3">
                                            {isExisting ? (
                                                <div className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded text-[8px] font-black uppercase">Mise à jour</div>
                                            ) : (
                                                <div className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded text-[8px] font-black uppercase">Nouveau</div>
                                            )}
                                        </div>
                                        <div>
                                            <h4 className="text-xl font-black text-white uppercase tracking-tighter leading-none mb-2">{demande.nomRestaurant}</h4>
                                            <div className="flex flex-wrap items-center gap-3 text-[10px] font-bold text-zinc-500 uppercase">
                                                <span className="flex items-center gap-1"><User className="w-3 h-3" />{demande.nomProprietaire}</span>
                                                <span className="w-1 h-1 bg-zinc-600 rounded-full" />
                                                <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{demande.email}</span>
                                                <span className="w-1 h-1 bg-zinc-600 rounded-full" />
                                                <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{demande.telephone}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest">
                                            <span className="text-violet-400">{demande.plan}</span>
                                            <span className="w-1 h-1 bg-zinc-600 rounded-full" />
                                            <span className="text-emerald-400">${demande.montant}</span>
                                            <span className="w-1 h-1 bg-zinc-600 rounded-full" />
                                            <span className="text-zinc-500">{new Date(demande.createdAt).toLocaleDateString()}</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {approvingId === demande.id ? (
                                            <div className="flex items-center gap-3 animate-in slide-in-from-right-4">
                                                {!isExisting && (
                                                    <input
                                                        type="text"
                                                        placeholder="Mot de passe gérant"
                                                        value={approvePassword}
                                                        onChange={(e) => setApprovePassword(e.target.value)}
                                                        className="bg-zinc-800 border border-zinc-700 rounded-xl py-3 px-4 text-xs text-white w-48 outline-none focus:ring-1 focus:ring-emerald-500"
                                                    />
                                                )}
                                                <button
                                                    onClick={async () => {
                                                        if (!isExisting && !approvePassword) { toast.error("Mot de passe requis."); return; }
                                                        const res = await approveDemande(demande.id, approvePassword || "UPDATE");
                                                        if (res.success) {
                                                            toast.success("Opération réussie !");
                                                            setApprovingId(null); setApprovePassword(""); fetchRestos();
                                                        }
                                                    }}
                                                    className="p-4 bg-emerald-600 text-white rounded-2xl hover:bg-emerald-500 shadow-lg shadow-emerald-600/20"
                                                ><CheckCircle2 className="w-5 h-5" /></button>
                                                <button onClick={() => setApprovingId(null)} className="p-4 bg-zinc-800 text-zinc-400 rounded-2xl"><X className="w-5 h-5" /></button>
                                            </div>
                                        ) : (
                                            <>
                                                <button
                                                    onClick={() => setApprovingId(demande.id)}
                                                    className="px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-emerald-600/10"
                                                >Approuver</button>
                                                <button 
                                                    onClick={() => rejectDemande(demande.id).then(() => fetchRestos())}
                                                    className="p-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-500 rounded-2xl border border-zinc-700"
                                                ><XCircle className="w-5 h-5" /></button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
      )}

      {/* ─── TAB: BROADCAST ─── */}
      {activeTab === 'broadcast' && (
        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-700 max-w-2xl mx-auto">
            <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-12 text-center">
                <div className="w-20 h-20 bg-indigo-500/10 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-indigo-500/20 shadow-xl shadow-indigo-500/5">
                    <Globe className="w-10 h-10 text-indigo-500" />
                </div>
                <h3 className="text-3xl font-black uppercase tracking-tighter text-white italic mb-2">Platform Broadcast</h3>
                <p className="text-zinc-500 text-sm font-medium mb-10 leading-relaxed italic">
                    Envoyez un message d'alerte, une annonce ou une mise à jour à l'ensemble de vos établissements en un clic.
                </p>

                <form onSubmit={handleBroadcast} className="text-left space-y-6">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Titre de l'annonce</label>
                        <input 
                            value={broadcastTitle}
                            onChange={(e) => setBroadcastTitle(e.target.value)}
                            placeholder="Ex: Mise à jour Système"
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 px-6 text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Message</label>
                        <textarea 
                            rows={4}
                            value={broadcastMessage}
                            onChange={(e) => setBroadcastMessage(e.target.value)}
                            placeholder="Détaillez votre annonce ici..."
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 px-6 text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Niveau d'Urgence</label>
                            <select 
                                value={broadcastType}
                                onChange={(e) => setBroadcastType(e.target.value)}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 px-6 text-xs text-white uppercase font-black tracking-widest focus:ring-2 focus:ring-indigo-500 outline-none"
                            >
                                <option value="INFO">Information (Bleu)</option>
                                <option value="SUCCESS">Succès / Nouveauté (Vert)</option>
                                <option value="WARNING">Alerte (Jaune)</option>
                                <option value="URGENT">Urgence (Rouge)</option>
                            </select>
                        </div>
                        <div className="flex items-end">
                            <button 
                                disabled={broadcastLoading}
                                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-4 rounded-2xl transition-all shadow-lg shadow-indigo-600/20 text-xs uppercase tracking-widest flex items-center justify-center gap-3 disabled:opacity-50"
                            >
                                {broadcastLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                Envoyer à tous
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
      )}

      {/* ─── TAB: SETTINGS ─── */}
      {activeTab === 'settings' && (
        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-700 max-w-2xl mx-auto">
             <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-12 text-center">
                <div className="w-20 h-20 bg-zinc-800 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-zinc-700">
                    <ShieldCheck className="w-10 h-10 text-primary" />
                </div>
                <h3 className="text-3xl font-black uppercase tracking-tighter text-white italic mb-2">Platform Settings</h3>
                <p className="text-zinc-500 text-sm font-medium mb-12">Configuration globale de l'écosystème SmartResto.</p>

                <div className="grid grid-cols-1 gap-4 text-left">
                     <button 
                        onClick={() => setShowSettings(true)}
                        className="flex items-center justify-between p-6 bg-zinc-950 border border-zinc-900 hover:border-primary/30 rounded-2xl group transition-all"
                     >
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-zinc-900 rounded-xl text-zinc-500 group-hover:text-primary transition-colors"><Lock className="w-5 h-5" /></div>
                            <div>
                                <p className="text-xs font-black text-white uppercase italic">Sécurité de la Forge</p>
                                <p className="text-[10px] text-zinc-600 font-bold uppercase">Modifier le code PIN Administrateur</p>
                            </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-zinc-800 group-hover:text-white transition-all transform group-hover:translate-x-1" />
                     </button>

                     <button className="flex items-center justify-between p-6 bg-zinc-950 border border-zinc-900 opacity-50 cursor-not-allowed rounded-2xl">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-zinc-900 rounded-xl text-zinc-700"><DollarSign className="w-5 h-5" /></div>
                            <div>
                                <p className="text-xs font-black text-zinc-400 uppercase italic">Grille Tarifaire</p>
                                <p className="text-[10px] text-zinc-800 font-bold uppercase">Modifier les prix des plans (Prochainement)</p>
                            </div>
                        </div>
                        <Lock className="w-4 h-4 text-zinc-800" />
                     </button>
                </div>

                <div className="mt-12 flex flex-col items-center">
                    <button onClick={() => window.location.href = '/'} className="flex items-center gap-2 text-zinc-600 hover:text-white transition-colors text-[10px] font-black uppercase tracking-widest">
                        <ArrowLeft className="w-3 h-3" /> Retour au site public
                    </button>
                    <p className="mt-6 text-[10px] font-bold text-zinc-800 uppercase tracking-widest">SmartResto SaaS v1.2.0 • Build 2024</p>
                </div>
             </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingResto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-10 shadow-2xl relative animate-in zoom-in-95 duration-300">
                <button 
                    onClick={() => setEditingResto(null)}
                    className="absolute top-6 right-6 p-2 hover:bg-zinc-800 rounded-full text-zinc-500 hover:text-white transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-4 mb-8 text-primary">
                    <Pencil className="w-6 h-6" />
                    <h3 className="text-2xl font-black uppercase tracking-tighter text-white">Modifier le compte</h3>
                </div>

                <form action={async (formData) => {
                    const res = await updateRestaurant(editingResto.id, formData);
                    if (res.success) {
                        toast.success("Informations du restaurant mises à jour");
                        setEditingResto(null);
                        await fetchRestos();
                    } else {
                        toast.error("Erreur: " + res.error);
                    }
                }} className="space-y-6">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-zinc-500 uppercase ml-2 tracking-widest">Nom du restaurant</label>
                        <input 
                            name="nom" 
                            defaultValue={editingResto.nom}
                            required 
                            className="w-full bg-zinc-800/50 border-zinc-700 rounded-2xl py-4 px-6 text-sm text-white focus:ring-2 focus:ring-primary outline-none transition-all"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-zinc-500 uppercase ml-2 tracking-widest">Email du gérant</label>
                        <input 
                            name="email"
                            type="email" 
                            defaultValue={editingResto.email}
                            required 
                            className="w-full bg-zinc-800/50 border-zinc-700 rounded-2xl py-4 px-6 text-sm text-white focus:ring-2 focus:ring-primary outline-none transition-all"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-zinc-500 uppercase ml-2 tracking-widest">Téléphone</label>
                        <input 
                            name="telephone"
                            type="tel" 
                            defaultValue={editingResto.telephone}
                            className="w-full bg-zinc-800/50 border-zinc-700 rounded-2xl py-4 px-6 text-sm text-white focus:ring-2 focus:ring-primary outline-none transition-all"
                            placeholder="+243..."
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-zinc-500 uppercase ml-2 tracking-widest">Réinitialiser Mot de passe (optionnel)</label>
                        <input 
                            name="newPassword"
                            type="text" 
                            placeholder="Saisissez un nouveau mot de passe"
                            className="w-full bg-zinc-800/20 border-zinc-700/50 rounded-2xl py-4 px-6 text-sm text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                        />
                        <p className="text-[8px] text-zinc-600 font-bold ml-2 mt-1 uppercase italic">Laissez vide pour ne pas modifier.</p>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-zinc-500 uppercase ml-2 tracking-widest">Date Fin Abonnement</label>
                        <input 
                            name="subscriptionEnd"
                            type="date"
                            defaultValue={editingResto.subscriptionEnd ? new Date(editingResto.subscriptionEnd).toISOString().split('T')[0] : ''}
                            className="w-full bg-zinc-800/50 border-zinc-700 rounded-2xl py-4 px-6 text-sm text-white focus:ring-2 focus:ring-primary outline-none transition-all"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-zinc-500 uppercase ml-2 tracking-widest">Plan</label>
                            <select name="plan" defaultValue={editingResto.plan} className="w-full bg-zinc-800/50 border-zinc-700 rounded-2xl py-4 px-6 text-sm text-white focus:ring-2 focus:ring-primary outline-none transition-all">
                                <option value="ESSAI">Essai Gratuit</option>
                                <option value="STANDARD">Standard</option>
                                <option value="PRO">Pro</option>
                                <option value="PLATINUM">Platinum</option>
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-zinc-500 uppercase ml-2 tracking-widest">Ville</label>
                            <select name="ville" defaultValue={editingResto.ville} className="w-full bg-zinc-800/50 border-zinc-700 rounded-2xl py-4 px-6 text-sm text-white focus:ring-2 focus:ring-primary outline-none transition-all">
                                <option value="Lubumbashi">Lubumbashi</option>
                                <option value="Kinshasa">Kinshasa</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-zinc-500 uppercase ml-2 tracking-widest">Mise à jour Logo/Image</label>
                        <div className="grid grid-cols-1 gap-4">
                            <div className="relative group">
                                <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 group-focus-within:text-primary" />
                                <input 
                                    name="logoUrl"
                                    type="url" 
                                    defaultValue={editingResto.logoUrl}
                                    className="w-full bg-zinc-800/50 border-zinc-700 rounded-2xl py-4 pl-12 text-sm text-white focus:ring-2 focus:ring-primary outline-none transition-all placeholder:text-zinc-700"
                                    placeholder="Lien URL existant..."
                                />
                            </div>
                            <div className="relative group flex items-center bg-zinc-800/30 border border-zinc-800 rounded-2xl px-4 py-3 hover:border-primary transition-all cursor-pointer">
                                <input 
                                    name="logoFile"
                                    type="file" 
                                    accept="image/*"
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                />
                                <div className="flex items-center gap-3 text-zinc-500 text-xs font-black uppercase tracking-widest pointer-events-none">
                                     Ou choisir un nouveau fichier local
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 flex gap-3">
                        <button 
                            type="button" 
                            onClick={() => setEditingResto(null)}
                            className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 font-black py-4 rounded-2xl transition-all uppercase tracking-widest text-xs"
                        >
                            Annuler
                        </button>
                        <button 
                            type="submit"
                            className="flex-1 bg-primary hover:bg-primary/90 text-black font-black py-4 rounded-2xl transition-all shadow-lg shadow-primary/20 uppercase tracking-widest text-xs"
                        >
                            Sauvegarder les changements
                        </button>
                    </div>
                </form>

                <p className="mt-8 text-[9px] text-zinc-600 font-bold uppercase text-center tracking-widest">
                    ID Restaurant : {editingResto.id}
                </p>
            </div>
        </div>
      )}

      {/* Settings Modal (Sécurité) */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-10 shadow-2xl relative animate-in zoom-in-95 duration-300">
                <button 
                    onClick={() => setShowSettings(false)}
                    className="absolute top-6 right-6 p-2 hover:bg-zinc-800 rounded-full text-zinc-500 hover:text-white transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="text-center mb-8">
                    <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-primary/20">
                        <Lock className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="text-xl font-black uppercase tracking-tighter text-white">Modifier le Code PIN</h3>
                    <p className="text-[10px] text-zinc-500 font-bold uppercase mt-1">Sécurité de la Forge</p>
                </div>

                <form action={async () => {
                    const res = await updateAdminPin(oldPin, newPin);
                    if (res.success) {
                        toast.success("🔥 Code PIN mis à jour avec succès.");
                        setShowSettings(false);
                        setOldPin("");
                        setNewPin("");
                    } else {
                        toast.error(res.error || "Échec de la mise à jour");
                    }
                }} className="space-y-6">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-zinc-500 uppercase ml-2 tracking-widest">Ancien Code PIN</label>
                        <input 
                            type="password"
                            maxLength={6}
                            required
                            value={oldPin}
                            onChange={(e) => setOldPin(e.target.value.replace(/\D/g, ""))}
                            className="w-full bg-zinc-800/50 border-zinc-700 rounded-2xl py-4 px-6 text-center text-xl font-black tracking-widest text-white focus:ring-2 focus:ring-primary outline-none transition-all"
                            placeholder="••••••"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-zinc-500 uppercase ml-2 tracking-widest">Nouveau Code PIN à 6 chiffres</label>
                        <input 
                            type="password"
                            maxLength={6}
                            required
                            value={newPin}
                            onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))}
                            className="w-full bg-zinc-800/50 border-zinc-700 rounded-2xl py-4 px-6 text-center text-xl font-black tracking-widest text-primary focus:ring-2 focus:ring-primary outline-none transition-all"
                            placeholder="••••••"
                        />
                    </div>

                    <div className="pt-4 flex gap-3">
                        <button 
                            type="button" 
                            onClick={() => setShowSettings(false)}
                            className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 font-black py-4 rounded-2xl transition-all uppercase tracking-widest text-xs"
                        >
                            Annuler
                        </button>
                        <button 
                            type="submit"
                            disabled={newPin.length !== 6}
                            className="flex-1 bg-primary hover:bg-primary/90 disabled:opacity-50 text-black font-black py-4 rounded-2xl transition-all shadow-lg shadow-primary/20 uppercase tracking-widest text-xs"
                        >
                            Mettre à Jour
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
}
