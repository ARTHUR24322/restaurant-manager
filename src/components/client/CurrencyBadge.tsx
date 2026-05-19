"use client"

import React from 'react';
import { RefreshCcw, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface CurrencyState {
  currency: 'USD' | 'FC';
  toggleCurrency: () => void;
}

export const useCurrencyStore = create<CurrencyState>()(
  persist(
    (set) => ({
      currency: 'USD',
      toggleCurrency: () => set((state) => ({ currency: state.currency === 'USD' ? 'FC' : 'USD' })),
    }),
    { name: 'smartresto-currency' }
  )
);

export function CurrencyBadge({ exchangeRate }: { exchangeRate: number }) {
  const { currency, toggleCurrency } = useCurrencyStore();

  return (
    <button
      onClick={toggleCurrency}
      className={cn(
        "group relative flex items-center gap-2 px-3 py-1.5 rounded-full transition-all duration-500 overflow-hidden",
        "bg-zinc-900/40 backdrop-blur-md border border-white/10 hover:border-primary/50 shadow-lg",
        "active:scale-95"
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      
      <div className={cn(
        "flex items-center justify-center w-5 h-5 rounded-full transition-all duration-500",
        currency === 'USD' ? "bg-primary text-black" : "bg-zinc-800 text-zinc-400"
      )}>
        <DollarSign className="w-3 h-3" />
      </div>

      <div className="flex flex-col items-start leading-none h-6 justify-center">
        <span className="text-[10px] font-black uppercase tracking-widest text-white/90">
             {currency === 'USD' ? 'Dollars' : 'Francs'}
        </span>
        <span className="text-[8px] font-bold text-zinc-500 whitespace-nowrap">
          1$ = {exchangeRate.toLocaleString()} FC
        </span>
      </div>

      <RefreshCcw className="w-3 h-3 text-zinc-600 group-hover:text-primary group-hover:rotate-180 transition-all duration-500" />
    </button>
  );
}
