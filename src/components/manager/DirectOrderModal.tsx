"use client"
/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Plus, 
  Minus, 
  Search, 
  ShoppingCart, 
  Package, 
  User,
  Trash2,
  Loader2,
  ArrowRight,
  Phone
} from "lucide-react";
import { getPlats, createCommande } from "@/lib/actions";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { type Plat } from "@/types";

interface DirectOrderModalProps {
  show: boolean;
  onClose: () => void;
  restaurantId: string;
  onSuccess: () => void;
}

export function DirectOrderModal({ show, onClose, restaurantId, onSuccess }: DirectOrderModalProps) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [plats, setPlats] = useState<Plat[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("Tous");
  const [cart, setCart] = useState<{ plat: Plat; quantite: number; selectedOptions: Record<string, any> }[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [orderType, setOrderType] = useState<"EMPORTER" | "SUR_PLACE">("EMPORTER");
  const [tableNumber, setTableNumber] = useState("");

  const categories = ["Tous", ...Array.from(new Set(plats.map(p => p.categorie)))];

  useEffect(() => {
    if (show && restaurantId) {
      setLoading(true);
      getPlats(restaurantId).then(data => {
        setPlats(data);
        setLoading(false);
      });
    }
  }, [show, restaurantId]);

  const addToCart = (plat: Plat) => {
    setCart(prev => {
      const existing = prev.find(item => item.plat.id === plat.id);
      if (existing) {
        return prev.map(item => 
          item.plat.id === plat.id 
            ? { ...item, quantite: item.quantite + 1 } 
            : item
        );
      }
      return [...prev, { plat, quantite: 1, selectedOptions: {} }];
    });
  };

  const removeFromCart = (platId: string) => {
    setCart(prev => {
      const existing = prev.find(item => item.plat.id === platId);
      if (existing && existing.quantite > 1) {
        return prev.map(item => 
          item.plat.id === platId 
            ? { ...item, quantite: item.quantite - 1 } 
            : item
        );
      }
      return prev.filter(item => item.plat.id !== platId);
    });
  };

  const clearCart = () => setCart([]);

  const total = cart.reduce((sum, item) => sum + (item.plat.prixUsd * item.quantite), 0);

  const handleSubmit = async () => {
    if (cart.length === 0) {
      toast.error("Le panier est vide");
      return;
    }

    if (orderType === "SUR_PLACE" && !tableNumber) {
      toast.error("Veuillez indiquer le numéro de table");
      return;
    }

    setSubmitting(true);
    try {
      const res = await createCommande({
        cartItems: cart,
        tableNumber: orderType === "EMPORTER" ? "EMPORTER" : `Table ${tableNumber}`,
        customerName: customerName || (orderType === "EMPORTER" ? "Client Emporter" : "Client Table"),
        totalUsd: total,
        restaurantId
      });

      if (res.success) {
        if (res.orderId && customerPhone.trim()) {
          const { assignPhoneToOrder } = await import("@/lib/actions");
          await assignPhoneToOrder(res.orderId, customerPhone.trim(), customerName);
        }
        toast.success("Commande créée avec succès");
        onSuccess();
        onClose();
        setCart([]);
        setCustomerName("");
        setCustomerPhone("");
        setTableNumber("");
      } else {
        toast.error("Erreur lors de la création de la commande");
      }
    } catch (error) {
      toast.error("Une erreur est survenue");
    } finally {
      setSubmitting(false);
    }
  };

  if (!show) return null;

  const filteredPlats = plats.filter(p => {
    const matchesSearch = p.nom.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "Tous" || p.categorie === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-6xl h-[90vh] bg-zinc-950 border border-zinc-800 rounded-[3rem] shadow-2xl flex flex-col md:flex-row overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Partie Gauche: Menu */}
        <div className="flex-1 flex flex-col border-r border-zinc-800 h-full overflow-hidden">
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter">Menu Direct</h2>
                <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">Séléction des articles</p>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-xl text-zinc-500 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input 
                  type="text"
                  placeholder="Rechercher un plat..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl py-3 pl-12 pr-4 text-sm text-white focus:outline-none focus:border-indigo-500 transition-all"
                />
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={cn(
                      "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap border transition-all",
                      selectedCategory === cat 
                        ? "bg-indigo-600 border-indigo-500 text-white" 
                        : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700"
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 pt-0">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-4" />
                <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Chargement du menu...</p>
              </div>
            ) : filteredPlats.length === 0 ? (
              <div className="text-center py-20 text-zinc-600 italic">
                Aucun plat trouvé
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredPlats.map(plat => (
                  <button
                    key={plat.id}
                    onClick={() => addToCart(plat)}
                    className="group bg-zinc-900 border border-zinc-800 hover:border-indigo-500/50 p-4 rounded-3xl text-left transition-all active:scale-95 space-y-3"
                  >
                    <div className="aspect-square rounded-2xl overflow-hidden bg-zinc-950 border border-zinc-800">
                      <img src={plat.image} alt={plat.nom} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-white line-clamp-1 italic">{plat.nom}</h4>
                      <p className="text-indigo-500 font-black text-lg">${plat.prixUsd.toFixed(2)}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Partie Droite: Panier & Validation */}
        <div className="w-full md:w-[380px] bg-zinc-900/50 flex flex-col h-full">
          <div className="p-8 border-b border-zinc-800">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <ShoppingCart className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-xl font-black text-white italic uppercase tracking-tighter">Votre Panier</h3>
            </div>

            <div className="space-y-4">
              <div className="flex gap-2">
                <button 
                  onClick={() => setOrderType("EMPORTER")}
                  className={cn(
                    "flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all",
                    orderType === "EMPORTER" 
                      ? "bg-white border-white text-black" 
                      : "bg-zinc-800 border-zinc-700 text-zinc-500"
                  )}
                >
                  À Emporter
                </button>
                <button 
                  onClick={() => setOrderType("SUR_PLACE")}
                  className={cn(
                    "flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all",
                    orderType === "SUR_PLACE" 
                      ? "bg-white border-white text-black" 
                      : "bg-zinc-800 border-zinc-700 text-zinc-500"
                  )}
                >
                  Sur Place
                </button>
              </div>

              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input 
                  type="text"
                  placeholder="Nom du client..."
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-3 pl-12 pr-4 text-sm text-white focus:outline-none focus:border-indigo-500 transition-all font-bold italic"
                />
              </div>

              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input 
                  type="tel"
                  placeholder="Numéro Whatsapp du client..."
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-3 pl-12 pr-4 text-sm text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition-all font-mono font-bold"
                />
              </div>

              {orderType === "SUR_PLACE" && (
                <div className="relative animate-in slide-in-from-top-2">
                  <Package className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input 
                    type="text"
                    placeholder="Numéro de table..."
                    value={tableNumber}
                    onChange={(e) => setTableNumber(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-3 pl-12 pr-4 text-sm text-white focus:outline-none focus:border-indigo-500 transition-all font-bold italic"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-zinc-600 opacity-50 space-y-4">
                <ShoppingCart className="w-12 h-12" />
                <p className="text-[10px] font-black uppercase tracking-widest">Panier vide</p>
              </div>
            ) : (
              cart.map((item, idx) => (
                <div key={idx} className="flex items-center gap-4 bg-zinc-950 p-4 rounded-3xl border border-zinc-800 group">
                   <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0">
                      <img src={item.plat.image} alt="" className="w-full h-full object-cover" />
                   </div>
                   <div className="flex-1">
                      <h5 className="text-xs font-black text-white italic truncate">{item.plat.nom}</h5>
                      <p className="text-indigo-500 font-black text-sm">${(item.plat.prixUsd * item.quantite).toFixed(2)}</p>
                   </div>
                   <div className="flex items-center gap-2">
                      <button onClick={() => removeFromCart(item.plat.id)} className="w-8 h-8 bg-zinc-900 border border-zinc-800 rounded-lg flex items-center justify-center text-zinc-500 hover:text-white transition-colors">
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-6 text-center text-xs font-black text-white">{item.quantite}</span>
                      <button onClick={() => addToCart(item.plat)} className="w-8 h-8 bg-zinc-900 border border-zinc-800 rounded-lg flex items-center justify-center text-zinc-500 hover:text-white transition-colors">
                        <Plus className="w-4 h-4" />
                      </button>
                   </div>
                </div>
              ))
            )}
          </div>

          <div className="p-8 bg-zinc-950 border-t border-zinc-800 space-y-6">
            <div className="flex flex-col gap-2">
               <div className="flex justify-between items-center text-zinc-500">
                  <span className="text-[10px] font-black uppercase tracking-widest">Sous-total</span>
                  <span className="font-bold font-mono">${total.toFixed(2)}</span>
               </div>
               <div className="flex justify-between items-end">
                  <span className="text-[10px] font-black uppercase tracking-widest text-white">Total à payer</span>
                  <span className="text-4xl font-black text-white italic tracking-tighter font-mono">${total.toFixed(2)}</span>
               </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <button
                onClick={handleSubmit}
                disabled={submitting || cart.length === 0}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-black py-5 rounded-[2rem] transition-all active:scale-95 text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-indigo-900/20 flex items-center justify-center gap-3"
              >
                {submitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Valider la vente
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
              {cart.length > 0 && (
                <button
                  onClick={clearCart}
                  className="w-full text-zinc-600 hover:text-red-500 text-[9px] font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-3 h-3" />
                  Vider le panier
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
