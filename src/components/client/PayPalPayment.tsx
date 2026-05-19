'use client'
/* eslint-disable react/no-unescaped-entities */

import React from 'react';
import { PayPalButtons, PayPalScriptProvider } from "@paypal/react-paypal-js"
import { createPayPalOrder, capturePayPalOrder } from "@/lib/paypal-actions"
import { toast } from "sonner"
import { ShieldCheck, CreditCard } from "lucide-react"

interface PayPalPaymentProps {
    amount: number;
    demandeId: string;
    onSuccess: () => void;
}

export default function PayPalPayment({ 
    amount, 
    demandeId, 
    onSuccess 
}: PayPalPaymentProps) {
    const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;

    if (!clientId) {
        return (
            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-amber-500 text-xs font-medium text-center">
                Configuration PayPal manquante (Client ID). 
                Veuillez contacter l'administrateur.
            </div>
        );
    }

    return (
        <PayPalScriptProvider options={{ 
            clientId: clientId,
            currency: "USD",
            intent: "capture",
            components: "buttons",
            enableFunding: "card"
        }}>
            <div className="w-full space-y-4 animate-in fade-in duration-300">
                <div className="flex items-center justify-center gap-3 py-2 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">
                    <span className="h-px flex-1 bg-zinc-800" />
                    <div className="flex items-center gap-1.5">
                        <ShieldCheck className="w-3 h-3 text-emerald-500" />
                        Paiement Sécurisé
                    </div>
                    <span className="h-px flex-1 bg-zinc-800" />
                </div>
                
                <div className="relative z-0">
                    <PayPalButtons
                        style={{ 
                            layout: "vertical", 
                            color: "gold",
                            shape: "rect", 
                            label: "pay",
                            height: 48
                        }}
                        forceReRender={[amount]}
                        createOrder={async () => {
                            const res = await createPayPalOrder(amount);
                            if (res.success && res.orderID) return res.orderID;
                            toast.error(res.error || "Erreur lors de l'initialisation PayPal");
                            return "";
                        }}
                        onApprove={async (data) => {
                            const res = await capturePayPalOrder(data.orderID, demandeId);
                            if (res.success) {
                                toast.success("Félicitations ! Paiement validé avec succès.");
                                onSuccess();
                            } else {
                                toast.error(res.error || "Erreur lors de la capture du paiement");
                            }
                        }}
                        onError={(err) => {
                            console.error("PayPal Error:", err);
                            toast.error("Le service PayPal ne répond pas. Vérifiez votre connexion.");
                        }}
                    />
                </div>

                <div className="flex flex-col items-center gap-2 pt-2">
                    <div className="flex items-center gap-3 opacity-50 grayscale hover:grayscale-0 transition-all duration-300">
                        <div className="flex items-center gap-1 bg-white/5 px-2 py-1 rounded border border-white/10">
                            <CreditCard className="w-3 h-3 text-zinc-400" />
                            <span className="text-[10px] text-zinc-400 font-medium">Cartes acceptées</span>
                        </div>
                    </div>
                    <p className="text-[10px] text-zinc-500 text-center px-4 leading-relaxed">
                        Visa, Mastercard, American Express et autres cartes via le paiement sécurisé PayPal.
                    </p>
                </div>
            </div>
        </PayPalScriptProvider>
    )
}
