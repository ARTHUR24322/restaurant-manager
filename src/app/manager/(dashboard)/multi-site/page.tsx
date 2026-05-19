"use client"
/* eslint-disable react/no-unescaped-entities, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getMultiSiteStats, updateChildPin, toggleChildStatus } from "@/lib/multi-site-actions";
import { getRestaurantById, checkIsMainAccount } from "@/lib/admin-actions";
import { 
  Globe, 
  Building2, 
  DollarSign, 
  ShoppingCart, 
  TrendingUp, 
  ArrowUpRight,
  Activity,
  MapPin,
  Loader2,
  ExternalLink,
  Lock,
  X,
  ShieldCheck,
  Pencil
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function MultiSitePage() {
  const searchParams = useSearchParams();
  const restoId = searchParams.get("resto_id");
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any[]>([]);
  const [restoProfile, setRestoProfile] = useState<any>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Paywall state
  const isLocked = restoProfile?.plan !== "PLATINUM";
  const [isPaywallOpen, setIsPaywallOpen] = useState(false);

  // PIN Management
  const [editingPinId, setEditingPinId] = useState<string | null>(null);
  const [newPin, setNewPin] = useState("");

  const handleUpdatePin = async (id: string) => {
    if (newPin.length !== 6) {
        import("sonner").then(s => s.toast.error("Le PIN doit faire exactement 6 chiffres."));
        return;
    }
    const res = await updateChildPin(id, newPin);
    if (res.success) {
        import("sonner").then(s => s.toast.success("PIN mis à jour !"));
        setEditingPinId(null);
        setNewPin("");
        if (restoProfile?.email) {
            const data = await getMultiSiteStats(restoProfile.email);
            setStats(data);
        }
    } else {
        import("sonner").then(s => s.toast.error(res.error || "Erreur"));
    }
  };

  const handleToggleStatus = async (id: string, active: boolean) => {
    const res = await toggleChildStatus(id, active);
    if (res.success) {
        import("sonner").then(s => s.toast.success(active ? "Établissement activé" : "Établissement suspendu"));
        if (restoProfile?.email) {
            const data = await getMultiSiteStats(restoProfile.email);
            setStats(data);
        }
    } else {
        import("sonner").then(s => s.toast.error("Erreur lors de l'opération"));
    }
  };

  useEffect(() => {
    async function loadData() {
      if (!restoId) return;
      setLoading(true);

      // Sécurité : Seule la Mère peut accéder à cette page
      const isMain = await checkIsMainAccount(restoId);
      if (!isMain) {
          router.push(`/manager/dashboard?resto_id=${restoId}`);
          return;
      }

      const profile = await getRestaurantById(restoId);
      setRestoProfile(profile);
      
      if (profile?.email) {
        const data = await getMultiSiteStats(profile.email);
        setStats(data);
      }
      setLoading(false);
    }
    loadData();
  }, [restoId, router]);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  const totalRevenue = stats.reduce((acc, r) => acc + r.dailyRevenue, 0);
  const totalOrders = stats.reduce((acc, r) => acc + r.dailyOrders, 0);

  // Identifier l'établissement mère (le plus ancien par inscription)
  const sortedStats = [...stats].sort((a,b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  const isMainEstablishment = sortedStats.length > 0 && sortedStats[0].id === restoId;

  const handleRequestNew = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isMainEstablishment) {
        import("sonner").then(s => s.toast.error("Seul l'établissement principal peut ajouter des sites."));
        return;
    }
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const { submitSubscriptionRequest } = await import("@/lib/demande-actions");
    
    try {
        const res = await submitSubscriptionRequest({
            nomRestaurant: formData.get("nom") as string,
            nomProprietaire: restoProfile.nomProprietaire || restoProfile.nom, // Fallback si pas de nom proprio séparé
            email: restoProfile.email,
            telephone: restoProfile.telephone || "N/A",
            ville: formData.get("ville") as string,
            plan: "PLATINUM", // Par défaut Platinum pour multi-site
            cycle: "monthly",
            montant: 100, // Prix Platinum
        });
        
        if (res.success) {
            import("sonner").then(s => s.toast.success("Demande d'ajout envoyée !"));
            setIsModalOpen(false);
        } else {
            import("sonner").then(s => s.toast.error("Erreur: " + res.error));
        }
    } catch (err) {
        import("sonner").then(s => s.toast.error("Erreur de connexion."));
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-[1600px] mx-auto animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl font-black italic tracking-tighter text-white uppercase flex items-center gap-3">
            <Globe className="w-8 h-8 text-primary" /> Dashboard Multi-Établissements
          </h1>
          <p className="text-zinc-500 font-medium">Vue groupée de votre parc de restaurants en temps réel.</p>
        </div>

        <div className="flex items-center gap-4">
            {isMainEstablishment ? (
                <button 
                    onClick={() => {
                        if(isLocked) return setIsPaywallOpen(true);
                        setIsModalOpen(true);
                    }}
                    className="bg-primary hover:bg-primary/90 text-black font-black py-4 px-8 rounded-2xl transition-all shadow-lg shadow-primary/20 flex items-center gap-2 uppercase tracking-widest text-[10px] active:scale-95"
                >
                    <Building2 className="w-4 h-4" /> Nouvel Établissement
                </button>
            ) : (
                <div className="px-6 py-3 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-zinc-700" />
                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest leading-none">Accès Filiale (Lecture seule)</span>
                </div>
            )}
            <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl flex items-center gap-4">
                <div className="text-right">
                    <p className="text-[10px] font-black text-zinc-500 uppercase">Revenu Global (Aujourd'hui)</p>
                    <p className="text-xl font-black text-emerald-500">$ {totalRevenue.toFixed(2)}</p>
                </div>
                <DollarSign className="w-6 h-6 text-emerald-500/50" />
            </div>
        </div>
      </div>

      {!isMainEstablishment && (
        <div className="bg-indigo-500/5 border border-indigo-500/20 p-6 rounded-[2.5rem] flex items-center gap-4 animate-in slide-in-from-top-4 duration-200">
            <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-500">
                <Globe className="w-6 h-6" />
            </div>
            <div>
                <h4 className="text-sm font-black text-white uppercase tracking-tighter italic">Établissement Secondaire</h4>
                <p className="text-xs text-indigo-500/80 font-bold uppercase tracking-tight">Seul l'établissement principal "{sortedStats[0]?.nom}" peut gérer et ajouter de nouveaux sites.</p>
            </div>
        </div>
      )}

      {/* Modal Requête Nouvel Établissement */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-10 relative animate-in zoom-in-95 duration-300">
                <button onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 text-zinc-500 hover:text-white transition-colors">
                    <Globe className="w-5 h-5 rotate-45" />
                </button>
                
                <h3 className="text-2xl font-black text-white italic tracking-tighter uppercase mb-2">Ajouter un établissement</h3>
                <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-8">Soumettre pour validation Super-Admin</p>

                <form onSubmit={handleRequestNew} className="space-y-6">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Nom du nouveau restaurant</label>
                        <input 
                            name="nom"
                            required 
                            placeholder="Ex: SmartResto - Site Sud"
                            className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl py-4 px-6 text-sm text-white focus:ring-2 focus:ring-primary outline-none transition-all"
                        />
                    </div>
                    
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Ville</label>
                        <select 
                            name="ville"
                            required 
                            className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl py-4 px-6 text-sm text-white focus:ring-2 focus:ring-primary outline-none transition-all"
                        >
                            <option value="Lubumbashi">Lubumbashi</option>
                            <option value="Kinshasa">Kinshasa</option>
                            <option value="Kolwezi">Kolwezi</option>
                            <option value="Likasi">Likasi</option>
                        </select>
                    </div>

                    <div className="bg-primary/5 p-6 rounded-2xl border border-primary/10">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-[10px] font-black text-zinc-500 uppercase">Propriétaire</span>
                            <span className="text-[10px] font-black text-primary uppercase">Platinum Tier</span>
                        </div>
                        <p className="text-sm font-bold text-white mb-1">{restoProfile.nomProprietaire || "Gérant Actuel"}</p>
                        <p className="text-xs text-zinc-500 font-medium">{restoProfile.email}</p>
                    </div>

                    <button 
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full bg-primary hover:bg-primary/90 text-black font-black py-4 rounded-2xl transition-all shadow-lg shadow-primary/20 uppercase tracking-widest text-xs flex items-center justify-center gap-3 disabled:opacity-50"
                    >
                        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Building2 className="w-4 h-4" />}
                        {isSubmitting ? "Envoi en cours..." : "Soumettre la demande"}
                    </button>
                </form>
            </div>
        </div>
      )}

      {/* Grid des établissements */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stats.map((resto) => (
          <div key={resto.id} className={cn(
            "bg-zinc-900 border rounded-[2.5rem] p-8 space-y-6 transition-all group relative overflow-hidden",
            resto.id === restoId ? "border-primary/50 ring-1 ring-primary/20" : "border-zinc-800 hover:border-zinc-700"
          )}>
            {resto.id === restoId && (
                <div className="absolute top-4 right-8">
                    <span className="text-[8px] font-black uppercase text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">Session Actuelle</span>
                </div>
            )}
            
            <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-zinc-800 rounded-2xl flex items-center justify-center border border-zinc-700 group-hover:scale-110 transition-transform">
                    <Building2 className="w-7 h-7 text-zinc-600 group-hover:text-primary transition-colors" />
                </div>
                <div>
                    <h3 className="text-xl font-black text-white italic tracking-tight uppercase leading-none">{resto.nom}</h3>
                    <div className="flex items-center gap-1.5 mt-2">
                        <MapPin className="w-3.5 h-3.5 text-zinc-500" />
                        <span className="text-xs text-zinc-500 font-bold uppercase tracking-tight">{resto.ville}</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-zinc-800">
                <div className="space-y-1">
                    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Commandes / Jour</p>
                    <div className="flex items-center gap-2">
                        <ShoppingCart className="w-4 h-4 text-primary" />
                        <span className="text-lg font-black text-white">{resto.dailyOrders}</span>
                    </div>
                </div>
                <div className="space-y-1">
                    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Revenu / Jour</p>
                    <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-emerald-500" />
                        <span className="text-lg font-black text-emerald-500">${resto.dailyRevenue.toFixed(2)}</span>
                    </div>
                </div>
            </div>

            {/* Section PIN pour les filiales */}
            {resto.id !== restoId && isMainEstablishment && (
                <div className="pt-4 border-t border-zinc-800 space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4 text-amber-500/50" />
                            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest leading-none">Code PIN Dashboard</span>
                        </div>
                        {editingPinId !== resto.id && (
                            <span className="text-xs font-black text-amber-500 font-mono tracking-widest">{resto.pinCode}</span>
                        )}
                    </div>

                    {editingPinId === resto.id ? (
                        <div className="flex items-center gap-2 animate-in slide-in-from-right-4 duration-200">
                            <input 
                                type="text"
                                maxLength={6}
                                value={newPin}
                                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))}
                                className="flex-1 bg-zinc-800 border border-primary/30 rounded-xl py-2 px-3 text-xs text-white focus:ring-1 focus:ring-primary outline-none font-mono tracking-widest"
                                placeholder="NOUVEAU PIN"
                                autoFocus
                            />
                            <button 
                                onClick={() => handleUpdatePin(resto.id)}
                                className="p-2 bg-primary text-black rounded-xl hover:bg-primary/90 transition-all font-black text-[10px] uppercase"
                            >
                                OK
                            </button>
                            <button 
                                onClick={() => { setEditingPinId(null); setNewPin(""); }}
                                className="p-2 bg-zinc-800 text-zinc-500 rounded-xl hover:text-white transition-all"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    ) : (
                        <button 
                            onClick={() => {
                                setEditingPinId(resto.id);
                                setNewPin(resto.pinCode);
                            }}
                            className="w-full py-2 bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/50 rounded-xl text-[9px] font-black uppercase text-zinc-500 hover:text-primary transition-all flex items-center justify-center gap-2"
                        >
                            <Pencil className="w-3 h-3" /> Modifier le code accès
                        </button>
                    )}
                </div>
            )}

            <div className="pt-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        {resto.active ? (
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        ) : (
                            <span className="w-2 h-2 rounded-full bg-zinc-700" />
                        )}
                        <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{resto.active ? "En ligne" : "Inactif"}</span>
                    </div>

                    {resto.id !== restoId && isMainEstablishment && (
                        <button 
                            onClick={() => handleToggleStatus(resto.id, !resto.active)}
                            className={cn(
                                "text-[9px] font-bold px-3 py-1.5 rounded-lg border transition-all uppercase tracking-tighter",
                                resto.active 
                                    ? "bg-red-500/10 border-red-500/20 text-red-500 hover:bg-red-500 hover:text-black" 
                                    : "bg-emerald-500/10 border-emerald-500/20 text-emerald-500 hover:bg-emerald-500 hover:text-black"
                            )}
                        >
                            {resto.active ? "Suspendre" : "Activer"}
                        </button>
                    )}
                </div>
                <button 
                  onClick={() => {
                      if(isLocked) return setIsPaywallOpen(true);
                      window.open(`/manager/dashboard?resto_id=${resto.id}`, '_blank');
                  }}
                  className="p-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-xl border border-zinc-700 transition-all active:scale-95"
                  title="Accéder au dashboard de cet établissement"
                >
                    <ExternalLink className="w-4 h-4" />
                </button>
            </div>
          </div>
        ))}

        {/* Card Recap Global */}
        <div className="bg-primary/5 border-2 border-dashed border-primary/20 rounded-[2.5rem] p-8 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center border border-primary/20">
                <TrendingUp className="w-8 h-8 text-primary" />
            </div>
            <div>
                <h3 className="text-lg font-black text-white uppercase tracking-tighter">Performance Totale</h3>
                <p className="text-xs text-zinc-500 font-medium">Cumul sur {stats.length} établissements</p>
            </div>
            <div className="space-y-1">
                <p className="text-3xl font-black text-primary italic">${totalRevenue.toFixed(2)}</p>
                <div className="flex items-center justify-center gap-2 text-[10px] font-black text-emerald-500 uppercase">
                    <Activity className="w-3 h-3" /> {totalOrders} Commandes totales
                </div>
            </div>
        </div>
      </div>

      {/* ─── MODAL PAYWALL ─── */}
      {isPaywallOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
            <div className="max-w-2xl w-full bg-zinc-900 border border-zinc-800 rounded-[3rem] p-10 md:p-16 text-center shadow-2xl relative overflow-hidden group animate-in zoom-in-95 duration-300">
                <button onClick={() => setIsPaywallOpen(false)} className="absolute top-6 right-6 text-zinc-500 hover:text-white transition-colors z-20">
                    <X className="w-5 h-5" />
                </button>
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-primary/10 blur-[100px] rounded-full pointer-events-none group-hover:bg-primary/20 transition-all duration-300" />
                
                <div className="relative z-10 space-y-8">
                    <div className="w-24 h-24 bg-zinc-800 rounded-[2.5rem] flex items-center justify-center mx-auto border border-zinc-700 shadow-xl group-hover:scale-110 transition-transform duration-200">
                        <Globe className="w-12 h-12 text-zinc-600" />
                        <div className="absolute -top-2 -right-2 bg-primary text-black p-2 rounded-xl shadow-lg">
                            <Lock className="w-4 h-4" />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h2 className="text-4xl font-black italic tracking-tighter text-white uppercase leading-none">Fonctionnalité PLATINUM</h2>
                        <p className="text-zinc-500 font-medium text-lg leading-relaxed">
                            L'interaction avec le Multi-Sites est une exclusivité du plan <span className="text-primary font-bold">PLATINUM</span>. 
                            Gérez tous vos restaurants depuis un seul compte et fusionnez vos statistiques.
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                        <button 
                            onClick={() => window.location.href = '/manager/settings?tab=subscription'}
                            className="bg-primary hover:bg-primary/90 text-black font-black py-4 px-10 rounded-2xl transition-all shadow-lg shadow-primary/10 flex items-center justify-center gap-3 uppercase tracking-widest text-xs active:scale-95"
                        >
                            Passer au plan Platinum
                        </button>
                        <button 
                            onClick={() => window.location.href = '/pricing'}
                            className="bg-zinc-800 hover:bg-zinc-700 text-white font-black py-4 px-10 rounded-2xl transition-all border border-zinc-700 flex items-center justify-center gap-3 uppercase tracking-widest text-xs active:scale-95"
                        >
                            Voir les avantages
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}
