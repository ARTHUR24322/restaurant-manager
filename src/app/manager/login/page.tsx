"use client"
/* eslint-disable react-hooks/exhaustive-deps */

import React, { useState, useTransition, useRef, useEffect } from 'react';
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
import { authenticateManager, verifyManagerPin } from "@/lib/auth-actions";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function ManagerLoginPage() {
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const [step, setStep] = useState<"credentials" | "pin">("credentials");
  const [pin, setPin] = useState(["", "", "", "", "", ""]);
  const pinRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];
  const router = useRouter();

  // Focus du premier champ PIN à l'affichage
  useEffect(() => {
    if (step === "pin") {
      setTimeout(() => pinRefs[0].current?.focus(), 100);
    }
  }, [step]);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setError("");
    startTransition(async () => {
      const res = await authenticateManager(formData);
      if (res.success && res.requiresPin) {
        setStep("pin");
        setPin(["", "", "", "", "", ""]);
      } else if (!res.success) {
        setError(res.error || "Identifiants invalides.");
      }
    });
  };

  const handlePinChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return; // Chiffres seulement
    const newPin = [...pin];
    newPin[index] = value.slice(-1); // Un seul chiffre
    setPin(newPin);
    setError("");

    if (value && index < 5) {
      pinRefs[index + 1].current?.focus();
    }

    // Auto-submit si le PIN est complet
    if (value && index === 5) {
      const fullPin = [...newPin].join("");
      if (fullPin.length === 6) {
        submitPin([...newPin].join(""));
      }
    }
  };

  const handlePinKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !pin[index] && index > 0) {
      pinRefs[index - 1].current?.focus();
    }
    if (e.key === "Enter") {
      const fullPin = pin.join("");
      if (fullPin.length === 6) submitPin(fullPin);
    }
  };

  const submitPin = (fullPin: string) => {
    setError("");
    startTransition(async () => {
      const res = await verifyManagerPin(fullPin);
      if (res.success) {
        router.push(`/manager/selection`);
        router.refresh();
      } else {
        setError(res.error || "Code PIN incorrect.");
        setPin(["", "", "", "", "", ""]);
        setTimeout(() => pinRefs[0].current?.focus(), 100);
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
            {step === "credentials" ? "Accédez à votre espace professionnel" : "Vérification d'identité — Étape 2 / 2"}
           </p>
        </div>

        {/* ===== ÉTAPE 1 : Email + Mot de passe ===== */}
        {step === "credentials" && (
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
        )}

        {/* ===== ÉTAPE 2 : Code PIN 4 chiffres ===== */}
        {step === "pin" && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-10 shadow-2xl shadow-black/50 animate-in zoom-in-95 duration-300">
            <div className="flex flex-col items-center text-center">
              
              {/* Icône */}
              <div className="relative mb-8">
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl animate-pulse" />
                <div className="relative w-20 h-20 bg-primary/10 border border-primary/30 rounded-full flex items-center justify-center">
                  <KeyRound className="w-10 h-10 text-primary" />
                </div>
              </div>

              <h2 className="text-2xl font-black italic uppercase text-white mb-2">Code PIN</h2>
              <p className="text-zinc-500 text-sm mb-10 leading-relaxed">
                Entrez votre code à <span className="text-primary font-black">6 chiffres</span> pour accéder au portail.<br/>
                <span className="text-zinc-600 text-xs">Par défaut : <span className="text-zinc-400 font-bold">000000</span></span>
              </p>

              {/* 4 cases PIN */}
              <div className="flex gap-4 mb-8">
                {pin.map((digit, index) => (
                  <input
                    key={index}
                    ref={pinRefs[index]}
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handlePinChange(index, e.target.value)}
                    onKeyDown={(e) => handlePinKeyDown(index, e)}
                    className={cn(
                      "w-16 h-16 text-center text-2xl font-black rounded-2xl border-2 bg-zinc-800 text-white outline-none transition-all duration-200",
                      digit ? "border-primary shadow-lg shadow-primary/20 scale-105" : "border-zinc-700",
                      "focus:border-primary focus:ring-2 focus:ring-primary/30 focus:scale-105",
                      error && "border-red-500/50"
                    )}
                  />
                ))}
              </div>

              {/* Erreur */}
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl flex items-center gap-3 mb-6 w-full animate-in shake duration-300">
                  <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  <p className="text-[10px] font-bold text-red-500 uppercase tracking-tight">{error}</p>
                </div>
              )}

              {/* Bouton soumettre */}
              <button
                disabled={pin.join("").length < 6 || isPending}
                onClick={() => submitPin(pin.join(""))}
                className="w-full bg-primary hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed text-black font-black py-4 rounded-2xl transition-all shadow-lg shadow-primary/10 uppercase tracking-widest text-xs flex items-center justify-center gap-2"
              >
                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                {isPending ? "Vérification..." : "Accéder au Portail"}
              </button>

              {/* Retour */}
              <button
                onClick={() => { setStep("credentials"); setError(""); setPin(["", "", "", "", "", ""]); }}
                className="mt-4 flex items-center gap-2 text-zinc-600 hover:text-zinc-400 transition-colors text-[10px] font-bold uppercase tracking-widest"
              >
                <ArrowLeft className="w-3 h-3" />
                Retour à la connexion
              </button>
            </div>
          </div>
        )}

        {/* Footer link for Super Admin */}
        <div className="mt-8 text-center animate-in fade-in duration-300 delay-500">
            <a href="/super-admin" className="text-[10px] font-black text-zinc-700 uppercase tracking-widest hover:text-primary transition-colors">
                🔐 Accès Propriétaire Plateforme
            </a>
        </div>
      </div>
    </div>
  );
}
