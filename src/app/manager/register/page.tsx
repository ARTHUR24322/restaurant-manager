"use client";
/* eslint-disable react/no-unescaped-entities, @typescript-eslint/no-unused-vars */

import React, { useState, useTransition } from "react";
import { 
  Building2, 
  Mail, 
  Lock, 
  ChevronRight, 
  Loader2, 
  AlertCircle,
  MapPin,
  Globe,
  ArrowLeft,
  CheckCircle2,
  Sparkles
} from "lucide-react";
import { registerRestaurant } from "@/lib/auth-actions";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";

const RDC_CITIES = [
  "Lubumbashi", "Kinshasa", "Goma", "Bukavu", 
  "Mbuji-Mayi", "Kolwezi", "Likasi", "Matadi", 
  "Kikwit", "Kananga", "Kisangani"
];

export default function RegisterPage() {
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setError("");
    
    startTransition(async () => {
      const res = await registerRestaurant(formData);
      if (res.success) {
        setSuccess(true);
        // Rediriger vers login après 3 secondes ou laisser l'utilisateur cliquer
        setTimeout(() => router.push("/manager/login"), 5000);
      } else {
        setError(res.error || "Une erreur est survenue.");
      }
    });
  };

  if (success) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-10 text-center animate-in zoom-in-95 duration-300 shadow-2xl">
          <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-500/30">
            <CheckCircle2 className="w-10 h-10 text-emerald-500" />
          </div>
          <h2 className="text-2xl font-black text-white italic uppercase tracking-tight mb-4">Inscription Réussie !</h2>
          <p className="text-zinc-400 text-sm mb-6 leading-relaxed">
            Félicitations ! Vous avez obtenu un <span className="text-primary font-bold">essai de 14 jours</span> gratuit pour votre inscription.
          </p>
          <p className="text-zinc-500 text-xs mb-10">
            Vous allez être redirigé vers la page de connexion pour accéder à votre espace de travail.
          </p>
          <Link 
            href="/manager/login"
            className="w-full bg-primary hover:bg-primary/90 text-black font-black py-4 rounded-2xl transition-all shadow-lg shadow-primary/10 uppercase tracking-widest text-xs flex items-center justify-center gap-2"
          >
            Se Connecter Maintenant
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4 py-12">
      {/* Background Decor */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/5 blur-[120px] rounded-full" />
      </div>

      <div className="w-full max-w-lg relative z-10">
        {/* Logo / Header */}
        <div className="flex flex-col items-center mb-10 animate-in fade-in slide-in-from-bottom-5 duration-300">
           <div className="w-16 h-16 bg-primary rounded-[1.5rem] flex items-center justify-center mb-6 shadow-2xl shadow-primary/20">
              <Building2 className="w-8 h-8 text-black" />
           </div>
           <h1 className="text-3xl font-black text-white italic uppercase tracking-tighter text-center">SmartResto <span className="text-primary italic">SaaS</span></h1>
           <p className="text-zinc-500 text-sm font-medium mt-2 text-center">
            Créez votre compte professionnel et gérez votre établissement
           </p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-8 md:p-10 shadow-2xl shadow-black/50 animate-in zoom-in-95 duration-200">
          <form onSubmit={handleRegister} className="space-y-6">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {/* Nom Etablissement */}
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-500 uppercase ml-4 tracking-widest leading-none">Nom de l'établissement</label>
                  <div className="relative group">
                      <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 group-focus-within:text-primary transition-colors" />
                      <input 
                          name="nom"
                          required
                          className="w-full bg-zinc-800/50 border border-zinc-700 rounded-2xl py-3.5 pl-12 text-sm text-white focus:ring-2 focus:ring-primary/50 transition-all outline-none placeholder:text-zinc-700"
                          placeholder="Ex: Le Gourmet"
                      />
                  </div>
               </div>

               {/* Email */}
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-500 uppercase ml-4 tracking-widest leading-none">Email Professionnel</label>
                  <div className="relative group">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 group-focus-within:text-primary transition-colors" />
                      <input 
                          name="email"
                          type="email" 
                          required
                          className="w-full bg-zinc-800/50 border border-zinc-700 rounded-2xl py-3.5 pl-12 text-sm text-white focus:ring-2 focus:ring-primary/50 transition-all outline-none placeholder:text-zinc-700"
                          placeholder="votre@email.com"
                      />
                  </div>
               </div>
            </div>

            <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase ml-4 tracking-widest">Adresse complète</label>
                <div className="relative group">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 group-focus-within:text-primary transition-colors" />
                    <input 
                        name="adresse"
                        required
                        className="w-full bg-zinc-800/50 border border-zinc-700 rounded-2xl py-3.5 pl-12 text-sm text-white focus:ring-2 focus:ring-primary/50 transition-all outline-none placeholder:text-zinc-700"
                        placeholder="Ex: 12 Av. de l'Equateur"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {/* Ville */}
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-500 uppercase ml-4 tracking-widest leading-none">Ville</label>
                  <div className="relative group">
                      <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 group-focus-within:text-primary transition-colors" />
                      <select 
                          name="ville"
                          required
                          className="w-full bg-zinc-800/50 border border-zinc-700 rounded-2xl py-3.5 pl-12 text-sm text-white focus:ring-2 focus:ring-primary/50 transition-all outline-none appearance-none"
                      >
                         {RDC_CITIES.map(city => (
                           <option key={city} value={city}>{city}</option>
                         ))}
                         <option value="Autre">Autre (RDC)</option>
                      </select>
                  </div>
               </div>

               {/* Pays */}
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-500 uppercase ml-4 tracking-widest leading-none">Pays</label>
                  <div className="relative group">
                      <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                      <input 
                          name="pays"
                          readOnly
                          value="République Démocratique du Congo"
                          className="w-full bg-zinc-800/30 border border-zinc-700 rounded-2xl py-3.5 pl-12 text-sm text-zinc-400 outline-none cursor-not-allowed"
                      />
                  </div>
               </div>
            </div>

            <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase ml-4 tracking-widest">Créer un mot de passe</label>
                <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 group-focus-within:text-primary transition-colors" />
                    <input 
                        name="password"
                        type="password" 
                        required
                        className="w-full bg-zinc-800/50 border border-zinc-700 rounded-2xl py-3.5 pl-12 text-sm text-white focus:ring-2 focus:ring-primary/50 transition-all outline-none placeholder:text-zinc-700"
                        placeholder="••••••••"
                    />
                </div>
            </div>

            <div className="bg-primary/5 border border-primary/20 p-4 rounded-2xl flex items-center gap-3">
               <Sparkles className="w-5 h-5 text-primary flex-shrink-0" />
               <p className="text-[10px] font-black text-primary uppercase tracking-tight">
                 Inclus : Essai illimité de 14 jours dès la création
               </p>
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl flex items-center gap-3 animate-in shake duration-300">
                    <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                    <p className="text-[10px] font-bold text-red-500 uppercase tracking-tight">{error}</p>
                </div>
            )}

            <button 
                disabled={isPending}
                type="submit"
                className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 text-black font-black py-4 rounded-2xl transition-all shadow-lg shadow-primary/10 uppercase tracking-widest text-xs flex items-center justify-center gap-2 group"
            >
                {isPending ? <Loader2 className="w-4 h-4 animate-spin text-black" /> : <Sparkles className="w-4 h-4 text-black" />}
                {isPending ? "Création du compte..." : "Créer mon compte Gratuit"}
                {!isPending && <ChevronRight className="w-4 h-4 text-black group-hover:translate-x-1 transition-transform" />}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-zinc-500">
            Déjà inscrit ? <Link href="/manager/login" className="text-primary font-bold hover:underline">Se connecter</Link>
          </p>
        </div>

        {/* Back Link */}
        <div className="mt-8 text-center animate-in fade-in duration-300 delay-500">
            <Link href="/" className="flex items-center justify-center gap-2 text-[10px] font-black text-zinc-700 uppercase tracking-widest hover:text-white transition-colors">
                <ArrowLeft className="w-3 h-3" />
                Retour au site public
            </Link>
        </div>
      </div>
    </div>
  );
}
