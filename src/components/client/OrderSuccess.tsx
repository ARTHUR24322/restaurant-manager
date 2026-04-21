"use client"

import React from 'react';
import { CheckCircle, ArrowRight, ShoppingBag } from "lucide-react";
import { cn } from "@/lib/utils";

interface OrderSuccessProps {
  isOpen: boolean;
  onClose: () => void;
  orderId?: string;
}

export function OrderSuccess({ isOpen, onClose, orderId }: OrderSuccessProps) {
  if (!isOpen) return null;

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

        {orderId && (
            <div className="bg-secondary/50 p-3 rounded-xl border border-border">
                <span className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Numéro de Commande</span>
                <span className="font-mono font-bold text-lg select-all">#{orderId}</span>
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
                onClick={onClose}
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
