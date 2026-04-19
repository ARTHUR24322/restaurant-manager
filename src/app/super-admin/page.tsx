"use client"

import React, { useState, useEffect } from 'react';
import {
    Plus,
    Building2,
    Users,
    DollarSign,
    ShieldCheck,
    Power,
    ExternalLink,
    Loader2,
    Mail,
    Lock,
    Globe,
    Settings,
    Pencil,
    X,
    MapPin,
    Activity,
    Bell,
    Phone,
    CheckCircle2,
    XCircle,
    Clock,
    User,
    Search,
    RefreshCw,
    ChevronRight,
    ArrowLeft,
    Send
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createRestaurant, getAllRestaurants, toggleSubscription, updateRestaurant, deleteRestaurant } from "@/lib/admin-actions";
import { impersonateRestaurant, authenticateSuperAdmin, getSuperAdminSession, verifySuperAdminPin, updateAdminPin } from "@/lib/auth-actions";
import { getGlobalAnalytics } from "@/lib/analytics-actions";
import { getAllDemandes, approveDemande, rejectDemande } from "@/lib/demande-actions";
import { toast } from "sonner";
import { sendBroadcastNotification } from "@/lib/admin-broadcast";

// --- COMPOSANTS DE VISUALISATION (SVG) ---

function DonutChart({ data }: { data: { name: string, value: number }[] }) {
    const total = data.reduce((acc, curr) => acc + curr.value, 0);
    let currentOffset = 0;
    const colors = ["#818cf8", "#f472b6", "#fbbf24", "#34d399", "#a78bfa"];

    return (
        <div className="relative w-48 h-48 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 32 32">
                {data.map((item, idx) => {
                    const percentage = (item.value / total) * 100;
                    const strokeDasharray = `${percentage} ${100 - percentage}`;
                    const offset = currentOffset;
                    currentOffset += percentage;
                    return (
                        <circle
                            key={idx}
                            cx="16" cy="16" r="14"
                            fill="transparent"
                            stroke={colors[idx % colors.length]}
                            strokeWidth="4"
                            strokeDasharray={strokeDasharray}
                            strokeDashoffset={-offset}
                            className="transition-all duration-1000 ease-out hover:opacity-80 cursor-pointer"
                        />
                    );
                })}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900 rounded-full m-8 border border-zinc-800 shadow-inner">
                <span className="text-xl font-black text-white">{total}</span>
                <span className="text-[8px] font-bold text-zinc-500 uppercase">Total Items</span>
            </div>
        </div>
    );
}

function MiniBarChart({ data }: { data: { name: string, value: number }[] }) {
    const max = Math.max(...data.map(d => d.value), 1);
    return (
        <div className="flex items-end gap-2 h-32 w-full pt-4">
            {data.map((item, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2 group">
                    <div className="relative w-full flex items-end justify-center h-full">
                        <div
                            className="w-full bg-indigo-500/20 group-hover:bg-indigo-500/40 rounded-t-lg transition-all duration-700 ease-out border-b-2 border-indigo-500"
                            style={{ height: `${(item.value / max) * 100}%` }}
                        >
                            <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-zinc-800 px-2 py-0.5 rounded text-[8px] font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity">
                                {item.value}
                            </div>
                        </div>
                    </div>
                    <span className="text-[8px] font-black text-zinc-500 uppercase truncate w-full text-center">{item.name}</span>
                </div>
            ))}
        </div>
    );
}

