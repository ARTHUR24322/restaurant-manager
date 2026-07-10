"use client"
/* eslint-disable react-hooks/exhaustive-deps */

import React, { useState, useTransition } from 'react';
import { 
  Building2, 
  Mail, 
  Lock, 
  ChevronRight, 
  Loader2, 
  ShieldCheck, 
  AlertCircle
} from "lucide-react";
import { authenticateManager } from "@/lib/auth-actions";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function ManagerLoginPage() {
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setError("");
    startTransition(async () => {
      const res = await authenticateManager(formData);
      if (res?.success) {
        // Stocker le flag première connexion pour l'affichage de la modale de sécurité
        if (res.firstLogin) {
          sessionStorage.setItem('smartresto_first_login', 'true');
        }
        router.push(`/manager/selection`);
        router.refresh();
      } else {
        setError(res?.error || "Identifiants invalides.");
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
        {/* Logo / Header */}
        <div className="flex flex-col items-center mb-10 animate-in fade-in slide-in-from-bottom-5 duration-300">
           <div className="w-16 h-16 bg-primary rounded-[1.5rem] flex items-center justify-center mb-6 shadow-2xl shadow-primary/20">
              <Building2 className="w-8 h-8 text-black" />
           </div>
           <h1 className="text-3xl font-black text-white italic uppercase tracking-tighter">SmartResto <span className="text-primary italic">Manager</span></h1>
           <p className="text-zinc-500 text-sm font-medium mt-2">
            Accédez à votre espace professionnel
           </p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-10 shadow-2xl shadow-black/50 animate-in zoom-in-95 duration-200 delay-150">
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase ml-4 tracking-widest">Email Professionnel</label>
                <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 group-focus-within:text-primary transition-colors" />
                    <input 
                        name="email"
                        type="email" 
                        required
                        className="w-full bg-zinc-800/50 border border-zinc-700 rounded-2xl py-4 pl-12 text-sm text-white focus:ring-2 focus:ring-primary/50 transition-all outline-none placeholder:text-zinc-700"
                        placeholder="votre@email.com"
                    />
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase ml-4 tracking-widest">Mot de passe</label>
                <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 group-focus-within:text-primary transition-colors" />
                    <input 
                        name="password"
                        type="password" 
                        required
                        className="w-full bg-zinc-800/50 border border-zinc-700 rounded-2xl py-4 pl-12 text-sm text-white focus:ring-2 focus:ring-primary/50 transition-all outline-none placeholder:text-zinc-700"
                        placeholder="••••••••"
                    />
                </div>
                <div className="flex justify-end mt-2">
                    <Link href="/manager/forgot-password" className="text-[10px] text-zinc-500 font-bold hover:text-primary transition-colors tracking-widest uppercase">
                        Mot de passe oublié ?
                    </Link>
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
                {isPending ? <Loader2 className="w-4 h-4 animate-spin text-black" /> : <ShieldCheck className="w-4 h-4 text-black" />}
                {isPending ? "Vérification..." : "Continuer"}
                {!isPending && <ChevronRight className="w-4 h-4 text-black group-hover:translate-x-1 transition-transform" />}
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-zinc-800/50 flex flex-col items-center gap-4">
            <p className="text-[10px] text-zinc-600 font-bold uppercase text-center leading-relaxed">
                Plateforme SaaS sécurisée par<br/>
                <span className="text-zinc-400">SmartResto Intelligent System</span>
            </p>
            <div className="flex gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[8px] text-emerald-500 uppercase font-black tracking-widest">Système Opérationnel</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
