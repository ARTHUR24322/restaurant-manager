"use client"

import React, { useState, useEffect } from 'react';
import { Settings, Lock, User, Save, Building2, Globe, CreditCard, Zap, Star, Crown, Clock, CheckCircle2, ChevronRight, AlertCircle, Loader2, Sun, Moon, Monitor } from "lucide-react";
import { useTheme } from "next-themes";
import { useRouter } from 'next/navigation';
import { updateRestaurantPassword, updateRestaurantProfile, updateRestaurantPin, updateRestaurantTheme } from "@/lib/actions-settings";
import { getManagerSession } from "@/lib/manager-actions";
import { submitSubscriptionRequest } from "@/lib/demande-actions";
import { checkIsMainAccount } from "@/lib/admin-actions";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function ManagerSettingsPage({ searchParams }: { searchParams: { resto_id?: string } }) {
  const restaurantId = searchParams.resto_id || "resto-99-default";
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState<'security' | 'profile' | 'subscription' | 'appearance'>('security');
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [newPin, setNewPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [pinLoading, setPinLoading] = useState(false);
  const [restaurant, setRestaurant] = useState<any>(null);
  const [requestLoading, setRequestLoading] = useState(false);

  useEffect(() => {
    const checkSecurity = async () => {
        const isMain = await checkIsMainAccount(restaurantId);
        if (!isMain) {
            router.push(`/manager/dashboard?resto_id=${restaurantId}`);
        }
    };
    checkSecurity();
    fetchSession();
  }, [restaurantId]);

  const fetchSession = async () => {
    const data = await getManagerSession();
    if (data) setRestaurant(data);
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPassword) {
      toast.error("Veuillez entrer votre mot de passe actuel.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Les nouveaux mots de passe ne correspondent pas.");
      return;
    }

    setLoading(true);
    const res = await updateRestaurantPassword(restaurantId, oldPassword, newPassword);
    setLoading(false);

    if (res.success) {
      toast.success("Mot de passe mis à jour avec succès !");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } else {
      toast.error(res.error || "Une erreur est survenue.");
    }
  };

  const handleUpdatePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPin.length !== 4 || isNaN(Number(newPin))) {
      toast.error("Le code PIN doit comporter 4 chiffres.");
      return;
    }

    setPinLoading(true);
    const res = await updateRestaurantPin(restaurantId, newPin);
    setPinLoading(false);

    if (res.success) {
      toast.success("Code PIN mis à jour !");
      setNewPin("");
    } else {
      toast.error(res.error || "Erreur.");
    }
  };

  const handleUpdateProfile = async (formData: FormData) => {
    setLoading(true);
    const res = await updateRestaurantProfile(restaurantId, formData);
    setLoading(false);

    if (res.success) {
      toast.success("Profil mis à jour avec succès !");
    } else {
      toast.error(res.error || "Erreur lors de la mise à jour.");
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
        <div>
            <h1 className="text-3xl font-black italic tracking-tighter text-white">Paramètres Restaurant</h1>
            <p className="text-zinc-500 font-medium">Gérez vos accès et la sécurité de votre établissement.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Sidebar param */}
            <div className="space-y-2">
                <button 
                  onClick={() => setActiveTab('security')}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all",
                    activeTab === 'security' ? "bg-primary text-black shadow-lg shadow-primary/10 scale-105" : "bg-zinc-900 border border-zinc-800 text-zinc-500 hover:bg-zinc-800"
                  )}
                >
                    <Lock className="w-4 h-4" /> Sécurité & Accès
                </button>
                <button 
                  onClick={() => setActiveTab('profile')}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all",
                    activeTab === 'profile' ? "bg-primary text-black shadow-lg shadow-primary/10 scale-105" : "bg-zinc-900 border border-zinc-800 text-zinc-500 hover:bg-zinc-800"
                  )}
                >
                    <User className="w-4 h-4" /> Profil Établissement
                </button>
                <button 
                  onClick={() => setActiveTab('subscription')}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all",
                    activeTab === 'subscription' ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 scale-105" : "bg-card border border-border text-muted-foreground hover:bg-secondary"
                  )}
                >
                    <CreditCard className="w-4 h-4" /> Abonnement & Plan
                </button>
                <button 
                  onClick={() => setActiveTab('appearance')}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all",
                    activeTab === 'appearance' ? "bg-amber-500 text-white shadow-lg shadow-amber-500/10 scale-105" : "bg-card border border-border text-muted-foreground hover:bg-secondary"
                  )}
                >
                    <Sun className="w-4 h-4" /> Apparence
                </button>
            </div>

            {/* Contenu param */}
            <div className="md:col-span-2 space-y-6">
                {activeTab === 'security' && (
                  <>
                    <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-8 animate-in fade-in zoom-in-95 duration-300">
                        <h3 className="text-lg font-black uppercase tracking-tighter mb-6 flex items-center gap-2">
                            Modifier le mot de passe
                        </h3>

                        <form onSubmit={handleUpdatePassword} className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-zinc-500 uppercase ml-2">Mot de passe actuel (donné par l'administrateur)</label>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-600" />
                                    <input 
                                        type="password" 
                                        required 
                                        value={oldPassword}
                                        onChange={(e) => setOldPassword(e.target.value)}
                                        className="w-full bg-zinc-800 border-amber-700/30 rounded-2xl py-3 pl-12 text-sm text-white focus:ring-1 focus:ring-amber-500 outline-none transition-all"
                                        placeholder="Entrez le mot de passe reçu"
                                    />
                                </div>
                            </div>

                            <div className="w-full border-t border-zinc-800 my-2" />

                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-zinc-500 uppercase ml-2">Nouveau mot de passe</label>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                                    <input 
                                        type="password" 
                                        required 
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="w-full bg-zinc-800 border-zinc-700 rounded-2xl py-3 pl-12 text-sm text-white focus:ring-1 focus:ring-primary outline-none transition-all"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-zinc-500 uppercase ml-2">Confirmer le mot de passe</label>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                                    <input 
                                        type="password" 
                                        required 
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="w-full bg-zinc-800 border-zinc-700 rounded-2xl py-3 pl-12 text-sm text-white focus:ring-1 focus:ring-primary outline-none transition-all"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>

                            <button 
                                disabled={loading}
                                className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 text-black font-black py-4 rounded-2xl mt-4 transition-all uppercase tracking-widest text-xs flex items-center justify-center gap-2 shadow-lg shadow-primary/10 active:scale-95"
                            >
                                <Save className="w-4 h-4" /> 
                                {loading ? "Mise à jour..." : "Enregistrer les modifications"}
                            </button>
                        </form>
                    </div>

                    <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-8 animate-in fade-in zoom-in-95 duration-300">
                        <h3 className="text-lg font-black uppercase tracking-tighter mb-6 flex items-center gap-2">
                            Code PIN Bureau (4 chiffres)
                        </h3>
                        <p className="text-[10px] text-zinc-500 font-bold uppercase mb-4">Ce code protège les sections Gestion, Stratégie et Stock.</p>

                        <form onSubmit={handleUpdatePin} className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-zinc-500 uppercase ml-2">Nouveau Code PIN</label>
                                <div className="relative">
                                    <Zap className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-500" />
                                    <input 
                                        type="text" 
                                        maxLength={4}
                                        required 
                                        value={newPin}
                                        onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                                        className="w-full bg-zinc-800 border-zinc-700 rounded-2xl py-3 pl-12 text-sm text-white focus:ring-1 focus:ring-indigo-500 outline-none transition-all tracking-[0.5em] font-black"
                                        placeholder="0000"
                                    />
                                </div>
                            </div>

                            <button 
                                disabled={pinLoading}
                                className="w-full bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white font-black py-4 rounded-2xl mt-4 transition-all uppercase tracking-widest text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/10 active:scale-95"
                            >
                                <Save className="w-4 h-4" /> 
                                {pinLoading ? "Mise à jour..." : "Modifier le Code PIN"}
                            </button>
                        </form>
                    </div>

                    <div className="bg-amber-500/5 border border-amber-500/20 rounded-[2rem] p-6 animate-in slide-in-from-bottom-4 duration-500 delay-100">
                        <p className="text-[10px] text-amber-500/80 font-black uppercase tracking-widest mb-1 italic">Note importante</p>
                        <p className="text-xs text-amber-500/60 leading-relaxed">
                            Le changement du mot de passe déconnectera tout autre gérant ayant accès à ce dashboard. Assurez-vous de communiquer le nouveau mot de passe à votre équipe de confiance.
                        </p>
                    </div>
                  </>
                )}

                {activeTab === 'profile' && (
                  <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-8 animate-in fade-in zoom-in-95 duration-300">
                      <h3 className="text-lg font-black uppercase tracking-tighter mb-6 flex items-center gap-2">
                          Profil Établissement
                      </h3>

                      <form action={handleUpdateProfile} className="space-y-4">
                          <div className="space-y-1">
                              <label className="text-[10px] font-black text-zinc-500 uppercase ml-2">Nom de l'établissement</label>
                              <div className="relative">
                                  <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                                  <input 
                                      name="nom"
                                      type="text" 
                                      required 
                                      className="w-full bg-zinc-800 border-zinc-700 rounded-2xl py-3 pl-12 text-sm text-white focus:ring-1 focus:ring-primary outline-none transition-all"
                                      placeholder="Ex: Mon Super Restaurant"
                                  />
                              </div>
                          </div>

                          <div className="space-y-1">
                              <label className="text-[10px] font-black text-zinc-500 uppercase ml-2">URL du Logo (Optionnel)</label>
                              <div className="relative">
                                  <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                                  <input 
                                      name="logoUrl"
                                      type="url" 
                                      className="w-full bg-zinc-800 border-zinc-700 rounded-2xl py-3 pl-12 text-sm text-white focus:ring-1 focus:ring-primary outline-none transition-all"
                                      placeholder="https://..."
                                  />
                              </div>
                          </div>

                          <button 
                              type="submit"
                              disabled={loading}
                              className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 text-black font-black py-4 rounded-2xl mt-4 transition-all uppercase tracking-widest text-xs flex items-center justify-center gap-2 shadow-lg shadow-primary/10 active:scale-95"
                          >
                              <Save className="w-4 h-4" /> 
                              {loading ? "Mise à jour..." : "Enregistrer les modifications"}
                          </button>
                      </form>
                  </div>
                )}

                {activeTab === 'subscription' && (
                  <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
                      {/* Plan Actuel Summary */}
                      <div className="bg-card border border-border rounded-[2.5rem] p-8 relative overflow-hidden">
                          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-[60px] rounded-full" />
                          
                          <div className="flex flex-col md:flex-row justify-between gap-6 relative z-10">
                              <div className="space-y-4">
                                  <div className="flex items-center gap-3">
                                      <div className="w-12 h-12 bg-indigo-500/20 rounded-2xl flex items-center justify-center border border-indigo-500/20">
                                          <Zap className="w-6 h-6 text-indigo-400" />
                                      </div>
                                      <div>
                                          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Plan Actuel</p>
                                          <h2 className="text-2xl font-black text-foreground italic">{restaurant?.plan || "STANDARD"}</h2>
                                      </div>
                                  </div>
                                  
                                  <div className="flex items-center gap-6">
                                      <div className="flex items-center gap-2">
                                          <div className={cn(
                                              "w-2 h-2 rounded-full",
                                              restaurant?.active ? "bg-emerald-500 animate-pulse" : "bg-red-500"
                                          )} />
                                          <span className="text-xs font-bold text-muted-foreground capitalize">{restaurant?.active ? "Compte Actif" : "Compte Suspendu"}</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                          <Clock className="w-4 h-4 text-muted-foreground" />
                                          <span className="text-xs font-bold text-muted-foreground">
                                              Expire le : {restaurant?.subscriptionEnd ? new Date(restaurant.subscriptionEnd).toLocaleDateString() : "Indéfini"}
                                          </span>
                                      </div>
                                  </div>
                              </div>
                              
                              <div className="flex items-center">
                                  <div className="px-6 py-4 bg-secondary/50 rounded-3xl border border-border text-center">
                                      <p className="text-[10px] font-black text-muted-foreground uppercase mb-1">Jours Restants</p>
                                      <p className="text-3xl font-black text-foreground">
                                          {restaurant?.subscriptionEnd ? Math.max(0, Math.ceil((new Date(restaurant.subscriptionEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : "0"}
                                      </p>
                                  </div>
                              </div>
                          </div>
                      </div>

                      {/* Changer de Plan Options */}
                      <div className="bg-card border border-border rounded-[2.5rem] p-10">
                          <h3 className="text-xl font-black italic tracking-tighter mb-8 text-foreground">Changer ou Renouveler votre Plan</h3>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {[
                                  {
                                      id: "STANDARD",
                                      price: "50$",
                                      icon: <Star className="w-5 h-5" />,
                                      color: "text-blue-400",
                                      bg: "bg-blue-500/10",
                                      desc: "Idéal pour les restaurants en croissance."
                                  },
                                  {
                                      id: "PRO",
                                      price: "65$",
                                      icon: <Crown className="w-5 h-5" />,
                                      color: "text-violet-400",
                                      bg: "bg-violet-500/10",
                                      desc: "Fonctionnalités avancées et support 24/7."
                                  },
                                  {
                                      id: "PLATINUM",
                                      price: "100$",
                                      icon: <Globe className="w-5 h-5" />,
                                      color: "text-emerald-400",
                                      bg: "bg-emerald-500/10",
                                      desc: "Dashboard Multi-site et gestion de groupe."
                                  }
                              ].map((p) => (
                                  <div 
                                      key={p.id}
                                      className={cn(
                                          "group p-6 rounded-[2rem] border transition-all hover:scale-[1.02]",
                                          restaurant?.plan === p.id ? "border-indigo-500/50 bg-indigo-500/5" : "border-border bg-secondary/50 hover:border-zinc-700"
                                      )}
                                  >
                                      <div className="flex items-start justify-between mb-4">
                                          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center border", p.bg)}>
                                              <div className={p.color}>{p.icon}</div>
                                          </div>
                                          <div className="text-right">
                                              <p className="text-lg font-black text-foreground">{p.price}</p>
                                              <p className="text-[10px] text-muted-foreground font-bold uppercase">/ Mois</p>
                                          </div>
                                      </div>
                                      
                                      <h4 className="text-sm font-black text-foreground mb-1">{p.id} PLAN</h4>
                                      <p className="text-xs text-muted-foreground mb-6 leading-relaxed">{p.desc}</p>
                                      
                                      <button 
                                          disabled={requestLoading}
                                          type="button"
                                          onClick={async () => {
                                              if(!restaurant) return;
                                              setRequestLoading(true);
                                              const res = await submitSubscriptionRequest({
                                                  nomRestaurant: restaurant.nom,
                                                  nomProprietaire: "Propriétaire actuel",
                                                  email: restaurant.email || "inconnu", 
                                                  telephone: "Non spécifié",
                                                  ville: "Lubumbashi",
                                                  plan: p.id,
                                                  cycle: "monthly",
                                                  montant: parseInt(p.price)
                                              });
                                              setRequestLoading(false);
                                              if(res.success) {
                                                  toast.success("Demande envoyée ! L'administrateur reviendra vers vous.");
                                              } else {
                                                  toast.error(res.error || "Erreur lors de l'envoi.");
                                              }
                                          }}
                                          className={cn(
                                              "w-full py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2",
                                              restaurant?.plan === p.id 
                                              ? "bg-secondary text-muted-foreground" 
                                              : "bg-foreground text-background hover:opacity-90"
                                          )}
                                      >
                                          {requestLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
                                          {restaurant?.plan === p.id ? "Plan Actuel (Renouveler)" : "Demander l'Upgrade"}
                                      </button>
                                  </div>
                              ))}
                          </div>

                          <div className="mt-8 p-6 bg-secondary/50 border border-border rounded-2xl flex items-start gap-4">
                              <AlertCircle className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
                              <div className="space-y-1">
                                  <p className="text-xs font-bold text-foreground uppercase italic tracking-wider">Processus de validation</p>
                                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                                      Le changement de plan ou le renouvellement n'est pas automatique. Une fois votre demande envoyée, un administrateur SmartResto vous contactera pour valider le paiement via Mobile Money ou FlexPaie.
                                  </p>
                              </div>
                          </div>
                      </div>
                  </div>
                )}

                {activeTab === 'appearance' && (
                  <div className="bg-card border border-border rounded-[2.5rem] p-8 animate-in fade-in zoom-in-95 duration-300">
                      <h3 className="text-lg font-black uppercase tracking-tighter mb-6 flex items-center gap-2 text-foreground">
                          Apparence de l'application
                      </h3>
                      <p className="text-sm text-muted-foreground mb-8">Personnalisez votre interface selon vos préférences ou l'éclairage de votre établissement.</p>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {[
                              { id: 'light', label: 'Clair', icon: Sun, color: 'text-amber-500', bg: 'bg-amber-500/10' },
                              { id: 'dark', label: 'Sombre', icon: Moon, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
                              { id: 'system', label: 'Système', icon: Monitor, color: 'text-zinc-500', bg: 'bg-zinc-500/10' },
                          ].map((t) => (
                              <button
                                  key={t.id}
                                  onClick={async () => {
                                      setTheme(t.id);
                                      await updateRestaurantTheme(restaurantId, t.id);
                                  }}
                                  className={cn(
                                      "flex flex-col items-center gap-4 p-6 rounded-3xl border-2 transition-all active:scale-95",
                                      theme === t.id ? "border-primary bg-primary/5" : "border-border bg-secondary/50 hover:bg-secondary"
                                  )}
                              >
                                  <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center border border-border", t.bg)}>
                                      <t.icon className={cn("w-6 h-6", t.color)} />
                                  </div>
                                  <span className="font-bold text-sm text-foreground">{t.label}</span>
                                  {theme === t.id && <CheckCircle2 className="w-4 h-4 text-primary" />}
                              </button>
                          ))}
                      </div>

                      <div className="mt-10 p-6 bg-secondary/50 border border-border rounded-2xl flex items-start gap-4">
                          <Zap className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                          <div className="space-y-1">
                              <p className="text-xs font-bold text-foreground uppercase italic tracking-wider">Astuce de confort</p>
                              <p className="text-[11px] text-muted-foreground leading-relaxed">
                                  Le mode sombre réduit la fatigue oculaire lors des services de nuit, tandis que le mode clair est recommandé pour une lecture optimale sous un éclairage fort en journée.
                              </p>
                          </div>
                      </div>
                  </div>
                )}
            </div>
        </div>
    </div>
  );
}
