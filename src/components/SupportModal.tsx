"use client";

import React, { useState } from "react";
import { X, Send, User, Mail, Phone, MessageSquare, Loader2, CheckCircle2 } from "lucide-react";
import { submitSupportMessage } from "@/lib/support-actions";
import { toast } from "sonner";

interface SupportModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSujet?: string;
}

export function SupportModal({ isOpen, onClose, initialSujet = "CONTACT" }: SupportModalProps) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    nom: "",
    email: "",
    telephone: "",
    message: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await submitSupportMessage({
        ...formData,
        sujet: initialSujet,
      });
      if (res.success) {
        setSuccess(true);
        toast.success("Message envoyé avec succès !");
      } else {
        toast.error(res.error || "Une erreur est survenue.");
      }
    } catch (err) {
      toast.error("Erreur de connexion.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  if (success) {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
        <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-10 text-center shadow-2xl relative animate-in zoom-in-95">
          <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-500/30">
            <CheckCircle2 className="w-10 h-10 text-emerald-500" />
          </div>
          <h3 className="text-2xl font-black text-white tracking-tight mb-3 italic">Message Envoyé !</h3>
          <p className="text-zinc-400 text-sm mb-8 leading-relaxed">
            Merci <span className="text-white font-bold">{formData.nom}</span> ! Notre équipe a bien reçu votre demande concernant <span className="text-primary-foreground font-bold">{initialSujet.replace("_", " ")}</span>. Nous vous répondrons très prochainement.
          </p>
          <button
            onClick={() => {
              setSuccess(false);
              setFormData({ nom: "", email: "", telephone: "", message: "" });
              onClose();
            }}
            className="w-full py-4 bg-zinc-800 hover:bg-zinc-700 text-white font-black rounded-2xl transition-all active:scale-95 uppercase tracking-widest text-xs"
          >
            Fermer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="w-full max-w-xl bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-10 relative shadow-2xl animate-in zoom-in-95 max-h-[95vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 hover:bg-zinc-800 rounded-full text-zinc-500 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-8">
          <h3 className="text-3xl font-black text-white italic tracking-tighter uppercase leading-none mb-2">Comment pouvons-nous aider ?</h3>
          <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">
            Service : <span className="text-primary">{initialSujet.replace("_", " ")}</span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Votre Nom complet</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
              <input
                required
                value={formData.nom}
                onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                className="w-full bg-zinc-800/50 border border-zinc-700/50 rounded-2xl py-4 pl-12 pr-4 text-sm text-white focus:ring-2 focus:ring-primary/50 outline-none transition-all placeholder:text-zinc-700"
                placeholder="Ex: Jean Mukendi"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Email professionnel</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-zinc-800/50 border border-zinc-700/50 rounded-2xl py-4 pl-12 pr-4 text-sm text-white focus:ring-2 focus:ring-primary/50 outline-none transition-all placeholder:text-zinc-700"
                  placeholder="nom@exemple.com"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Téléphone / WhatsApp</label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                <input
                  type="tel"
                  required
                  value={formData.telephone}
                  onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                  className="w-full bg-zinc-800/50 border border-zinc-700/50 rounded-2xl py-4 pl-12 pr-4 text-sm text-white focus:ring-2 focus:ring-primary/50 outline-none transition-all placeholder:text-zinc-700"
                  placeholder="+243 ..."
                />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Votre Message</label>
            <div className="relative">
              <MessageSquare className="absolute left-4 top-5 w-4 h-4 text-zinc-600" />
              <textarea
                required
                rows={4}
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                className="w-full bg-zinc-800/50 border border-zinc-700/50 rounded-2xl py-4 pl-12 pr-4 text-sm text-white focus:ring-2 focus:ring-primary/50 outline-none transition-all placeholder:text-zinc-700 resize-none"
                placeholder="Décrivez votre besoin ou votre question ici..."
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary/90 text-black font-black py-5 rounded-2xl transition-all shadow-lg shadow-primary/20 uppercase tracking-widest text-xs flex items-center justify-center gap-3 disabled:opacity-50 active:scale-95"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            {loading ? "Envoi en cours..." : "Envoyer le message"}
          </button>
        </form>
      </div>
    </div>
  );
}
