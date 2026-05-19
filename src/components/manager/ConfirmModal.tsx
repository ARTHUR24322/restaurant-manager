"use client"
/* eslint-disable @typescript-eslint/no-unused-vars */

import React from "react";
import { AlertCircle, X, ShieldCheck, Trash2, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ConfirmModalProps {
  show: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "success" | "info";
  isLoading?: boolean;
}

export function ConfirmModal({
  show,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Confirmer",
  cancelLabel = "Annuler",
  variant = "danger",
  isLoading = false
}: ConfirmModalProps) {
  if (!show) return null;

  const icons = {
    danger: <Trash2 className="w-8 h-8 text-destructive" />,
    success: <CheckCircle2 className="w-8 h-8 text-emerald-500" />,
    info: <AlertCircle className="w-8 h-8 text-primary" />
  };

  const bgColors = {
    danger: "bg-destructive/10",
    success: "bg-emerald-500/10",
    info: "bg-primary/10"
  };

  const buttonColors = {
    danger: "bg-destructive hover:bg-destructive/90 text-white shadow-destructive/10",
    success: "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/10",
    info: "bg-primary hover:bg-primary/90 text-black shadow-primary/10"
  };

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-[600] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-10 shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex flex-col items-center text-center">
          <div className={cn("w-16 h-16 rounded-full flex items-center justify-center mb-6", bgColors[variant])}>
            {icons[variant]}
          </div>
          
          <h3 className="text-xl font-black italic uppercase text-white mb-2">{title}</h3>
          <p className="text-zinc-500 text-sm font-medium mb-8 leading-relaxed">
            {message}
          </p>
          
          <div className="flex gap-3 w-full">
            <button 
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 font-black py-4 rounded-2xl uppercase text-[10px] tracking-widest transition-all disabled:opacity-50"
            >
              {cancelLabel}
            </button>
            <button 
              disabled={isLoading}
              onClick={onConfirm}
              className={cn(
                "flex-1 font-black py-4 rounded-2xl uppercase text-[10px] tracking-widest transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50",
                buttonColors[variant]
              )}
            >
              {isLoading && <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />}
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
