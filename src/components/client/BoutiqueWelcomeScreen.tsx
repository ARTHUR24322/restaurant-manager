"use client";
/* eslint-disable @next/next/no-img-element */

import React, { useState, useEffect } from "react";
import { User, Phone, ArrowRight, Store, ShoppingCart, MapPin, UserCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface BoutiqueWelcomeScreenProps {
  restaurantId: string;
  restaurantName: string;
  logoUrl?: string;
  children: React.ReactNode;
}

const STORAGE_KEY_PREFIX = "sr_boutique_client_";

export function BoutiqueWelcomeScreen({
  restaurantId,
  restaurantName,
  logoUrl,
  children,
}: BoutiqueWelcomeScreenProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [isRegistered, setIsRegistered] = useState(false);
  const [activeTab, setActiveTab] = useState<"shop" | "track" | "profile">("shop");
  const [isLoading, setIsLoading] = useState(true);

  const storageKey = `${STORAGE_KEY_PREFIX}${restaurantId}`;

  // Check if client is already registered
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.name && parsed.phone) {
          setName(parsed.name);
          setPhone(parsed.phone);
          setIsRegistered(true);
        }
      }
    } catch {
      /* ignore */
    }
    setIsLoading(false);
  }, [storageKey]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;

    const clientData = { name: name.trim(), phone: phone.trim() };
    localStorage.setItem(storageKey, JSON.stringify(clientData));
    // Also save phone for loyalty
    localStorage.setItem("sr_loyalty_phone", phone.trim());
    setIsRegistered(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  // Welcome / registration screen
  if (!isRegistered) {
    return (
      <div className="fixed inset-0 z-[100] bg-background flex flex-col items-center justify-center p-6 text-foreground overflow-hidden">
        {/* Background decorations */}
        <div className="absolute top-[-15%] left-[-10%] w-[55%] h-[55%] bg-primary/20 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-[-15%] right-[-10%] w-[50%] h-[50%] bg-indigo-500/10 blur-[120px] rounded-full pointer-events-none" />

        <div className="relative z-10 w-full max-w-sm flex flex-col items-center animate-in zoom-in-95 fade-in duration-300">
          {/* Logo */}
          <div className="mb-8 relative">
            <div className="absolute inset-0 bg-primary/30 rounded-[2rem] blur-2xl animate-pulse" />
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={restaurantName}
                className="relative w-28 h-28 object-cover rounded-[2rem] border-2 border-border shadow-2xl"
              />
            ) : (
              <div className="relative w-28 h-28 bg-card border-2 border-border rounded-[2rem] flex items-center justify-center shadow-2xl shadow-primary/10">
                <Store className="w-12 h-12 text-primary" />
              </div>
            )}
          </div>

          {/* Title */}
          <div className="text-center mb-10 w-full">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary/10 border border-primary/20 rounded-full text-xs font-black uppercase tracking-widest text-primary mb-6">
              <Store className="w-3 h-3" />
              Boutique en Ligne
            </div>
            <h1 className="text-4xl sm:text-5xl font-black italic tracking-tighter mb-4 leading-tight">
              Bienvenue chez <br />
              <span className="text-primary">{restaurantName}</span>
            </h1>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Entrez votre nom et votre numéro pour commander et suivre votre livraison.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="w-full space-y-4">
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                <User className="w-5 h-5" />
              </div>
              <input
                type="text"
                placeholder="Votre prénom et nom"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={40}
                autoFocus
                className="w-full bg-secondary/50 border border-border/50 text-foreground font-medium text-base rounded-2xl pl-12 pr-4 py-4 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-muted-foreground/40"
              />
            </div>

            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                <Phone className="w-5 h-5" />
              </div>
              <input
                type="tel"
                placeholder="Votre numéro (WhatsApp)"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                className="w-full bg-secondary/50 border border-border/50 text-foreground font-medium text-base rounded-2xl pl-12 pr-4 py-4 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-muted-foreground/40"
              />
            </div>

            <button
              type="submit"
              disabled={!name.trim() || !phone.trim()}
              className={cn(
                "w-full py-4 rounded-2xl font-black uppercase tracking-widest text-sm flex items-center justify-center gap-2 transition-all duration-200",
                name.trim() && phone.trim()
                  ? "bg-primary text-primary-foreground shadow-xl shadow-primary/25 hover:scale-[1.02] active:scale-[0.98]"
                  : "bg-secondary text-muted-foreground cursor-not-allowed opacity-60"
              )}
            >
              Accéder à la boutique <ArrowRight className="w-5 h-5" />
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Main boutique view with bottom nav
  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Active tab content */}
      {activeTab === "shop" && (
        <div className="animate-in fade-in duration-200">
          {children}
        </div>
      )}

      {activeTab === "track" && (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="w-full max-w-md">
            <div className="text-center mb-10">
              <div className="w-20 h-20 bg-primary/10 border-2 border-primary/20 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <MapPin className="w-10 h-10 text-primary" />
              </div>
              <h2 className="text-2xl font-black text-foreground mb-2">Suivre ma commande</h2>
              <p className="text-muted-foreground text-sm">
                Entrez votre numéro de téléphone pour retrouver l&apos;état de votre commande.
              </p>
            </div>

            <TrackOrderPanel phone={phone} restaurantId={restaurantId} />
          </div>
        </div>
      )}

      {activeTab === "profile" && (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="w-full max-w-sm">
            <div className="text-center mb-10">
              <div className="w-20 h-20 bg-primary/10 border-2 border-primary/20 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <UserCircle className="w-10 h-10 text-primary" />
              </div>
              <h2 className="text-2xl font-black text-foreground mb-1">Mon Profil</h2>
              <p className="text-muted-foreground text-sm">Vos informations de livraison</p>
            </div>

            <div className="bg-card border border-border rounded-2xl p-6 space-y-4 shadow-lg">
              <div className="flex items-center gap-4 p-4 bg-secondary/40 rounded-xl">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">Nom</p>
                  <p className="font-bold text-foreground mt-0.5">{name}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 bg-secondary/40 rounded-xl">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Phone className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">Téléphone</p>
                  <p className="font-bold text-foreground mt-0.5">{phone}</p>
                </div>
              </div>

              <button
                onClick={() => {
                  localStorage.removeItem(storageKey);
                  setIsRegistered(false);
                  setName("");
                  setPhone("");
                }}
                className="w-full mt-2 py-3 rounded-xl border border-destructive/30 text-destructive text-sm font-bold hover:bg-destructive/10 transition-colors"
              >
                Modifier mes informations
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-card/90 backdrop-blur-xl border-t border-border shadow-2xl">
        <div className="max-w-md mx-auto flex items-stretch h-[68px] px-4 gap-1">
          <NavButton
            icon={<ShoppingCart className="w-5 h-5" />}
            label="Boutique"
            active={activeTab === "shop"}
            onClick={() => setActiveTab("shop")}
          />
          <NavButton
            icon={<MapPin className="w-5 h-5" />}
            label="Suivre"
            active={activeTab === "track"}
            onClick={() => setActiveTab("track")}
          />
          <NavButton
            icon={<UserCircle className="w-5 h-5" />}
            label="Profil"
            active={activeTab === "profile"}
            onClick={() => setActiveTab("profile")}
          />
        </div>
      </div>
    </div>
  );
}

