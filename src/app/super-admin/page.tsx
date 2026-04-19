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

    const handleDelete = async (id: string) => {
        if (confirmDeleteId !== id) {
            setConfirmDeleteId(id);
            toast.warning("Re-cliquez pour confirmer la suppression.");
            setTimeout(() => setConfirmDeleteId(null), 5000);
            return;
        }
        setLoading(true);
        const res = await deleteRestaurant(id);
        if (res.success) {
            toast.success("Établissement supprimé.");
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
            toast.error("Veuillez remplir tous les champs.");
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
            toast.success(`Broadcast envoyé à ${res.count} restaurants !`);
            setBroadcastTitle("");
            setBroadcastMessage("");
        } else {
            toast.error(res.error || "Erreur d'envoi.");
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
                        <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-primary/20">
                            <ShieldCheck className="w-8 h-8 text-black" />
                        </div>
                        <h1 className="text-2xl font-black text-white italic uppercase tracking-tighter">SmartResto SaaS</h1>
                        <p className="text-zinc-500 text-xs font-bold uppercase">Propriétaire Plateforme</p>
                    </div>

                    {!showPinStep ? (
                        <form onSubmit={handleLogin} className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-zinc-500 uppercase ml-4">Email Admin</label>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full bg-zinc-800 border-zinc-700 rounded-2xl py-4 pl-12 text-sm text-white focus:ring-2 focus:ring-primary transition-all outline-none"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-zinc-500 uppercase ml-4">Mot de passe</label>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                                    <input
                                        type="password"
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full bg-zinc-800 border-zinc-700 rounded-2xl py-4 pl-12 text-sm text-white focus:ring-2 focus:ring-primary transition-all outline-none"
                                    />
                                </div>
                            </div>
                            {error && <p className="text-red-500 text-[10px] font-bold text-center uppercase">{error}</p>}
                            <button disabled={loading} className="w-full bg-primary hover:bg-primary/90 text-black font-black py-4 rounded-2xl uppercase tracking-widest text-xs">
                                {loading ? "Connexion..." : "Entrer dans la Forge"}
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handlePinSubmit} className="space-y-6">
                            <div className="text-center space-y-2">
                                <p className="text-xs text-zinc-400 font-medium">Double Authentification</p>
                                <div className="flex justify-center">
                                    <input
                                        type="text"
                                        maxLength={6}
                                        required
                                        autoFocus
                                        value={pin}
                                        onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                                        className="w-48 bg-zinc-800 border-2 border-zinc-700 rounded-2xl py-4 text-center text-3xl font-black tracking-[0.5em] text-primary transition-all outline-none"
                                    />
                                </div>
                            </div>
                            <button disabled={loading || pin.length !== 6} className="w-full bg-primary hover:bg-primary/90 text-black font-black py-4 rounded-2xl uppercase tracking-widest text-xs">
                                Valider l'Accès
                            </button>
                        </form>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 p-8 space-y-8">
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-10">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <div className="w-8 h-8 bg-zinc-900 rounded-lg flex items-center justify-center border border-zinc-800">
                            <ShieldCheck className="w-4 h-4 text-primary" />
                        </div>
                        <h2 className="text-sm font-black text-zinc-500 uppercase tracking-widest italic">SaaS Command Center</h2>
                    </div>
                    <h1 className="text-5xl font-black italic tracking-tighter text-white">Bonjour, Arthur.</h1>
                </div>

                <nav className="flex items-center bg-zinc-900/50 p-1.5 rounded-2xl border border-zinc-800/50">
                    {[
                        { id: 'dashboard', label: 'Command Center', icon: <Activity className="w-4 h-4" /> },
                        { id: 'restaurants', label: 'Restaurants', icon: <Building2 className="w-4 h-4" /> },
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
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                        {[
                            { label: 'Revenu SaaS Mensuel', val: `$ ${analytics?.saasRevenue?.toFixed(2)}`, color: 'text-indigo-500', icon: <Building2 className="w-5 h-5" /> },
                            { label: 'Volume d\'Affaires (GMV)', val: `$ ${analytics?.globalRevenue?.toFixed(2)}`, color: 'text-emerald-500', icon: <DollarSign className="w-5 h-5" /> },
                            { label: 'Scans QR Totaux', val: analytics?.totalVisites || 0, color: 'text-primary', icon: <Activity className="w-5 h-5" /> },
                            { label: 'Inscriptions', val: restaurants.length, color: 'text-white', icon: <Users className="w-5 h-5" /> },
                        ].map((stat, i) => (
                            <div key={i} className="bg-zinc-900 border border-zinc-800 p-8 rounded-[2.5rem] group">
                                <p className="text-[10px] font-black text-zinc-500 uppercase mb-1">{stat.label}</p>
                                <p className={cn("text-3xl font-black italic mb-4", stat.color)}>{stat.val}</p>
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                        <div className="xl:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-10 flex flex-col items-center">
                                <h3 className="text-sm font-black uppercase text-zinc-500 mb-8">Répartition des Plans</h3>
                                <DonutChart data={analytics?.planDistribution || []} />
                            </div>
                            <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-10 flex flex-col items-center">
                                <h3 className="text-sm font-black uppercase text-zinc-500 mb-8">Expansion Géographique</h3>
                                <MiniBarChart data={analytics?.cityDistribution || []} />
                            </div>
                        </div>
                        <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-8">
                            <h3 className="text-sm font-black uppercase mb-8 flex items-center gap-2">
                                <Clock className="w-4 h-4 text-indigo-500" /> Activité Récente
                            </h3>
                            <div className="space-y-4">
                                {analytics?.subscriptionActivity?.map((log: any) => (
                                    <div key={log.id} className="bg-zinc-950/50 p-4 rounded-2xl border border-zinc-900">
                                        <p className="text-[10px] font-black text-white uppercase">{log.restaurantNom}</p>
                                        <p className="text-[9px] text-zinc-500">{log.type} - {log.newPlan}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'restaurants' && (
                <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-700">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-8">
                        <div className="flex justify-between mb-8">
                            <h3 className="text-lg font-black uppercase flex items-center gap-2">
                                <Building2 className="w-5 h-5 text-primary" /> Établissements ({restaurants.length})
                            </h3>
                            <div className="flex items-center gap-3">
                                <input
                                    type="text"
                                    placeholder="Rechercher..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="bg-zinc-800 border-zinc-700 rounded-xl py-2 px-4 text-xs text-white"
                                />
                                <button onClick={fetchRestos} className="p-2 bg-zinc-800 rounded-xl"><RefreshCw className="w-4 h-4" /></button>
                            </div>
                        </div>
                        <div className="space-y-4">
                            {restaurants.filter(r => r.nom.toLowerCase().includes(searchQuery.toLowerCase())).map(resto => (
                                <div key={resto.id} className="bg-zinc-800/30 p-5 rounded-3xl border border-zinc-800/50 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-zinc-700 rounded-2xl flex items-center justify-center border border-zinc-600">
                                            {resto.logoUrl ? <img src={resto.logoUrl} className="w-full h-full object-cover rounded-2xl" /> : <Building2 className="w-6 h-6 text-zinc-500" />}
                                        </div>
                                        <div>
                                            <h4 className="font-black text-white uppercase">{resto.nom}</h4>
                                            <p className="text-xs text-zinc-500">{resto.email} • {resto.plan}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => setEditingResto(resto)} className="p-2 bg-zinc-800 rounded-xl text-zinc-400 hover:text-primary"><Pencil className="w-4 h-4" /></button>
                                        <button onClick={() => handleToggle(resto.id, resto.active)} className={cn("p-2 rounded-xl border", resto.active ? "text-emerald-500 border-emerald-500/20" : "text-red-500 border-red-500/20")}><Power className="w-4 h-4" /></button>
                                        <button 
                                            onClick={async () => {
                                                const res = await impersonateRestaurant(resto.id);
                                                if (res.success) window.open(`/manager/dashboard?resto_id=${resto.id}`, "_blank");
                                            }}
                                            className="p-2 bg-zinc-800 rounded-xl text-zinc-400"
                                        >
                                            <ExternalLink className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => handleDelete(resto.id)} className="p-2 bg-zinc-800 rounded-xl text-red-500/50 hover:text-red-500"><XCircle className="w-4 h-4" /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'demandes' && (
                <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-700">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-10">
                        <h3 className="text-2xl font-black uppercase mb-10 flex items-center gap-3"><Bell className="w-8 h-8 text-violet-500" /> Validations En Attente</h3>
                        <div className="space-y-4">
                            {demandes.filter(d => d.statut === "EN_ATTENTE").map(demande => (
                                <div key={demande.id} className="bg-zinc-950/50 p-6 rounded-3xl border border-zinc-800">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <h4 className="text-lg font-black text-white uppercase">{demande.nomRestaurant}</h4>
                                            <p className="text-[10px] text-zinc-500 uppercase font-bold">{demande.plan} • ${demande.montant}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button 
                                                onClick={async () => {
                                                    const pwd = prompt("Mot de passe gérant ?");
                                                    if(pwd) { await approveDemande(demande.id, pwd); fetchRestos(); }
                                                }}
                                                className="bg-emerald-600 text-white font-black px-6 py-3 rounded-2xl text-[10px] uppercase"
                                            >
                                                Approuver
                                            </button>
                                            <button onClick={() => rejectDemande(demande.id).then(fetchRestos)} className="bg-zinc-800 text-red-500 p-3 rounded-2xl"><XCircle className="w-5 h-5" /></button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'broadcast' && (
                <div className="max-w-2xl mx-auto animate-in slide-in-from-bottom-4 duration-700">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-10">
                        <h3 className="text-2xl font-black uppercase mb-8 flex items-center gap-3"><Globe className="w-8 h-8 text-primary" /> Broadcast Global</h3>
                        <form onSubmit={handleBroadcast} className="space-y-6">
                            <input
                                type="text"
                                value={broadcastTitle}
                                onChange={(e) => setBroadcastTitle(e.target.value)}
                                className="w-full bg-zinc-800 border-zinc-700 rounded-2xl py-4 px-6 text-white outline-none focus:ring-2 focus:ring-primary"
                                placeholder="Titre de la notification"
                            />
                            <textarea
                                value={broadcastMessage}
                                onChange={(e) => setBroadcastMessage(e.target.value)}
                                rows={4}
                                className="w-full bg-zinc-800 border-zinc-700 rounded-2xl py-4 px-6 text-white outline-none focus:ring-2 focus:ring-primary resize-none"
                                placeholder="Message aux managers..."
                            />
                            <button disabled={broadcastLoading} className="w-full bg-primary text-black font-black py-4 rounded-2xl uppercase tracking-widest text-xs">
                                {broadcastLoading ? "Envoi..." : "Déployer le Broadcast"}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {activeTab === 'settings' && (
                <div className="max-w-2xl mx-auto animate-in slide-in-from-bottom-4 duration-700">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-10">
                        <h3 className="text-xl font-black uppercase mb-8 flex items-center gap-3"><Settings className="w-7 h-7 text-zinc-500" /> Configuration Système</h3>
                        <button 
                            onClick={() => setShowSettings(true)}
                            className="w-full bg-zinc-800/50 p-6 rounded-3xl border border-zinc-700 flex justify-between items-center group"
                        >
                            <span className="font-black text-white uppercase">Modifier le Code PIN d'accès</span>
                            <ChevronRight className="w-5 h-5 text-zinc-600 group-hover:text-primary" />
                        </button>
                    </div>
                </div>
            )}

            {editingResto && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-10 relative">
                        <button onClick={() => setEditingResto(null)} className="absolute top-8 right-8 text-zinc-500"><X /></button>
                        <h3 className="text-2xl font-black italic uppercase text-white mb-8">Editer Restaurant</h3>
                        <form action={async (fd) => { await updateRestaurant(editingResto.id, fd); setEditingResto(null); fetchRestos(); }} className="space-y-4">
                            <input name="nom" defaultValue={editingResto.nom} className="w-full bg-zinc-800 border-zinc-700 rounded-2xl py-4 px-6 text-white" />
                            <input name="email" defaultValue={editingResto.email} className="w-full bg-zinc-800 border-zinc-700 rounded-2xl py-4 px-6 text-white" />
                            <button className="w-full bg-primary text-black font-black py-4 rounded-2xl uppercase text-xs">Enregistrer</button>
                        </form>
                    </div>
                </div>
            )}

            {showSettings && (
                <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[100] flex items-center justify-center p-4">
                    <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-10 relative">
                        <button onClick={() => setShowSettings(false)} className="absolute top-8 right-8 text-zinc-500"><X /></button>
                        <h3 className="text-xl font-black uppercase text-center text-white mb-8">Nouveau Code PIN</h3>
                        <div className="space-y-6">
                            <input type="password" value={oldPin} onChange={e => setOldPin(e.target.value)} className="w-full bg-zinc-800 border-zinc-700 rounded-2xl py-4 text-center text-xl text-white" placeholder="Ancien PIN" />
                            <input type="password" value={newPin} onChange={e => setNewPin(e.target.value)} className="w-full bg-zinc-800 border-zinc-700 rounded-2xl py-4 text-center text-xl text-primary" placeholder="Nouveau PIN" />
                            <div className="flex gap-3">
                                <button onClick={() => setShowSettings(false)} className="flex-1 bg-zinc-800 text-zinc-400 py-4 rounded-2xl font-black uppercase text-xs">Annuler</button>
                                <button 
                                    onClick={async () => {
                                        const res = await updateAdminPin(oldPin, newPin);
                                        if(res.success) { setShowSettings(false); setOldPin(""); setNewPin(""); toast.success("PIN Modifié"); }
                                    }}
                                    className="flex-1 bg-primary text-black py-4 rounded-2xl font-black uppercase text-xs"
                                >
                                    Actualiser
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
