"use client"

import { useCartStore } from "@/store/cartStore";
import { ShoppingCart, X, Plus, Minus, CreditCard, Loader2 } from "lucide-react";
import { useState } from "react";
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
  
  const searchParams = useSearchParams();
  const tableNumber = searchParams.get("table") || "Inconnue";
  const customerName = searchParams.get("name") || "Client";
  
  const { items, getTotalUsd, removeItem, updateQuantity, clearCart, addOfflineOrder, addSubmittedOrderId } = useCartStore();

  const totalUsd = getTotalUsd();
  const totalCdf = totalUsd * exchangeRate;

  const handleConfirmOrder = async () => {
    setIsSubmitting(true);
    
    // Données de la commande
    const orderData = {
      cartItems: items,
      tableNumber: tableNumber,
      customerName: customerName,
      totalUsd: totalUsd,
      notes: (document.querySelector('textarea') as HTMLTextAreaElement)?.value || "",
      restaurantId: restaurantId
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
                  ${item.plat.prixUsd.toFixed(2)}
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
        <div className="p-6 bg-zinc-900/80 rounded-b-[2.5rem] md:rounded-b-[2.5rem] border-t border-white/5">
          
          <div className="mb-6">
            <textarea 
              placeholder="Une note spéciale ? (Allergie, extra...)" 
              className="w-full text-sm bg-black/40 border border-white/10 rounded-2xl p-4 resize-none focus:ring-1 focus:ring-primary h-20 text-white placeholder:text-zinc-600 outline-none transition-all"
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2 mb-6">
              <div className="flex justify-between items-end border-b border-white/5 pb-2">
                <span className="text-zinc-400 text-xs font-bold uppercase tracking-widest">Total USD</span>
                <span className="font-black text-2xl text-white">${totalUsd.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-600 font-medium">Taux indicatif: 1$ = {exchangeRate} FC</span>
                <span className="font-bold text-zinc-500">{totalCdf.toLocaleString('fr-CD')} FC</span>
              </div>
          </div>

          <button 
            onClick={handleConfirmOrder}
            disabled={isSubmitting}
            className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 text-black font-black uppercase tracking-widest py-4 rounded-2xl flex items-center justify-center gap-3 transition-transform active:scale-95 shadow-lg shadow-primary/20 text-sm"
          >
            {isSubmitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
                <CreditCard className="w-5 h-5" />
            )}
            {isSubmitting ? "Traitement..." : "Confirmer la Commande"}
          </button>
        </div>
      </div>
    </>
  );
}