export default function SuperAdminPage() {
    const [isLogged, setIsLogged] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [restaurants, setRestaurants] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [error, setError] = useState("");
    const [editingResto, setEditingResto] = useState<any>(null);
    const [analytics, setAnalytics] = useState<any>(null);
    const [demandes, setDemandes] = useState<any[]>([]);
    const [approvingId, setApprovingId] = useState<string | null>(null);
    const [approvePassword, setApprovePassword] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [showAll, setShowAll] = useState(false);
    const [expandedMother, setExpandedMother] = useState<string | null>(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    const [showPinStep, setShowPinStep] = useState(false);
    const [pin, setPin] = useState("");
    const [showSettings, setShowSettings] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [activeTab, setActiveTab] = useState<'dashboard' | 'restaurants' | 'demandes' | 'broadcast' | 'settings'>('dashboard');
    
    const [broadcastTitle, setBroadcastTitle] = useState("");
    const [broadcastMessage, setBroadcastMessage] = useState("");
    const [broadcastType, setBroadcastType] = useState<any>("INFO");
    const [broadcastLoading, setBroadcastLoading] = useState(false);
    const [oldPin, setOldPin] = useState("");
    const [newPin, setNewPin] = useState("");

    useEffect(() => {
        const checkSession = async () => {
            const res = await getSuperAdminSession();
            if (res.success) {
                setIsLogged(true);
                fetchRestos();
            }
        };
        checkSession();
    }, []);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        const formData = new FormData();
        formData.append("email", email);
        formData.append("password", password);
        const res = await authenticateSuperAdmin(formData);
        if (res.success && res.requiresPin) {
            setShowPinStep(true);
        } else if (res.success) {
            setIsLogged(true);
            fetchRestos();
        } else {
            setError(res.error || "Identifiants incorrects");
        }
        setLoading(false);
    };

    const handlePinSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        const res = await verifySuperAdminPin(pin);
        if (res.success) {
            setIsLogged(true);
            fetchRestos();
        } else {
            setError(res.error || "Code PIN incorrect");
        }
        setLoading(false);
    };

    const fetchRestos = async () => {
        setLoading(true);
        try {
            const data = await getAllRestaurants();
            setRestaurants(Array.isArray(data) ? data : []);
            const stats = await getGlobalAnalytics();
            if (stats.success) setAnalytics(stats);
            const demandesData = await getAllDemandes();
            setDemandes(Array.isArray(demandesData) ? demandesData : []);
        } catch (e) {
            console.error(e);
            setRestaurants([]);
        }
        setLoading(false);
    };

    const clientAction = async (formData: FormData) => {
        setIsCreating(true);
        try {
            const res = await createRestaurant(formData);
            if (res.success) {
                toast.success("🚀 Restaurant Déployé !", {
                    description: `ID: ${res.restoId} | Mot de passe: ${res.password}`,
                    duration: 10000,
                });
                setShowCreateModal(false);
                await fetchRestos();
            } else {
                toast.error("Erreur: " + res.error);
            }
        } catch (err) {
            toast.error("Erreur serveur.");
        } finally {
            setIsCreating(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (confirmDeleteId !== id) {
            setConfirmDeleteId(id);
            toast.warning("Re-cliquez pour supprimer.");
            setTimeout(() => setConfirmDeleteId(null), 5000);
            return;
        }
        setLoading(true);
        const res = await deleteRestaurant(id);
        if (res.success) {
            toast.success("Supprimé.");
            await fetchRestos();
        } else {
            toast.error(res.error || "Erreur.");
        }
        setConfirmDeleteId(null);
        setLoading(false);
    };

    const handleBroadcast = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!broadcastTitle || !broadcastMessage) {
            toast.error("Champs requis.");
            return;
        }
        setBroadcastLoading(true);
        const res = await sendBroadcastNotification({
            title: broadcastTitle,
            message: broadcastMessage,
            type: broadcastType
        });
        setBroadcastLoading(false);
        if (res.success) {
            toast.success("Broadcast envoyé !");
            setBroadcastTitle("");
            setBroadcastMessage("");
        } else {
            toast.error("Erreur.");
        }
    };

    const handleToggle = async (id: string, current: boolean) => {
        await toggleSubscription(id, !current);
        fetchRestos();
    };

    if (!isLogged) {
        return (
            <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
                <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-10 shadow-2xl">
                    <div className="flex flex-col items-center mb-8">
                        <ShieldCheck className="w-12 h-12 text-primary mb-4" />
                        <h1 className="text-2xl font-black text-white italic uppercase">SmartResto SaaS</h1>
                    </div>

                    {!showPinStep ? (
                        <form onSubmit={handleLogin} className="space-y-4">
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-zinc-800 border-zinc-700 rounded-2xl py-4 px-6 text-white outline-none"
                                placeholder="Email"
                            />
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-zinc-800 border-zinc-700 rounded-2xl py-4 px-6 text-white outline-none"
                                placeholder="Mot de passe"
                            />
                            {error && <p className="text-red-500 text-[10px] uppercase text-center">{error}</p>}
                            <button disabled={loading} className="w-full bg-primary text-black font-black py-4 rounded-2xl uppercase">
                                {loading ? "..." : "Entrer"}
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handlePinSubmit} className="space-y-6">
                            <input
                                type="text"
                                maxLength={6}
                                required
                                value={pin}
                                onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                                className="w-full bg-zinc-800 border-zinc-700 rounded-2xl py-4 text-center text-3xl font-black text-primary outline-none"
                                placeholder="••••••"
                            />
                            <button className="w-full bg-primary text-black font-black py-4 rounded-2xl uppercase">Valider</button>
                        </form>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 p-8 space-y-8">
            <div className="flex justify-between items-end gap-10">
                <div>
                    <h2 className="text-sm font-black text-zinc-500 uppercase tracking-widest italic">SaaS Command Center</h2>
                    <h1 className="text-5xl font-black italic tracking-tighter text-white">Bonjour, Arthur.</h1>
                </div>

                <nav className="flex items-center bg-zinc-900/50 p-1.5 rounded-2xl border border-zinc-800/50">
                    {[
                        { id: 'dashboard', label: 'Command', icon: <Activity className="w-4 h-4" /> },
                        { id: 'restaurants', label: 'Établissements', icon: <Building2 className="w-4 h-4" /> },
                        { id: 'demandes', label: 'Validations', icon: <Bell className="w-4 h-4" />, count: demandes.filter(d => d.statut === "EN_ATTENTE").length },
                        { id: 'broadcast', label: 'Broadcast', icon: <Globe className="w-4 h-4" /> },
                        { id: 'settings', label: 'System', icon: <Settings className="w-4 h-4" /> },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={cn(
                                "flex items-center gap-2 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                activeTab === tab.id ? "bg-primary text-black" : "text-zinc-500 hover:text-white"
                            )}
                        >
                            {tab.icon}
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            {activeTab === 'dashboard' && (
                <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-700">
                    {/* Quick Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                        {[
                            { label: 'Revenu SaaS', val: `$ ${analytics?.saasRevenue?.toFixed(2)}`, color: 'text-indigo-500' },
                            { label: 'Volume (GMV)', val: `$ ${analytics?.globalRevenue?.toFixed(2)}`, color: 'text-emerald-500' },
                            { label: 'Scans QR', val: analytics?.totalVisites || 0, color: 'text-primary' },
                            { label: 'Restaurants', val: restaurants.length, color: 'text-white' },
                        ].map((stat, i) => (
                            <div key={i} className="bg-zinc-900 border border-zinc-800 p-8 rounded-[2.5rem]">
                                <p className="text-[10px] font-black text-zinc-500 uppercase mb-1">{stat.label}</p>
                                <p className={cn("text-3xl font-black italic", stat.color)}>{stat.val}</p>
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                        {/* Graphiques Section */}
                        <div className="xl:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Donut: Plans Distribution */}
                            <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-10 flex flex-col items-center justify-center text-center">
                                <h3 className="text-sm font-black uppercase tracking-widest text-zinc-500 mb-8">Répartition des Plans</h3>
                                <DonutChart data={analytics?.planDistribution || []} />
                                <div className="grid grid-cols-2 gap-4 mt-8 w-full">
                                    {(analytics?.planDistribution || []).map((d: any, i: number) => (
                                        <div key={i} className="flex items-center gap-2 text-[10px] font-bold text-white uppercase">
                                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: ["#818cf8", "#f472b6", "#fbbf24", "#34d399", "#a78bfa"][i % 5] }} />
                                            {d.name} : <span className="text-zinc-500">{d.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Bars: City Distribution */}
                            <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-10 flex flex-col items-center justify-between">
                                <div className="w-full text-center">
                                    <h3 className="text-sm font-black uppercase tracking-widest text-zinc-500 mb-2">Expansion Géographique</h3>
                                    <p className="text-[10px] font-bold text-indigo-500 uppercase mb-8">Restaurants par Ville</p>
                                </div>
                                <MiniBarChart data={analytics?.cityDistribution || []} />
                            </div>
                        </div>

                        {/* Flux d'activité existant */}
                        <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-8 overflow-hidden">
                            <div className="flex items-center justify-between mb-8">
                                <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-indigo-500" /> Activité Récente
                                </h3>
                            </div>
                            <div className="space-y-4">
                                {analytics?.subscriptionActivity?.map((log: any) => (
                                    <div key={log.id} className="bg-zinc-950/50 p-4 rounded-2xl border border-zinc-900">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="text-[10px] font-black text-white uppercase leading-none">{log.restaurantNom}</span>
                                            <span className="text-[8px] font-bold text-zinc-600 uppercase">{new Date(log.createdAt).toLocaleDateString()}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className={cn(
                                                "text-[9px] font-black px-2 py-0.5 rounded-full uppercase",
                                                log.type === 'UPGRADE' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-zinc-800 text-zinc-400'
                                            )}>{log.type}</span>
                                            <span className="text-[10px] font-medium text-zinc-500 italic">{log.newPlan}</span>
                                        </div>
                                    </div>
                                ))}
                                {(!analytics?.subscriptionActivity || analytics.subscriptionActivity.length === 0) && (
                                     <div className="text-center py-10 opacity-50">
                                         <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Aucune activité récente</p>
                                     </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'restaurants' && (
                <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-700">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-8">
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="text-lg font-black uppercase flex items-center gap-2">
                                <Building2 className="w-5 h-5 text-primary" /> {restaurants.length} Restaurants
                            </h3>
                            <div className="flex items-center gap-4">
                                <input
                                    type="text"
                                    placeholder="Rechercher..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="bg-zinc-800 border-zinc-700 rounded-xl py-2 px-4 text-xs text-white"
                                />
                                <button onClick={() => setShowCreateModal(true)} className="bg-primary text-black p-2 rounded-xl flex items-center gap-2 text-[10px] font-black uppercase pr-4">
                                    <Plus className="w-4 h-4" /> Nouveau Restaurant
                                </button>
                            </div>
                        </div>

                        <div className="space-y-4">
                            {restaurants.filter(r => r.nom.toLowerCase().includes(searchQuery.toLowerCase())).map(r => (
                                <div key={r.id} className="bg-zinc-800/30 p-5 rounded-3xl border border-zinc-800/50 flex items-center justify-between">
                                    <div>
                                        <h4 className="font-black text-white uppercase">{r.nom}</h4>
                                        <p className="text-xs text-zinc-500">{r.email} • {r.ville} • <span className="text-primary font-bold">{r.plan}</span></p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => setEditingResto(r)} className="p-2 bg-zinc-800 rounded-xl text-zinc-400 hover:text-primary"><Pencil className="w-4 h-4" /></button>
                                        <button onClick={() => handleToggle(r.id, r.active)} className={cn("p-2 rounded-xl border", r.active ? "text-emerald-500 border-emerald-500/20" : "text-red-500 border-red-500/20")}><Power className="w-4 h-4" /></button>
                                        <button onClick={async () => {
                                            const res = await impersonateRestaurant(r.id);
                                            if (res.success) window.open(`/manager/dashboard?resto_id=${r.id}`, "_blank");
                                        }} className="p-2 bg-zinc-800 rounded-xl text-zinc-400"><ExternalLink className="w-4 h-4" /></button>
                                        <button onClick={() => handleDelete(r.id)} className="p-2 bg-zinc-800 rounded-xl text-red-500/50 hover:text-red-500"><XCircle className="w-4 h-4" /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* MODALE CREATION */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="w-full max-w-xl bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-10 relative">
                        <button onClick={() => setShowCreateModal(false)} className="absolute top-8 right-8 text-zinc-500 hover:text-white"><X /></button>
                        <h3 className="text-2xl font-black italic uppercase text-white mb-8">Déployer un Restaurant</h3>
                        <form action={clientAction} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <input name="nom" required placeholder="Nom du Restaurant" className="w-full bg-zinc-800 border-zinc-700 rounded-2xl py-4 px-6 text-white outline-none focus:ring-1 focus:ring-primary" />
                                <input name="telephone" required placeholder="Téléphone / WhatsApp" className="w-full bg-zinc-800 border-zinc-700 rounded-2xl py-4 px-6 text-white outline-none focus:ring-1 focus:ring-primary" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <input name="email" type="email" required placeholder="Email Propriétaire" className="w-full bg-zinc-800 border-zinc-700 rounded-2xl py-4 px-6 text-white outline-none focus:ring-1 focus:ring-primary" />
                                <input name="ville" required placeholder="Ville" className="w-full bg-zinc-800 border-zinc-700 rounded-2xl py-4 px-6 text-white outline-none focus:ring-1 focus:ring-primary" />
                            </div>
                            <div className="space-y-3 p-4 bg-zinc-800/50 rounded-2xl border border-zinc-700">
                                <label className="text-[10px] font-black text-zinc-500 uppercase ml-2">Logo de l'établissement</label>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <input name="logoUrl" placeholder="Lien URL du logo (optionnel)" className="w-full bg-zinc-900 border-zinc-700 rounded-xl py-3 px-4 text-xs text-white outline-none" />
                                    <input name="logoFile" type="file" accept="image/*" className="w-full bg-zinc-900 border-zinc-700 rounded-xl py-2 px-4 text-[10px] text-zinc-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-[10px] file:font-black file:bg-primary file:text-black hover:file:bg-primary/80" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <select name="plan" required className="w-full bg-zinc-800 border-zinc-700 rounded-2xl py-4 px-6 text-white outline-none">
                                    <option value="FREE">ESSAI GRATUIT (14J)</option>
                                    <option value="STANDARD">STANDARD</option>
                                    <option value="PRO">PRO (Stock)</option>
                                    <option value="PLATINUM">PLATINUM (Tout Inclus)</option>
                                </select>
                                <input name="password" type="password" required placeholder="Mot de Passe Initial" className="w-full bg-zinc-800 border-zinc-700 rounded-2xl py-4 px-6 text-white" />
                            </div>
                            <button disabled={isCreating} className="w-full bg-primary text-black font-black py-4 rounded-2xl uppercase">
                                {isCreating ? "Déploiement..." : "Lancer le Restaurant"}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* MODALE EDITION COMPLETE */}
            {editingResto && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="w-full max-w-xl bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-10 relative">
                        <button onClick={() => setEditingResto(null)} className="absolute top-8 right-8 text-zinc-500"><X /></button>
                        <h3 className="text-2xl font-black italic uppercase text-white mb-8">Paramètres Établissement</h3>
                        <form action={async (fd) => { await updateRestaurant(editingResto.id, fd); setEditingResto(null); fetchRestos(); toast.success("Mise à jour OK"); }} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-zinc-500 uppercase ml-2">Nom</label>
                                    <input name="nom" defaultValue={editingResto.nom} className="w-full bg-zinc-800 border-zinc-700 rounded-2xl py-4 px-6 text-white" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-zinc-500 uppercase ml-2">Ville</label>
                                    <input name="ville" defaultValue={editingResto.ville} className="w-full bg-zinc-800 border-zinc-700 rounded-2xl py-4 px-6 text-white" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-zinc-500 uppercase ml-2">Email</label>
                                    <input name="email" defaultValue={editingResto.email} className="w-full bg-zinc-800 border-zinc-700 rounded-2xl py-4 px-6 text-white outline-none" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-zinc-500 uppercase ml-2">Téléphone</label>
                                    <input name="telephone" defaultValue={editingResto.telephone} className="w-full bg-zinc-800 border-zinc-700 rounded-2xl py-4 px-6 text-white outline-none" />
                                </div>
                            </div>

                            <div className="space-y-3 p-4 bg-zinc-800/50 rounded-2xl border border-zinc-700">
                                <label className="text-[10px] font-black text-zinc-500 uppercase ml-2">Logo de l'établissement</label>
                                <div className="flex items-center gap-4 mb-2">
                                    <div className="w-12 h-12 bg-zinc-900 rounded-xl overflow-hidden border border-zinc-700">
                                        {editingResto.logoUrl ? <img src={editingResto.logoUrl} className="w-full h-full object-cover" /> : <Building2 className="w-full h-full p-2 text-zinc-600" />}
                                    </div>
                                    <p className="text-[9px] text-zinc-500 font-bold uppercase">Image actuelle</p>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <input name="logoUrl" defaultValue={editingResto.logoUrl} placeholder="Lien URL du logo" className="w-full bg-zinc-900 border-zinc-700 rounded-xl py-3 px-4 text-xs text-white outline-none" />
                                    <input name="logoFile" type="file" accept="image/*" className="w-full bg-zinc-900 border-zinc-700 rounded-xl py-2 px-4 text-[10px] text-zinc-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-[10px] file:font-black file:bg-primary file:text-black hover:file:bg-primary/80" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-zinc-500 uppercase ml-2">Plan</label>
                                    <select name="plan" defaultValue={editingResto.plan} className="w-full bg-zinc-800 border-zinc-700 rounded-2xl py-4 px-6 text-white outline-none">
                                        <option value="FREE">ESSAI GRATUIT (14J)</option>
                                        <option value="STANDARD">STANDARD</option>
                                        <option value="PRO">PRO (Stock)</option>
                                        <option value="PLATINUM">PLATINUM (Tout Inclus)</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-zinc-500 uppercase ml-2">Abonnement</label>
                                    <select name="active" defaultValue={editingResto.active ? "true" : "false"} className="w-full bg-zinc-800 border-zinc-700 rounded-2xl py-4 px-6 text-white outline-none">
                                        <option value="true">ACTIF</option>
                                        <option value="false">SUSPENDU</option>
                                    </select>
                                </div>
                            </div>
                            <button className="w-full bg-primary text-black font-black py-4 rounded-2xl uppercase">Sauvegarder</button>
                        </form>
                    </div>
                </div>
            )}

            {/* TAB DEMANDES, BROADCAST & SETTINGS (LOGIQUE RESTAURÉE) */}
            {activeTab === 'demandes' && (
                <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-700">
                    <h3 className="text-2xl font-black uppercase flex items-center gap-3"><Bell className="w-8 h-8 text-violet-500" /> Validations</h3>
                    <div className="space-y-4">
                        {demandes.filter(d => d.statut === "EN_ATTENTE").map(demande => (
                            <div key={demande.id} className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl flex justify-between items-center">
                                <div>
                                    <h4 className="font-black text-white uppercase">{demande.nomRestaurant}</h4>
                                    <p className="text-xs text-zinc-500">{demande.nomProprietaire} • {demande.plan} • ${demande.montant}</p>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={async () => { const p = prompt("PWD ?"); if(p) { await approveDemande(demande.id, p); fetchRestos(); }}} className="bg-emerald-600 text-white font-black px-4 py-2 rounded-xl text-[10px] uppercase">Approuver</button>
                                    <button onClick={() => rejectDemande(demande.id).then(fetchRestos)} className="bg-red-600/10 text-red-500 p-2 rounded-xl"><XCircle /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {activeTab === 'broadcast' && (
                <div className="max-w-2xl mx-auto animate-in slide-in-from-bottom-4 duration-700 bg-zinc-900 p-10 border border-zinc-800 rounded-[2.5rem]">
                    <h3 className="text-2xl font-black uppercase mb-8 flex items-center gap-3"><Globe className="w-8 h-8 text-primary" /> Broadcast Global</h3>
                    <form onSubmit={handleBroadcast} className="space-y-6">
                        <input value={broadcastTitle} onChange={e => setBroadcastTitle(e.target.value)} placeholder="Titre" className="w-full bg-zinc-800 border-zinc-700 rounded-2xl py-4 px-6 text-white" />
                        <textarea value={broadcastMessage} onChange={e => setBroadcastMessage(e.target.value)} rows={4} placeholder="Message..." className="w-full bg-zinc-800 border-zinc-700 rounded-2xl py-4 px-6 text-white resize-none" />
                        <button disabled={broadcastLoading} className="w-full bg-primary text-black font-black py-4 rounded-2xl uppercase">{broadcastLoading ? "..." : "Envoyer"}</button>
                    </form>
                </div>
            )}

            {activeTab === 'settings' && (
                <div className="max-w-2xl mx-auto animate-in slide-in-from-bottom-4 duration-700 bg-zinc-900 p-10 border border-zinc-800 rounded-[2.5rem]">
                    <h3 className="text-2xl font-black uppercase mb-8">Configuration PIN</h3>
                    <button onClick={() => setShowSettings(true)} className="w-full bg-zinc-800 p-6 rounded-3xl border border-zinc-700 text-white font-black uppercase flex justify-between items-center">
                        Changer le PIN Admin <ChevronRight />
                    </button>
                </div>
            )}

            {showSettings && (
                <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[100] flex items-center justify-center p-4">
                    <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-10 relative">
                        <button onClick={() => setShowSettings(false)} className="absolute top-8 right-8 text-zinc-500"><X /></button>
                        <h3 className="text-xl font-black uppercase text-center text-white mb-8">Sécurité</h3>
                        <div className="space-y-4">
                            <input type="password" value={oldPin} onChange={e => setOldPin(e.target.value)} className="w-full bg-zinc-800 border-zinc-700 rounded-2xl py-4 px-6 text-center text-white" placeholder="Ancien PIN" />
                            <input type="password" value={newPin} onChange={e => setNewPin(e.target.value)} className="w-full bg-zinc-800 border-zinc-700 rounded-2xl py-4 px-6 text-center text-primary" placeholder="Nouveau PIN" />
                            <button onClick={async () => { const r = await updateAdminPin(oldPin, newPin); if(r.success) { setShowSettings(false); setOldPin(""); setNewPin(""); toast.success("PIN MAJ"); }}} className="w-full bg-primary text-black font-black py-4 rounded-2xl uppercase">Confirm</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
