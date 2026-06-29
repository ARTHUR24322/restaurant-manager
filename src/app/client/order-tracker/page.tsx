"use client"
/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { 
  CheckCircle2, UtensilsCrossed, Truck, Star, Info, 
  Receipt, Headphones, ArrowLeft, UserCircle, ShoppingCart, 
  BookOpen, History, Loader2, Sparkles, Gift
} from 'lucide-react';
import { getOrderDetails } from '@/lib/actions';
import { cn } from '@/lib/utils';
import Link from 'next/link';

function OrderTrackerContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const orderId = searchParams.get('orderId');

  const [order, setOrder] = useState<any | null>(null); // Keeping any for now but adding comment to improve later
  const [loyalty, setLoyalty] = useState<any | null>(null);
  const [isLoyaltyActive, setIsLoyaltyActive] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderId) {
      setLoading(false);
      return;
    }

    const fetchOrder = async () => {
      const res = await getOrderDetails(orderId);
      if (res.success) {
        if (res.order) setOrder(res.order);
        if (res.loyalty) setLoyalty(res.loyalty);
        setIsLoyaltyActive(res.isLoyaltyActive || false);
      }
      setLoading(false);
    };

    fetchOrder();
    const interval = setInterval(fetchOrder, 15000); // Auto refresh every 15s
    return () => clearInterval(interval);
  }, [orderId]);

  const refreshOrder = async () => {
    if (!orderId) return;
    const res = await getOrderDetails(orderId);
    if (res.success) {
      if (res.order) setOrder(res.order);
      if (res.loyalty) setLoyalty(res.loyalty);
      setIsLoyaltyActive(res.isLoyaltyActive || false);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
        <p className="text-muted-foreground font-bold uppercase tracking-widest text-[10px]">Chargement de votre commande...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center mb-6">
          <Info className="w-10 h-10 text-destructive" />
        </div>
        <h2 className="text-2xl font-black italic uppercase tracking-tighter mb-2">Commande introuvable</h2>
        <p className="text-muted-foreground text-sm mb-8">Nous n&apos;avons pas pu récupérer les détails de cette commande.</p>
        <button 
          onClick={() => router.back()}
          className="bg-primary text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-primary/20"
        >
          Retour au menu
        </button>
      </div>
    );
  }

  const isDeliveryOrder = !!(order.adresseLivraison);

  const getStatusStep = (status: string) => {
    if (isDeliveryOrder) {
      // Flux livraison : Caisse → Cuisine → Livraison
      switch (status) {
        case 'PENDING_BOUTIQUE': return 0;
        case 'SUBMITTED': return 1;      // À la caisse
        case 'PREPARING': return 2;      // En cuisine
        case 'READY_FOR_DELIVERY': return 2.5; // Cuisine terminée, en attente livreur
        case 'DELIVERING': return 3;     // En livraison
        case 'COMPLETED': return 4;      // Livré
        default: return 1;
      }
    } else {
      switch (status) {
        case 'PENDING': return 1;
        case 'PREPARING': return 1;
        case 'READY': return 2;
        case 'COMPLETED': return 3;
        default: return 1;
      }
    }
  };

  const currentStep = getStatusStep(order.statut);

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'PENDING_BOUTIQUE': return 'Validation boutique';
      case 'SUBMITTED': return 'En attente caisse';
      case 'PREPARING': return 'En préparation';
      case 'READY_FOR_DELIVERY': return 'En attente livreur';
      case 'DELIVERING': return 'En course de livraison';
      case 'READY': return 'Prête à emporter';
      case 'COMPLETED': return isDeliveryOrder ? 'Livrée !' : 'Servie';
      case 'CANCELLED': return 'Annulée';
      default: return 'En cours';
    }
  };

  return (
    <div className="bg-background text-foreground font-medium min-h-screen pb-32">
      {/* TopAppBar */}
      <header className="fixed top-0 w-full z-50 bg-card/80 backdrop-blur-md border-b border-border flex items-center justify-between px-6 h-16">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.back()}
            className="p-2 hover:bg-secondary rounded-full transition-all active:scale-90"
          >
            <ArrowLeft className="w-5 h-5 text-primary" />
          </button>
          <h1 className="text-lg font-black italic uppercase tracking-tighter text-primary">
            {order.restaurant?.nom || "SmartResto"}
          </h1>
        </div>
        <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center overflow-hidden">
           <UserCircle className="w-6 h-6 text-muted-foreground" />
        </div>
      </header>

      <main className="pt-24 px-6 max-w-2xl mx-auto space-y-8">
        {/* Hero Celebration Section */}
        <section className="text-center py-6 flex flex-col items-center animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="w-24 h-24 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mb-6 shadow-xl relative">
            <div className="absolute inset-0 bg-emerald-500/20 rounded-full animate-ping" />
            <CheckCircle2 className="w-12 h-12 relative z-10" />
          </div>
          <h2 className="text-3xl font-black italic uppercase tracking-tighter mb-1">C&apos;est en route !</h2>
          <p className="text-muted-foreground font-bold uppercase tracking-widest text-[10px]">
            Commande <span className="text-primary font-mono select-all">#{order.id.slice(-8).toUpperCase()}</span>
          </p>
        </section>

        {/* Order Status Progress */}
        <section className="bg-card border border-border rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl rounded-full" />
          
          <div className="flex justify-between items-center mb-10 relative z-10">
            <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
              <History className="w-4 h-4 text-primary" /> Suivi en temps réel
            </h3>
            <span className={cn(
              "inline-flex items-center px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest",
              order.statut === 'COMPLETED' ? "bg-emerald-500/10 text-emerald-500" :
              order.statut === 'DELIVERING' ? "bg-amber-500/10 text-amber-500" :
              "bg-primary/10 text-primary"
            )}>
              <span className={cn(
                "w-2 h-2 rounded-full mr-2",
                order.statut === 'COMPLETED' ? "bg-emerald-500" :
                order.statut === 'DELIVERING' ? "bg-amber-400 animate-pulse" :
                "bg-primary animate-pulse"
              )}></span>
              {getStatusLabel(order.statut)}
            </span>
          </div>

          {isDeliveryOrder ? (
            /* === BARRE LIVRAISON 3 ÉTAPES === */
            <div className="space-y-6">
              {/* Progress bar */}
              <div className="h-3 w-full bg-secondary rounded-full overflow-hidden border border-border">
                <div
                  className="h-full bg-primary transition-all duration-1000 ease-in-out"
                  style={{ width: `${Math.min(100, (Math.min(currentStep, 3) / 3) * 100)}%` }}
                />
              </div>
              {/* Steps */}
              <div className="flex justify-between">
                {[
                  { label: 'Caisse', icon: <CheckCircle2 className="w-5 h-5" />, step: 1 },
                  { label: 'Cuisine', icon: <UtensilsCrossed className="w-5 h-5" />, step: 2 },
                  { label: 'Livraison', icon: <Truck className="w-5 h-5" />, step: 3 },
                ].map(({ label, icon, step }) => (
                  <div key={step} className={cn("flex flex-col items-center gap-2 transition-all duration-300", currentStep >= step ? "opacity-100" : "opacity-30")}>
                    <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center transition-all",
                      currentStep >= step + 1 ? "bg-emerald-500 text-white" :
                      currentStep >= step ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30 scale-110" :
                      "bg-secondary text-muted-foreground"
                    )}>
                      {icon}
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-tighter">{label}</span>
                    {currentStep >= step + 1 && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
                  </div>
                ))}
              </div>
              {/* Info livreur */}
              {order.livreur && (
                <div className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl mt-4">
                  <Truck className="w-5 h-5 text-amber-400 flex-shrink-0" />
                  <div>
                    <p className="text-[9px] font-black uppercase text-amber-400 tracking-widest">Votre livreur</p>
                    <p className="text-sm font-black text-foreground">{order.livreur}</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* === BARRE STANDARD 3 ÉTAPES === */
            <div className="relative pt-2 pb-2">
              <div className="h-3 w-full bg-secondary rounded-full overflow-hidden border border-border">
                <div
                  className="h-full bg-primary transition-all duration-1000 ease-in-out relative"
                  style={{ width: `${(currentStep / 3) * 100}%` }}
                >
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-5 h-5 bg-primary border-4 border-card rounded-full shadow-[0_0_15px_rgba(var(--primary),0.5)]"></div>
                </div>
              </div>
              <div className="flex justify-between mt-6">
                <div className={cn("flex flex-col items-center gap-2 transition-all duration-300", currentStep >= 1 ? "opacity-100 scale-110" : "opacity-30")}>
                  <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center", currentStep >= 1 ? "bg-primary text-white" : "bg-secondary")}>
                    <UtensilsCrossed className="w-5 h-5" />
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-tighter">Préparation</span>
                </div>
                <div className={cn("flex flex-col items-center gap-2 transition-all duration-300", currentStep >= 2 ? "opacity-100 scale-110" : "opacity-30")}>
                  <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center", currentStep >= 2 ? "bg-primary text-white" : "bg-secondary")}>
                    <Truck className="w-5 h-5" />
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-tighter">Prête</span>
                </div>
                <div className={cn("flex flex-col items-center gap-2 transition-all duration-300", currentStep >= 3 ? "opacity-100 scale-110" : "opacity-30")}>
                  <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center", currentStep >= 3 ? "bg-primary text-white" : "bg-secondary")}>
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-tighter">Livrée</span>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Loyalty Card Visual */}
        {isLoyaltyActive && loyalty && (
          <section className="relative overflow-hidden bg-gradient-to-br from-pink-500 to-purple-600 rounded-[2.5rem] p-8 text-white shadow-2xl animate-in slide-in-from-bottom-4 delay-200">
            {/* Decorative background pattern */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl opacity-50"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-black/10 rounded-full -ml-16 -mb-16 blur-2xl opacity-30"></div>
            
            <div className="relative z-10 font-black italic">
              <div className="flex justify-between items-start mb-10">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.3em] opacity-80 not-italic font-black">Carte de Fidélité Elite</p>
                  <h3 className="text-2xl mt-2 leading-none uppercase tracking-tighter">Solde : {loyalty.points} points</h3>
                </div>
                <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-lg border border-white/20">
                  <Star className="w-8 h-8 text-amber-300 fill-amber-300" />
                </div>
              </div>
              
              {/* Loyalty Progress */}
              <div className="space-y-4">
                <div className="flex justify-between text-[10px] uppercase tracking-widest not-italic opacity-90">
                  <span>{loyalty.points} pts</span>
                  <span>Palier : {loyalty.threshold} pts</span>
                </div>
                <div className="h-4 w-full bg-black/20 rounded-full overflow-hidden border border-white/10 p-0.5">
                  <div 
                    className="h-full bg-white rounded-full shadow-[0_0_15px_rgba(255,255,255,0.5)] transition-all duration-1000 ease-out"
                    style={{ width: `${Math.min(100, (loyalty.points / loyalty.threshold) * 100)}%` }}
                  />
                </div>
                <div className="flex items-center gap-3 pt-4 not-italic">
                  <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-amber-200" />
                  </div>
                  <p className="text-xs font-bold leading-tight opacity-90">
                    {loyalty.points >= loyalty.threshold 
                      ? "Félicitations ! Vous avez débloqué un cadeau !" 
                      : `Plus que ${loyalty.threshold - loyalty.points} points pour votre prochaine surprise !`
                    }
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Quick Actions (Bento Style) */}
        <div className="grid grid-cols-2 gap-4">
          <button className="group bg-card border border-border rounded-[2rem] p-6 flex flex-col items-center text-center justify-center gap-3 hover:border-primary/50 transition-all active:scale-95 shadow-sm">
            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
              <Receipt className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Historique</span>
          </button>
          <button className="group bg-card border border-border rounded-[2rem] p-6 flex flex-col items-center text-center justify-center gap-3 hover:border-primary/50 transition-all active:scale-95 shadow-sm">
            <div className="w-12 h-12 bg-secondary rounded-2xl flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
              <Headphones className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Besoin d&apos;aide ?</span>
          </button>
        </div>

        {/* Featured Image Card */}
        <div className="rounded-[2.5rem] overflow-hidden shadow-2xl aspect-video relative group border border-border/50">
          <img 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000" 
            src="https://images.unsplash.com/photo-1559339352-11d035aa65de?q=80&w=2074&auto=format&fit=crop"
            alt="New season menu"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end p-8">
            <div className="space-y-1 font-black italic uppercase">
              <p className="text-white text-xl tracking-tighter">Découvrez notre carte de saison</p>
              <p className="text-primary text-[10px] tracking-widest not-italic font-black">Nouveautés du moment</p>
            </div>
          </div>
        </div>
      </main>

      {/* BottomNavBar */}
      <nav className="fixed bottom-0 left-0 w-full flex justify-around items-center px-6 py-4 pb-8 bg-card/80 backdrop-blur-xl border-t border-border z-50 rounded-t-[2.5rem] shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)]">
        <Link 
          href={`/client/menu?resto_id=${order.restaurantId}&table=${order.table}`}
          className="flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-primary transition-all active:scale-90"
        >
          <BookOpen className="w-5 h-5" />
          <span className="text-[9px] font-black uppercase tracking-tight">Menu</span>
        </Link>

        {isLoyaltyActive && (
          <Link 
            href={`/client/loyalty?resto_id=${order.restaurantId}&table=${order.table}`}
            className="flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-primary transition-all active:scale-90"
          >
            <Gift className="w-5 h-5" />
            <span className="text-[9px] font-black uppercase tracking-tight">Cadeaux</span>
          </Link>
        )}
        
        <Link 
          href={`/client/menu?resto_id=${order.restaurantId}&table=${order.table}`}
          className="flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-primary transition-all active:scale-90"
        >
          <ShoppingCart className="w-5 h-5" />
          <span className="text-[9px] font-black uppercase tracking-tight">Panier</span>
        </Link>

        <div className="flex flex-col items-center justify-center gap-1 text-primary animate-bounce">
          <div className="w-10 h-10 bg-primary/10 rounded-2xl flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <span className="text-[9px] font-black uppercase tracking-tight">Suivi</span>
        </div>
      </nav>
    </div>
  );
}

export default function OrderTrackerPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
        <p className="text-muted-foreground font-bold uppercase tracking-widest text-[10px]">Chargement...</p>
      </div>
    }>
      <OrderTrackerContent />
    </Suspense>
  );
}
