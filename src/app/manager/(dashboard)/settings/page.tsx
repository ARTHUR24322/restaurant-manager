"use client"

import React, { useState, useEffect } from 'react';
import { Settings, Lock, User, Save, Building2, Globe, CreditCard, Zap, Star, Clock, CheckCircle2, ChevronRight, AlertCircle, Loader2, Sun, Moon, Monitor, DollarSign, RefreshCw, TrendingUp, Upload, MessageSquare, ShieldCheck, Check } from "lucide-react";
import { useTheme } from "next-themes";
import { useRouter } from 'next/navigation';
import { Crown, Gift } from "lucide-react";
import { updateRestaurantPassword, updateRestaurantProfile, updateRestaurantPin, updateRestaurantTheme, updateRestaurantTauxChange } from "@/lib/actions-settings";
import { getManagerSession } from "@/lib/manager-actions";
import { getLoyaltyConfig, updateLoyaltySettings } from "@/lib/actions";
import { submitSubscriptionRequest } from "@/lib/demande-actions";
import { checkIsMainAccount } from "@/lib/admin-actions";
import { getWhatsAppSettings, updateWhatsAppSettings, testWhatsAppConnection } from "@/lib/actions-whatsapp";
import { SubmitButton } from "@/components/manager/SubmitButton";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function ManagerSettingsPage({ searchParams }: { searchParams: { resto_id?: string } }) {
  const router = useRouter();
  const [restaurantId, setRestaurantId] = useState<string>(searchParams.resto_id || "");
  
  const [activeTab, setActiveTab] = useState<'security' | 'profile' | 'subscription' | 'appearance' | 'monnaie' | 'loyalty' | 'whatsapp'>('security');
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [newPin, setNewPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [pinLoading, setPinLoading] = useState(false);
  const [restaurant, setRestaurant] = useState<any>(null);
  const [requestLoading, setRequestLoading] = useState(false);
  const [newTaux, setNewTaux] = useState<string>("");
  const [tauxLoading, setTauxLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Loyalty Config
  const [loyaltyRate, setLoyaltyRate] = useState<string>("1");
  const [loyaltyThreshold, setLoyaltyThreshold] = useState<string>("100");
  const [loyaltyLoading, setLoyaltyLoading] = useState(false);

  // WhatsApp Config
  const [waAccessToken, setWaAccessToken] = useState("");
  const [waPhoneNumberId, setWaPhoneNumberId] = useState("");
  const [waBusinessAccountId, setWaBusinessAccountId] = useState("");
  const [waEnabled, setWaEnabled] = useState(false);
  const [waLoading, setWaLoading] = useState(false);
  const [waTestLoading, setWaTestLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Si l'ID n'est pas dans l'URL, le récupérer depuis la session
    async function init() {
      let restoId = searchParams.resto_id;
      if (!restoId) {
        const session = await getManagerSession();
        restoId = session?.id || "";
        if (restoId) setRestaurantId(restoId);
      }
      if (restoId) {
        const isMain = await checkIsMainAccount(restoId);
        if (!isMain) {
          router.push(`/manager/dashboard?resto_id=${restoId}`);
          return;
        }
        const session = await getManagerSession();
        if (session) {
          setRestaurant(session);
          if ((session as any).tauxChange) setNewTaux(String((session as any).tauxChange));
          // Sync du thème
          if ((session as any).preferredTheme && (session as any).preferredTheme !== theme) {
            setTheme((session as any).preferredTheme);
          }
        }
        
        // Charger la config de fidélité
        const loyaltyInfo = await getLoyaltyConfig(restoId);
        if (loyaltyInfo) {
          setLoyaltyRate(String(loyaltyInfo.pointsPerUsd));
          setLoyaltyThreshold(String(loyaltyInfo.rewardThreshold));
        }

        // Charger la config WhatsApp
        const waInfo = await getWhatsAppSettings(restoId);
        if (waInfo.success && waInfo.data) {
          setWaPhoneNumberId(waInfo.data.whatsappPhoneNumberId || "");
          setWaBusinessAccountId(waInfo.data.whatsappBusinessAccountId || "");
          setWaEnabled(waInfo.data.whatsappEnabled || false);
        }
      }
    }
    init();
  }, [searchParams.resto_id]);

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
    if (newPin.length !== 6 || isNaN(Number(newPin))) {
      toast.error("Le code PIN doit comporter 6 chiffres.");
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
      const nom = formData.get("nom") as string;
      const logoUrl = formData.get("logoUrl") as string;
      // Note: If we uploaded a file, the server-side will return a new path, 
      // but since we're in a client-side action, we might want to refresh the session or just rely on the toast.
      // For immediate preview update, if we have a previewUrl, we can use it.
      setRestaurant((prev: any) => ({ ...prev, nom, logoUrl: previewUrl || logoUrl }));
    } else {
      toast.error(res.error || "Erreur lors de la mise à jour.");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
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
                <button 
                  onClick={() => setActiveTab('monnaie')}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all",
                    activeTab === 'monnaie' ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/10 scale-105" : "bg-card border border-border text-muted-foreground hover:bg-secondary"
                  )}
                >
                    <DollarSign className="w-4 h-4" /> Taux de Change
                </button>
                <button 
                  onClick={() => setActiveTab('loyalty')}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all",
                    activeTab === 'loyalty' ? "bg-pink-500 text-white shadow-lg shadow-pink-500/10 scale-105" : "bg-card border border-border text-muted-foreground hover:bg-secondary"
                  )}
                >
                    <Gift className="w-4 h-4" /> Fidélisation
                </button>
                <button 
                  onClick={() => setActiveTab('whatsapp')}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all",
                    activeTab === 'whatsapp' ? "bg-emerald-600 text-white shadow-lg shadow-emerald-500/10 scale-105" : "bg-card border border-border text-muted-foreground hover:bg-secondary"
                  )}
                >
                    <MessageSquare className="w-4 h-4" /> WhatsApp API
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

                            <SubmitButton isLoading={loading} loadingText="Mise à jour...">
                                Enregistrer les modifications
                            </SubmitButton>
                        </form>
                    </div>

                    <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-8 animate-in fade-in zoom-in-95 duration-300">
                        <h3 className="text-lg font-black uppercase tracking-tighter mb-6 flex items-center gap-2">
                            Code PIN Bureau (6 chiffres)
                        </h3>
                        <p className="text-[10px] text-zinc-500 font-bold uppercase mb-4">Ce code protège les sections Gestion, Stratégie et Stock.</p>

                        <form onSubmit={handleUpdatePin} className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-zinc-500 uppercase ml-2">Nouveau Code PIN</label>
                                <div className="relative">
                                    <Zap className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-500" />
                                    <input 
                                        type="text" 
                                        maxLength={6}
                                        required 
                                        value={newPin}
                                        onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                                        className="w-full bg-zinc-800 border-zinc-700 rounded-2xl py-3 pl-12 text-sm text-white focus:ring-1 focus:ring-indigo-500 outline-none transition-all tracking-[0.5em] font-black"
                                        placeholder="000000"
                                    />
                                </div>
                            </div>

                            <SubmitButton 
                                className="bg-indigo-500 hover:bg-indigo-600 shadow-indigo-500/10 text-white" 
                                loadingText="Mise à jour..."
                                isLoading={pinLoading}
                            >
                                Modifier le Code PIN
                            </SubmitButton>
                        </form>
                    </div>

                    <div className="bg-amber-500/5 border border-amber-500/20 rounded-[2rem] p-6 animate-in slide-in-from-bottom-4 duration-200 delay-100">
                        <p className="text-[10px] text-amber-500/80 font-black uppercase tracking-widest mb-1 italic">Note importante</p>
                        <p className="text-xs text-amber-500/60 leading-relaxed">
                            Le changement du mot de passe déconnectera tout autre gérant ayant accès à ce dashboard. Assurez-vous de communiquer le nouveau mot de passe à votre équipe de confiance.
                        </p>
                    </div>
                  </>
                )}

                {activeTab === 'profile' && (
                  <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-8 animate-in fade-in zoom-in-95 duration-300">
                          <div className="flex items-center justify-between mb-8">
                              <div>
                                  <h3 className="text-lg font-black uppercase tracking-tighter flex items-center gap-2">
                                      Profil Établissement
                                  </h3>
                                  <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mt-1">Identité visuelle du restaurant</p>
                              </div>
                              
                              {/* Logo Preview with Upload Trigger */}
                              <div 
                                className="relative group cursor-pointer"
                                onClick={() => fileInputRef.current?.click()}
                              >
                                  <div className="w-24 h-24 bg-zinc-800 rounded-[2rem] border-2 border-dashed border-zinc-700 overflow-hidden shadow-2xl flex items-center justify-center transition-all group-hover:border-primary group-hover:bg-zinc-800/50">
                                      {previewUrl || restaurant?.logoUrl ? (
                                          <img src={previewUrl || restaurant.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                                      ) : (
                                          <Upload className="w-8 h-8 text-zinc-600 group-hover:text-primary transition-colors" />
                                      )}
                                  </div>
                                  <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-zinc-900 border border-zinc-700 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                      <Upload className="w-5 h-5 text-primary" />
                                  </div>
                                  
                                  {/* Hidden File Input */}
                                  <input 
                                    type="file"
                                    name="logoFile"
                                    ref={fileInputRef}
                                    onChange={handleFileChange}
                                    accept="image/*"
                                    className="hidden"
                                  />
                              </div>
                          </div>

                          <form action={handleUpdateProfile} className="space-y-6">
                              <div className="relative p-6 bg-primary/5 border border-primary/10 rounded-3xl mb-4 group overflow-hidden">
                                 <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                    <Globe className="w-12 h-12" />
                                 </div>
                                 <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">Source du Logo</p>
                                 <p className="text-xs text-zinc-500 font-medium">Vous pouvez soit <span className="text-white font-bold">uploader une image locale</span> en cliquant sur l'aperçu ci-dessus, soit <span className="text-white font-bold">coller une URL</span> directe ci-dessous.</p>
                              </div>
                          <div className="space-y-1">
                              <label className="text-[10px] font-black text-zinc-500 uppercase ml-2">Nom de l'établissement</label>
                              <div className="relative">
                                  <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                                  <input 
                                      name="nom"
                                      type="text" 
                                      required 
                                      defaultValue={restaurant?.nom}
                                      className="w-full bg-zinc-800 border-zinc-700 rounded-2xl py-3 pl-12 text-sm text-white focus:ring-1 focus:ring-primary outline-none transition-all font-bold italic"
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
                                      defaultValue={restaurant?.logoUrl}
                                      className="w-full bg-zinc-800 border-zinc-700 rounded-2xl py-3 pl-12 text-sm text-white focus:ring-1 focus:ring-primary outline-none transition-all font-mono text-[11px]"
                                      placeholder="https://votre-logo.png"
                                  />
                              </div>
                          </div>

                          <SubmitButton isLoading={loading} loadingText="Mise à jour...">
                              Enregistrer les modifications
                          </SubmitButton>
                      </form>
                  </div>
                )}

                {activeTab === 'subscription' && (
                  <div className="space-y-8 animate-in fade-in zoom-in-95 duration-300">
                      {/* Plan Actuel Summary */}
                      <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-8 relative overflow-hidden shadow-2xl">
                          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[100px] rounded-full" />
                          
                          <div className="flex flex-col md:flex-row justify-between gap-6 relative z-10">
                              <div className="space-y-4">
                                  <div className="flex items-center gap-4">
                                      <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center border border-primary/20">
                                          <Zap className="w-7 h-7 text-primary" />
                                      </div>
                                      <div>
                                          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest leading-none mb-1">Plan Actuel</p>
                                          <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter">{restaurant?.plan || "TRIAL"}</h2>
                                      </div>
                                  </div>
                                  
                                  <div className="flex items-center gap-6">
                                      <div className="flex items-center gap-2">
                                          <div className={cn(
                                              "w-2 h-2 rounded-full",
                                              restaurant?.active ? "bg-emerald-500 animate-pulse" : "bg-red-500"
                                          )} />
                                          <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{restaurant?.active ? "Compte Actif" : "Compte Suspendu"}</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                          <Clock className="w-4 h-4 text-zinc-500" />
                                          <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                                              Expire le : {restaurant?.subscriptionEnd ? new Date(restaurant.subscriptionEnd).toLocaleDateString() : "Indéfini"}
                                          </span>
                                      </div>
                                  </div>
                              </div>
                              
                              <div className="flex items-center">
                                  <div className="px-8 py-5 bg-zinc-800/50 rounded-3xl border border-zinc-700 text-center shadow-xl">
                                      <p className="text-[10px] font-black text-zinc-500 uppercase mb-1 tracking-widest">Jours Restants</p>
                                      <p className="text-4xl font-black text-white italic">
                                          {restaurant?.subscriptionEnd ? Math.max(0, Math.ceil((new Date(restaurant.subscriptionEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : "0"}
                                      </p>
                                  </div>
                              </div>
                          </div>
                      </div>

                      {/* Changer de Plan Options (Full Cards) */}
                      <div className="space-y-6">
                          <h3 className="text-2xl font-black italic tracking-tighter text-white uppercase flex items-center gap-3">
                             <Star className="w-7 h-7 text-primary" /> Plans & Tarification SmartResto
                          </h3>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              {[
                                  {
                                      name: "Standard",
                                      price: "30",
                                      icon: <Star className="w-5 h-5" />,
                                      badge: "Meilleure offre",
                                      features: ["Menu digital illimité", "QR Codes illimités", "Gestion des commandes", "Impression thermique", "Tableau de bord analytique"],
                                      gradient: "from-blue-600/10 to-indigo-700/10",
                                      border: "border-blue-500/20"
                                  },
                                  {
                                      name: "Pro",
                                      price: "55",
                                      icon: <Crown className="w-5 h-5" />,
                                      badge: "Populaire",
                                      features: ["Tout du plan Standard", "Gestion de stock avancée", "Multi-utilisateurs illimités", "White Label (Logo)", "Support 24/7"],
                                      gradient: "from-violet-600/10 to-purple-800/10",
                                      border: "border-violet-500/20"
                                  },
                                  {
                                      name: "Platinum",
                                      price: "99",
                                      icon: <Globe className="w-5 h-5" />,
                                      badge: "Enterprise",
                                      features: ["Tout du plan Pro", "Multi-Établissements (5 filiales)", "Statistiques Globales", "Stocks Multi-sites", "Conseiller dédié"],
                                      gradient: "from-emerald-600/10 to-teal-800/10",
                                      border: "border-emerald-500/20"
                                  }
                              ].map((p) => (
                                  <div 
                                      key={p.name}
                                      className={cn(
                                          "group relative flex flex-col p-8 rounded-[2.5rem] border overflow-hidden transition-all hover:-translate-y-1",
                                          restaurant?.plan === p.name.toUpperCase() 
                                            ? "border-primary bg-primary/5 shadow-2xl shadow-primary/5" 
                                            : `bg-zinc-900 ${p.border} hover:bg-zinc-800/50`
                                      )}
                                  >
                                      <div className="flex justify-between items-start mb-6">
                                          <div className="w-12 h-12 bg-zinc-800 rounded-2xl flex items-center justify-center border border-zinc-700 text-primary">
                                              {p.icon}
                                          </div>
                                          <span className="text-[9px] font-black uppercase bg-zinc-800 text-zinc-400 px-3 py-1.5 rounded-full border border-zinc-700">{p.badge}</span>
                                      </div>

                                      <h4 className="text-xl font-black text-white italic uppercase tracking-tighter mb-1">{p.name}</h4>
                                      <div className="flex items-baseline gap-1 mb-6">
                                          <span className="text-3xl font-black text-white italic">${p.price}</span>
                                          <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">/ Mois</span>
                                      </div>

                                      <ul className="space-y-3 mb-8 flex-1">
                                          {p.features.map(f => (
                                              <li key={f} className="flex items-center gap-3 text-[11px] font-medium text-zinc-400 capitalize whitespace-nowrap overflow-hidden text-ellipsis">
                                                  <div className="w-4 h-4 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                                                      <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500" />
                                                  </div>
                                                  {f}
                                              </li>
                                          ))}
                                      </ul>

                                      <button 
                                          disabled={requestLoading || restaurant?.plan === p.name.toUpperCase()}
                                          onClick={async () => {
                                              if(!restaurant) return;
                                              setRequestLoading(true);
                                              const res = await submitSubscriptionRequest({
                                                  nomRestaurant: restaurant.nom,
                                                  nomProprietaire: "Propriétaire actuel",
                                                  email: restaurant.email || "inconnu", 
                                                  telephone: "Non spécifié",
                                                  ville: restaurant.ville || "Lubumbashi",
                                                  plan: p.name.toUpperCase(),
                                                  cycle: "monthly",
                                                  montant: parseInt(p.price)
                                              });
                                              setRequestLoading(false);
                                              if(res.success) {
                                                  toast.success(`Demande d'upgrade vers ${p.name} envoyée !`);
                                              } else {
                                                  toast.error(res.error || "Erreur lors de l'envoi.");
                                              }
                                          }}
                                          className={cn(
                                              "w-full py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2",
                                              restaurant?.plan === p.name.toUpperCase() 
                                              ? "bg-zinc-800 text-zinc-600 border border-zinc-700 cursor-not-allowed" 
                                              : "bg-primary text-black shadow-lg shadow-primary/10 hover:brightness-110"
                                          )}
                                      >
                                          {restaurant?.plan === p.name.toUpperCase() ? "Plan Actuel" : "Activer ce Plan"}
                                          {requestLoading && <Loader2 className="w-3 h-3 animate-spin" />}
                                      </button>
                                  </div>
                              ))}
                          </div>

                          <div className="bg-primary/5 border border-primary/20 rounded-[2rem] p-8 flex items-start gap-4">
                              <AlertCircle className="w-6 h-6 text-primary shrink-0 mt-1" />
                              <div className="space-y-1">
                                  <p className="text-sm font-black text-white uppercase italic tracking-tighter">Processus de Activation</p>
                                  <p className="text-[11px] text-zinc-500 font-medium leading-relaxed leading-none">
                                      Une fois votre demande envoyée, notre équipe vous contactera pour finaliser le paiement via FlexPaie (Orange, M-Pesa, Airtel ou Visa/Mastercard). 
                                      Votre compte sera activé instantanément après confirmation.
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

                {activeTab === 'monnaie' && (
                  <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
                      {/* Taux actuel */}
                      <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-[2.5rem] p-8">
                          <div className="flex items-center gap-4 mb-6">
                              <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center border border-emerald-500/20">
                                  <TrendingUp className="w-6 h-6 text-emerald-400" />
                              </div>
                              <div>
                                  <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Taux Actuel</p>
                                  <p className="text-3xl font-black text-white">
                                      1 USD = <span className="text-emerald-400">{restaurant?.tauxChange || newTaux || 2800} FC</span>
                                  </p>
                              </div>
                          </div>

                          {/* Aperçu rapide */}
                          <div className="grid grid-cols-3 gap-3">
                              {[1, 5, 10, 20, 50, 100].map(usd => (
                                  <div key={usd} className="bg-zinc-900/80 rounded-2xl p-3 text-center border border-zinc-800">
                                      <p className="text-[10px] font-black text-zinc-500 uppercase">{usd} USD</p>
                                      <p className="text-sm font-black text-emerald-400">
                                          {(usd * (restaurant?.tauxChange || parseFloat(newTaux) || 2800)).toLocaleString('fr-CD')} FC
                                      </p>
                                  </div>
                              ))}
                          </div>
                      </div>

                      {/* Formulaire de mise à jour */}
                      <div className="bg-card border border-border rounded-[2.5rem] p-8">
                          <h3 className="text-lg font-black uppercase tracking-tighter mb-2 text-foreground flex items-center gap-2">
                              <RefreshCw className="w-5 h-5 text-emerald-500" /> Mettre à jour le taux
                          </h3>
                          <p className="text-[11px] text-muted-foreground mb-6 leading-relaxed">
                              Ce taux est utilisé automatiquement pour <span className="text-foreground font-bold">convertir les factures en Francs Congolais</span> (FC) lors de l'impression. Mettez-le à jour chaque matin selon le taux du jour.
                          </p>

                          <div className="space-y-4">
                              <div className="space-y-1">
                                  <label className="text-[10px] font-black text-zinc-500 uppercase ml-2">Nouveau taux (1 USD = ? FC)</label>
                                  <div className="relative">
                                      <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
                                      <input 
                                          type="number"
                                          min="1"
                                          step="10"
                                          value={newTaux}
                                          onChange={(e) => setNewTaux(e.target.value)}
                                          className="w-full bg-zinc-800 border-zinc-700 rounded-2xl py-4 pl-12 text-sm text-white focus:ring-2 focus:ring-emerald-500/50 outline-none transition-all font-black tracking-wider"
                                          placeholder="Ex: 2850"
                                      />
                                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-zinc-500">FC</span>
                                  </div>
                              </div>

                              {newTaux && !isNaN(parseFloat(newTaux)) && (
                                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex items-center gap-3">
                                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                                      <p className="text-sm font-bold text-emerald-400">
                                          Aperçu : 10 USD = <span className="font-black">{(10 * parseFloat(newTaux)).toLocaleString('fr-CD')} FC</span>
                                      </p>
                                  </div>
                              )}

                              <SubmitButton 
                                  className="bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20 text-white" 
                                  loadingText="Enregistrement..."
                                  type="button"
                                  isLoading={tauxLoading}
                                  onClick={async () => {
                                      if (!restaurantId || !newTaux) return;
                                      setTauxLoading(true);
                                      const res = await updateRestaurantTauxChange(restaurantId, parseFloat(newTaux));
                                      setTauxLoading(false);
                                      if (res.success) {
                                          toast.success(`Taux mis à jour : 1 USD = ${newTaux} FC`);
                                          setRestaurant((prev: any) => ({ ...prev, tauxChange: parseFloat(newTaux) }));
                                      } else {
                                          toast.error(res.error || "Erreur lors de la mise à jour.");
                                      }
                                  }}
                              >
                                  Enregistrer le nouveau taux
                              </SubmitButton>
                          </div>
                      </div>

                      {/* Info */}
                      <div className="bg-amber-500/5 border border-amber-500/20 rounded-[2rem] p-6 flex items-start gap-4">
                          <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                          <div className="space-y-1">
                              <p className="text-xs font-bold text-foreground uppercase italic tracking-wider">Rappel quotidien</p>
                              <p className="text-[11px] text-muted-foreground leading-relaxed">
                                  Le taux USD/FC varie souvent. Pour des factures exactes, mettez-le à jour chaque matin avant d'ouvrir votre service. Le taux affiché sur les nouvelles commandes est celui sauvegardé au moment de la commande.
                              </p>
                          </div>
                      </div>
                  </div>
                )}

                {activeTab === 'loyalty' && (
                  <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
                    <div className="bg-card border border-border rounded-[2.5rem] p-8 relative overflow-hidden shadow-2xl">
                          <div className="absolute top-0 right-0 w-64 h-64 bg-pink-500/5 blur-[100px] rounded-full" />
                          <h3 className="text-2xl font-black uppercase tracking-tighter mb-2 text-foreground flex items-center gap-3 relative z-10">
                              <Gift className="w-8 h-8 text-pink-500" /> Programme de Fidélité
                          </h3>
                          <p className="text-[11px] text-muted-foreground mb-8 leading-relaxed max-w-lg relative z-10">
                              Fidélisez votre clientèle en leur offrant des points à chaque commande. Ces points peuvent ensuite être échangés contre un cadeau que vous définissez.
                          </p>
                          
                          <form className="space-y-6 relative z-10" onSubmit={async (e) => {
                            e.preventDefault();
                            if (!restaurantId || !loyaltyRate || !loyaltyThreshold) return;
                            
                            setLoyaltyLoading(true);
                            const formData = new FormData();
                            formData.append("restaurantId", restaurantId);
                            formData.append("pointsPerUsd", loyaltyRate);
                            formData.append("rewardThreshold", loyaltyThreshold);
                            formData.append("rewardDescription", "Un cadeau offert !");
                            
                            try {
                              const res = await updateLoyaltySettings(formData);
                              if (res.success) {
                                toast.success("Configuration de fidélité mise à jour");
                              } else {
                                toast.error("Erreur de mise à jour");
                              }
                            } catch (e) {
                              toast.error("Erreur serveur");
                            } finally {
                              setLoyaltyLoading(false);
                            }
                          }}>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-zinc-500 uppercase ml-2">Points par USD dépensé</label>
                                    <div className="relative">
                                        <input 
                                            type="number"
                                            min="1"
                                            value={loyaltyRate}
                                            onChange={(e) => setLoyaltyRate(e.target.value)}
                                            className="w-full bg-zinc-800 border-zinc-700 rounded-2xl py-3 pl-4 text-sm text-white focus:ring-2 focus:ring-pink-500/50 outline-none transition-all font-black"
                                            placeholder="Ex: 1"
                                        />
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-zinc-500 uppercase">Points</span>
                                    </div>
                                </div>
 
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-zinc-500 uppercase ml-2">Points requis pour un cadeau</label>
                                    <div className="relative">
                                        <Crown className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-pink-500" />
                                        <input 
                                            type="number"
                                            min="10"
                                            value={loyaltyThreshold}
                                            onChange={(e) => setLoyaltyThreshold(e.target.value)}
                                            className="w-full bg-zinc-800 border-zinc-700 rounded-2xl py-3 pl-12 text-sm text-white focus:ring-2 focus:ring-pink-500/50 outline-none transition-all font-black"
                                            placeholder="Ex: 100"
                                        />
                                    </div>
                                </div>
                              </div>
 
                              <SubmitButton 
                                  className="bg-pink-500 hover:bg-pink-600 shadow-pink-500/20 text-white" 
                                  loadingText="Enregistrement..."
                                  isLoading={loyaltyLoading}
                              >
                                  Enregistrer la configuration
                              </SubmitButton>
                          </form>
                    </div>
                  </div>
                )}

                {activeTab === 'whatsapp' && (
                  <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-8 relative overflow-hidden shadow-2xl">
                          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[100px] rounded-full" />
                          <h3 className="text-2xl font-black uppercase tracking-tighter mb-2 text-foreground flex items-center gap-3 relative z-10">
                              <MessageSquare className="w-8 h-8 text-emerald-500" /> Intégration WhatsApp
                          </h3>
                          <p className="text-[11px] text-zinc-500 mb-8 leading-relaxed max-w-lg relative z-10">
                              Utilisez votre propre compte **WhatsApp Business API** pour envoyer des reçus numériques et des notifications de commande prête à vos clients.
                          </p>
                          
                          <form className="space-y-6 relative z-10" onSubmit={async (e) => {
                            e.preventDefault();
                            setWaLoading(true);
                            const res = await updateWhatsAppSettings(restaurantId, {
                              accessToken: waAccessToken,
                              phoneNumberId: waPhoneNumberId,
                              businessAccountId: waBusinessAccountId,
                              enabled: waEnabled
                            });
                            setWaLoading(false);
                            if (res.success) {
                              toast.success("Paramètres WhatsApp mis à jour !");
                              setWaAccessToken(""); // Clear input
                            } else {
                              toast.error(res.error || "Une erreur est survenue");
                            }
                          }}>
                              <div className="flex items-center gap-4 mb-4 p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl">
                                <div className={cn(
                                  "w-3 h-3 rounded-full",
                                  waEnabled ? "bg-emerald-500 animate-pulse" : "bg-zinc-700"
                                )} />
                                <div className="flex-1">
                                  <p className="text-xs font-bold">Activer les notifications WhatsApp</p>
                                  <p className="text-[10px] text-zinc-500">Si activé, les clients recevront leurs reçus par WhatsApp.</p>
                                </div>
                                <input 
                                  type="checkbox"
                                  checked={waEnabled}
                                  onChange={(e) => setWaEnabled(e.target.checked)}
                                  className="w-5 h-5 accent-emerald-500 cursor-pointer"
                                />
                              </div>

                              <div className="space-y-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-zinc-500 uppercase ml-2">System User Access Token (Meta)</label>
                                    <div className="relative">
                                        <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
                                        <input 
                                            type="password"
                                            value={waAccessToken}
                                            onChange={(e) => setWaAccessToken(e.target.value)}
                                            className="w-full bg-zinc-800 border-zinc-700 rounded-2xl py-3 pl-12 text-sm text-white focus:ring-2 focus:ring-emerald-500/50 outline-none transition-all"
                                            placeholder="••••••••••••••••"
                                        />
                                    </div>
                                    <p className="text-[9px] text-zinc-500 px-2 mt-1 italic">Ce token est chiffré en base de données avec AES-256-GCM.</p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="space-y-1">
                                      <label className="text-[10px] font-black text-zinc-500 uppercase ml-2">Phone Number ID</label>
                                      <div className="relative">
                                          <input 
                                              type="text"
                                              value={waPhoneNumberId}
                                              onChange={(e) => setWaPhoneNumberId(e.target.value)}
                                              className="w-full bg-zinc-800 border-zinc-700 rounded-2xl py-3 pl-4 text-sm text-white focus:ring-2 focus:ring-emerald-500/50 outline-none transition-all font-mono"
                                              placeholder="Ex: 109283734625"
                                          />
                                      </div>
                                  </div>
                                  <div className="space-y-1">
                                      <label className="text-[10px] font-black text-zinc-500 uppercase ml-2">WhatsApp Business Account ID</label>
                                      <div className="relative">
                                          <input 
                                              type="text"
                                              value={waBusinessAccountId}
                                              onChange={(e) => setWaBusinessAccountId(e.target.value)}
                                              className="w-full bg-zinc-800 border-zinc-700 rounded-2xl py-3 pl-4 text-sm text-white focus:ring-2 focus:ring-emerald-500/50 outline-none transition-all font-mono"
                                              placeholder="Ex: 509283734621"
                                          />
                                      </div>
                                  </div>
                                </div>
                              </div>

                              <div className="flex gap-4">
                                <SubmitButton 
                                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/20 text-white" 
                                    loadingText="Sauvegarde..."
                                    isLoading={waLoading}
                                >
                                    Enregistrer la configuration
                                </SubmitButton>
                                
                                <button 
                                  type="button"
                                  disabled={waTestLoading || !waPhoneNumberId}
                                  onClick={async () => {
                                    const testPhone = window.prompt("Entrez votre numéro WhatsApp (indicatif inclus, ex: 243...) :");
                                    if (!testPhone) return;
                                    setWaTestLoading(true);
                                    const res = await testWhatsAppConnection(restaurantId, testPhone);
                                    setWaTestLoading(false);
                                    if (res.success) {
                                      toast.success("Message de test envoyé !");
                                    } else {
                                      toast.error("Échec du test : vérifier vos IDs et Token Meta.");
                                    }
                                  }}
                                  className="px-6 rounded-2xl border border-border bg-secondary hover:bg-secondary/80 text-xs font-bold uppercase transition-all flex items-center justify-center gap-2"
                                >
                                  {waTestLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                                  Tester
                                </button>
                              </div>
                          </form>
                    </div>

                    <div className="bg-card border border-border rounded-3xl p-6 flex items-start gap-4">
                       <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                       <div className="space-y-1">
                          <p className="text-[10px] font-black text-white uppercase tracking-widest leading-none mb-1">Configuration Meta Required</p>
                          <p className="text-[11px] text-zinc-500 leading-relaxed">
                            N'oubliez pas d'approuver vos modèles de messages (**Templates**) sur le portail Meta for Developers avant de les utiliser. Les noms de modèles attendus par SmartResto sont : `order_ready` et `digital_receipt`.
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
