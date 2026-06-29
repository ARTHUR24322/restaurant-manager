"use client";
/* eslint-disable @typescript-eslint/no-unused-vars, @next/next/no-img-element */

import { useCartStore } from "@/store/cartStore";
import { ShoppingCart, X, Plus, Minus, Loader2, CheckCircle2, ChevronRight, Phone, User, MapPin, Sparkles, Ticket } from "lucide-react";
import { type Plat, type ClientReward } from "@/types";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { createCommande, updateOrderAddress } from "@/lib/actions";
import { toast } from "sonner";
import { useCurrencyStore } from "./CurrencyBadge";

export function BoutiqueCart({ restaurantId, exchangeRate = 2800, isLoyaltyActive = false }: { restaurantId: string, exchangeRate?: number, isLoyaltyActive?: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1); // 1: Cart/Checkout, 2: Address
  
  // Checkout Info
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  
  // Address Info
  const [commune, setCommune] = useState("");
  const [quartier, setQuartier] = useState("");
  const [avenue, setAvenue] = useState("");
  const [numero, setNumero] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);

  const { items, getTotalUsd, removeItem, updateQuantity, clearCart } = useCartStore();
  const { currency } = useCurrencyStore();

  const [promoCode, setPromoCode] = useState("");
  const [isPromoOpen, setIsPromoOpen] = useState(false);
  const [appliedPromo, setAppliedPromo] = useState<ClientReward | null>(null);
  const [isVerifyingPromo, setIsVerifyingPromo] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('sr_boutique_promo');
    if (saved) setAppliedPromo(JSON.parse(saved));
    const savedPhone = localStorage.getItem('sr_loyalty_phone');
    if (savedPhone) setPhone(savedPhone);
  }, []);

  const baseTotalUsd = getTotalUsd(exchangeRate);
  const discountPercent = appliedPromo?.discountValue || 0;
  const discountAmount = (baseTotalUsd * discountPercent) / 100;
  const totalUsd = baseTotalUsd - discountAmount;
  const totalCdf = totalUsd * exchangeRate;

  const formatPrice = (plat: Plat) => {
    const price = plat.prixUsd;
    if (currency === 'FC') {
       if (plat.devise === 'FC') return `${price.toLocaleString()} FC`;
       return `${(price * exchangeRate).toLocaleString()} FC`;
    }
    if (plat.devise === 'FC') return `$${(price / exchangeRate).toFixed(2)}`;
    return `$${price.toFixed(2)}`;
  };

  const handleApplyPromo = async () => {
    if (!promoCode || !phone) {
      toast.error("Veuillez renseigner votre téléphone et un code promo.");
      return;
    }
    setIsVerifyingPromo(true);
    try {
      const { validateAndApplyPromo } = await import("@/lib/actions-loyalty");
      const res = await validateAndApplyPromo(restaurantId, promoCode, phone);
      if (res.success && res.reward) {
        toast.success(`Succès ! -${res.reward.discountValue}% appliqué 🎊`, {
          icon: <Sparkles className="w-5 h-5 text-emerald-500" />
        });
        setAppliedPromo(res.reward);
        localStorage.setItem('sr_boutique_promo', JSON.stringify(res.reward));
        localStorage.setItem('sr_loyalty_phone', phone);
        setPromoCode("");
        setIsPromoOpen(false);
      } else {
        toast.error(res.error || "Code invalide.");
      }
    } catch(_e) {
      toast.error("Erreur de connexion.");
    } finally {
      setIsVerifyingPromo(false);
    }
  };

  const removePromo = () => {
    setAppliedPromo(null);
    localStorage.removeItem('sr_boutique_promo');
    toast.info("Code promo retiré.");
  };

  const handlePlaceOrder = async () => {
    if (!customerName || !phone) {
      toast.error("Veuillez renseigner votre nom et numéro de téléphone.");
      return;
    }

    setIsSubmitting(true);
    const orderData = {
      cartItems: items,
      tableNumber: "EN LIGNE",
      customerName: customerName,
      totalUsd: totalUsd,
      restaurantId: restaurantId,
      promoRewardId: appliedPromo?.id
    };

    try {
      const res = await createCommande(orderData);
      if (res.success && res.orderId) {
        const { assignPhoneToOrder } = await import("@/lib/actions");
        await assignPhoneToOrder(res.orderId, phone, customerName);
        
        if (appliedPromo) localStorage.removeItem('sr_boutique_promo');
        localStorage.setItem('sr_loyalty_phone', phone);

        setCreatedOrderId(res.orderId);
        setStep(2); // Go to Address Step
        toast.success("Commande enregistrée ! Veuillez indiquer où livrer.");
      } else {
        toast.error("Erreur de connexion.");
      }
    } catch (_error) {
       toast.error("Erreur de serveur.");
    } finally {
       setIsSubmitting(false);
    }
  };

  const handleSaveAddress = async () => {
    if (!commune || !quartier || !avenue || !numero) {
      toast.error("Veuillez remplir tous les champs de l'adresse.");
      return;
    }
    
    if (!createdOrderId) return;

    setIsSubmitting(true);
    const fullAddress = `Commune: ${commune}, Quartier: ${quartier}, Avenue: ${avenue}, N°: ${numero}`;
    
    try {
      const res = await updateOrderAddress(createdOrderId, fullAddress);
      if (res.success) {
        toast.success("Adresse enregistrée avec succès ! Votre commande est en route.");
        clearCart();
        setIsOpen(false);
        setStep(1);
        setCustomerName("");
        setPhone("");
      } else {
        toast.error("Erreur de sauvegarde.");
      }
    } catch (_error) {
      toast.error("Erreur.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (items.length === 0 && !isOpen) return null;

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-background/90 backdrop-blur-md z-40" onClick={() => (step === 1) && setIsOpen(false)} />
      )}

      {/* Bouton Panier Flottant */}
      {!isOpen && items.length > 0 && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 rounded-2xl bg-primary text-primary-foreground px-6 py-4 shadow-2xl flex items-center gap-4 hover:scale-105 active:scale-95 transition-all duration-300 animate-in slide-in-from-bottom-5"
        >
          <div className="relative">
            <ShoppingCart className="w-5 h-5" />
            <span className="absolute -top-3 -right-3 bg-white text-black w-5 h-5 rounded-full text-[10px] flex items-center justify-center font-black shadow-sm">
               {items.length}
            </span>
          </div>
          <span className="font-black text-sm">
            {currency === 'FC' ? `${totalCdf.toLocaleString()} FC` : `$${totalUsd.toFixed(2)}`}
          </span>
        </button>
      )}

      {/* Cart Drawer */}
      <div className={cn(
        "fixed bottom-0 left-0 right-0 md:left-auto md:right-6 md:bottom-6 md:w-[450px] bg-card border-t md:border border-border shadow-2xl md:rounded-[2rem] rounded-t-[2rem] z-50 transform transition-transform duration-500",
        isOpen ? "translate-y-0" : "translate-y-full"
      )}>
        
        {step === 1 && (
          <div className="flex flex-col h-[85vh] md:h-auto md:max-h-[85vh]">
            <div className="px-8 py-6 flex items-center justify-between border-b border-border bg-card rounded-t-[2rem]">
               <h2 className="text-lg font-black uppercase text-foreground flex items-center gap-2">
                 <ShoppingCart className="w-5 h-5" /> Votre Panier
               </h2>
               <button onClick={() => setIsOpen(false)} className="p-2 bg-secondary rounded-full hover:bg-secondary/80 transition-colors">
                  <X className="w-4 h-4" />
               </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Items */}
              <div className="space-y-4">
                {items.map((item) => (
                  <div key={item.cartItemId} className="flex gap-4 items-center bg-secondary/30 p-3 rounded-2xl border border-border">
                    <img src={item.plat.image} alt={item.plat.nom} className="w-16 h-16 rounded-xl object-cover bg-secondary" />
                    <div className="flex-1">
                      <h4 className="font-bold text-sm text-foreground">{item.plat.nom}</h4>
                      <p className="text-primary font-black text-sm mt-1">{formatPrice(item.plat)}</p>
                    </div>
                    <div className="flex items-center gap-3 bg-background px-3 py-1.5 rounded-xl border border-border">
                      <button onClick={() => item.quantite > 1 ? updateQuantity(item.cartItemId, item.quantite - 1) : removeItem(item.cartItemId)}>
                        <Minus className="w-3 h-3 text-muted-foreground hover:text-foreground" />
                      </button>
                      <span className="font-bold text-sm w-4 text-center">{item.quantite}</span>
                      <button onClick={() => updateQuantity(item.cartItemId, item.quantite + 1)}>
                        <Plus className="w-3 h-3 text-muted-foreground hover:text-foreground" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Form Info */}
              <div className="space-y-4 pt-4 border-t border-border">
                <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Vos informations</h3>
                
                <div className="space-y-3">
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input 
                        type="text" 
                        placeholder="Votre nom complet" 
                        value={customerName}
                        onChange={e => setCustomerName(e.target.value)}
                        className="w-full bg-background border border-border rounded-xl pl-10 pr-4 py-3 text-sm focus:ring-2 focus:ring-primary outline-none"
                      />
                    </div>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input 
                        type="tel" 
                        placeholder="Numéro de téléphone (WhatsApp)" 
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        className="w-full bg-background border border-border rounded-xl pl-10 pr-4 py-3 text-sm focus:ring-2 focus:ring-primary outline-none"
                      />
                    </div>
                </div>
              </div>
            </div>

            {/* Loyalty / Promo */}
            {isLoyaltyActive && (
              <div className="px-6 mb-4">
                {appliedPromo ? (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-[1.5rem] p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                        <Sparkles className="w-5 h-5 text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-emerald-400 font-black text-sm">Avantage Fidélité !</p>
                        <p className="text-[10px] text-emerald-500/70 font-bold uppercase tracking-widest">
                          -{appliedPromo.discountValue}% appliqué sur le total
                        </p>
                      </div>
                    </div>
                    <button onClick={removePromo} className="text-zinc-400 hover:text-white p-2">
                       <X className="w-5 h-5" />
                    </button>
                  </div>
                ) : (
                  <div className="bg-secondary/20 rounded-[1.5rem] border border-border p-4">
                     {!isPromoOpen ? (
                        <button onClick={() => setIsPromoOpen(!isPromoOpen)} className="w-full flex items-center justify-between group">
                          <div className="flex items-center gap-3">
                             <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                <Ticket className="w-5 h-5" />
                             </div>
                             <div className="text-left">
                                <p className="text-foreground font-bold text-sm">Avez-vous une récompense ?</p>
                                <p className="text-muted-foreground text-[10px] font-black uppercase tracking-widest">Utilisez votre code cadeau</p>
                             </div>
                          </div>
                          <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                        </button>
                     ) : (
                        <div className="space-y-3 animate-in fade-in zoom-in-95 duration-200">
                          <div className="flex items-center justify-between mb-2">
                             <p className="text-sm font-bold text-primary">Saisir le code / Votre téléphone</p>
                             <button onClick={() => setIsPromoOpen(false)} className="text-muted-foreground hover:text-white">
                                <X className="w-4 h-4" />
                             </button>
                          </div>
                          <input 
                            type="tel" 
                            placeholder="Votre téléphone"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary"
                          />
                          <div className="flex gap-2">
                            <input 
                              type="text" 
                              placeholder="Code ex: GIFT-ABC"
                              value={promoCode}
                              onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                              className="flex-1 bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary uppercase placeholder:normal-case font-mono"
                            />
                            <button 
                              onClick={handleApplyPromo}
                              disabled={isVerifyingPromo || !promoCode || !phone}
                              className="bg-primary text-primary-foreground px-6 rounded-xl font-bold disabled:opacity-50"
                            >
                              {isVerifyingPromo ? <Loader2 className="w-4 h-4 animate-spin" /> : "Appliquer"}
                            </button>
                          </div>
                        </div>
                     )}
                  </div>
                )}
              </div>
            )}

            {/* Footer */}
            <div className="p-6 bg-secondary/20 border-t border-border mt-auto">
               {(discountAmount > 0) && (
                 <div className="flex justify-between items-center mb-2 px-1">
                   <span className="text-emerald-500 font-bold text-xs uppercase tracking-widest">Remise Fidélité</span>
                   <span className="text-emerald-500 font-bold text-sm">-${discountAmount.toFixed(2)}</span>
                 </div>
               )}
               <div className="flex justify-between items-end mb-6">
                  <span className="text-muted-foreground text-sm font-bold uppercase tracking-wider">Total Final</span>
                  <div className="text-right">
                     <p className="text-3xl font-black text-primary">${totalUsd.toFixed(2)}</p>
                     <p className="text-xs font-medium text-muted-foreground">{totalCdf.toLocaleString()} FC</p>
                  </div>
               </div>

               <button 
                 disabled={isSubmitting || !customerName || !phone}
                 onClick={handlePlaceOrder}
                 className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-primary-foreground py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 shadow-xl shadow-primary/20"
               >
                 {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Continuer"}
                 {!isSubmitting && <ChevronRight className="w-5 h-5" />}
               </button>
            </div>
          </div>
        )}

        {step === 2 && (
           <div className="flex flex-col h-[85vh] md:h-auto md:max-h-[85vh] p-8 animate-in slide-in-from-right-8">
              <div className="text-center mb-8">
                 <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-8 h-8 text-primary" />
                 </div>
                 <h2 className="text-2xl font-black text-foreground">Commande Validée !</h2>
                 <p className="text-muted-foreground mt-2">Où devons-nous vous livrer ?</p>
              </div>

              <div className="space-y-4 flex-1 overflow-y-auto pr-2">
                 <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground flex gap-1.5 items-center"><MapPin className="w-3.5 h-3.5"/> Commune (Obligatoire)</label>
                    <input 
                      value={commune} onChange={e => setCommune(e.target.value)}
                      placeholder="Ex: Lubumbashi" 
                      className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary"
                    />
                 </div>
                 <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground">Quartier (Obligatoire)</label>
                    <input 
                      value={quartier} onChange={e => setQuartier(e.target.value)}
                      placeholder="Ex: Golf" 
                      className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary"
                    />
                 </div>
                 <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground">Avenue (Obligatoire)</label>
                    <input 
                      value={avenue} onChange={e => setAvenue(e.target.value)}
                      placeholder="Ex: Chemin Public" 
                      className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary"
                    />
                 </div>
                 <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground">Numéro de Parcelle (Obligatoire)</label>
                    <input 
                      value={numero} onChange={e => setNumero(e.target.value)}
                      placeholder="Ex: 10 A" 
                      className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary"
                    />
                 </div>
              </div>

              <div className="mt-8 pt-4">
                 <button 
                   disabled={isSubmitting || !commune || !quartier || !avenue || !numero}
                   onClick={handleSaveAddress}
                   className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 shadow-xl shadow-primary/20"
                 >
                   {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Confirmer mon adresse"}
                 </button>
              </div>
           </div>
        )}
      </div>
    </>
  );
}
