"use client"

import { useCartStore } from "@/store/cartStore";
import { ShoppingCart, X, Plus, Minus, CreditCard, Loader2, Ticket, Phone, Trash2, CheckCircle2, ChevronDown } from "lucide-react";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { createCommande } from "@/lib/actions";
import { OrderSuccess } from "./OrderSuccess";
import { toast } from "sonner";

// Composant flottant pour le client affichant le total en live
export function CartFloat({ restaurantId, exchangeRate = 2800 }: { restaurantId?: string, exchangeRate?: number }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastOrderId, setLastOrderId] = useState<string | undefined>();
  const [promoCode, setPromoCode] = useState("");
  const [promoPhone, setPromoPhone] = useState("");
  const [isPromoOpen, setIsPromoOpen] = useState(false);
  const [appliedPromo, setAppliedPromo] = useState<any>(null);
  const [isVerifyingPromo, setIsVerifyingPromo] = useState(false);
  
  const searchParams = useSearchParams();
  const tableNumber = searchParams.get("table") || "Inconnue";
  const customerName = searchParams.get("name") || "Client";
  
  const { items, getTotalUsd, removeItem, updateQuantity, clearCart, addOfflineOrder, addSubmittedOrderId } = useCartStore();

  const baseTotalUsd = getTotalUsd(exchangeRate);
  
  // Promo Logic
  useEffect(() => {
    const saved = localStorage.getItem('sr_applied_promo');
    if (saved) setAppliedPromo(JSON.parse(saved));
  }, []);

  const discountPercent = appliedPromo?.discountValue || 0;
  const discountAmount = (baseTotalUsd * discountPercent) / 100;
  const totalUsd = baseTotalUsd - discountAmount;
  const totalCdf = totalUsd * exchangeRate;

  const handleApplyPromo = async () => {
    if (!promoCode || !promoPhone) {
      toast.error("Veuillez saisir le code et votre numéro.");
      return;
    }
    setIsVerifyingPromo(true);
    try {
      const { validateAndApplyPromo } = await import("@/lib/actions-loyalty");
      const res = await validateAndApplyPromo(restaurantId || "", promoCode, promoPhone);
      if (res.success && res.reward) {
        toast.success(`Réduction de ${res.reward.discountValue}% appliquée !`);
        setAppliedPromo(res.reward);
        localStorage.setItem('sr_applied_promo', JSON.stringify(res.reward));
        setPromoCode("");
        setPromoPhone("");
      } else {
        toast.error(res.error || "Code ou numéro invalide.");
      }
    } catch(e) {
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
    
    // Données de la commande
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
      // 1. Vérifier si on est en ligne
      if (!navigator.onLine) {
        const tempId = addOfflineOrder(orderData);
        addSubmittedOrderId(tempId); // On suit aussi les commandes offline
        toast.info("Connexion perdue. Commande enregistrée localement. Elle sera envoyée dès le retour d'Internet.");
        setShowSuccess(true);
        clearCart();
        setIsOpen(false);
        return;
      }

      // 2. Si en ligne, envoyer normalement
      const res = await createCommande(orderData);

      if (res.success) {
        if (appliedPromo) localStorage.removeItem('sr_applied_promo');
        setLastOrderId(res.orderId);
        if (res.orderId) {
          addSubmittedOrderId(res.orderId);
        }
        setShowSuccess(true);
        clearCart();
        setIsOpen(false);
      } else {
        // En cas d'erreur serveur (ex: timeout), proposer de sauvegarder en hors-ligne
        toast.error("Le serveur ne répond pas. Commande sauvegardée en attente.");
        const tempId = addOfflineOrder(orderData);
        addSubmittedOrderId(tempId);
        setShowSuccess(true);
        clearCart();
        setIsOpen(false);
      }
    } catch (error) {
       console.error(error);
       // En cas de plantage réseau brutal, sauver en local
       const tempId = addOfflineOrder(orderData);
       addSubmittedOrderId(tempId);
       toast.warning("Erreur réseau. Commande mise en attente de synchronisation.");
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
      <OrderSuccess 
        isOpen={showSuccess} 
        onClose={() => setShowSuccess(false)} 
        orderId={lastOrderId}
      />

      {/* Overlay Sombre pour Focus */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Bouton Flottant Fermé */}
      {!isOpen && items.length > 0 && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 rounded-full bg-primary text-black px-6 py-4 shadow-[0_0_40px_-10px_rgba(var(--primary),0.8)] flex items-center gap-4 hover:scale-105 active:scale-95 transition-all duration-300 animate-in slide-in-from-bottom-5"
        >
          <div className="relative flex items-center justify-center">
            <ShoppingCart className="w-5 h-5" />
            <span className="absolute -top-3 -right-4 bg-white text-black w-5 h-5 rounded-full text-[10px] flex items-center justify-center font-black shadow-md border border-zinc-200">
              {items.length}
            </span>
          </div>
          <div className="w-px h-5 bg-black/20" />
          <span className="font-black text-sm">${totalUsd.toFixed(2)}</span>
        </button>
      )}

      {/* Modal Panier Ouvert - Style Tiroir iOS */}
      <div
        className={cn(
          "fixed bottom-0 left-0 right-0 md:left-auto md:right-6 md:bottom-6 md:w-[420px] bg-zinc-950/80 backdrop-blur-3xl md:border border-t border-white/10 shadow-[0_-20px_60px_-20px_rgba(0,0,0,0.8)] md:rounded-[2.5rem] rounded-t-[2.5rem] z-50 transform transition-transform duration-500 ease-out",
          isOpen ? "translate-y-0" : "translate-y-full md:translate-y-[120%]"
        )}
      >
        {/* Poignée (Handle) */}
        <div className="w-full flex justify-center pt-4 pb-2 md:hidden">
            <div className="w-12 h-1.5 bg-zinc-700/50 rounded-full" />
        </div>

        <div className="px-6 py-4 flex items-center justify-between border-b border-white/5">
          <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-3 text-white">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                <ShoppingCart className="w-4 h-4" />
            </div>
            Votre Panier
          </h2>
          <button 
            onClick={() => setIsOpen(false)}
            className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 text-zinc-400 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 flex flex-col gap-4 max-h-[50vh] overflow-y-auto no-scrollbar">
          {items.map((item) => (
            <div key={item.cartItemId} className="flex gap-4 items-center bg-zinc-900/50 p-3 rounded-2xl border border-white/5 group">
              {/* Image Miniature */}
              <div className="w-16 h-16 rounded-[1rem] overflow-hidden shrink-0">
                <img 
                  src={item.plat.image} 
                  alt={item.plat.nom}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
              </div>

              {/* Infos Plat */}
              <div className="flex-1">
                <h4 className="font-bold text-sm text-white/90">{item.plat.nom}</h4>
                <p className="text-primary font-black text-sm mt-0.5">
                  {item.plat.devise === "USD" ? "$" : ""}{item.plat.prixUsd.toFixed(2)}{item.plat.devise === "FC" ? " FC" : ""}
                </p>
                {/* Options choisies */}
                {Object.keys(item.selectedOptions).length > 0 && (
                  <div className="text-[10px] text-zinc-500 mt-1.5 flex flex-wrap gap-1 font-bold uppercase tracking-widest">
                    {Object.entries(item.selectedOptions).map(([key, val]) => (
                      <span key={key} className="bg-white/5 px-2 py-1 rounded-md">
                        {Array.isArray(val) ? val.join(", ") : val}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Contrôles Quantité */}
              <div className="flex flex-col items-center gap-2 bg-black/40 rounded-full p-2 border border-white/5">
                <button 
                  onClick={() => updateQuantity(item.cartItemId, item.quantite + 1)}
                  className="w-6 h-6 rounded-full hover:bg-white/10 text-white flex items-center justify-center transition-colors"
                >
                  <Plus className="w-3 h-3" />
                </button>
                <span className="font-black text-xs text-white">{item.quantite}</span>
                <button 
                  onClick={() => item.quantite > 1 ? updateQuantity(item.cartItemId, item.quantite - 1) : removeItem(item.cartItemId)}
                  className="w-6 h-6 rounded-full hover:bg-red-500/20 text-red-400 flex items-center justify-center transition-colors"
                >
                  <Minus className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Pied : Totaux et Action */}
        <div className="p-6 bg-zinc-950 rounded-b-[2.5rem] md:rounded-b-[2.5rem] border-t border-white/5">
          
          <div className="mb-6 space-y-4">
            <textarea 
              placeholder="Une note spéciale ? (Allergie, extra...)" 
              className="w-full text-xs bg-black/40 border border-white/10 rounded-2xl p-4 resize-none focus:ring-1 focus:ring-primary h-14 text-white placeholder:text-zinc-700 outline-none transition-all shadow-inner"
              disabled={isSubmitting}
            />

            {/* --- LOYALTY & PROMO SECTION --- */}
            <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden relative transition-all duration-300">
               {appliedPromo ? (
                 <div className="flex items-center justify-between bg-emerald-500/10 p-4">
                    <div className="flex items-center gap-3">
                       <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                       <div>
                          <p className="text-white text-xs font-black uppercase tracking-widest">{appliedPromo.promoCode}</p>
                          <p className="text-emerald-500 text-[10px] font-bold">Réduction de {appliedPromo.discountValue}% appliquée</p>
                       </div>
                    </div>
                    <button 
                      onClick={removePromo}
                      className="p-2 hover:bg-emerald-500/10 text-emerald-500 rounded-xl transition-colors"
                    >
                       <Trash2 className="w-4 h-4" />
                    </button>
                 </div>
               ) : (
                 <>
                   <button 
                     onClick={() => setIsPromoOpen(!isPromoOpen)}
                     className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
                   >
                     <h3 className="text-[10px] font-black uppercase text-zinc-500 tracking-[0.2em] flex items-center gap-2">
                        <Ticket className="w-3 h-3 text-primary" /> Avez-vous un code promo ?
                     </h3>
                     <ChevronDown className={cn("w-4 h-4 text-zinc-500 transition-transform duration-300", isPromoOpen ? "rotate-180" : "")} />
                   </button>
                   
                   {isPromoOpen && (
                     <div className="p-4 pt-0 space-y-3 animate-in slide-in-from-top-2 duration-300 border-t border-white/5 mt-2">
                        <div className="grid grid-cols-1 gap-2">
                            <div className="relative">
                                <input 
                                  type="text" 
                                  placeholder="CODE PROMO" 
                                  value={promoCode}
                                  onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                                  className="w-full text-xs font-bold uppercase bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-zinc-700 outline-none focus:ring-1 focus:ring-primary transition-all pr-10"
                                />
                                <Ticket className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-700" />
                            </div>
                            <div className="relative">
                                <input 
                                  type="tel" 
                                  placeholder="VOTRE NUMÉRO" 
                                  value={promoPhone}
                                  onChange={(e) => setPromoPhone(e.target.value)}
                                  className="w-full text-xs font-bold bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-zinc-700 outline-none focus:ring-1 focus:ring-primary transition-all pr-10 font-mono"
                                />
                                <Phone className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-700" />
                            </div>
                        </div>
                        <button 
                          onClick={handleApplyPromo}
                          disabled={isVerifyingPromo || !promoCode || !promoPhone}
                          className="w-full bg-primary hover:bg-primary/90 disabled:opacity-30 text-black rounded-xl text-[10px] font-black uppercase tracking-[0.1em] py-3 transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
                        >
                          {isVerifyingPromo ? <Loader2 className="w-3 h-3 animate-spin" /> : "Appliquer"}
                        </button>
                     </div>
                   )}
                 </>
               )}
            </div>
          </div>

          <div className="space-y-4 mb-8 bg-zinc-900 border border-white/5 rounded-[2rem] p-6">
              <div className="space-y-2">
                <div className="flex justify-between items-center text-zinc-500 text-[10px] font-black uppercase tracking-widest">
                  <span>Sous-total</span>
                  <span>${baseTotalUsd.toFixed(2)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between items-center text-emerald-500 text-[10px] font-black uppercase tracking-widest animate-in slide-in-from-left-2 duration-300">
                    <span className="flex items-center gap-2">
                       <CheckCircle2 className="w-3 h-3" /> Réduction Loyalty ({discountPercent}%)
                    </span>
                    <span>-${discountAmount.toFixed(2)}</span>
                  </div>
                )}
              </div>
              
              <div className="h-px bg-white/5 w-full" />

              <div className="flex justify-between items-end">
                <span className="text-white text-sm font-black uppercase tracking-widest italic">Total à payer</span>
                <div className="flex flex-col items-end">
                    <span className="font-black text-3xl text-primary drop-shadow-[0_0_15px_rgba(var(--primary),0.3)]">${totalUsd.toFixed(2)}</span>
                    <span className="text-[10px] font-bold text-zinc-500 mt-1 font-mono tracking-tighter">{totalCdf.toLocaleString('fr-CD')} FC</span>
                </div>
              </div>
          </div>

          <button 
            onClick={handleConfirmOrder}
            disabled={isSubmitting}
            className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 text-black font-black uppercase tracking-[0.2em] py-5 rounded-[2rem] flex items-center justify-center gap-4 transition-all active:scale-[0.98] shadow-2xl shadow-primary/20 text-xs"
          >
            {isSubmitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
                <CheckCircle2 className="w-5 h-5" />
            )}
            {isSubmitting ? "Enregistrement..." : "Confirmer ma Commande"}
          </button>

          <p className="text-[9px] text-zinc-600 text-center mt-6 font-black uppercase tracking-widest italic">
            Paiement sécurisé au comptoir ou à table
          </p>
        </div>
      </div>
    </>
  );
}
