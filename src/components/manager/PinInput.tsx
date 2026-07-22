"use client"
/* eslint-disable react-hooks/exhaustive-deps */

import React, { useState, useEffect } from 'react';
import { Delete, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PinInputProps {
  onComplete: (pin: string) => void;
  onCancel: () => void;
  error?: string;
  isLoading?: boolean;
}

export function PinInput({ onComplete, onCancel, error, isLoading }: PinInputProps) {
  const [pin, setPin] = useState('');

  const handleNumberClick = (num: string) => {
    if (pin.length < 6 && !isLoading) {
      setPin(pin + num);
    }
  };

  const handleValidate = () => {
    if (pin.length >= 4 && !isLoading) {
      onComplete(pin);
    }
  };

  const handleDelete = () => {
    if (!isLoading) {
      setPin(pin.slice(0, -1));
    }
  };

  // Keyboard support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        handleNumberClick(e.key);
      } else if (e.key === 'Backspace') {
        handleDelete();
      } else if (e.key === 'Escape') {
        onCancel();
      } else if (e.key === 'Enter') {
        if (pin.length >= 4) {
          handleValidate();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pin, isLoading]);

  return (
    <div className="flex flex-col items-center gap-8 animate-in zoom-in-95 duration-150">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-black text-white italic uppercase tracking-tight">Accès Sécurisé</h2>
        <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Saisissez votre code PIN (4 à 6 chiffres)</p>
      </div>

      {/* Pin Display */}
      <div className="flex gap-4">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div 
            key={i}
            className={cn(
              "w-12 h-12 rounded-2xl border-2 flex items-center justify-center transition-all duration-150",
              pin.length > i 
                ? "border-primary bg-primary/10 shadow-[0_0_20px_rgba(var(--primary-rgb),0.2)]" 
                : "border-zinc-800 bg-zinc-900",
              error && "border-red-500 bg-red-500/10"
            )}
          >
            {pin.length > i && (
              <div className="w-2.5 h-2.5 rounded-full bg-white animate-in fade-in zoom-in duration-75" />
            )}
          </div>
        ))}
      </div>

      {error && (
        <p className="text-red-500 text-[10px] font-black uppercase tracking-widest animate-in shake duration-300">{error}</p>
      )}

      {/* Keypad */}
      <div className="grid grid-cols-3 gap-4 w-full max-w-[280px]">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
          <button
            key={num}
            onClick={() => handleNumberClick(num)}
            className="h-16 rounded-2xl bg-zinc-900 border border-zinc-800 text-xl font-black text-white hover:bg-zinc-800 hover:border-zinc-700 active:scale-90 transition-all shadow-md"
          >
            {num}
          </button>
        ))}
        <button
          onClick={onCancel}
          className="h-16 rounded-2xl flex items-center justify-center text-zinc-500 hover:text-white transition-colors"
        >
          <X className="w-6 h-6" />
        </button>
        <button
          onClick={() => handleNumberClick('0')}
          className="h-16 rounded-2xl bg-zinc-900 border border-zinc-800 text-xl font-black text-white hover:bg-zinc-800 hover:border-zinc-700 active:scale-90 transition-all shadow-md"
        >
          0
        </button>
        <button
          onClick={handleDelete}
          className="h-16 rounded-2xl flex items-center justify-center text-zinc-500 hover:text-white hover:bg-red-500/10 transition-all"
        >
          <Delete className="w-6 h-6" />
        </button>
      </div>

      <button
        onClick={handleValidate}
        disabled={pin.length < 4 || isLoading}
        className="w-full max-w-[280px] h-16 bg-primary hover:bg-primary/90 text-black font-black text-sm uppercase tracking-widest rounded-2xl shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center"
      >
        {isLoading ? "VÉRIFICATION..." : "VALIDER"}
      </button>
    </div>
  );
}
