"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { MessageCircle, Search, Gift, ShoppingBag, Loader2, Send } from "lucide-react";
import { getMarketingContacts, MarketingContact } from "@/lib/actions-marketing";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";

export default function MarketingWhatPage() {
    const searchParams = useSearchParams();
    const restoId = searchParams.get("resto_id");
    const [contacts, setContacts] = useState<MarketingContact[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [message, setMessage] = useState("Bonjour ! Découvrez nos nouvelles spécialités du jour. Passez commande dès maintenant !");

    useEffect(() => {
        if (!restoId) return;
        
        async function fetchContacts() {
            setLoading(true);
            const res = await getMarketingContacts(restoId as string);
            if (res.success && res.contacts) {
                setContacts(res.contacts);
            } else {
                toast.error("Erreur lors du chargement des contacts.");
            }
            setLoading(false);
        }
        
        fetchContacts();
    }, [restoId]);

    const filteredContacts = contacts.filter(c => 
        (c.name?.toLowerCase() || "").includes(searchQuery.toLowerCase()) || 
        c.phone.includes(searchQuery)
    );

    const handleSendMessage = (phone: string) => {
        if (!message.trim()) {
            toast.error("Veuillez saisir un message à envoyer.");
            return;
        }
        const text = encodeURIComponent(message);
        const url = `https://wa.me/${phone}?text=${text}`;
        window.open(url, "_blank");
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-20 opacity-50">
                <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
                <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">Chargement des contacts...</p>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-black italic uppercase text-foreground flex items-center gap-2">
                        <MessageCircle className="w-6 h-6 text-primary" />
                        Marketin-WhatsApp
                    </h1>
                    <p className="text-muted-foreground text-sm font-medium">Communiquez avec vos clients par WhatsApp.</p>
                </div>
            </div>

            {/* Zone de Message */}
            <div className="bg-card border border-border p-6 rounded-2xl shadow-sm">
                <label className="block text-sm font-black uppercase text-foreground mb-2">Message à envoyer</label>
                <textarea 
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={3}
                    placeholder="Saisissez votre message marketing ou annonce ici..."
                    className="w-full bg-background border border-border rounded-xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-medium"
                />
                <p className="text-xs text-muted-foreground mt-2 italic">Ce message sera pré-rempli dans l&apos;application WhatsApp lorsque vous cliquerez sur Envoyer.</p>
            </div>

            {/* Filtre */}
            <div className="flex items-center gap-2 bg-background border border-border rounded-xl p-2 px-4 shadow-sm w-full md:w-96">
                <Search className="w-4 h-4 text-muted-foreground shrink-0" />
                <input 
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Chercher un contact par nom ou numéro..."
                    className="bg-transparent border-none outline-none w-full text-sm font-medium placeholder:text-muted-foreground h-8"
                />
            </div>

            {/* Liste des contacts */}
            <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
                {filteredContacts.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground text-sm font-medium">
                        Aucun contact trouvé.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-secondary/50 text-muted-foreground">
                                <tr>
                                    <th className="px-6 py-4 font-black text-[10px] uppercase tracking-widest">Client</th>
                                    <th className="px-6 py-4 font-black text-[10px] uppercase tracking-widest">Numéro WhatsApp</th>
                                    <th className="px-6 py-4 font-black text-[10px] uppercase tracking-widest hidden md:table-cell">Source</th>
                                    <th className="px-6 py-4 font-black text-[10px] uppercase tracking-widest hidden lg:table-cell">Dernière activité</th>
                                    <th className="px-6 py-4 font-black text-[10px] uppercase tracking-widest text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {filteredContacts.map(contact => (
                                    <tr key={contact.phone} className="hover:bg-secondary/20 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-foreground truncate max-w-[200px]">{contact.name}</div>
                                            {contact.points !== undefined && contact.points > 0 && (
                                                <div className="text-[10px] font-black text-amber-500 uppercase flex items-center gap-1 mt-1">
                                                    <Gift className="w-3 h-3" /> {contact.points} pts
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 font-mono font-bold text-muted-foreground">
                                            +{contact.phone}
                                        </td>
                                        <td className="px-6 py-4 hidden md:table-cell">
                                            <div className="flex items-center gap-1">
                                                {contact.source === "loyalty" || contact.source === "both" ? (
                                                    <div className="bg-primary/20 text-primary p-1 rounded-md" title="Client Fidèle">
                                                        <Gift className="w-3 h-3" />
                                                    </div>
                                                ) : null}
                                                {contact.source === "orders" || contact.source === "both" ? (
                                                    <div className="bg-blue-500/20 text-blue-500 p-1 rounded-md" title="Commandes en ligne">
                                                        <ShoppingBag className="w-3 h-3" />
                                                    </div>
                                                ) : null}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 hidden lg:table-cell text-xs text-muted-foreground font-medium">
                                            {contact.lastOrderDate ? formatDistanceToNow(new Date(contact.lastOrderDate), { addSuffix: true, locale: fr }) : "N/A"}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => handleSendMessage(contact.phone)}
                                                className="inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#1DA851] text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-[#25D366]/20 active:scale-95"
                                            >
                                                <Send className="w-4 h-4" />
                                                <span className="hidden sm:inline">Envoyer</span>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
            
        </div>
    );
}
