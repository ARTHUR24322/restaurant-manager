"use client"

import React, { useState } from 'react';
import { CheckCircle, ArrowRight, ShoppingBag, Gift, Phone, Loader2, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { assignPhoneToOrder } from "@/lib/actions";

interface OrderSuccessProps {
  isOpen: boolean;
  onClose: () => void;
  orderId?: string;
}

export function OrderSuccess({ isOpen, onClose, orderId }: OrderSuccessProps) {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [isLoyaltyLoading, setIsLoyaltyLoading] = useState(false);
  const [loyaltyStatus, setLoyaltyStatus] = useState<any>(null);
  const [step, setStep] = useState<"phone" | "name" | "result">("phone");

  if (!isOpen) return null;

  const handlePhoneSubmit = async () => {
    if (!phone || !orderId) return;
    setIsLoyaltyLoading(true);
    // First check: send phone without name to see if customer exists
    const status = await assignPhoneToOrder(orderId, phone);
    setIsLoyaltyLoading(false);

    if (status.success) {
      if (status.isNewCustomer) {
        // New customer → ask for their name
        setStep("name");
      } else {
        // Returning customer → show points directly
        setLoyaltyStatus(status);
        setStep("result");
      }
    }
  };

  const handleNameSubmit = async () => {
    if (!customerName.trim() || !orderId) return;
    setIsLoyaltyLoading(true);
    // Re-assign with customer name for the new account
    const status = await assignPhoneToOrder(orderId, phone, customerName.trim());
    setIsLoyaltyLoading(false);

    if (status.success) {
      setLoyaltyStatus(status);
      setStep("result");
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-background/90 backdrop-blur-md"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative bg-card border border-border shadow-2xl rounded-3xl p-8 max-w-sm w-full text-center space-y-6 transform animate-in zoom-in-95 slide-in-from-bottom-10 duration-200">
        
        {/* Success Icon Container */}
        <div className="relative mx-auto w-24 h-24 flex items-center justify-center">
            {/* Animated Rings */}
            <div className="absolute inset-0 bg-emerald-500/20 rounded-full animate-ping" />
            <div className="absolute inset-2 bg-emerald-500/30 rounded-full animate-pulse" />
            <div className="relative z-10 w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/40">
                <CheckCircle className="w-12 h-12 text-white" />
            </div>
        </div>

        <div className="space-y-2">
            <h2 className="text-3xl font-black italic tracking-tight text-primary">Très bien !</h2>
            <p className="text-muted-foreground font-medium">Votre commande a été transmise avec succès au Manager et à la Cuisine.</p>
        </div>

        {orderId && step === "phone" && (
            <div className="bg-secondary/50 p-3 rounded-xl border border-border">
                <span className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Numéro de Commande</span>
                <span className="font-mono font-bold text-lg select-all">#{orderId}</span>
            </div>
        )}

        {/* --------- LOYALTY: STEP 1 - PHONE --------- */}
        {orderId && step === "phone" && (
          <div className="bg-pink-500/5 border border-pink-500/20 rounded-2xl p-4 animate-in slide-in-from-bottom-4 duration-300">
             <div className="flex items-center justify-center gap-2 mb-3 text-pink-500">
               <Gift className="w-5 h-5 animate-bounce" />
               <p className="text-xs font-black uppercase tracking-widest">Programme Fidélité</p>
             </div>
             <p className="text-[11px] text-muted-foreground mb-4">Entrez votre numéro pour cumuler vos points et recevoir un cadeau exclusif !</p>
             
             <form 
              className="flex items-center gap-2"
              onSubmit={async (e) => {
                e.preventDefault();
                await handlePhoneSubmit();
              }}
             >
                <div className="relative flex-1">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input 
                     type="tel"
                     placeholder="081..."
                     value={phone}
                     onChange={(e) => setPhone(e.target.value)}
                     className="w-full bg-background border border-border rounded-xl py-2.5 pl-9 text-sm text-foreground focus:ring-2 focus:ring-pink-500/50 outline-none"
                  />
                </div>
                <button 
                  type="submit"
                  disabled={isLoyaltyLoading || phone.length < 9}
                  className="bg-pink-500 text-white rounded-xl px-4 py-2.5 font-bold text-sm tracking-wide disabled:opacity-50 hover:bg-pink-600 transition-colors flex items-center justify-center min-w-[4rem]"
                >
                  {isLoyaltyLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Go !"}
                </button>
             </form>
          </div>
        )}

        {/* --------- LOYALTY: STEP 2 - NAME (new customer) --------- */}
        {orderId && step === "name" && (
          <div className="bg-pink-500/5 border border-pink-500/20 rounded-2xl p-5 animate-in zoom-in-95 slide-in-from-bottom-4 duration-300 space-y-4">
             <div className="flex items-center justify-center gap-2 text-pink-500">
               <Gift className="w-5 h-5" />
               <p className="text-xs font-black uppercase tracking-widest">Bienvenue !</p>
             </div>
             <div className="w-14 h-14 bg-pink-500 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-pink-500/40">
               <User className="w-7 h-7 text-white" />
             </div>
             <p className="text-sm font-bold text-foreground">C'est votre première visite !</p>
             <p className="text-[11px] text-muted-foreground">
               Entrez votre prénom pour créer votre compte fidélité et commencer à accumuler des points.
             </p>
             
             <form 
              className="flex items-center gap-2"
              onSubmit={async (e) => {
                e.preventDefault();
                await handleNameSubmit();
              }}
             >
                <div className="relative flex-1">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input 
                     type="text"
                     placeholder="Votre prénom..."
                     value={customerName}
                     onChange={(e) => setCustomerName(e.target.value)}
                     className="w-full bg-background border border-border rounded-xl py-2.5 pl-9 text-sm text-foreground focus:ring-2 focus:ring-pink-500/50 outline-none"
                     autoFocus
                  />
                </div>
                <button 
                  type="submit"
                  disabled={isLoyaltyLoading || customerName.trim().length < 2}
                  className="bg-pink-500 text-white rounded-xl px-4 py-2.5 font-bold text-sm tracking-wide disabled:opacity-50 hover:bg-pink-600 transition-colors flex items-center justify-center min-w-[4rem]"
                >
                  {isLoyaltyLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "OK"}
                </button>
             </form>
          </div>
        )}

        {/* --------- LOYALTY: STEP 3 - RESULT --------- */}
        {loyaltyStatus && step === "result" && (
          <div className="bg-pink-500/10 border border-pink-500/20 rounded-2xl p-5 animate-in zoom-in-95 duration-500 shadow-[0_0_20px_-5px_rgba(236,72,153,0.3)]">
              <div className="w-12 h-12 bg-pink-500 rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg shadow-pink-500/40">
                  <Gift className="w-6 h-6 text-white" />
              </div>
              
              {loyaltyStatus.isNewCustomer ? (
                <h3 className="text-lg font-black italic text-pink-500 uppercase">Bienvenue {loyaltyStatus.customerName} !</h3>
              ) : (
                <h3 className="text-lg font-black italic text-pink-500 uppercase">
                  Rebonjour {loyaltyStatus.customerName} !
                </h3>
              )}
              
              <p className="text-xs text-foreground font-bold mt-1">Vous gagnez <span className="text-pink-500 text-base">{loyaltyStatus.potentialPoints} points</span></p>
              
              <div className="w-full bg-background border border-border h-3 rounded-full mt-4 overflow-hidden relative">
                  <div 
                    className="absolute top-0 left-0 h-full bg-gradient-to-r from-pink-500 to-purple-500 transition-all duration-1000 ease-out"
                    style={{ width: `${Math.min(100, Math.max(5, ((loyaltyStatus.currentPoints + loyaltyStatus.potentialPoints) / loyaltyStatus.threshold) * 100))}%` }}
                  />
              </div>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-2">
                 Total: {loyaltyStatus.currentPoints + loyaltyStatus.potentialPoints} / {loyaltyStatus.threshold}
              </p>
              {loyaltyStatus.currentPoints + loyaltyStatus.potentialPoints >= loyaltyStatus.threshold && (
                 <p className="text-xs text-white bg-pink-500 rounded-full py-1 mt-3 font-bold animate-pulse">
                    🎉 Bravo ! Cadeau débloqué !
                 </p>
              )}
          </div>
        )}

        <div className="space-y-3 pt-4">
            <button 
                onClick={onClose}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-xl shadow-primary/20 group"
            >
                <ShoppingBag className="w-5 h-5 group-hover:animate-bounce" />
                Continuer mes achats
            </button>
            
            <button 
                onClick={() => {
                  router.push(`/client/order-tracker?orderId=${orderId}&resto_id=${loyaltyStatus?.restaurantId || ""}`);
                  onClose();
                }}
                className="w-full bg-secondary hover:bg-secondary/80 text-foreground font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-colors"
            >
                Suivre ma commande
                <ArrowRight className="w-4 h-4" />
            </button>
        </div>

        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest pt-2">SmartResto • Service Premium</p>
      </div>
    </div>
  );
}
