"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { 
  Phone, 
  CreditCard, 
  LogOut, 
  ArrowRight,
  ShieldAlert
} from "lucide-react";
import { logoutManager } from "@/lib/auth-actions";

interface SubscriptionExpiredClientProps {
  restoName: string;
}

export function SubscriptionExpiredClient({ restoName }: SubscriptionExpiredClientProps) {
  const router = useRouter();

  const handleLogout = async () => {
    await logoutManager();
    router.push("/manager/login");
  };

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
                <div className="flex items-start gap-4 p-4 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-red-500/30 transition-all group">
                    <div className="p-3 bg-red-500/10 rounded-xl text-red-500 group-hover:scale-110 transition-transform">
                        <Phone className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="font-bold text-white">Par Mobile Money</h3>
                        <p className="text-xs text-zinc-400 mt-1 mb-2">Envoyez votre paiement et contactez le support pour une réactivation immédiate.</p>
                        <div className="flex flex-wrap gap-2 mb-2">
                           <span className="px-2 py-1 text-[10px] font-black uppercase tracking-widest bg-orange-500/20 text-orange-400 rounded-lg border border-orange-500/20">Orange: 089xxxxxxx</span>
                           <span className="px-2 py-1 text-[10px] font-black uppercase tracking-widest bg-red-500/20 text-red-400 rounded-lg border border-red-500/20">Airtel: 099xxxxxxx</span>
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
            
            <div className="pt-4 border-t border-zinc-800">
                <button
                   className="w-full bg-red-600 hover:bg-red-500 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-red-900/40 uppercase tracking-widest text-sm"
                   onClick={() => window.location.href = "tel:+243990000000"} 
                >
                   Appeler le Support <ArrowRight className="w-5 h-5" />
                </button>
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
