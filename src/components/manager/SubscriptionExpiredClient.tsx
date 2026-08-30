"use client";
/* eslint-disable react/no-unescaped-entities */

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  Phone, 
  CreditCard, 
  LogOut, 
  ShieldAlert,
  MessageCircle,
  Copy,
  Check
} from "lucide-react";
import { logoutManager } from "@/lib/auth-actions";
import { toast } from "sonner";

interface SubscriptionExpiredClientProps {
  restoName: string;
}

export function SubscriptionExpiredClient({ restoName }: SubscriptionExpiredClientProps) {
  const router = useRouter();
  const [copiedNum, setCopiedNum] = useState<string | null>(null);

  const handleLogout = async () => {
    await logoutManager();
    router.push("/manager/login");
  };

  const handleCopy = (num: string, label: string) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(num);
      setCopiedNum(num);
      toast.success(`Numéro ${label} (${num}) copié !`);
      setTimeout(() => setCopiedNum(null), 2000);
    }
  };

  const whatsappMsg = encodeURIComponent(
    `Bonjour, je souhaite réactiver l'abonnement SmartResto pour mon établissement : "${restoName}".`
  );

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 relative overflow-hidden text-zinc-100">
      {/* Background Glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-red-500/10 blur-[150px] rounded-full" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-red-500/10 blur-[150px] rounded-full" />

      <div className="relative z-10 w-full max-w-2xl text-center space-y-8 animate-in zoom-in-95 duration-200">
        
        {/* Header Icon */}
        <div className="flex justify-center">
            <div className="relative">
                <div className="absolute inset-0 bg-red-500/20 rounded-full blur-xl animate-pulse" />
                <div className="relative w-24 h-24 bg-zinc-900 border-2 border-red-500/50 rounded-3xl flex items-center justify-center shadow-2xl shadow-red-500/20">
                    <ShieldAlert className="w-12 h-12 text-red-500" />
                </div>
            </div>
        </div>

        {/* Text Content */}
        <div className="space-y-4">
            <h1 className="text-4xl md:text-5xl font-black italic uppercase tracking-tighter text-white">
                Service <span className="text-red-500">Suspendu</span>
            </h1>
            <p className="text-zinc-400 text-lg">
                L'abonnement de <span className="font-bold text-white">{restoName}</span> est arrivé à expiration ou a été désactivé par l'administration.
            </p>
        </div>

        {/* Payment / Support Options */}
        <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-[2.5rem] p-8 text-left space-y-6">
            <h2 className="text-sm font-black uppercase tracking-widest text-zinc-500 mb-6">Comment réactiver votre compte ?</h2>
            
            <div className="space-y-4">
                <div className="flex items-start gap-4 p-5 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-red-500/30 transition-all group">
                    <div className="p-3 bg-red-500/10 rounded-xl text-red-500 group-hover:scale-110 transition-transform">
                        <Phone className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-bold text-white text-base">Par Mobile Money & Appel Direct</h3>
                        <p className="text-xs text-zinc-400 mt-1 mb-3">
                          Envoyez votre paiement Mobile Money ou appelez directement l'un des numéros ci-dessous pour une réactivation immédiate.
                        </p>
                        
                        <div className="flex flex-wrap gap-2.5 mb-2">
                           <button
                             type="button"
                             onClick={() => handleCopy("0834590319", "Orange / M-Pesa")}
                             className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-black uppercase tracking-wider bg-orange-500/15 text-orange-400 hover:bg-orange-500/25 rounded-xl border border-orange-500/30 transition-all cursor-pointer"
                             title="Cliquer pour copier le numéro"
                           >
                             <span>Orange / M-Pesa : 083 459 0319</span>
                             {copiedNum === "0834590319" ? (
                               <Check className="w-3.5 h-3.5 text-emerald-400" />
                             ) : (
                               <Copy className="w-3.5 h-3.5 opacity-60" />
                             )}
                           </button>

                           <button
                             type="button"
                             onClick={() => handleCopy("0980824657", "Airtel Money")}
                             className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-black uppercase tracking-wider bg-red-500/15 text-red-400 hover:bg-red-500/25 rounded-xl border border-red-500/30 transition-all cursor-pointer"
                             title="Cliquer pour copier le numéro"
                           >
                             <span>Airtel : 098 082 4657</span>
                             {copiedNum === "0980824657" ? (
                               <Check className="w-3.5 h-3.5 text-emerald-400" />
                             ) : (
                               <Copy className="w-3.5 h-3.5 opacity-60" />
                             )}
                           </button>
                        </div>
                    </div>
                </div>

                <div className="flex items-start gap-4 p-4 rounded-2xl bg-zinc-900 border border-zinc-800 opacity-50 relative overflow-hidden">
                    <div className="p-3 bg-zinc-800 rounded-xl text-zinc-500">
                        <CreditCard className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="font-bold text-white">Paiement par carte (Bientôt)</h3>
                        <p className="text-xs text-zinc-400 mt-1">Le paiement automatique par carte bancaire sera bientôt disponible.</p>
                    </div>
                    <div className="absolute top-4 right-4 bg-zinc-800 text-[8px] font-black px-2 py-1 uppercase tracking-widest rounded-md">Inactif</div>
                </div>
            </div>
            
            {/* Direct Action Buttons */}
            <div className="pt-4 border-t border-zinc-800 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <a
                       href="tel:+243834590319"
                       className="w-full bg-red-600 hover:bg-red-500 text-white font-black py-4 px-4 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-red-900/40 uppercase tracking-wider text-xs"
                    >
                       <Phone className="w-4 h-4" /> Appeler : 083 459 0319
                    </a>
                    <a
                       href="tel:+243980824657"
                       className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-black py-4 px-4 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95 border border-zinc-700 uppercase tracking-wider text-xs"
                    >
                       <Phone className="w-4 h-4" /> Appeler : 098 082 4657
                    </a>
                </div>

                <a
                   href={`https://wa.me/243834590319?text=${whatsappMsg}`}
                   target="_blank"
                   rel="noopener noreferrer"
                   className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3.5 px-4 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-emerald-900/30 uppercase tracking-wider text-xs"
                >
                   <MessageCircle className="w-4 h-4" /> Contacter sur WhatsApp
                </a>
            </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-8">
            <button 
              onClick={handleLogout}
              className="group flex items-center justify-center gap-3 w-full max-w-sm mx-auto px-6 py-4 rounded-2xl border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-all"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-xs font-black uppercase tracking-widest">Se déconnecter</span>
            </button>
        </div>

      </div>
    </div>
  );
}

