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
    ChevronDown,
    ArrowLeft,
    Send,
    Layers,
    ChevronUp,
    KeyRound,
    AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createRestaurant, getAllRestaurants, toggleSubscription, updateRestaurant, deleteRestaurant } from "@/lib/admin-actions";
import { impersonateRestaurant, authenticateSuperAdmin, getSuperAdminSession, verifySuperAdminPin, updateAdminPin, logoutSuperAdminGlobal } from "@/lib/auth-actions";
import { getGlobalAnalytics } from "@/lib/analytics-actions";
import { getAllDemandes, approveDemande, rejectDemande } from "@/lib/demande-actions";
import { toast } from "sonner";
import { sendBroadcastNotification } from "@/lib/admin-broadcast";
import { getAllRecoveryRequests, resolveRecoveryRequest } from "@/lib/recovery-actions";

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
    const [recoveryRequests, setRecoveryRequests] = useState<any[]>([]);
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
    const [activeTab, setActiveTab] = useState<'dashboard' | 'restaurants' | 'demandes' | 'recuperation' | 'broadcast' | 'settings'>('dashboard');

    // --- ETATS POUR MODALE PERSONNALISEE ---
    const [modalConfig, setModalConfig] = useState<{
        show: boolean;
        title: string;
        message: string;
        type: 'confirm' | 'input';
        onConfirm: (val?: string) => void;
        placeholder?: string;
    }>({ show: false, title: "", message: "", type: "confirm", onConfirm: () => {} });
    const [modalValue, setModalValue] = useState("");

    // --- ETAT POUR MODALE MOT DE PASSE D'APPROBATION ---
    const [approveModalOpen, setApproveModalOpen] = useState(false);
    const [approveModalDemande, setApproveModalDemande] = useState<any>(null);
    const [approveModalPassword, setApproveModalPassword] = useState("");
    const [approveModalShowPwd, setApproveModalShowPwd] = useState(false);
    const [approveModalLoading, setApproveModalLoading] = useState(false);
    
    const [broadcastTitle, setBroadcastTitle] = useState("");
    const [broadcastMessage, setBroadcastMessage] = useState("");
    const [broadcastType, setBroadcastType] = useState<any>("INFO");
    const [broadcastLoading, setBroadcastLoading] = useState(false);
    const [broadcastTargetType, setBroadcastTargetType] = useState<"GLOBAL" | "SPECIFIC">("GLOBAL");
    const [broadcastTargetId, setBroadcastTargetId] = useState("");
    const [oldPin, setOldPin] = useState("");
    const [newPin, setNewPin] = useState("");
    const [expandedEmails, setExpandedEmails] = useState<Set<string>>(new Set());

    // Groupement des restaurants par email pour identifier Mères & Filiales
    const groupedRestaurants = React.useMemo(() => {
        const groups: { [key: string]: { mother: any, children: any[] } } = {};
        
        // Trier par date de création pour que le premier soit toujours la mère
        const sorted = [...restaurants].sort((a, b) => 
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );

        sorted.forEach(r => {
            if (!groups[r.email]) {
                groups[r.email] = { mother: r, children: [] };
            } else {
                groups[r.email].children.push(r);
            }
        });
        return Object.values(groups);
    }, [restaurants]);

    const toggleEmailExpansion = (email: string) => {
        const next = new Set(expandedEmails);
        if (next.has(email)) next.delete(email);
        else next.add(email);
        setExpandedEmails(next);
    };

    useEffect(() => {
        const checkSession = async () => {
            const res = await getSuperAdminSession();
            if (res.success) {
                setIsLogged(true);
                fetchRestos();
            } else if (window.location.pathname.startsWith('/super-admin') && isLogged) {
                // Si on était connecté mais qu'on ne l'est plus, on force un reload complet
                window.location.href = "/";
            }
        };
        checkSession();

        // --- DETECTION RETOUR ARRIERE (BFCache) ---
        const handlePageShow = (event: PageTransitionEvent) => {
            if (event.persisted) {
                window.location.reload();
            }
        };

        window.addEventListener('pageshow', handlePageShow);
        return () => window.removeEventListener('pageshow', handlePageShow);
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
            const recoveryData = await getAllRecoveryRequests();
            setRecoveryRequests(Array.isArray(recoveryData) ? recoveryData : []);
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
        if (broadcastTargetType === "SPECIFIC" && !broadcastTargetId) {
            toast.error("Sélectionnez un restaurant cible.");
            return;
        }
        setBroadcastLoading(true);
        const res = await sendBroadcastNotification({
            title: broadcastTitle,
            message: broadcastMessage,
            type: broadcastType,
            restaurantId: broadcastTargetType === "SPECIFIC" ? broadcastTargetId : undefined
        });
        setBroadcastLoading(false);
        if (res.success) {
            toast.success(broadcastTargetType === "GLOBAL" ? "Broadcast envoyé à tous !" : "Notification ciblée envoyée !");
            setBroadcastTitle("");
            setBroadcastMessage("");
        } else {
            toast.error(res.error || "Erreur.");
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
                <div className="flex items-start gap-10">
                    <div>
                        <h2 className="text-sm font-black text-zinc-500 uppercase tracking-widest italic">SaaS Command Center</h2>
                        <h1 className="text-5xl font-black italic tracking-tighter text-white">Bonjour, Arthur.</h1>
                    </div>
                    <button 
                        onClick={() => setModalConfig({
                            show: true,
                            title: "Sécurité Plateforme",
                            message: "Voulez-vous déconnecter TOUS les accès administrateur sur tous les appareils ?",
                            type: "confirm",
                            onConfirm: async () => {
                                const r = await logoutSuperAdminGlobal();
                                if (r.success) window.location.reload();
                            }
                        })}
                        className="mt-6 flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-black transition-all font-black uppercase text-[10px] tracking-widest active:scale-95"
                    >
                        <Power className="w-4 h-4" />
                        Déconnexion Globale
                    </button>
                </div>

                <nav className="flex items-center bg-zinc-900/50 p-1.5 rounded-2xl border border-zinc-800/50">
                    {[
                        { id: 'dashboard', label: 'Command', icon: <Activity className="w-4 h-4" /> },
                        { id: 'restaurants', label: 'Établissements', icon: <Building2 className="w-4 h-4" /> },
                        { id: 'demandes', label: 'Validations', icon: <Bell className="w-4 h-4" />, count: demandes.filter(d => d.statut === "EN_ATTENTE").length },
                        { id: 'recuperation', label: 'Récupération', icon: <KeyRound className="w-4 h-4" />, count: recoveryRequests.filter(r => r.statut === "EN_ATTENTE").length },
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

                        <div className="space-y-6">
                            {groupedRestaurants
                                .filter(group => 
                                    group.mother.nom.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                    group.children.some(c => c.nom.toLowerCase().includes(searchQuery.toLowerCase()))
                                )
                                .map(group => (
                                <div key={group.mother.id} className="space-y-2">
                                    {/* LIGNE MÈRE */}
                                    <div className="bg-zinc-800/40 p-5 rounded-3xl border border-zinc-700/50 flex items-center justify-between hover:bg-zinc-800/60 transition-all">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center border border-primary/20">
                                                <Building2 className="w-6 h-6 text-primary" />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h4 className="font-black text-white uppercase">{group.mother.nom}</h4>
                                                    <span className="text-[8px] font-black bg-primary/10 text-primary px-2 py-0.5 rounded-full uppercase tracking-tighter">Établissement Mère</span>
                                                </div>
                                                <p className="text-xs text-zinc-500">{group.mother.email} • {group.mother.ville} • <span className="text-primary font-bold">{group.mother.plan}</span></p>
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center gap-3">
                                            {group.children.length > 0 && (
                                                <button 
                                                    onClick={() => toggleEmailExpansion(group.mother.email)}
                                                    className={cn(
                                                        "flex items-center gap-2 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border",
                                                        expandedEmails.has(group.mother.email) 
                                                            ? "bg-zinc-700 border-zinc-600 text-white" 
                                                            : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-white"
                                                    )}
                                                >
                                                    <Layers className="w-3 h-3" />
                                                    {expandedEmails.has(group.mother.email) ? "Masquer Filiales" : `Filiales (${group.children.length})`}
                                                    {expandedEmails.has(group.mother.email) ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                                </button>
                                            )}
                                            <div className="w-px h-8 bg-zinc-800 mx-2" />
                                            <div className="flex items-center gap-1.5">
                                                <button onClick={() => setEditingResto(group.mother)} className="p-2.5 bg-zinc-900 rounded-xl text-zinc-400 hover:text-primary border border-zinc-800 hover:border-primary/20 transition-all" title="Éditer"><Pencil className="w-4 h-4" /></button>
                                                <button onClick={() => handleToggle(group.mother.id, group.mother.active)} className={cn("p-2.5 rounded-xl border transition-all", group.mother.active ? "text-emerald-500 border-emerald-500/20 bg-emerald-500/5" : "text-red-500 border-red-500/20 bg-red-500/5")} title={group.mother.active ? "Suspendre" : "Activer"}><Power className="w-4 h-4" /></button>
                                                <button onClick={async () => {
                                                    const res = await impersonateRestaurant(group.mother.id);
                                                    if (res.success) window.open(`/manager/dashboard?resto_id=${group.mother.id}`, "_blank");
                                                }} className="p-2.5 bg-zinc-900 rounded-xl text-zinc-400 border border-zinc-800 hover:text-white transition-all" title="Accéder au dashboard"><ExternalLink className="w-4 h-4" /></button>
                                                <button onClick={() => handleDelete(group.mother.id)} className="p-2.5 bg-zinc-900 rounded-xl text-red-500/30 hover:text-red-500 border border-zinc-800 hover:border-red-500/20 transition-all" title="Supprimer"><XCircle className="w-4 h-4" /></button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* LISTE DES FILIALES (EXPANDABLE) */}
                                    {expandedEmails.has(group.mother.email) && (
                                        <div className="ml-12 space-y-2 border-l-2 border-zinc-800 pl-6 py-2 animate-in slide-in-from-top-2 duration-300">
                                            {group.children.map(child => (
                                                <div key={child.id} className="bg-zinc-900/40 p-4 rounded-2xl border border-white/[0.02] flex items-center justify-between hover:bg-zinc-900/60">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 bg-zinc-800 rounded-lg flex items-center justify-center border border-zinc-700/50">
                                                            <Building2 className="w-4 h-4 text-zinc-500" />
                                                        </div>
                                                        <div>
                                                            <h5 className="text-[11px] font-black text-zinc-300 uppercase">{child.nom}</h5>
                                                            <p className="text-[9px] text-zinc-500">Filiale • {child.ville} • UID: {child.id.substring(0,8)}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 scale-90 origin-right">
                                                        <button onClick={() => setEditingResto(child)} className="p-2 bg-zinc-800 rounded-lg text-zinc-500 hover:text-primary"><Pencil className="w-3.5 h-3.5" /></button>
                                                        <button onClick={() => handleToggle(child.id, child.active)} className={cn("p-2 rounded-lg border", child.active ? "text-emerald-500 border-emerald-500/10" : "text-red-500 border-red-500/10")}><Power className="w-3.5 h-3.5" /></button>
                                                        <button onClick={async () => {
                                                            const res = await impersonateRestaurant(child.id);
                                                            if (res.success) window.open(`/manager/dashboard?resto_id=${child.id}`, "_blank");
                                                        }} className="p-2 bg-zinc-800 rounded-lg text-zinc-500"><ExternalLink className="w-3.5 h-3.5" /></button>
                                                        <button onClick={() => handleDelete(child.id)} className="p-2 bg-zinc-800 rounded-lg text-red-500/30 hover:text-red-500"><XCircle className="w-3.5 h-3.5" /></button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
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
                                <input name="adminPassword" type="password" required placeholder="Mot de Passe Initial" className="w-full bg-zinc-800 border-zinc-700 rounded-2xl py-4 px-6 text-white" />
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

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-zinc-500 uppercase ml-2">Nouveau Mot de Passe (Optionnel)</label>
                                    <input name="newPassword" type="password" placeholder="Laisser vide pour ne pas changer" className="w-full bg-zinc-800 border-zinc-700 rounded-2xl py-4 px-6 text-white outline-none" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-zinc-500 uppercase ml-2">Nouveau Code PIN (Optionnel)</label>
                                    <input name="pinCode" placeholder="6 chiffres" className="w-full bg-zinc-800 border-zinc-700 rounded-2xl py-4 px-6 text-white outline-none" />
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
                                    <button onClick={() => { 
                                        const isMainExist = restaurants.some(r => r.email === demande.email);
                                        const isSameResto = restaurants.some(r => r.email === demande.email && r.nom.toLowerCase() === demande.nomRestaurant.toLowerCase());
                                        
                                        if (!isMainExist && !isSameResto) {
                                            // Nouveau compte : ouvrir la modale premium
                                            setApproveModalDemande(demande);
                                            setApproveModalPassword("");
                                            setApproveModalOpen(true);
                                        } else {
                                            // Renouvellement : approuver directement sans mot de passe
                                            setApprovingId(demande.id);
                                            approveDemande(demande.id, "").then(res => {
                                                if (res.success) {
                                                    toast.success(res.isUpdate ? "Abonnement renouvelé !" : "Établissement créé !");
                                                    fetchRestos();
                                                } else {
                                                    toast.error(res.error);
                                                }
                                            }).finally(() => setApprovingId(null));
                                        }
                                    }} 
                                    disabled={approvingId === demande.id}
                                    className="bg-emerald-600 text-white font-black px-4 py-2 rounded-xl text-[10px] uppercase flex items-center gap-2"
                                    >
                                        {approvingId === demande.id ? <Loader2 className="w-3 h-3 animate-spin" /> : "Approuver"}
                                    </button>
                                    <button onClick={() => rejectDemande(demande.id).then(fetchRestos)} className="bg-red-600/10 text-red-500 p-2 rounded-xl"><XCircle /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {activeTab === 'recuperation' && (
                <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-700">
                    <h3 className="text-2xl font-black uppercase flex items-center gap-3"><KeyRound className="w-8 h-8 text-amber-500" /> Récupération de Mots de Passe</h3>
                    <div className="space-y-4">
                        {recoveryRequests.length === 0 ? (
                            <div className="bg-zinc-900 border border-zinc-800 p-10 rounded-3xl text-center">
                                <p className="text-zinc-500 font-bold uppercase text-xs">Aucune demande en attente</p>
                            </div>
                        ) : (
                            recoveryRequests.map(request => (
                                <div key={request.id} className={cn(
                                    "bg-zinc-900 border p-6 rounded-3xl flex justify-between items-center transition-all",
                                    request.statut === "EN_ATTENTE" ? "border-zinc-800" : "border-zinc-800/30 opacity-60"
                                )}>
                                    <div className="flex items-center gap-4">
                                        <div className={cn(
                                            "w-12 h-12 rounded-2xl flex items-center justify-center border",
                                            request.statut === "EN_ATTENTE" ? "bg-amber-500/10 border-amber-500/20 text-amber-500" : "bg-zinc-800 border-zinc-700 text-zinc-500"
                                        )}>
                                            <Phone className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h4 className="font-black text-white uppercase">{request.nomRestaurant}</h4>
                                            <p className="text-xs text-zinc-500">
                                                {request.email} • {request.telephone}
                                            </p>
                                            <p className="text-[9px] text-zinc-600 mt-1 uppercase font-bold tracking-widest">Reçu le {new Date(request.createdAt).toLocaleDateString('fr-FR')}</p>
                                        </div>
                                    </div>

                                    {request.statut === "EN_ATTENTE" ? (
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={() => setModalConfig({
                                                    show: true,
                                                    title: "Récupération Accès",
                                                    message: `Définir un nouveau mot de passe pour ${request.nomRestaurant}.`,
                                                    type: "input",
                                                    placeholder: "Nouveau mot de passe",
                                                    onConfirm: async (val) => {
                                                        if (!val || val.length < 4) return;
                                                        setApprovingId(request.id);
                                                        const res = await resolveRecoveryRequest(request.id, val, "APPROVE");
                                                        if (res.success) {
                                                            toast.success(res.message);
                                                            fetchRestos();
                                                        } else {
                                                            toast.error(res.error);
                                                        }
                                                        setApprovingId(null);
                                                    }
                                                })}
                                                disabled={approvingId === request.id}
                                                className="bg-primary text-black font-black px-6 py-2.5 rounded-xl text-[10px] uppercase flex items-center gap-2 hover:scale-105 transition-all"
                                            >
                                                {approvingId === request.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShieldCheck className="w-3 h-3" />}
                                                Réinitialiser
                                            </button>
                                            <button 
                                                onClick={() => setModalConfig({
                                                    show: true,
                                                    title: "Rejet Demande",
                                                    message: "Êtes-vous certain de vouloir rejeter cette demande de récupération ?",
                                                    type: "confirm",
                                                    onConfirm: async () => {
                                                        const res = await resolveRecoveryRequest(request.id, undefined, "REJECT");
                                                        if (res.success) {
                                                            toast.success(res.message);
                                                            fetchRestos();
                                                        }
                                                    }
                                                })}
                                                className="bg-red-600/10 text-red-500 p-2.5 rounded-xl border border-red-600/10 hover:bg-red-600 hover:text-white transition-all"
                                            >
                                                <XCircle className="w-5 h-5" />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
                                            <CheckCircle2 className={cn("w-4 h-4", request.statut === "TRAITE" ? "text-emerald-500" : "text-red-500")} />
                                            <span className="text-[10px] font-black uppercase text-zinc-400">{request.statut}</span>
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'broadcast' && (
                <div className="max-w-2xl mx-auto animate-in slide-in-from-bottom-4 duration-700 bg-zinc-900 p-10 border border-zinc-800 rounded-[2.5rem]">
                    <h3 className="text-2xl font-black uppercase mb-8 flex items-center gap-3">
                        <Globe className="w-8 h-8 text-primary" /> 
                        {broadcastTargetType === "GLOBAL" ? "Broadcast Global" : "Message Personnel"}
                    </h3>
                    <form onSubmit={handleBroadcast} className="space-y-6">
                        <div className="flex gap-4">
                            <button
                                type="button"
                                onClick={() => setBroadcastTargetType("GLOBAL")}
                                className={cn(
                                    "flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all",
                                    broadcastTargetType === "GLOBAL" ? "bg-primary/20 text-primary border-primary" : "bg-zinc-800/50 text-zinc-500 border-zinc-700"
                                )}
                            >
                                Tous les Établissements
                            </button>
                            <button
                                type="button"
                                onClick={() => setBroadcastTargetType("SPECIFIC")}
                                className={cn(
                                    "flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all",
                                    broadcastTargetType === "SPECIFIC" ? "bg-violet-500/20 text-violet-400 border-violet-500" : "bg-zinc-800/50 text-zinc-500 border-zinc-700"
                                )}
                            >
                                Établissement Spécifique
                            </button>
                        </div>

                        {broadcastTargetType === "SPECIFIC" && (
                            <select
                                value={broadcastTargetId}
                                onChange={(e) => setBroadcastTargetId(e.target.value)}
                                className="w-full bg-zinc-800 border-zinc-700 rounded-2xl py-4 px-6 text-white outline-none"
                            >
                                <option value="">-- Sélectionnez un restaurant --</option>
                                {restaurants.map(r => (
                                    <option key={r.id} value={r.id}>{r.nom} ({r.ville})</option>
                                ))}
                            </select>
                        )}

                        <input value={broadcastTitle} onChange={e => setBroadcastTitle(e.target.value)} placeholder="Titre" className="w-full bg-zinc-800 border-zinc-700 rounded-2xl py-4 px-6 text-white outline-none focus:ring-1 focus:ring-primary" />
                        <textarea value={broadcastMessage} onChange={e => setBroadcastMessage(e.target.value)} rows={4} placeholder="Message..." className="w-full bg-zinc-800 border-zinc-700 rounded-2xl py-4 px-6 text-white resize-none outline-none focus:ring-1 focus:ring-primary" />
                        
                        <div className="grid grid-cols-2 gap-4">
                             <select
                                value={broadcastType}
                                onChange={(e) => setBroadcastType(e.target.value)}
                                className="w-full bg-zinc-800 border-zinc-700 rounded-2xl py-4 px-6 text-white outline-none"
                            >
                                <option value="INFO">INFORMATION</option>
                                <option value="WARNING">AVERTISSEMENT</option>
                                <option value="SUCCESS">SUCCÈS</option>
                                <option value="URGENT">URGENT</option>
                            </select>
                            <button disabled={broadcastLoading} className="w-full bg-primary text-black font-black py-4 rounded-2xl uppercase">
                                {broadcastLoading ? "..." : "Envoyer"}
                            </button>
                        </div>
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
            {/* --- MODALE D'ACTION PERSONNALISÉE --- */}
            {modalConfig.show && (
                <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[200] flex items-center justify-center p-4 transition-all duration-300">
                    <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-10 shadow-2xl shadow-primary/5 animate-in zoom-in-95 duration-200">
                        <div className="flex flex-col items-center text-center">
                            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-6">
                                {modalConfig.type === 'confirm' ? <AlertCircle className="w-8 h-8 text-primary" /> : <KeyRound className="w-8 h-8 text-primary" />}
                            </div>
                            <h3 className="text-xl font-black italic uppercase text-white mb-2">{modalConfig.title}</h3>
                            <p className="text-zinc-500 text-sm font-medium mb-8 leading-relaxed px-2">{modalConfig.message}</p>
                            
                            {modalConfig.type === 'input' && (
                                <input 
                                    autoFocus
                                    type="text"
                                    value={modalValue}
                                    onChange={(e) => setModalValue(e.target.value)}
                                    placeholder={modalConfig.placeholder}
                                    className="w-full bg-zinc-800 border-zinc-700 rounded-2xl py-4 px-6 text-center text-white mb-8 outline-none focus:ring-1 focus:ring-primary transition-all font-bold"
                                />
                            )}

                            <div className="flex gap-3 w-full">
                                <button 
                                    onClick={() => { setModalConfig({ ...modalConfig, show: false }); setModalValue(""); }}
                                    className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 font-black py-4 rounded-2xl uppercase text-[10px] tracking-widest transition-all"
                                >
                                    Annuler
                                </button>
                                <button 
                                    onClick={() => {
                                        modalConfig.onConfirm(modalConfig.type === 'input' ? modalValue : undefined);
                                        setModalConfig({ ...modalConfig, show: false });
                                        setModalValue("");
                                    }}
                                    className="flex-1 bg-primary hover:bg-primary/90 text-black font-black py-4 rounded-2xl uppercase text-[10px] tracking-widest transition-all shadow-lg shadow-primary/10"
                                >
                                    Confirmer
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* =====================================================
                MODALE PREMIUM : DÉFINIR MOT DE PASSE (APPROBATION)
            ===================================================== */}
            {approveModalOpen && approveModalDemande && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[600] flex items-center justify-center p-4">
                    <div className="w-full max-w-md bg-zinc-900 border border-zinc-700 rounded-[2.5rem] p-10 shadow-2xl shadow-primary/10 animate-in zoom-in-95 duration-300">
                        <div className="flex flex-col items-center text-center">
                            {/* Icone animée */}
                            <div className="relative mb-8">
                                <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl animate-pulse" />
                                <div className="relative w-20 h-20 bg-primary/10 border border-primary/30 rounded-full flex items-center justify-center">
                                    <Lock className="w-10 h-10 text-primary" />
                                </div>
                            </div>

                            <h3 className="text-2xl font-black italic uppercase text-white mb-1">Nouveau Compte</h3>
                            <p className="text-zinc-400 text-sm font-medium mb-1">
                                <span className="font-black text-white">{approveModalDemande.nomRestaurant}</span>
                            </p>
                            <p className="text-zinc-500 text-xs mb-8">Définissez le mot de passe initial de cet établissement.</p>

                            {/* Input mot de passe */}
                            <div className="w-full relative mb-6">
                                <input
                                    autoFocus
                                    type={approveModalShowPwd ? "text" : "password"}
                                    value={approveModalPassword}
                                    onChange={(e) => setApproveModalPassword(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && approveModalPassword.trim().length >= 6) {
                                            document.getElementById('approve-confirm-btn')?.click();
                                        }
                                    }}
                                    placeholder="Mot de passe (min. 6 caractères)"
                                    className="w-full bg-zinc-800 border border-zinc-700 focus:border-primary rounded-2xl py-4 pl-6 pr-14 text-white font-bold outline-none focus:ring-2 focus:ring-primary/30 transition-all placeholder:text-zinc-600 placeholder:font-normal"
                                />
                                <button
                                    type="button"
                                    onClick={() => setApproveModalShowPwd(!approveModalShowPwd)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-primary transition-colors"
                                >
                                    {approveModalShowPwd ? (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                                    )}
                                </button>
                            </div>

                            {/* Indicateur de sécurité */}
                            {approveModalPassword.length > 0 && approveModalPassword.length < 6 && (
                                <p className="text-xs text-red-400 font-bold mb-4 w-full text-left pl-1">⚠ Minimum 6 caractères requis.</p>
                            )}

                            {/* Boutons */}
                            <div className="flex gap-3 w-full mt-2">
                                <button
                                    onClick={() => { setApproveModalOpen(false); setApproveModalDemande(null); setApproveModalPassword(""); }}
                                    className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 font-black py-4 rounded-2xl uppercase text-[10px] tracking-widest transition-all"
                                >
                                    Annuler
                                </button>
                                <button
                                    id="approve-confirm-btn"
                                    disabled={approveModalPassword.trim().length < 6 || approveModalLoading}
                                    onClick={async () => {
                                        if (approveModalPassword.trim().length < 6) return;
                                        setApproveModalLoading(true);
                                        setApprovingId(approveModalDemande.id);
                                        try {
                                            const res = await approveDemande(approveModalDemande.id, approveModalPassword.trim());
                                            if (res.success) {
                                                toast.success("Établissement créé avec succès !");
                                                setApproveModalOpen(false);
                                                setApproveModalDemande(null);
                                                setApproveModalPassword("");
                                                fetchRestos();
                                            } else {
                                                toast.error(res.error || "Erreur lors de la création.");
                                            }
                                        } finally {
                                            setApproveModalLoading(false);
                                            setApprovingId(null);
                                        }
                                    }}
                                    className="flex-1 bg-primary hover:bg-primary/90 text-black font-black py-4 rounded-2xl uppercase text-[10px] tracking-widest transition-all shadow-lg shadow-primary/20 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {approveModalLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                                    {approveModalLoading ? "Création..." : "Approuver"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
