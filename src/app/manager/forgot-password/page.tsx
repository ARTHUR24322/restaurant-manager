"use client"

import React, { useState, useTransition } from 'react';
import { 
  Building2, 
  Mail, 
  Lock, 
  ChevronRight, 
  Loader2, 
  ShieldCheck, 
  AlertCircle,
  KeyRound,
  ArrowLeft
} from "lucide-react";
import { resetPasswordWithPin } from "@/lib/auth-actions";
import { useRouter } from "next/navigation";
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleReset = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setError("");
    startTransition(async () => {
      const res = await resetPasswordWithPin(formData);
      if (res.success) {
        setSuccess(true);
        // On redirige après 3 secondes
        setTimeout(() => {
          router.push(`/manager/login`);
        }, 3000);
      } else {
        setError(res.error || "Informations invalides.");
      }
    });
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4">
      {/* Background Decor */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/5 blur-[120px] rounded-full" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Navigation retour */}
        <Link 
            href="/manager/login" 
            className="inline-flex items-center gap-2 text-zinc-500 hover:text-primary transition-colors text-xs font-bold uppercase tracking-widest mb-8 animate-in fade-in"
        >
            <ArrowLeft className="w-4 h-4" />
            Retour à la connexion
        </Link>

        {/* Logo / Header */}
        <div className="flex flex-col items-center mb-10 animate-in fade-in slide-in-from-bottom-5 duration-700">
           <div className="w-16 h-16 bg-primary/20 rounded-[1.5rem] flex items-center justify-center mb-6 shadow-2xl shadow-primary/20">
              <KeyRound className="w-8 h-8 text-primary" />
           </div>
           <h1 className="text-3xl font-black text-white italic uppercase tracking-tighter">Réinitialisation</h1>
           <p className="text-zinc-500 text-sm font-medium mt-2 text-center">
             Utilisez votre <span className="text-primary font-bold">Code PIN d'établissement</span> pour créer un nouveau mot de passe.
           </p>
        </div>

        {/* Card Form */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-10 shadow-2xl shadow-black/50 animate-in zoom-in-95 duration-500 delay-150">
             
             {success ? (
                 <div className="flex flex-col items-center justify-center py-6 animate-in zoom-in-95 duration-300">
                     <div className="w-16 h-16 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mb-4">
                         <ShieldCheck className="w-8 h-8" />
                     </div>
                     <h3 className="text-white font-black text-xl mb-2">Mot de passe modifié</h3>
                     <p className="text-zinc-400 text-sm text-center">
                         Votre mot de passe a été réinitialisé avec succès. Vous allez être redirigé vers la page de connexion.
                     </p>
                 </div>
             ) : (
                <form onSubmit={handleReset} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-zinc-500 uppercase ml-4 tracking-widest">Email Professionnel</label>
                        <div className="relative group">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 group-focus-within:text-primary transition-colors" />
                            <input 
                                name="email"
                                type="email" 
                                required
                                className="w-full bg-zinc-800/50 border-zinc-700 rounded-2xl py-4 pl-12 text-sm text-white focus:ring-2 focus:ring-primary/50 transition-all outline-none placeholder:text-zinc-700"
                                placeholder="votre@email.com"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-zinc-500 uppercase ml-4 tracking-widest">Code PIN  (6 chiffres)</label>
                        <div className="relative group">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 group-focus-within:text-primary transition-colors" />
                            <input 
                                name="pinCode"
                                type="password" 
                                inputMode="numeric"
                                pattern="\d{6}"
                                maxLength={6}
                                required
                                className="w-full bg-zinc-800/50 border-zinc-700 rounded-2xl py-4 pl-12 text-sm text-white focus:ring-2 focus:ring-primary/50 transition-all outline-none placeholder:text-zinc-700 text-center tracking-[1em]"
                                placeholder="••••••"
                            />
                        </div>
                        <p className="text-[10px] text-zinc-600 px-4">Le code PIN est le code de sécurité unique fourni lors de la création de votre établissement.</p>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-zinc-500 uppercase ml-4 tracking-widest">Nouveau mot de passe</label>
                        <div className="relative group">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 group-focus-within:text-primary transition-colors" />
                            <input 
                                name="newPassword"
                                type="password" 
                                required
                                minLength={6}
                                className="w-full bg-zinc-800/50 border-zinc-700 rounded-2xl py-4 pl-12 text-sm text-white focus:ring-2 focus:ring-primary/50 transition-all outline-none placeholder:text-zinc-700"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-zinc-500 uppercase ml-4 tracking-widest">Confirmer le mot de passe</label>
                        <div className="relative group">
                            <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 group-focus-within:text-primary transition-colors" />
                            <input 
                                name="confirmPassword"
                                type="password" 
                                required
                                minLength={6}
                                className="w-full bg-zinc-800/50 border-zinc-700 rounded-2xl py-4 pl-12 text-sm text-white focus:ring-2 focus:ring-primary/50 transition-all outline-none placeholder:text-zinc-700"
                                placeholder="••••••••"
                            />
                        </div>
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
                        {isPending ? <Loader2 className="w-4 h-4 animate-spin text-black" /> : <KeyRound className="w-4 h-4 text-black" />}
                        {isPending ? "Modification..." : "Modifier le mot de passe"}
                        {!isPending && <ChevronRight className="w-4 h-4 text-black group-hover:translate-x-1 transition-transform" />}
                    </button>
                </form>
             )}

        </div>

      </div>
    </div>
  );
}