function NavButton({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex-1 flex flex-col items-center justify-center gap-1 rounded-xl transition-all duration-200",
        active
          ? "text-primary bg-primary/10"
          : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
      )}
    >
      <span className={cn("transition-transform duration-200", active && "scale-110")}>{icon}</span>
      <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
      {active && (
        <span className="absolute bottom-1 w-1 h-1 rounded-full bg-primary" />
      )}
    </button>
  );
}

// Panel to track order status
function TrackOrderPanel({ phone, restaurantId }: { phone: string; restaurantId: string }) {
  const [orders, setOrders] = useState<Array<{ id: string; statut: string; totalUsd: number; createdAt: string }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const statusLabels: Record<string, { label: string; color: string; emoji: string }> = {
    PENDING_BOUTIQUE: { label: "En attente de validation", color: "text-amber-400", emoji: "🕐" },
    PENDING_CAISSE: { label: "À la caisse", color: "text-blue-400", emoji: "💳" },
    EN_PREPARATION: { label: "En préparation", color: "text-violet-400", emoji: "👨‍🍳" },
    READY_FOR_DELIVERY: { label: "Prêt à livrer", color: "text-emerald-400", emoji: "📦" },
    DELIVERING: { label: "En livraison", color: "text-orange-400", emoji: "🚚" },
    DELIVERED: { label: "Livré ✅", color: "text-emerald-400", emoji: "✅" },
    CANCELLED: { label: "Annulé", color: "text-red-400", emoji: "❌" },
  };

  const handleSearch = async () => {
    if (!phone) return;
    setIsLoading(true);
    setSearched(true);
    try {
      const res = await fetch(`/api/boutique/track?phone=${encodeURIComponent(phone)}&restaurantId=${restaurantId}`);
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
      }
    } catch {
      /* ignore */
    } finally {
      setIsLoading(false);
    }
  };

  // auto-search on mount if phone is available
  useEffect(() => {
    if (phone) handleSearch();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (searched && orders.length === 0) {
    return (
      <div className="text-center py-12 bg-card border border-border rounded-2xl">
        <span className="text-4xl mb-4 block">📭</span>
        <p className="font-bold text-foreground">Aucune commande trouvée</p>
        <p className="text-sm text-muted-foreground mt-1">pour le numéro {phone}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {orders.map((order) => {
        const status = statusLabels[order.statut] || { label: order.statut, color: "text-foreground", emoji: "📋" };
        return (
          <div key={order.id} className="bg-card border border-border rounded-2xl p-5 shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                #{order.id.slice(-6).toUpperCase()}
              </span>
              <span className="text-xs text-muted-foreground">
                {new Date(order.createdAt).toLocaleDateString("fr-FR")}
              </span>
            </div>
            <div className={cn("flex items-center gap-2 font-bold text-base", status.color)}>
              <span>{status.emoji}</span>
              <span>{status.label}</span>
            </div>
            <p className="text-sm text-muted-foreground mt-2 font-medium">
              Total: <span className="text-foreground font-black">${order.totalUsd?.toFixed(2)}</span>
            </p>
          </div>
        );
      })}
      {!searched && (
        <button
          onClick={handleSearch}
          className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-primary/90 active:scale-95 transition-all"
        >
          Rechercher mes commandes
        </button>
      )}
    </div>
  );
}
