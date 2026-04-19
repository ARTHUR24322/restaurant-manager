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
export function CartFloat({ restaurantId }: { restaurantId?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastOrderId, setLastOrderId] = useState<string | undefined>();
  
  const searchParams = useSearchParams();
  const tableNumber = searchParams.get("table") || "Inconnue";
  const customerName = searchParams.get("name") || "Client";
  
  const { items, getTotalUsd, removeItem, updateQuantity, clearCart } = useCartStore();

  const totalUsd = getTotalUsd();
  // TODO: Prendre le vrai taux du jour de la DB. Ex: 1 USD = 2800 CDF
  const exchangeRate = 2800;
  const totalCdf = totalUsd * exchangeRate;

  const handleConfirmOrder = async () => {
    setIsSubmitting(true);
    try {
      // Simulation des paramètres Table et Client (Étape 2: Récupération des URL SearchParams)
      // Pour l'instant on utilise des valeurs fixes ou vides
      const res = await createCommande({
        cartItems: items,
        tableNumber: tableNumber,
        customerName: customerName,
        totalUsd: totalUsd,
        notes: (document.querySelector('textarea') as HTMLTextAreaElement)?.value || "",
        restaurantId: restaurantId // <--- Ajouté ici
      });

      if (res.success) {
        setLastOrderId(res.orderId);
        setShowSuccess(true);
        clearCart();
        setIsOpen(false);
      } else {
        toast.error(res.error || "La commande a échoué.");
      }
    } catch (error) {
       console.error(error);
       toast.error("Une erreur technique est survenue.");
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
          className="fixed bottom-6 right-6 z-50 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground p-4 shadow-lg flex items-center gap-3 transition-transform hover:scale-105"
        >
          <div className="relative">
            <ShoppingCart className="w-6 h-6" />
            <span className="absolute -top-3 -right-3 bg-destructive text-destructive-foreground w-6 h-6 rounded-full text-xs flex items-center justify-center font-bold">
              {items.length}
            </span>
          </div>
          <span className="font-semibold">${totalUsd.toFixed(2)}</span>
        </button>
      )}

      {/* Modal Panier Ouvert */}
      <div
        className={cn(
          "fixed bottom-0 left-0 right-0 md:left-auto md:right-4 md:bottom-4 md:w-96 bg-card border border-border shadow-2xl md:rounded-xl z-50 transform transition-transform duration-300 ease-in-out",
          isOpen ? "translate-y-0" : "translate-y-full md:translate-y-[120%]"
        )}
      >
        <div className="p-4 flex items-center justify-between border-b border-border">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-primary" />
            Votre Panier
          </h2>
          <button 
            onClick={() => setIsOpen(false)}
            className="p-2 rounded-full hover:bg-secondary text-muted-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 flex flex-col gap-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
          {items.map((item) => (
            <div key={item.cartItemId} className="flex gap-4 items-center bg-secondary/30 p-3 rounded-lg border border-border/50">
              {/* Image Miniature */}
              <div className="w-16 h-16 rounded-md bg-secondary overflow-hidden shrink-0">
                <img 
                  src={item.plat.image} 
                  alt={item.plat.nom}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Infos Plat */}
              <div className="flex-1">
                <h4 className="font-semibold text-sm">{item.plat.nom}</h4>
                <p className="text-primary font-bold text-sm flex gap-1 items-center">
                  ${item.plat.prixUsd.toFixed(2)}
                </p>
                {/* Affichage des options choisies */}
                {Object.keys(item.selectedOptions).length > 0 && (
                  <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-1">
                    {Object.entries(item.selectedOptions).map(([key, val]) => (
                      <span key={key} className="bg-secondary px-1.5 py-0.5 rounded-sm">
                        {Array.isArray(val) ? val.join(", ") : val}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Contrôles Quantité */}
              <div className="flex flex-col items-center gap-1">
                <button 
                  onClick={() => updateQuantity(item.cartItemId, item.quantite + 1)}
                  className="p-1 rounded-full hover:bg-primary/20 text-primary transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
                <span className="font-semibold text-sm w-4 text-center">{item.quantite}</span>
                <button 
                  onClick={() => item.quantite > 1 ? updateQuantity(item.cartItemId, item.quantite - 1) : removeItem(item.cartItemId)}
                  className="p-1 rounded-full hover:bg-destructive/20 text-destructive transition-colors"
                >
                  <Minus className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Pied : Totaux et Action */}
        <div className="p-4 border-t border-border bg-card/50">
          
          {/* Note Spéciale (Étape 2 Pro) */}
          <div className="mb-4">
            <textarea 
              placeholder="Une note spéciale ? (Ex: C'est mon anniversaire 🎉...)" 
              className="w-full text-sm bg-secondary/50 border border-border rounded-lg p-3 resize-none focus:ring-1 focus:ring-primary h-16"
              disabled={isSubmitting}
            />
          </div>

          <div className="flex justify-between items-center mb-1">
            <span className="text-muted-foreground text-sm">Total USD</span>
            <span className="font-bold text-lg">${totalUsd.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center mb-4 text-xs">
            <span className="text-muted-foreground">Total CDF (≃ {exchangeRate} FC)</span>
            <span className="font-medium text-muted-foreground">{totalCdf.toLocaleString('fr-CD')} FC</span>
          </div>

          <button 
            onClick={handleConfirmOrder}
            disabled={isSubmitting}
            className="w-full bg-primary hover:bg-primary/90 disabled:opacity-70 text-primary-foreground font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-lg shadow-primary/20"
          >
            {isSubmitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
                <CreditCard className="w-5 h-5" />
            )}
            {isSubmitting ? "Envoi..." : "Confirmer la commande"}
          </button>
        </div>
      </div>
    </>
  );
}
