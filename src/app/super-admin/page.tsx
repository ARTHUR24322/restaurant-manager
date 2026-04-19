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
  User
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createRestaurant, getAllRestaurants, toggleSubscription, updateRestaurant, deleteRestaurant } from "@/lib/admin-actions";
import { impersonateRestaurant, authenticateSuperAdmin, getSuperAdminSession, verifySuperAdminPin, updateAdminPin } from "@/lib/auth-actions";
import { getGlobalAnalytics } from "@/lib/analytics-actions";
import { getAllDemandes, approveDemande, rejectDemande } from "@/lib/demande-actions";
import { toast } from "sonner";

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
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 bg-zinc-800 rounded-lg flex items-center justify-center border border-zinc-700">
                <ShieldCheck className="w-4 h-4 text-primary" />
            </div>
            <h2 className="text-sm font-black text-zinc-500 uppercase tracking-widest">SaaS Control Center</h2>
          </div>
          <h1 className="text-4xl font-black italic tracking-tighter text-white">Bonjour, Arthur.</h1>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowSettings(true)}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl hover:bg-zinc-800 hover:border-zinc-700 transition-all text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-primary"
          >
            <ShieldCheck className="w-4 h-4" /> Sécurité
          </button>
          
          <div className="flex flex-wrap gap-4">
            <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl flex items-center gap-4">
                <div className="text-right">
                    <p className="text-[10px] font-black text-zinc-500 uppercase">Scans Globaux</p>
                    <p className="text-xl font-black text-primary">{analytics?.totalVisites || 0}</p>
                </div>
                <Activity className="w-6 h-6 text-primary/50" />
            </div>
            <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl flex items-center gap-4">
                <div className="text-right">
                    <p className="text-[10px] font-black text-zinc-500 uppercase">Ventes Restaurateurs</p>
                    <p className="text-xl font-black text-emerald-500">$ {analytics?.globalRevenue ? analytics.globalRevenue.toFixed(2) : "0.00"}</p>
                </div>
                <DollarSign className="w-6 h-6 text-emerald-500/50" />
            </div>
            <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl flex items-center gap-4">
                <div className="text-right">
                    <p className="text-[10px] font-black text-zinc-500 uppercase">Revenu SaaS</p>
                    <p className="text-xl font-black text-indigo-500">$ {analytics?.saasRevenue ? analytics.saasRevenue.toFixed(2) : "0.00"}</p>
                </div>
                <Building2 className="w-6 h-6 text-indigo-500/50" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Colonne Gauche : Liste des restos & Leaderboard */}
        <div className="xl:col-span-2 space-y-6">
        
            {/* Leaderboard Scans */}
            {analytics?.topRestaurants && analytics.topRestaurants.length > 0 && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-8">
                    <div className="flex items-center justify-between mb-6">
                       <h3 className="text-lg font-black uppercase tracking-tighter flex items-center gap-2">
                           <Activity className="w-5 h-5 text-primary" /> Top Restaurants (Scans QR)
                       </h3>
                       <span className="text-[10px] font-bold text-zinc-500 uppercase bg-zinc-800 px-2 py-1 rounded">Aujourd'hui : +{analytics.visitesJour}</span>
                    </div>
                    <div className="space-y-4">
                        {analytics.topRestaurants.slice(0, 5).map((resto: any, idx: number) => {
                            const percent = analytics.totalVisites > 0 ? (resto.scans / analytics.totalVisites) * 100 : 0;
                            return (
                                <div key={resto.id} className="relative">
                                    <div className="flex justify-between items-center mb-1 text-xs font-bold">
                                        <div className="flex items-center gap-2">
                                            <span className="text-zinc-500 w-4">#{idx + 1}</span>
                                            <span className="text-white uppercase truncate max-w-[200px]">{resto.nom}</span>
                                        </div>
                                        <span className="text-primary">{resto.scans} scans</span>
                                    </div>
                                    <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                                        <div className="h-full bg-primary transition-all duration-1000" style={{ width: `${percent}%` }} />
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* ─── Demandes d'abonnement ─── */}
            {demandes.filter((d: any) => d.statut === "EN_ATTENTE").length > 0 && (
                <div className="bg-zinc-900 border border-violet-500/30 rounded-[2.5rem] p-8 relative overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-500 via-purple-500 to-blue-500 animate-pulse" />
                    <div className="flex items-center justify-between mb-6">
                       <h3 className="text-lg font-black uppercase tracking-tighter flex items-center gap-2">
                           <Bell className="w-5 h-5 text-violet-500 animate-bounce" /> Nouvelles Demandes ({demandes.filter((d: any) => d.statut === "EN_ATTENTE").length})
                       </h3>
                       <span className="text-[10px] font-bold text-violet-400 uppercase bg-violet-500/10 px-3 py-1 rounded-full border border-violet-500/20">En attente de validation</span>
                    </div>
                    <div className="space-y-4">
                        {demandes.filter((d: any) => d.statut === "EN_ATTENTE").map((demande: any) => {
                            const isExisting = restaurants.some((r: any) => r.email === demande.email && r.nom === demande.nomRestaurant);
                            return (
                                <div key={demande.id} className="bg-zinc-800/50 border border-zinc-700/50 rounded-3xl p-6 hover:border-violet-500/30 transition-all">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <div className="space-y-2 flex-1">
                                            <div className="flex items-center gap-2">
                                                <Building2 className="w-4 h-4 text-violet-400" />
                                                <h4 className="font-black text-white uppercase tracking-tighter">{demande.nomRestaurant}</h4>
                                                <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded bg-violet-500/20 text-violet-400 border border-violet-500/20">{demande.plan}</span>
                                                {isExisting ? (
                                                    <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/20">Mise à jour</span>
                                                ) : (
                                                    <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/20">Nouveau</span>
                                                )}
                                            </div>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                                                <div className="flex items-center gap-1.5 text-zinc-400">
                                                    <User className="w-3 h-3 text-zinc-500" />
                                                    <span className="font-medium">{demande.nomProprietaire}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5 text-zinc-400">
                                                    <Mail className="w-3 h-3 text-zinc-500" />
                                                    <span className="truncate font-medium">{demande.email}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5 text-zinc-400">
                                                    <Phone className="w-3 h-3 text-zinc-500" />
                                                    <span className="font-medium">{demande.telephone}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5 text-zinc-400">
                                                    <MapPin className="w-3 h-3 text-zinc-500" />
                                                    <span className="font-medium">{demande.ville}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 text-[10px] text-zinc-500 font-bold">
                                                <span>Cycle: {demande.cycle === "monthly" ? "Mensuel" : demande.cycle === "semiannual" ? "6 Mois" : "Annuel"}</span>
                                                <span className="w-1 h-1 bg-zinc-600 rounded-full" />
                                                <span className="text-emerald-400">${demande.montant}</span>
                                                <span className="w-1 h-1 bg-zinc-600 rounded-full" />
                                                <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(demande.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            {approvingId === demande.id ? (
                                                <div className="flex items-center gap-2 animate-in slide-in-from-right-4 duration-200">
                                                    {!isExisting && (
                                                        <input
                                                            type="text"
                                                            placeholder="Mot de passe initial"
                                                            value={approvePassword}
                                                            onChange={(e) => setApprovePassword(e.target.value)}
                                                            className="bg-zinc-900 border border-zinc-700 rounded-xl py-2 px-3 text-xs text-white w-40 focus:ring-1 focus:ring-emerald-500 outline-none"
                                                        />
                                                    )}
                                                    <button
                                                        onClick={async () => {
                                                            if (!isExisting && !approvePassword) { toast.error("Veuillez saisir un mot de passe."); return; }
                                                            const res = await approveDemande(demande.id, approvePassword || "UPDATE");
                                                            if (res.success) {
                                                                toast.success(res.isUpdate ? "🚀 Plan mis à jour !" : `✅ Restaurant créé ! ID: ${res.restoId}`, { duration: 8000 });
                                                                setApprovingId(null);
                                                                setApprovePassword("");
                                                                fetchRestos();
                                                            } else {
                                                                toast.error(res.error || "Erreur");
                                                            }
                                                        }}
                                                        className="p-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-all active:scale-95"
                                                        title="Confirmer"
                                                    >
                                                        <CheckCircle2 className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => { setApprovingId(null); setApprovePassword(""); }}
                                                        className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded-xl transition-all"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <>
                                                    <button
                                                        onClick={() => setApprovingId(demande.id)}
                                                        className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600/10 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-600/20 rounded-2xl transition-all text-[10px] font-black uppercase tracking-widest active:scale-95"
                                                    >
                                                        <CheckCircle2 className="w-4 h-4" /> {isExisting ? "Approuver Mise à jour" : "Approuver Nouveau"}
                                                    </button>
                                                    <button
                                                        onClick={async () => {
                                                            const res = await rejectDemande(demande.id);
                                                            if (res.success) {
                                                                toast.success("Demande refusée.");
                                                                fetchRestos();
                                                            }
                                                        }}
                                                        className="p-2.5 bg-zinc-800 hover:bg-red-500/20 text-zinc-500 hover:text-red-400 border border-zinc-700 hover:border-red-500/30 rounded-2xl transition-all active:scale-95"
                                                        title="Refuser"
                                                    >
                                                        <XCircle className="w-4 h-4" />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ─── Flux d'Activité des Abonnements ─── */}
            {analytics?.subscriptionActivity && analytics.subscriptionActivity.length > 0 && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-8">
                    <div className="flex items-center justify-between mb-6">
                       <h3 className="text-lg font-black uppercase tracking-tighter flex items-center gap-2">
                           <Activity className="w-5 h-5 text-indigo-500" /> Activité des Abonnements
                       </h3>
                       <span className="text-[10px] font-bold text-zinc-500 uppercase">Derniers mouvements</span>
                    </div>
                    <div className="space-y-4">
                        {analytics.subscriptionActivity.map((log: any) => (
                            <div key={log.id} className="flex items-center justify-between bg-zinc-800/20 p-4 rounded-2xl border border-zinc-800/50">
                                <div className="flex items-center gap-4">
                                    <div className={cn(
                                        "p-2 rounded-xl",
                                        log.type === "UPGRADE" ? "bg-emerald-500/10 text-emerald-500" :
                                        log.type === "DOWNGRADE" ? "bg-red-500/10 text-red-500" :
                                        log.type === "NEW" ? "bg-primary/10 text-primary" : "bg-zinc-700/50 text-zinc-400"
                                    )}>
                                        <Activity className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-black text-white uppercase tracking-tight">{log.restaurantNom}</p>
                                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
                                            {log.type === "NEW" ? `Nouveau : ${log.newPlan}` : 
                                             log.type === "UPGRADE" ? `Upgrade : ${log.oldPlan} ➜ ${log.newPlan}` :
                                             log.type === "DOWNGRADE" ? `Downgrade : ${log.oldPlan} ➜ ${log.newPlan}` :
                                             `Renouvellement : ${log.newPlan}`}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs font-black text-emerald-500">+${log.monthlyPrice.toFixed(2)}/mois</p>
                                    <p className="text-[8px] text-zinc-600 font-bold uppercase">{new Date(log.createdAt).toLocaleDateString()}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-8">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
                    <h3 className="text-lg font-black uppercase tracking-tighter flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-primary" /> Restaurants Actifs ({restaurants?.length || 0})
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
                </div>
                
                {restaurants?.filter(r => 
                    r.nom.toLowerCase().includes(searchQuery.toLowerCase()) || 
                    r.email.toLowerCase().includes(searchQuery.toLowerCase())
                ).length > 5 && !showAll && (
                    <div className="mt-6 text-center">
                        <button 
                            onClick={() => setShowAll(true)}
                            className="text-xs font-black uppercase tracking-widest text-zinc-500 hover:text-primary transition-colors py-2 px-4 rounded-xl border border-zinc-800 hover:border-primary/30"
                        >
                            Voir tous les restaurants ({restaurants.length})
                        </button>
                    </div>
                )}
                
                {showAll && (
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

        {/* Colonne Droite : Formulaire Ajout */}
        <div className="space-y-6">
            <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-8 shadow-xl">
                 <h3 className="text-lg font-black uppercase tracking-tighter mb-6">Instancier un Restaurant</h3>
                 <form ref={formRef} action={clientAction} className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-zinc-500 uppercase ml-2">Nom de l'établissement</label>
                        <input 
                            name="nom" 
                            required 
                            className="w-full bg-zinc-800 border-zinc-700 rounded-2xl py-3 px-4 text-sm text-white focus:ring-1 focus:ring-primary outline-none"
                            placeholder="ex: Le Grand Buffet"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-zinc-500 uppercase ml-2">Email du gérant</label>
                        <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                            <input 
                                name="email"
                                type="email" 
                                required 
                                className="w-full bg-zinc-800 border-zinc-700 rounded-2xl py-3 pl-12 text-sm text-white focus:ring-1 focus:ring-primary outline-none transition-all"
                                placeholder="gerant@email.com"
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-zinc-500 uppercase ml-2">Téléphone</label>
                        <div className="relative">
                            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                            <input 
                                name="telephone"
                                type="tel"
                                className="w-full bg-zinc-800 border-zinc-700 rounded-2xl py-3 pl-12 text-sm text-white focus:ring-1 focus:ring-primary outline-none transition-all"
                                placeholder="+243..."
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-zinc-500 uppercase ml-2">Mot de passe initial (donné au gérant)</label>
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                            <input 
                                name="adminPassword"
                                type="text" 
                                required 
                                minLength={4}
                                className="w-full bg-zinc-800 border-zinc-700 rounded-2xl py-3 pl-12 text-sm text-white focus:ring-1 focus:ring-primary outline-none transition-all"
                                placeholder="Ex: Resto2024!"
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-zinc-500 uppercase ml-2">Code PIN Dashboard (6 chiffres)</label>
                        <div className="relative">
                            <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                            <input 
                                name="pinCode"
                                type="text" 
                                required 
                                maxLength={6}
                                defaultValue="0000"
                                className="w-full bg-zinc-800 border-zinc-700 rounded-2xl py-3 pl-12 text-sm text-white focus:ring-1 focus:ring-primary outline-none transition-all font-mono tracking-widest"
                                placeholder="0000"
                            />
                        </div>
                    </div>
    
                    <p className="text-[9px] text-zinc-600 font-bold ml-2 mt-1">Le gérant pourra le modifier dans ses paramètres.</p>

                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-zinc-500 uppercase ml-2">Logo de l'établissement</label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="relative group">
                                <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 group-focus-within:text-primary transition-colors" />
                                <input 
                                    name="logoUrl"
                                    type="url" 
                                    className="w-full bg-zinc-800 border-zinc-700 rounded-2xl py-3 pl-12 text-sm text-white focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-zinc-600"
                                    placeholder="Lien URL (ex: https://...)"
                                />
                            </div>
                            <div className="relative group flex items-center bg-zinc-800 border border-zinc-700 rounded-2xl px-4 py-2 hover:border-primary transition-all cursor-pointer">
                                <input 
                                    name="logoFile"
                                    type="file" 
                                    accept="image/*"
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                />
                                <div className="flex items-center gap-2 text-zinc-400 text-xs font-bold uppercase truncate pointer-events-none">
                                     Ou importer fichier local
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-zinc-500 uppercase ml-2 tracking-widest">Plan</label>
                            <select name="plan" className="w-full bg-zinc-800 border-zinc-700 rounded-2xl py-3 px-4 text-sm text-white focus:ring-1 focus:ring-primary outline-none transition-all">
                                <option value="ESSAI">Essai Gratuit</option>
                                <option value="STANDARD">Standard</option>
                                <option value="PRO">Pro</option>
                                <option value="PLATINUM">Platinum</option>
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-zinc-500 uppercase ml-2 tracking-widest">Ville</label>
                            <select name="ville" className="w-full bg-zinc-800 border-zinc-700 rounded-2xl py-3 px-4 text-sm text-white focus:ring-1 focus:ring-primary outline-none transition-all">
                                <option value="Lubumbashi">Lubumbashi</option>
                                <option value="Kinshasa">Kinshasa</option>
                            </select>
                        </div>
                    </div>
                    <button 
                        type="submit"
                        disabled={isCreating}
                        className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-black font-black py-4 rounded-2xl mt-4 transition-all uppercase tracking-widest text-xs flex items-center justify-center gap-2"
                    >
                        {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} 
                        {isCreating ? "Déploiement en cours..." : "Créer & Déployer"}
                    </button>
                 </form>

                 <div className="mt-8 pt-6 border-t border-zinc-800/50">
                    <p className="text-[10px] text-zinc-500 font-bold uppercase mb-4">Fonctions Automatisées</p>
                    <ul className="space-y-2">
                        <li className="flex items-center gap-2 text-[10px] text-zinc-400 font-medium">
                            <Globe className="w-3 h-3 text-primary" /> Setup Menu d'Exemple
                        </li>
                        <li className="flex items-center gap-2 text-[10px] text-zinc-400 font-medium">
                            <Plus className="w-3 h-3 text-primary" /> Génération d'ID Unique
                        </li>
                    </ul>
                 </div>
            </div>
        </div>
      </div>
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
