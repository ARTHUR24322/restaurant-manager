"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChefHat,
  Banknote,
  UserCheck,
  Bike,
  Crown,
  Delete,
  Loader2,
  LogIn,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { loginEmployeByPin, ouvrirShift, logEmployeConnection } from "@/lib/employe-actions";

const ROLES_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  MANAGER: { label: "Manager", icon: Crown, color: "from-amber-600 to-amber-400" },
  CAISSIER: { label: "Caissier", icon: Banknote, color: "from-emerald-600 to-emerald-400" },
  CUISINIER: { label: "Cuisinier", icon: ChefHat, color: "from-orange-600 to-orange-400" },
  SERVEUR: { label: "Serveur", icon: UserCheck, color: "from-indigo-600 to-indigo-400" },
  LIVREUR: { label: "Livreur", icon: Bike, color: "from-sky-600 to-sky-400" },
};

export default function EmployePinPage({ searchParams }: { searchParams: { resto_id?: string; redirect?: string } }) {
  const router = useRouter();
  const restaurantId = searchParams.resto_id || "";
  const redirectTo = searchParams.redirect || "/manager/dashboard";

  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  // Shift opening state
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [fondsInitial, setFondsInitial] = useState("0");
  const [shiftLoading, setShiftLoading] = useState(false);
  const [loggedEmploye, setLoggedEmploye] = useState<any>(null);

  const handlePinDigit = (digit: string) => {
    if (pin.length < 6) setPin((p) => p + digit);
  };

  const handleDelete = () => setPin((p) => p.slice(0, -1));


  const handleConfirmPin = async () => {
    if (!selectedRole || pin.length < 4) return;
    setLoginLoading(true);
    setError("");
    try {
      const res = await loginEmployeByPin(restaurantId, pin);
      if (res.success && res.employe) {
        if (res.employe.role !== selectedRole) {
          setError("Ce code PIN n'appartient pas à ce poste.");
          setPin("");
          setTimeout(() => setError(""), 2000);
          return;
        }

        // Log the connection
        await logEmployeConnection(restaurantId, res.employe.id, res.employe.nom, res.employe.role);

        setLoggedEmploye(res.employe);
        // Si c'est un caissier, proposer l'ouverture du shift
        if (res.employe.role === "CAISSIER" || res.employe.role === "MANAGER") {
          setShowShiftModal(true);
        } else {
          // Stocker l'employé actif en sessionStorage et rediriger
          sessionStorage.setItem("employe_actif", JSON.stringify(res.employe));
          router.push(`${redirectTo}?resto_id=${restaurantId}`);
        }
      } else {
        setError("Code PIN incorrect.");
        setPin("");
        setTimeout(() => setError(""), 2000);
      }
    } finally {
      setLoginLoading(false);
    }
  };

  const handleOuvrirShift = async (skipShift = false) => {
    if (!loggedEmploye) return;

    if (!skipShift) {
      setShiftLoading(true);
      const res = await ouvrirShift(restaurantId, loggedEmploye.id, parseFloat(fondsInitial) || 0);
      if (res.success) {
        sessionStorage.setItem("employe_actif", JSON.stringify(loggedEmploye));
        sessionStorage.setItem("shift_actif", JSON.stringify(res.shift));
      }
      setShiftLoading(false);
    } else {
      sessionStorage.setItem("employe_actif", JSON.stringify(loggedEmploye));
    }

    router.push(`${redirectTo}?resto_id=${restaurantId}`);
  };



  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Logo / Titre */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-black italic tracking-tighter bg-gradient-to-r from-primary to-indigo-400 bg-clip-text text-transparent">
            Smart<span className="text-white">Resto</span>
          </h1>
          <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mt-2">
            {selectedRole ? "Entrez votre code PIN" : "Quel est votre poste ?"}
          </p>
        </div>

        {!selectedRole ? (
          /* ======================== Grille des rôles ======================== */
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Object.keys(ROLES_CONFIG).map((roleKey) => {
              const conf = ROLES_CONFIG[roleKey];
              const Icon = conf.icon;
              return (
                <button
                  key={roleKey}
                  onClick={() => { setSelectedRole(roleKey); setPin(""); setError(""); }}
                  className="group relative bg-zinc-900 border border-zinc-800 hover:border-zinc-600 rounded-2xl p-5 flex flex-col items-center gap-3 transition-all hover:scale-105 active:scale-95 hover:shadow-xl hover:shadow-primary/5"
                >
                  <div className={cn(
                    "w-16 h-16 rounded-2xl flex items-center justify-center bg-gradient-to-br shadow-lg",
                    conf.color
                  )}>
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                  <div className="text-center">
                    <p className="font-black text-white text-sm">{conf.label}</p>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          /* ======================== Écran PIN ======================== */
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
            {/* Rôle sélectionné */}
            <div className="flex flex-col items-center mb-8">
              {(() => {
                const conf = ROLES_CONFIG[selectedRole] || ROLES_CONFIG.SERVEUR;
                const Icon = conf.icon;
                return (
                  <>
                    <div className={cn("w-20 h-20 rounded-3xl flex items-center justify-center bg-gradient-to-br shadow-2xl mb-3", conf.color)}>
                      <Icon className="w-10 h-10 text-white" />
                    </div>
                    <p className="font-black text-white text-xl">{conf.label}</p>
                    <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">Connexion</p>
                  </>
                );
              })()}
            </div>

            {/* Indicateur PIN */}
            <div className="flex items-center justify-center gap-3 mb-8">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "w-4 h-4 rounded-full border-2 transition-all duration-150",
                    i < pin.length
                      ? error
                        ? "bg-destructive border-destructive"
                        : "bg-primary border-primary shadow-[0_0_12px_rgba(0,200,150,0.5)]"
                      : "bg-transparent border-zinc-700"
                  )}
                />
              ))}
            </div>

            {error && (
              <p className="text-center text-destructive text-xs font-black uppercase tracking-widest mb-4 animate-in shake">
                ⚠ {error}
              </p>
            )}

            {/* Clavier PIN */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
                <button
                  key={d}
                  onClick={() => handlePinDigit(d)}
                  className="h-16 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-600 rounded-2xl text-white text-2xl font-black transition-all active:scale-95 hover:shadow-lg"
                >
                  {d}
                </button>
              ))}
              <button
                onClick={() => setSelectedRole(null)}
                className="h-16 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-2xl text-zinc-500 text-xs font-black uppercase tracking-widest transition-all active:scale-95 hover:text-white"
              >
                ← Retour
              </button>
              <button
                onClick={() => handlePinDigit("0")}
                className="h-16 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-600 rounded-2xl text-white text-2xl font-black transition-all active:scale-95"
              >
                0
              </button>
              <button
                onClick={handleDelete}
                className="h-16 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-2xl text-zinc-400 transition-all active:scale-95 flex items-center justify-center"
              >
                <Delete className="w-5 h-5" />
              </button>
            </div>

            {/* Bouton Valider */}
            <button
              onClick={handleConfirmPin}
              disabled={pin.length < 4 || loginLoading}
              className="w-full h-16 bg-primary hover:bg-primary/90 text-black font-black text-sm uppercase tracking-widest rounded-2xl shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loginLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogIn className="w-5 h-5" />}
              {loginLoading ? "Vérification..." : "Se connecter"}
            </button>
          </div>
        )}
      </div>

      {/* ======================== Modal Shift ======================== */}
      {showShiftModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-[2rem] p-8 shadow-2xl animate-in zoom-in-95 duration-200 text-center">
            <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto mb-5 border border-emerald-500/20">
              <Banknote className="w-8 h-8 text-emerald-500" />
            </div>
            <h3 className="text-lg font-black italic text-white mb-1">Ouverture de Caisse</h3>
            <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-6">
              Entrez le fonds de départ
            </p>

            <div className="mb-6">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 block mb-2">
                Fonds Initial ($)
              </label>
              <input
                type="number"
                value={fondsInitial}
                onChange={(e) => setFondsInitial(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 focus:border-emerald-500 rounded-xl py-4 px-5 text-white text-xl font-black outline-none text-center focus:ring-2 focus:ring-emerald-500/30 transition-all"
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <button
                onClick={() => handleOuvrirShift(false)}
                disabled={shiftLoading}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-4 rounded-xl uppercase text-xs tracking-widest transition-all shadow-lg shadow-emerald-500/10 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {shiftLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Banknote className="w-4 h-4" />}
                {shiftLoading ? "Ouverture..." : "Ouvrir la Caisse"}
              </button>
              <button
                onClick={() => handleOuvrirShift(true)}
                className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400 font-black py-3 rounded-xl uppercase text-[10px] tracking-widest transition-all"
              >
                Continuer sans ouvrir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
