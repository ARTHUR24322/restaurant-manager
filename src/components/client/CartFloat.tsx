"use client"
/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-unused-vars */

import { useCartStore } from "@/store/cartStore";
import { ShoppingCart, X, Plus, Minus, CreditCard, Loader2, Ticket, Phone, Trash2, CheckCircle2, ChevronDown, Sparkles } from "lucide-react";
import { type ClientReward } from "@/types";
import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { createCommande } from "@/lib/actions";
import { OrderSuccess } from "./OrderSuccess";
import { toast } from "sonner";

export function CartFloat({ restaurantId, exchangeRate = 2800 }: { restaurantId?: string, exchangeRate?: number }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastOrderId, setLastOrderId] = useState<string | undefined>();
  const [promoCode, setPromoCode] = useState("");
  const [promoPhone, setPromoPhone] = useState("");
  const [isPromoOpen, setIsPromoOpen] = useState(false);
  const [appliedPromo, setAppliedPromo] = useState<ClientReward | null>(null);
  const [isVerifyingPromo, setIsVerifyingPromo] = useState(false);
  const [availableRewards, setAvailableRewards] = useState<ClientReward[]>([]);
  
  const searchParams = useSearchParams();
  const tableNumber = searchParams.get("table") || "Inconnue";
  const customerName = searchParams.get("name") || "Client";
  
  const { items, getTotalUsd, removeItem, updateQuantity, clearCart, addOfflineOrder, addSubmittedOrderId } = useCartStore();

  const baseTotalUsd = getTotalUsd(exchangeRate);
  
  const fetchAvailableRewards = useCallback(async (phone: string) => {
     try {
        const { getClientLoyalty } = await import("@/lib/actions-loyalty");
        const res = await getClientLoyalty(restaurantId || "", phone);
        if (res.success) {
           setAvailableRewards(res.myRewards || []);
        }
     } catch (_e) {}
  }, [restaurantId]);

  useEffect(() => {
    const saved = localStorage.getItem('sr_applied_promo');
    if (saved) setAppliedPromo(JSON.parse(saved));

    const savedPhone = localStorage.getItem('sr_loyalty_phone');
    if (savedPhone && restaurantId) {
      setPromoPhone(savedPhone);
      fetchAvailableRewards(savedPhone);
    }
  }, [restaurantId, fetchAvailableRewards]);

  const discountPercent = appliedPromo?.discountValue || 0;
  const discountAmount = (baseTotalUsd * discountPercent) / 100;
  const totalUsd = baseTotalUsd - discountAmount;
  const totalCdf = totalUsd * exchangeRate;

  const handleApplyPromo = async (code?: string, phone?: string) => {
    const c = code || promoCode;
    const p = phone || promoPhone;

    if (!c || !p) {
      toast.error("Code promo ou téléphone manquant.");
      return;
    }

    setIsVerifyingPromo(true);
    try {
      const { validateAndApplyPromo } = await import("@/lib/actions-loyalty");
      const res = await validateAndApplyPromo(restaurantId || "", c, p);
      if (res.success && res.reward) {
        toast.success(`Succès ! -${res.reward.discountValue}% appliqué 🎊`, {
          icon: <Sparkles className="w-5 h-5 text-emerald-500" />
        });
        setAppliedPromo(res.reward);
        localStorage.setItem('sr_applied_promo', JSON.stringify(res.reward));
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
    localStorage.removeItem('sr_applied_promo');
    toast.info("Code promo retiré.");
  };

  const handleConfirmOrder = async () => {
    setIsSubmitting(true);
    const orderData = {
      cartItems: items,
      tableNumber: tableNumber,
      customerName: customerName,
      totalUsd: totalUsd,
      notes: (document.querySelector('textarea') as HTMLTextAreaElement)?.value || "",
      restaurantId: restaurantId,
      promoRewardId: appliedPromo?.id
    };

    try {
      if (!navigator.onLine) {
        const tempId = addOfflineOrder(orderData);
        addSubmittedOrderId(tempId);
        setShowSuccess(true);
        clearCart();
        setIsOpen(false);
        return;
      }

      const res = await createCommande(orderData);
      if (res.success) {
        if (appliedPromo) localStorage.removeItem('sr_applied_promo');
        setLastOrderId(res.orderId);
        if (res.orderId) addSubmittedOrderId(res.orderId);
        setShowSuccess(true);
        clearCart();
        setIsOpen(false);
      } else {
        toast.error("Serveur indisponible. Sauvegarde locale effectuée.");
        const tempId = addOfflineOrder(orderData);
        addSubmittedOrderId(tempId);
        setShowSuccess(true);
        clearCart();
        setIsOpen(false);
      }
    } catch (_error) {
       const tempId = addOfflineOrder(orderData);
       addSubmittedOrderId(tempId);
       setShowSuccess(true);
       clearCart();
       setIsOpen(false);
    } finally {
       setIsSubmitting(false);
    }
  };

  if (items.length === 0 && !showSuccess) return null;

  return (
    <>
      <OrderSuccess isOpen={showSuccess} onClose={() => setShowSuccess(false)} orderId={lastOrderId} />

      {isOpen && (
        <div className="fixed inset-0 bg-background/90 backdrop-blur-md z-40" onClick={() => setIsOpen(false)} />
      )}

      {/* Floating Button */}
      {!isOpen && items.length > 0 && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 rounded-2xl bg-primary text-black px-6 py-4 shadow-2xl flex items-center gap-4 hover:scale-105 active:scale-95 transition-all duration-300 animate-in slide-in-from-bottom-5"
        >
          <div className="relative">
            <ShoppingCart className="w-5 h-5" />
            <span className="absolute -top-3 -right-3 bg-white text-black w-5 h-5 rounded-full text-[10px] flex items-center justify-center font-black border border-zinc-200">
               {items.length}
            </span>
          </div>
          <span className="font-black text-sm">${totalUsd.toFixed(2)}</span>
        </button>
      )}

      {/* Cart Drawer */}
      <div className={cn(
        "fixed bottom-0 left-0 right-0 md:left-auto md:right-6 md:bottom-6 md:w-[420px] bg-zinc-950 border-t md:border border-white/5 shadow-2xl md:rounded-[3rem] rounded-t-[3rem] z-50 transform transition-transform duration-500 ease-&lsqb;cubic-bezier(0.33,1,0.68,1)&rsqb;",
        isOpen ? "translate-y-0" : "translate-y-full"
      )}>
        <div className="w-full flex justify-center py-3 md:hidden">
            <div className="w-12 h-1 bg-white/10 rounded-full" />
        </div>

        <div className="px-8 py-6 flex items-center justify-between">
           <h2 className="text-xl font-black uppercase italic tracking-tighter text-white">Votre Panier</h2>
           <button onClick={() => setIsOpen(false)} className="p-2 bg-white/5 rounded-full text-zinc-500 hover:text-white transition-colors">
              <X className="w-4 h-4" />
           </button>
        </div>

        <div className="px-8 flex flex-col gap-4 max-h-[40vh] overflow-y-auto no-scrollbar pb-6 text-white">
          {items.map((item) => (
            <div key={item.cartItemId} className="flex gap-4 items-center bg-zinc-900/50 p-4 rounded-3xl border border-white/5">
              <img src={item.plat.image} alt={item.plat.nom} className="w-16 h-16 rounded-2xl object-cover" />
              <div className="flex-1">
                <h4 className="font-bold text-xs">{item.plat.nom}</h4>
                <p className="text-primary font-black text-xs mt-1">${item.plat.prixUsd.toFixed(2)}</p>
              </div>
              <div className="flex items-center gap-3 bg-black/40 px-3 py-2 rounded-2xl border border-white/5">
                <button onClick={() => item.quantite > 1 ? updateQuantity(item.cartItemId, item.quantite - 1) : removeItem(item.cartItemId)}>
                  <Minus className="w-3 h-3 text-white/50 hover:text-white" />
                </button>
                <span className="font-black text-xs w-4 text-center">{item.quantite}</span>
                <button onClick={() => updateQuantity(item.cartItemId, item.quantite + 1)}>
                  <Plus className="w-3 h-3 text-white/50 hover:text-white" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer Area */}
        <div className="p-8 bg-zinc-900/50 border-t border-white/5 rounded-b-[3rem]">
          {/* Promo Section */}
          <div className="mb-6">
            <h3 className="text-[9px] font-black uppercase text-zinc-500 tracking-[0.2em] mb-3">Offres & Codes Promo</h3>
            
            {appliedPromo ? (
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3 text-emerald-500">
                  <Ticket className="w-5 h-5" />
                  <span className="text-xs font-black uppercase">{appliedPromo.promoCode} (-{appliedPromo.discountValue}%)</span>
                </div>
                <button onClick={removePromo} className="text-emerald-500/50 hover:text-emerald-500">
                   <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-2 px-2">
                {availableRewards.length > 0 ? (
                  availableRewards.map(reward => (
                    <button
                      key={reward.id}
                      onClick={() => handleApplyPromo(reward.promoCode || undefined, promoPhone)}
                      className="bg-primary/10 border border-primary/20 text-primary px-4 py-3 rounded-2xl flex items-center gap-2 whitespace-nowrap animate-in fade-in"
                    >
                      <Ticket className="w-4 h-4" />
                      <span className="text-[10px] font-black uppercase tracking-widest">{reward.promoCode}</span>
                    </button>
                  ))
                ) : (
                  <button 
                    onClick={() => setIsPromoOpen(!isPromoOpen)}
                    className="w-full bg-white/5 border border-white/5 text-zinc-500 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2"
                  >
                    <Plus className="w-3 h-3" /> Saisir un code promo
                  </button>
                )}
              </div>
            )}

            {isPromoOpen && !appliedPromo && (
              <div className="mt-4 flex gap-2 animate-in slide-in-from-top-2">
                <input 
                  type="text" 
                  placeholder="CODE" 
                  value={promoCode} 
                  onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                  className="flex-1 bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-xs font-black text-white outline-none focus:ring-1 focus:ring-primary" 
                />
                <button 
                  onClick={() => handleApplyPromo()}
                  disabled={isVerifyingPromo || !promoPhone}
                  className="bg-primary text-black px-4 py-3 rounded-xl text-[10px] font-black uppercase"
                >
                  {isVerifyingPromo ? <Loader2 className="w-3 h-3 animate-spin" /> : "OK"}
                </button>
              </div>
            )}
          </div>

          <div className="space-y-3 mb-8">
             <div className="flex justify-between text-xs text-zinc-500 font-bold uppercase tracking-widest">
                <span>Total</span>
                <span>${baseTotalUsd.toFixed(2)}</span>
             </div>
             {discountAmount > 0 && (
               <div className="flex justify-between text-emerald-500 text-xs font-black uppercase tracking-widest">
                  <span>Réduction</span>
                  <span>-${discountAmount.toFixed(2)}</span>
               </div>
             )}
             <div className="flex justify-between items-end pt-3 border-t border-white/5">
                <span className="text-white text-base font-black italic">Total final</span>
                <div className="text-right">
                   <p className="text-3xl font-black text-primary">${totalUsd.toFixed(2)}</p>
                   <p className="text-[10px] font-mono text-zinc-600 tracking-tighter">{totalCdf.toLocaleString()} FC</p>
                </div>
             </div>
          </div>

          <button 
            disabled={isSubmitting}
            onClick={handleConfirmOrder}
            className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 text-black py-5 rounded-[2rem] font-black uppercase tracking-[0.2em] shadow-2xl shadow-primary/20 transition-all active:scale-95 text-xs flex items-center justify-center gap-3"
          >
            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
            {isSubmitting ? "Envoi..." : "Commander maintenant"}
          </button>
        </div>
      </div>
    </>
  );
}
