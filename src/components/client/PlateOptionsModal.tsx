"use client"
/* eslint-disable @next/next/no-img-element */

import React, { useState } from 'react';
import { X, Check, ShoppingCart } from "lucide-react";
import { cn } from "@/lib/utils";
import { type Plat, type Option } from "@/types";

interface PlateOptionsModalProps {
  plat: Plat | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selectedOptions: string[]) => void;
}

export function PlateOptionsModal({ plat, isOpen, onClose, onConfirm }: PlateOptionsModalProps) {
  const [selected, setSelected] = useState<string[]>([]);

  if (!isOpen || !plat) return null;

  const toggleOption = (optName: string) => {
    setSelected(prev => 
      prev.includes(optName) 
        ? prev.filter(o => o !== optName) 
        : [...prev, optName]
    );
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-card border border-border shadow-2xl rounded-3xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="relative h-40">
            <img src={plat.image} alt={plat.nom} className="w-full h-full object-cover" />
            <button 
                onClick={onClose}
                className="absolute top-4 right-4 bg-background/50 hover:bg-background backdrop-blur-md p-2 rounded-full transition-colors"
            >
                <X className="w-4 h-4" />
            </button>
        </div>

        <div className="p-6 space-y-6">
            <div>
                <h3 className="text-xl font-bold">{plat.nom}</h3>
                <p className="text-xs text-muted-foreground mt-1">Personnalisez votre plat selon vos goûts.</p>
            </div>

            <div className="space-y-3">
                <p className="text-xs font-bold uppercase tracking-widest text-primary">Options disponibles</p>
                {plat.options?.length > 0 ? (
                    <div className="grid grid-cols-1 gap-2">
                        {plat.options.map((opt: Option) => (
                            <button
                                key={opt.id}
                                onClick={() => toggleOption(opt.nom)}
                                className={cn(
                                    "flex items-center justify-between p-3 rounded-xl border transition-all text-sm font-medium",
                                    selected.includes(opt.nom) 
                                        ? "bg-primary/10 border-primary text-primary shadow-sm"
                                        : "bg-secondary/30 border-border/50 hover:border-primary/50"
                                )}
                            >
                                <span>{opt.nom}</span>
                                <div className={cn(
                                    "w-5 h-5 rounded-full border flex items-center justify-center transition-colors",
                                    selected.includes(opt.nom) ? "bg-primary border-primary" : "border-border"
                                )}>
                                    {selected.includes(opt.nom) && <Check className="w-3 h-3 text-white" />}
                                </div>
                            </button>
                        ))}
                    </div>
                ) : (
                    <p className="text-xs italic text-muted-foreground">Aucune option particulière pour ce plat.</p>
                )}
            </div>

            <button
                onClick={() => {
                    onConfirm(selected);
                    setSelected([]);
                    onClose();
                }}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-lg shadow-primary/20"
            >
                <ShoppingCart className="w-5 h-5" />
                Ajouter au Panier
            </button>
        </div>
      </div>
    </div>
  );
}
