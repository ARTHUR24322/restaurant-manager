"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useEffect, useState } from "react";
import { ChefHat, Banknote, UserCheck, Bike, Crown, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { fermerShift } from "@/lib/employe-actions";

const ROLES_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  MANAGER: { label: "Manager", icon: Crown, color: "text-amber-500 bg-amber-500/10 border-amber-500/20" },
  CAISSIER: { label: "Caissier", icon: Banknote, color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" },
  CUISINIER: { label: "Cuisinier", icon: ChefHat, color: "text-orange-500 bg-orange-500/10 border-orange-500/20" },
  SERVEUR: { label: "Serveur", icon: UserCheck, color: "text-indigo-500 bg-indigo-500/10 border-indigo-500/20" },
  LIVREUR: { label: "Livreur", icon: Bike, color: "text-sky-500 bg-sky-500/10 border-sky-500/20" },
};

export function EmployeActifBadge({ restaurantId: _restaurantId }: { restaurantId: string }) {
  const [employe, setEmploye] = useState<any>(null);
  const [shift, setShift] = useState<any>(null);
  const [showLogout, setShowLogout] = useState(false);
  const [fermetureLoading, setFermetureLoading] = useState(false);
  const [fondsFinal, setFondsFinal] = useState("0");

  useEffect(() => {
    const empRaw = sessionStorage.getItem("employe_actif");
    const shiftRaw = sessionStorage.getItem("shift_actif");
    if (empRaw) setEmploye(JSON.parse(empRaw));
    if (shiftRaw) setShift(JSON.parse(shiftRaw));
  }, []);

  if (!employe) return null;

  const conf = ROLES_CONFIG[employe.role] || ROLES_CONFIG.SERVEUR;
  const Icon = conf.icon;

  const handleDeconnexion = async (fermerCaisse: boolean) => {
    setFermetureLoading(true);
    if (fermerCaisse && shift?.id) {
      await fermerShift(shift.id, parseFloat(fondsFinal) || 0);
    }
    sessionStorage.removeItem("employe_actif");
    sessionStorage.removeItem("shift_actif");
    setEmploye(null);
    setShift(null);
    setShowLogout(false);
    setFermetureLoading(false);
  };

  return (
    <>
      <button
        onClick={() => setShowLogout(true)}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-black transition-all hover:scale-105",
          conf.color
        )}
      >
        <Icon className="w-3.5 h-3.5" />
        <span className="hidden sm:block">{employe.nom}</span>
      </button>

      {/* Modal fermeture */}
      {showLogout && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-[2rem] p-8 shadow-2xl animate-in zoom-in-95 duration-200 text-center">
            <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 border", conf.color)}>
              <Icon className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-black italic text-white mb-1">{employe.nom}</h3>
            <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-6">{conf.label}</p>

            {shift && !shift.heureFermeture && (
              <div className="mb-5">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 block mb-2">
                  Fonds Final à la Fermeture ($)
                </label>
                <input
                  type="number"
                  value={fondsFinal}
                  onChange={(e) => setFondsFinal(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 focus:border-emerald-500 rounded-xl py-3 px-4 text-white text-xl font-black outline-none text-center"
                  placeholder="0.00"
                />
              </div>
            )}

            <div className="space-y-2">
              {shift && !shift.heureFermeture && (
                <button
                  disabled={fermetureLoading}
                  onClick={() => handleDeconnexion(true)}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3.5 rounded-xl uppercase text-[10px] tracking-widest transition-all disabled:opacity-50"
                >
                  Fermer la Caisse & Se Déconnecter
                </button>
              )}
              <button
                disabled={fermetureLoading}
                onClick={() => handleDeconnexion(false)}
                className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400 font-black py-3.5 rounded-xl uppercase text-[10px] tracking-widest transition-all flex items-center justify-center gap-2"
              >
                <LogOut className="w-3.5 h-3.5" />
                {shift && !shift.heureFermeture ? "Déconnecter sans fermer caisse" : "Se Déconnecter"}
              </button>
              <button
                onClick={() => setShowLogout(false)}
                className="w-full bg-transparent text-zinc-600 font-bold py-2 text-xs"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
