"use client"

import React, { useState, useEffect } from 'react';
import {
  Gift, Phone, Search, Users, Crown,
  TrendingUp, ArrowDown, ArrowUp, Loader2,
  ChevronRight, X, Star, Award, Clock,
  Minus
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getLoyaltyCustomers, getLoyaltyCustomerDetails, redeemLoyaltyPoints, getRandomRewardProducts, redeemLoyaltyGift } from "@/lib/actions";
import { getManagerSession } from "@/lib/manager-actions";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";

export default function LoyaltyCustomersPage({ searchParams }: { searchParams: { resto_id?: string } }) {
  const [restaurantId, setRestaurantId] = useState<string>(searchParams.resto_id || "");
  const [customers, setCustomers] = useState<any[]>([]);
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [customerDetails, setCustomerDetails] = useState<any>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [redeemLoading, setRedeemLoading] = useState(false);
  const [giftProducts, setGiftProducts] = useState<any[] | null>(null);

  useEffect(() => {
    async function init() {
      let id = searchParams.resto_id;
      if (!id) {
        const session = await getManagerSession();
        id = session?.id || "";
        if (id) setRestaurantId(id);
      }
      if (!id) return;
      await fetchCustomers(id);
    }
    init();
  }, [searchParams.resto_id]);

  const fetchCustomers = async (id: string) => {
    setLoading(true);
    const result = await getLoyaltyCustomers(id);
    if (result.success) {
      setCustomers(result.customers);
      setConfig(result.config);
    }
    setLoading(false);
  };

  const openCustomerDetails = async (customer: any) => {
    setSelectedCustomer(customer);
    setDetailsLoading(true);
    const result = await getLoyaltyCustomerDetails(restaurantId, customer.id);
    if (result.success) {
      setCustomerDetails(result.customer);
    }
    setDetailsLoading(false);
  };

  const handleRedeem = async (customerId: string, points: number) => {
    if (!config) return;
    setRedeemLoading(true);
    const result = await redeemLoyaltyPoints(restaurantId, customerId, points);
    if (result.success) {
      toast.success(`${points} points échangés avec succès !`);
      await fetchCustomers(restaurantId);
      // Refresh details
      const updated = await getLoyaltyCustomerDetails(restaurantId, customerId);
      if (updated.success) {
        setCustomerDetails(updated.customer);
        setSelectedCustomer(updated.customer);
      }
    } else {
      toast.error(result.error || "Erreur");
    }
    setRedeemLoading(false);
  };

  const handleLoadGifts = async (customerId: string) => {
    setRedeemLoading(true);
    const result = await getRandomRewardProducts(restaurantId);
    setRedeemLoading(false);
    if (result.success && result.products.length > 0) {
      setGiftProducts(result.products);
    } else {
      setGiftProducts([]);
    }
  };

  const handleRedeemGift = async (customerId: string, platId: string) => {
    setRedeemLoading(true);
    const result = await redeemLoyaltyGift(restaurantId, customerId, platId);
    if (result.success) {
      toast.success(`🎁 Cadeau "${result.giftName}" offert avec succès !`);
      setGiftProducts(null);
      await fetchCustomers(restaurantId);
      // Refresh details
      const updated = await getLoyaltyCustomerDetails(restaurantId, customerId);
      if (updated.success) {
        setCustomerDetails(updated.customer);
        setSelectedCustomer(updated.customer);
      }
    } else {
      toast.error(result.error || "Erreur lors de l'échange.");
    }
    setRedeemLoading(false);
  };

  const filteredCustomers = customers.filter(c =>
    c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phone?.includes(searchQuery)
  );

  const totalPoints = customers.reduce((acc: number, c: any) => acc + c.points, 0);
  const eligibleCount = config ? customers.filter((c: any) => c.points >= config.rewardThreshold).length : 0;

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-4">
        <Loader2 className="w-10 h-10 text-pink-500 animate-spin" />
        <p className="text-muted-foreground text-xs mt-4 font-black uppercase tracking-widest">Chargement du programme fidélité...</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black italic tracking-tighter text-foreground uppercase flex items-center gap-3">
            <div className="w-12 h-12 bg-pink-500/10 rounded-2xl flex items-center justify-center border border-pink-500/20">
              <Gift className="w-6 h-6 text-pink-500" />
            </div>
            Clients Fidélité
          </h1>
          <p className="text-muted-foreground font-medium mt-1">Gérez vos clients fidèles et leurs récompenses.</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-3xl p-6 relative overflow-hidden group hover:-translate-y-0.5 transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-pink-500/5 blur-[40px] rounded-full" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-4 h-4 text-pink-500" />
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Total Clients</span>
            </div>
            <span className="text-3xl font-black text-foreground italic">{customers.length}</span>
          </div>
        </div>

        <div className="bg-card border border-border rounded-3xl p-6 relative overflow-hidden group hover:-translate-y-0.5 transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 blur-[40px] rounded-full" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <Star className="w-4 h-4 text-amber-500" />
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Points Totaux</span>
            </div>
            <span className="text-3xl font-black text-foreground italic">{totalPoints.toLocaleString()}</span>
          </div>
        </div>

        <div className="bg-card border border-border rounded-3xl p-6 relative overflow-hidden group hover:-translate-y-0.5 transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 blur-[40px] rounded-full" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <Award className="w-4 h-4 text-emerald-500" />
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Éligibles Cadeau</span>
            </div>
            <span className="text-3xl font-black text-foreground italic">{eligibleCount}</span>
          </div>
        </div>

        <div className="bg-card border border-border rounded-3xl p-6 relative overflow-hidden group hover:-translate-y-0.5 transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 blur-[40px] rounded-full" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <Crown className="w-4 h-4 text-purple-500" />
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Palier Cadeau</span>
            </div>
            <span className="text-3xl font-black text-foreground italic">{config?.rewardThreshold || 100}</span>
            <span className="text-xs text-muted-foreground font-bold ml-1">pts</span>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Rechercher par nom ou numéro..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-card border border-border rounded-2xl py-3 pl-11 pr-4 text-sm text-foreground focus:ring-2 focus:ring-pink-500/50 outline-none transition-all placeholder:text-muted-foreground"
        />
      </div>

      {/* Customer List */}
      {filteredCustomers.length === 0 ? (
        <div className="bg-card border-2 border-dashed border-border rounded-[2.5rem] py-24 flex flex-col items-center justify-center text-muted-foreground">
          <Gift className="w-16 h-16 mb-4 opacity-10" />
          <p className="font-black text-[10px] uppercase tracking-widest opacity-50">
            {searchQuery ? "Aucun client trouvé" : "Aucun client fidélité enregistré"}
          </p>
          {!searchQuery && (
            <p className="text-xs text-muted-foreground mt-2 max-w-xs text-center">
              Les clients apparaîtront ici après avoir entré leur numéro de téléphone lors d'une commande payée.
            </p>
          )}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-[2.5rem] overflow-hidden shadow-2xl">
          {/* Table Header */}
          <div className="hidden md:grid grid-cols-12 gap-4 px-8 py-4 border-b border-border bg-secondary/30">
            <span className="col-span-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Client</span>
            <span className="col-span-2 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Téléphone</span>
            <span className="col-span-2 text-[10px] font-black text-muted-foreground uppercase tracking-widest text-center">Points</span>
            <span className="col-span-2 text-[10px] font-black text-muted-foreground uppercase tracking-widest text-center">Statut</span>
            <span className="col-span-2 text-[10px] font-black text-muted-foreground uppercase tracking-widest text-right">Actions</span>
          </div>

          {/* Table Rows */}
          <div className="divide-y divide-border">
            {filteredCustomers.map((customer: any) => {
              const progress = config ? Math.min(100, (customer.points / config.rewardThreshold) * 100) : 0;
              const isEligible = config ? customer.points >= config.rewardThreshold : false;

              return (
                <div
                  key={customer.id}
                  className="grid grid-cols-1 md:grid-cols-12 gap-4 px-8 py-5 hover:bg-secondary/20 transition-colors cursor-pointer group items-center"
                  onClick={() => openCustomerDetails(customer)}
                >
                  {/* Name + Avatar */}
                  <div className="col-span-4 flex items-center gap-4">
                    <div className={cn(
                      "w-11 h-11 rounded-2xl flex items-center justify-center font-black text-sm border shrink-0",
                      isEligible
                        ? "bg-pink-500/10 border-pink-500/20 text-pink-500"
                        : "bg-secondary border-border text-muted-foreground"
                    )}>
                      {customer.name?.charAt(0)?.toUpperCase() || "?"}
                    </div>
                    <div>
                      <p className="font-bold text-foreground text-sm group-hover:text-pink-500 transition-colors">{customer.name || "Client"}</p>
                      <p className="text-[10px] text-muted-foreground font-medium">
                        Inscrit le {format(new Date(customer.createdAt), "d MMM yyyy", { locale: fr })}
                      </p>
                    </div>
                  </div>

                  {/* Phone */}
                  <div className="col-span-2 flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="font-mono text-sm text-foreground">{customer.phone}</span>
                  </div>

                  {/* Points */}
                  <div className="col-span-2 flex flex-col items-center gap-1">
                    <span className={cn(
                      "text-lg font-black italic",
                      isEligible ? "text-pink-500" : "text-foreground"
                    )}>
                      {customer.points}
                    </span>
                    <div className="w-full max-w-[80px] bg-secondary h-1.5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-pink-500 to-purple-500 rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(2, progress)}%` }}
                      />
                    </div>
                  </div>

                  {/* Status */}
                  <div className="col-span-2 flex justify-center">
                    {isEligible ? (
                      <span className="bg-pink-500/10 text-pink-500 border border-pink-500/20 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
                        <Gift className="w-3 h-3" /> Cadeau !
                      </span>
                    ) : (
                      <span className="bg-secondary text-muted-foreground border border-border px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                        {config ? config.rewardThreshold - customer.points : 0} pts restants
                      </span>
                    )}
                  </div>

                  {/* Action */}
                  <div className="col-span-2 flex justify-end">
                    <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-pink-500 group-hover:translate-x-1 transition-all" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Customer Detail Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div
            className="absolute inset-0 bg-background/90 backdrop-blur-md"
            onClick={() => { setSelectedCustomer(null); setCustomerDetails(null); setGiftProducts(null); }}
          />
          <div className="relative bg-card border border-border shadow-2xl rounded-[2.5rem] p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto transform animate-in zoom-in-95 slide-in-from-bottom-6 duration-300">
            {/* Close */}
            <button
              onClick={() => { setSelectedCustomer(null); setCustomerDetails(null); setGiftProducts(null); }}
              className="absolute top-6 right-6 p-2 rounded-xl bg-secondary hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
            >
              <X className="w-4 h-4" />
            </button>

            {detailsLoading ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Loader2 className="w-8 h-8 text-pink-500 animate-spin" />
              </div>
            ) : customerDetails ? (
              <div className="space-y-6">
                {/* Customer Header */}
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-pink-500 to-purple-600 rounded-3xl flex items-center justify-center text-white font-black text-2xl shadow-lg shadow-pink-500/20">
                    {customerDetails.name?.charAt(0)?.toUpperCase() || "?"}
                  </div>
                  <div>
                    <h2 className="text-2xl font-black italic text-foreground tracking-tight">
                      {customerDetails.name || "Client"}
                    </h2>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="w-3.5 h-3.5" />
                      <span className="font-mono text-sm">{customerDetails.phone}</span>
                    </div>
                  </div>
                </div>

                {/* Points Display */}
                <div className="bg-secondary/50 border border-border rounded-3xl p-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-pink-500/5 blur-[50px] rounded-full" />
                  <div className="relative z-10">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">Points Accumulés</p>
                    <div className="flex items-end gap-2">
                      <span className="text-5xl font-black text-pink-500 italic">
                        {customerDetails.points}
                      </span>
                      <span className="text-muted-foreground font-bold mb-2">
                        / {config?.rewardThreshold || 100} pts
                      </span>
                    </div>
                    <div className="w-full bg-background border border-border h-3 rounded-full mt-4 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-pink-500 to-purple-500 transition-all duration-1000 ease-out rounded-full"
                        style={{ width: `${Math.min(100, Math.max(3, (customerDetails.points / (config?.rewardThreshold || 100)) * 100))}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Redeem Gift Section */}
                {config && customerDetails.points >= config.rewardThreshold && (
                  <div className="space-y-3">
                    {!giftProducts ? (
                      <button
                        onClick={() => handleLoadGifts(customerDetails.id)}
                        disabled={redeemLoading}
                        className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-95 shadow-xl shadow-pink-500/20 text-sm uppercase tracking-widest disabled:opacity-50"
                      >
                        {redeemLoading ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <>
                            <Gift className="w-5 h-5" />
                            Convertir {config.rewardThreshold} pts → Cadeau
                          </>
                        )}
                      </button>
                    ) : giftProducts.length === 0 ? (
                      <div className="bg-orange-500/10 border border-orange-500/20 rounded-2xl p-4 text-center">
                        <p className="text-xs font-bold text-orange-500">Aucun produit cadeau configuré dans le menu.</p>
                        <p className="text-[10px] text-muted-foreground mt-1">Allez dans Gestion Menu et activez le bouton 🎁 sur les plats éligibles.</p>
                      </div>
                    ) : (
                      <div className="space-y-3 animate-in slide-in-from-bottom-4 duration-300">
                        <p className="text-[10px] font-black text-pink-500 uppercase tracking-widest text-center">
                          🎁 Le client choisit UN cadeau parmi :
                        </p>
                        <div className={cn(
                          "grid gap-3",
                          giftProducts.length === 1 ? "grid-cols-1" : "grid-cols-2"
                        )}>
                          {giftProducts.map((product: any) => (
                            <button
                              key={product.id}
                              onClick={() => handleRedeemGift(customerDetails.id, product.id)}
                              disabled={redeemLoading}
                              className="group bg-secondary/50 border-2 border-border hover:border-pink-500/50 rounded-2xl p-4 text-center transition-all hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 relative overflow-hidden"
                            >
                              <div className="absolute inset-0 bg-gradient-to-b from-pink-500/0 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                              <div className="relative z-10">
                                <div className="w-16 h-16 rounded-2xl bg-secondary border border-border overflow-hidden mx-auto mb-3 group-hover:shadow-lg group-hover:shadow-pink-500/10 transition-shadow">
                                  <img src={product.image} alt={product.nom} className="w-full h-full object-cover" />
                                </div>
                                <p className="font-black text-sm text-foreground group-hover:text-pink-500 transition-colors">{product.nom}</p>
                                <p className="text-[10px] text-muted-foreground font-bold mt-1">
                                  {product.devise === "USD" ? "$" : ""}{product.prixUsd?.toFixed(2)} {product.devise === "FC" ? "FC" : ""}
                                </p>
                              </div>
                            </button>
                          ))}
                        </div>
                        <button
                          onClick={() => setGiftProducts(null)}
                          className="w-full text-[10px] text-muted-foreground font-bold uppercase tracking-widest py-2 hover:text-foreground transition-colors"
                        >
                          Annuler
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Transaction History */}
                <div>
                  <h3 className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Clock className="w-4 h-4" /> Historique des Transactions
                  </h3>
                  {customerDetails.transactions?.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-8">Aucune transaction enregistrée</p>
                  ) : (
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                      {customerDetails.transactions?.map((tx: any) => (
                        <div
                          key={tx.id}
                          className="flex items-center justify-between bg-secondary/30 border border-border rounded-2xl px-4 py-3 hover:bg-secondary/50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-8 h-8 rounded-xl flex items-center justify-center",
                              tx.type === "EARN"
                                ? "bg-emerald-500/10 text-emerald-500"
                                : "bg-orange-500/10 text-orange-500"
                            )}>
                              {tx.type === "EARN"
                                ? <ArrowUp className="w-4 h-4" />
                                : <Minus className="w-4 h-4" />
                              }
                            </div>
                            <div>
                              <p className="text-xs font-bold text-foreground">{tx.note || (tx.type === "EARN" ? "Points gagnés" : "Points échangés")}</p>
                              <p className="text-[10px] text-muted-foreground">
                                {format(new Date(tx.createdAt), "d MMM yyyy 'à' HH:mm", { locale: fr })}
                              </p>
                            </div>
                          </div>
                          <span className={cn(
                            "font-black text-sm",
                            tx.type === "EARN" ? "text-emerald-500" : "text-orange-500"
                          )}>
                            {tx.type === "EARN" ? "+" : ""}{tx.points}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="text-[10px] text-muted-foreground text-center font-bold uppercase tracking-widest pt-2">
                  Client depuis le {format(new Date(customerDetails.createdAt), "d MMMM yyyy", { locale: fr })}
                </div>
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-16">Impossible de charger les détails.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
