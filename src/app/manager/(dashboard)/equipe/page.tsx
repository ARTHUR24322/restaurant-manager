"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState, useEffect, useCallback } from "react";
import {
  Users,
  Plus,
  Pencil,
  Trash2,
  ChefHat,
  Banknote,
  UserCheck,
  Bike,
  Crown,
  Eye,
  EyeOff,
  Loader2,
  X,
  ShieldCheck,
  TrendingUp,
  Clock,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getEmployes,
  createEmploye,
  updateEmploye,
  deleteEmploye,
  getStatsEmployes,
  getShiftsJour,
} from "@/lib/employe-actions";
import { getManagerSession } from "@/lib/manager-actions";
import { toast } from "sonner";

const ROLES = [
  { value: "MANAGER", label: "Manager", icon: Crown, color: "text-amber-500 bg-amber-500/10 border-amber-500/20" },
  { value: "CAISSIER", label: "Caissier", icon: Banknote, color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" },
  { value: "CUISINIER", label: "Cuisinier", icon: ChefHat, color: "text-orange-500 bg-orange-500/10 border-orange-500/20" },
  { value: "SERVEUR", label: "Serveur", icon: UserCheck, color: "text-indigo-500 bg-indigo-500/10 border-indigo-500/20" },
  { value: "LIVREUR", label: "Livreur", icon: Bike, color: "text-sky-500 bg-sky-500/10 border-sky-500/20" },
] as const;

type RoleType = typeof ROLES[number]["value"];

function getRoleConfig(role: string) {
  return ROLES.find((r) => r.value === role) || ROLES[2];
}

function EmployeModal({
  open,
  employe,
  restaurantId,
  onClose,
  onSaved,
}: {
  open: boolean;
  employe: any | null;
  restaurantId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [nom, setNom] = useState("");
  const [codePin, setCodePin] = useState("");
  const [role, setRole] = useState<RoleType>("CAISSIER");
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (employe) {
      setNom(employe.nom || "");
      setCodePin("");
      setRole(employe.role || "CAISSIER");
    } else {
      setNom("");
      setCodePin("");
      setRole("CAISSIER");
    }
    setShowPin(false);
  }, [employe, open]);

  const handleSubmit = async () => {
    if (!nom.trim()) return toast.error("Nom requis.");
    if (!employe && (!codePin || !/^\d{4,6}$/.test(codePin))) {
      return toast.error("Code PIN de 4 à 6 chiffres requis.");
    }

    setLoading(true);
    try {
      if (employe) {
        const data: any = { nom: nom.trim(), role };
        if (codePin) data.codePin = codePin;
        const res = await updateEmploye(employe.id, data);
        if (res.success) {
          toast.success("Employé mis à jour !");
          onSaved();
        } else {
          toast.error(res.error || "Erreur.");
        }
      } else {
        const res = await createEmploye({ restaurantId, nom: nom.trim(), codePin, role });
        if (res.success) {
          toast.success("Employé créé avec succès !");
          onSaved();
        } else {
          toast.error(res.error || "Erreur.");
        }
      }
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-[2rem] p-8 shadow-2xl shadow-primary/5 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-xl font-black italic uppercase tracking-tighter text-white">
              {employe ? "Modifier Employé" : "Nouvel Employé"}
            </h2>
            <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mt-0.5">
              Gestion du Personnel
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-zinc-600 hover:text-white hover:bg-zinc-800 transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Nom */}
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 block mb-2">
              Nom Complet
            </label>
            <input
              type="text"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              placeholder="Ex: Jean Kabila"
              className="w-full bg-zinc-800 border border-zinc-700 focus:border-primary rounded-xl py-3 px-4 text-white font-bold outline-none focus:ring-2 focus:ring-primary/30 transition-all placeholder:text-zinc-600 placeholder:font-normal"
            />
          </div>

          {/* Code PIN */}
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 block mb-2">
              Code PIN {employe ? "(laisser vide = inchangé)" : "(4-6 chiffres)"}
            </label>
            <div className="relative">
              <input
                type={showPin ? "text" : "password"}
                value={codePin}
                onChange={(e) => setCodePin(e.target.value.replace(/\D/g, "").substring(0, 6))}
                placeholder={employe ? "Nouveau code PIN (optionnel)" : "Ex: 1234"}
                className="w-full bg-zinc-800 border border-zinc-700 focus:border-primary rounded-xl py-3 px-4 pr-12 text-white font-bold outline-none focus:ring-2 focus:ring-primary/30 transition-all placeholder:text-zinc-600 placeholder:font-normal tracking-widest text-lg text-center"
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
              >
                {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Rôle */}
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 block mb-2">
              Rôle
            </label>
            <div className="grid grid-cols-2 gap-2">
              {ROLES.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setRole(r.value)}
                  className={cn(
                    "flex items-center gap-2 p-3 rounded-xl border font-bold text-xs transition-all",
                    role === r.value
                      ? r.color + " border-current"
                      : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600"
                  )}
                >
                  <r.icon className="w-4 h-4" />
                  {r.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-8">
          <button
            onClick={onClose}
            className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 font-black py-3.5 rounded-xl uppercase text-[10px] tracking-widest transition-all"
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 bg-primary hover:bg-primary/90 text-black font-black py-3.5 rounded-xl uppercase text-[10px] tracking-widest transition-all shadow-lg shadow-primary/20 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
            {loading ? "..." : employe ? "Mettre à jour" : "Créer"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ================================================
// MAIN PAGE
// ================================================

export default function EquipePage({ searchParams }: { searchParams: { resto_id?: string } }) {
  const [restaurantId, setRestaurantId] = useState<string>(searchParams.resto_id || "");
  const [employes, setEmployes] = useState<any[]>([]);
  const [stats, setStats] = useState<any[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"equipe" | "stats" | "shifts">("equipe");
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedEmploye, setSelectedEmploye] = useState<any | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [periodeStats, setPeriodeStats] = useState<"day" | "week" | "month">("day");

  // Fallback: si pas de resto_id dans l'URL, récupérer depuis la session
  useEffect(() => {
    async function loadSession() {
      if (!searchParams.resto_id) {
        const session = await getManagerSession();
        if (session) {
          setRestaurantId(session.id);
        }
      }
    }
    loadSession();
  }, [searchParams.resto_id]);

  const reload = useCallback(async () => {
    if (!restaurantId) return;
    setLoading(true);
    const [empRes, statsRes, shiftsRes] = await Promise.all([
      getEmployes(restaurantId),
      getStatsEmployes(restaurantId, periodeStats),
      getShiftsJour(restaurantId),
    ]);
    setEmployes(empRes.employes || []);
    setStats(statsRes.stats || []);
    setShifts(shiftsRes.shifts || []);
    setLoading(false);
  }, [restaurantId, periodeStats]);

  useEffect(() => { reload(); }, [reload]);

  const handleDelete = async (id: string) => {
    const res = await deleteEmploye(id);
    if (res.success) {
      toast.success("Employé supprimé.");
      setDeleteConfirm(null);
      reload();
    } else {
      toast.error(res.error || "Erreur.");
    }
  };

  const handleToggleActif = async (emp: any) => {
    const res = await updateEmploye(emp.id, { actif: !emp.actif });
    if (res.success) {
      toast.success(emp.actif ? "Employé désactivé." : "Employé réactivé.");
      reload();
    } else {
      toast.error(res.error || "Erreur.");
    }
  };

  const totalVentes = stats.reduce((s, e) => s + (e.ventesCaisse || 0), 0);
  const totalCommandes = stats.reduce((s, e) => s + (e.nbCommandesCaisse || 0), 0);

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-6xl mx-auto animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black italic tracking-tighter bg-gradient-to-r from-primary to-indigo-400 bg-clip-text text-transparent">
            Équipe & Personnel
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {employes.length} employé{employes.length > 1 ? "s" : ""} enregistré{employes.length > 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={() => { setSelectedEmploye(null); setModalOpen(true); }}
          className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-black font-black px-6 py-3 rounded-2xl uppercase text-xs tracking-widest shadow-lg shadow-primary/20 hover:scale-105 transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          Nouvel Employé
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 bg-card p-1.5 rounded-2xl border border-border w-fit">
        {[
          { id: "equipe", label: "Équipe", icon: Users },
          { id: "stats", label: "Performances", icon: BarChart3 },
          { id: "shifts", label: "Shifts du Jour", icon: Clock },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id as any)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-xl transition-all",
              activeTab === id
                ? "bg-primary text-primary-foreground shadow-lg"
                : "hover:bg-secondary text-muted-foreground"
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-32">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
        </div>
      ) : (
        <>
          {/* ========================= TAB: ÉQUIPE ========================= */}
          {activeTab === "equipe" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {employes.length === 0 ? (
                <div className="col-span-3 py-24 text-center text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-4 text-zinc-700" />
                  <p className="font-bold">Aucun employé enregistré.</p>
                  <p className="text-sm mt-1">Créez votre première fiche employé.</p>
                </div>
              ) : (
                employes.map((emp) => {
                  const roleConf = getRoleConfig(emp.role);
                  const Icon = roleConf.icon;
                  return (
                    <div
                      key={emp.id}
                      className={cn(
                        "bg-card border rounded-2xl p-6 relative transition-all hover:shadow-md",
                        emp.actif ? "border-border" : "border-zinc-800 opacity-60"
                      )}
                    >
                      {/* Badge status */}
                      <div className={cn(
                        "absolute top-4 right-4 w-2.5 h-2.5 rounded-full",
                        emp.actif ? "bg-emerald-500 animate-pulse" : "bg-zinc-600"
                      )} />

                      {/* Avatar + Nom */}
                      <div className="flex items-center gap-4 mb-5">
                        <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center border", roleConf.color)}>
                          <Icon className="w-7 h-7" />
                        </div>
                        <div>
                          <p className="font-black text-white text-lg leading-none">{emp.nom}</p>
                          <span className={cn("text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border", roleConf.color)}>
                            {roleConf.label}
                          </span>
                        </div>
                      </div>

                      {/* PIN masqué */}
                      <div className="bg-zinc-800/50 rounded-xl p-3 mb-5 flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Code PIN</span>
                        <span className="font-black text-zinc-600 tracking-widest">••••</span>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleToggleActif(emp)}
                          className={cn(
                            "flex-1 text-[10px] font-black uppercase tracking-widest py-2.5 rounded-xl transition-all border",
                            emp.actif
                              ? "bg-zinc-800 text-zinc-400 border-zinc-700 hover:border-zinc-600"
                              : "bg-emerald-500/10 text-emerald-500 border-emerald-500/30 hover:bg-emerald-500/20"
                          )}
                        >
                          {emp.actif ? "Désactiver" : "Réactiver"}
                        </button>
                        <button
                          onClick={() => { setSelectedEmploye(emp); setModalOpen(true); }}
                          className="p-2.5 bg-zinc-800 hover:bg-primary/10 hover:text-primary text-zinc-400 rounded-xl transition-all border border-zinc-700"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(emp.id)}
                          className="p-2.5 bg-zinc-800 hover:bg-destructive/10 hover:text-destructive text-zinc-400 rounded-xl transition-all border border-zinc-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* ========================= TAB: STATS ========================= */}
          {activeTab === "stats" && (
            <div className="space-y-6">
              {/* Période selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-widest text-zinc-500">Période :</span>
                {([
                  { id: "day", label: "Aujourd'hui" },
                  { id: "week", label: "7 Jours" },
                  { id: "month", label: "30 Jours" },
                ] as const).map(({ id, label }) => (
                  <button
                    key={id}
                    onClick={() => setPeriodeStats(id)}
                    className={cn(
                      "px-4 py-2 text-xs font-black rounded-xl uppercase tracking-widest transition-all",
                      periodeStats === id ? "bg-primary text-black" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Résumé global */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-card border border-border rounded-2xl p-6">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">
                    Total Encaissé (équipe)
                  </p>
                  <p className="text-3xl font-black italic text-primary">${totalVentes.toFixed(2)}</p>
                </div>
                <div className="bg-card border border-border rounded-2xl p-6">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">
                    Total Commandes
                  </p>
                  <p className="text-3xl font-black italic text-white">{totalCommandes}</p>
                </div>
              </div>

              {/* Par employé */}
              <div className="bg-card border border-border rounded-3xl overflow-hidden">
                <div className="p-6 border-b border-border">
                  <h3 className="text-lg font-black italic tracking-tighter flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    Performances Individuelles
                  </h3>
                </div>
                <div className="divide-y divide-border">
                  {stats
                    .sort((a, b) => b.ventesCaisse - a.ventesCaisse)
                    .map((emp, idx) => {
                      const roleConf = getRoleConfig(emp.role);
                      const Icon = roleConf.icon;
                      const pct = totalVentes > 0 ? (emp.ventesCaisse / totalVentes) * 100 : 0;
                      return (
                        <div key={emp.id} className="p-5 flex items-center gap-4 hover:bg-secondary/30 transition-colors">
                          <div className="text-2xl font-black italic text-zinc-700 w-6 text-center">
                            {idx + 1}
                          </div>
                          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center border shrink-0", roleConf.color)}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <p className="font-black text-white">{emp.nom}</p>
                              <p className="font-black text-primary">${emp.ventesCaisse.toFixed(2)}</p>
                            </div>
                            <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden mb-1">
                              <div
                                className="h-full bg-primary rounded-full transition-all duration-700"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <div className="flex items-center gap-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                              <span>{emp.nbCommandesCaisse} encaiss.</span>
                              <span>{emp.nbCommandesCrees} créées</span>
                              {emp.nbCommandesCuisine > 0 && <span>{emp.nbCommandesCuisine} cuisine</span>}
                              <span className={cn("ml-auto", emp.actif ? "text-emerald-500" : "text-zinc-600")}>
                                {emp.actif ? "Actif" : "Inactif"}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  {stats.length === 0 && (
                    <div className="p-12 text-center text-muted-foreground italic text-sm">
                      Aucune statistique pour cette période.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ========================= TAB: SHIFTS ========================= */}
          {activeTab === "shifts" && (
            <div className="space-y-4">
              <div className="bg-card border border-border rounded-3xl overflow-hidden">
                <div className="p-6 border-b border-border">
                  <h3 className="text-lg font-black italic tracking-tighter flex items-center gap-2">
                    <Clock className="w-5 h-5 text-indigo-400" />
                    Sessions Caisse – {new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
                  </h3>
                </div>
                {shifts.length === 0 ? (
                  <div className="p-16 text-center text-muted-foreground">
                    <Clock className="w-10 h-10 mx-auto mb-4 text-zinc-700" />
                    <p className="font-bold">Aucune session enregistrée aujourd&apos;hui.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {shifts.map((shift) => {
                      const emp = shift.employe;
                      const roleConf = getRoleConfig(emp?.role || "CAISSIER");
                      const Icon = roleConf.icon;
                      const duree = shift.heureFermeture
                        ? Math.round((new Date(shift.heureFermeture).getTime() - new Date(shift.heureOuverture).getTime()) / 60000)
                        : Math.round((Date.now() - new Date(shift.heureOuverture).getTime()) / 60000);

                      return (
                        <div key={shift.id} className="p-5 flex items-center gap-4 hover:bg-secondary/20 transition-colors">
                          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center border shrink-0", roleConf.color)}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <p className="font-black text-white">{emp?.nom || "Inconnu"}</p>
                              <span className={cn(
                                "text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full",
                                shift.heureFermeture
                                  ? "bg-zinc-800 text-zinc-500"
                                  : "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                              )}>
                                {shift.heureFermeture ? "Fermé" : "En cours"}
                              </span>
                            </div>
                            <div className="flex items-center gap-4 mt-1 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                              <span>
                                Ouverture : {new Date(shift.heureOuverture).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                              </span>
                              {shift.heureFermeture && (
                                <span>
                                  Fermeture : {new Date(shift.heureFermeture).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                                </span>
                              )}
                              <span className="text-primary">{duree} min</span>
                            </div>
                            <div className="flex items-center gap-4 mt-1 text-[10px] font-medium text-zinc-600">
                              <span>Fonds initial : <span className="text-white font-bold">${shift.fondsInitial}</span></span>
                              {shift.fondsFinal !== null && (
                                <span>
                                  Fonds final : <span className={cn("font-bold", shift.fondsFinal >= shift.fondsInitial ? "text-emerald-500" : "text-red-500")}>
                                    ${shift.fondsFinal}
                                  </span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal Création/Édition */}
      <EmployeModal
        open={modalOpen}
        employe={selectedEmploye}
        restaurantId={restaurantId}
        onClose={() => setModalOpen(false)}
        onSaved={() => { setModalOpen(false); reload(); }}
      />

      {/* Modale Confirmation Suppression */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-[2rem] p-8 shadow-2xl animate-in zoom-in-95 duration-200 text-center">
            <div className="w-14 h-14 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-5">
              <Trash2 className="w-7 h-7 text-destructive" />
            </div>
            <h3 className="text-lg font-black italic text-white mb-2">Supprimer l&apos;employé ?</h3>
            <p className="text-zinc-500 text-sm mb-6">Cette action est irréversible. L&apos;historique des commandes sera conservé.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 font-black py-3.5 rounded-xl uppercase text-[10px] tracking-widest transition-all"
              >
                Annuler
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 bg-destructive hover:bg-destructive/90 text-white font-black py-3.5 rounded-xl uppercase text-[10px] tracking-widest transition-all"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
