"use client";
/* eslint-disable react/no-unescaped-entities, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  UtensilsCrossed,
  Check,
  Zap,
  Crown,
  Star,
  ChevronDown,
  Shield,
  CreditCard,
  ArrowRight,
  Sparkles,
  BarChart3,
  QrCode,
  Printer,
  Users,
  Clock,
  HeadphonesIcon,
  Package,
  Globe,
  X,
  Loader2,
  Phone,
  Building2,
  User,
  Mail,
  MapPin,
  CheckCircle2,
} from "lucide-react";
import { submitSubscriptionRequest } from "@/lib/demande-actions";
import { toast } from "sonner";
import { SupportModal } from "@/components/SupportModal";

// ─── Types ──────────────────────────────────────────────────
type BillingCycle = "monthly" | "semiannual" | "annual";

interface PlanFeature {
  text: string;
  included: boolean;
}

interface PricingPlan {
  name: string;
  description: string;
  icon: React.ReactNode;
  prices: Record<BillingCycle, number>;
  features: PlanFeature[];
  cta: string;
  popular?: boolean;
  badge?: string;
  gradient: string;
  iconBg: string;
}

// ─── Data ───────────────────────────────────────────────────
const plans: PricingPlan[] = [
  {
    name: "Standard",
    description: "Tout ce qu'il faut pour gérer votre restaurant efficacement.",
    icon: <Star className="w-7 h-7" />,
    prices: { monthly: 45, semiannual: 235, annual: 432 },
    features: [
      { text: "Menu digital illimité", included: true },
      { text: "QR Codes illimités", included: true },
      { text: "Gestion des commandes", included: true },
      { text: "Tableau de bord analytique", included: true },
      { text: "Impression thermique", included: true },
      { text: "Multi-utilisateurs (3)", included: true },
      { text: "Gestion de stock", included: false },
      { text: "Support prioritaire", included: false },
    ],
    cta: "S'abonner",
    badge: "Meilleure offre",
    gradient: "from-primary/10 to-primary/5",
    iconBg: "bg-primary text-black",
  },
  {
    name: "Pro",
    description: "La solution complète pour les restaurateurs ambitieux.",
    icon: <Crown className="w-7 h-7" />,
    prices: { monthly: 75, semiannual: 390, annual: 720 },
    features: [
      { text: "Tout du plan Standard", included: true },
      { text: "QR Codes personnalisés", included: true },
      { text: "Gestion de stock avancée", included: true },
      { text: "Multi-utilisateurs illimités", included: true },
      { text: "Support prioritaire 24/7", included: true },
      { text: "Rapports personnalisés", included: true },
      { text: "API & Intégrations", included: true },
      { text: "Marque blanche (logo)", included: true },
    ],
    cta: "S'abonner",
    popular: true,
    badge: "Populaire",
    gradient: "from-primary/20 to-primary/5",
    iconBg: "bg-primary text-black",
  },
  {
    name: "Platinum",
    description: "Pour les groupes de restaurants et franchises.",
    icon: <Globe className="w-7 h-7" />,
    prices: { monthly: 150, semiannual: 780, annual: 1440 },
    features: [
      { text: "Tout du plan Pro", included: true },
      { text: "Dashboard Multi-Établissements", included: true },
      { text: "Statistiques Groupées", included: true },
      { text: "Gestion des Stocks Multi-sites", included: true },
      { text: "Compte Propriétaire Unifié", included: true },
      { text: "Formation sur site", included: true },
      { text: "Conseiller dédié", included: true },
    ],
    cta: "S'abonner",
    badge: "Enterprise",
    gradient: "from-zinc-700/50 to-zinc-900/50",
    iconBg: "bg-zinc-700 text-white",
  },
];

const faqs = [
  {
    q: "Comment fonctionne le paiement ?",
    a: "Le paiement est traité de manière 100% sécurisée via FlexPaie. Vous pouvez payer par Mobile Money (Airtel, M-Pesa, Orange) ou par carte bancaire. Votre abonnement est activé instantanément après validation du paiement.",
  },
  {
    q: "Puis-je changer de plan en cours de route ?",
    a: "Absolument. Vous pouvez passer à un plan supérieur à tout moment. La différence sera calculée au prorata de votre période restante. Pour un passage à un plan inférieur, le changement prendra effet à la fin de votre cycle actuel.",
  },
  {
    q: "Y a-t-il un remboursement possible ?",
    a: "Oui. Nous offrons une garantie satisfait ou remboursé de 7 jours après le premier paiement. Si SmartResto ne répond pas à vos attentes, contactez notre support pour un remboursement intégral.",
  },
  {
    q: "Comment résilier mon abonnement ?",
    a: "La résiliation est simple et sans frais. Rendez-vous dans les paramètres de votre espace Gérant, section 'Abonnement', et cliquez sur 'Résilier'. Votre accès reste actif jusqu'à la fin de la période payée.",
  },
  {
    q: "L'essai gratuit nécessite-t-il un paiement ?",
    a: "Non. L'essai gratuit de 14 jours ne nécessite aucune carte bancaire ni paiement. À la fin de la période, vous choisissez librement de continuer avec un plan payant ou d'arrêter.",
  },
];

// ─── Components ─────────────────────────────────────────────

function NavBar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-zinc-950/70 backdrop-blur-xl border-b border-white/5">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/20 group-hover:shadow-violet-500/40 transition-shadow">
            <UtensilsCrossed className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-black tracking-tight text-white">
            Smart<span className="text-primary">Resto</span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {[
            { label: "Accueil", href: "/" },
            { label: "Fonctionnalités", href: "#features" },
            { label: "Pricing", href: "#pricing" },
            { label: "Contact", href: "#contact" },
          ].map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white rounded-lg hover:bg-white/5 transition-all"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/manager/login"
            className="px-4 py-2 text-sm font-semibold text-zinc-300 hover:text-white transition-colors"
          >
            Se connecter
          </Link>
          <a
            href="#pricing"
            className="px-5 py-2.5 text-sm font-bold bg-primary text-white rounded-xl hover:shadow-lg hover:shadow-violet-500/25 transition-all active:scale-95"
          >
            Démarrer
          </a>
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden p-2 text-zinc-400 hover:text-white"
        >
          {mobileOpen ? <X className="w-6 h-6" /> : (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
          )}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-zinc-900/95 backdrop-blur-xl border-t border-white/5 px-6 pb-6 pt-2 animate-in slide-in-from-top-2 duration-200">
          {[
            { label: "Accueil", href: "/" },
            { label: "Fonctionnalités", href: "#features" },
            { label: "Pricing", href: "#pricing" },
            { label: "Contact", href: "#contact" },
          ].map((item) => (
            <a
              key={item.label}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className="block py-3 text-sm font-medium text-zinc-300 hover:text-white border-b border-white/5"
            >
              {item.label}
            </a>
          ))}
          <div className="flex gap-3 mt-4">
            <Link href="/manager/login" className="flex-1 text-center py-3 text-sm font-bold border border-white/10 rounded-xl text-zinc-300 hover:text-white hover:bg-white/5 transition-all">
              Connexion
            </Link>
            <a href="#pricing" onClick={() => setMobileOpen(false)} className="flex-1 text-center py-3 text-sm font-bold bg-primary text-white rounded-xl">
              Démarrer
            </a>
          </div>
        </div>
      )}
    </header>
  );
}

function BillingToggle({ cycle, setCycle }: { cycle: BillingCycle; setCycle: (c: BillingCycle) => void }) {
  const options: { key: BillingCycle; label: string; badge?: string }[] = [
    { key: "monthly", label: "Mensuel" },
    { key: "semiannual", label: "6 mois", badge: "-13%" },
    { key: "annual", label: "Annuel", badge: "-20%" },
  ];

  return (
    <div className="inline-flex bg-zinc-900/80 border border-white/10 rounded-2xl p-1.5 gap-1">
      {options.map((opt) => (
        <button
          key={opt.key}
          onClick={() => setCycle(opt.key)}
          className={`
            relative px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300
            ${cycle === opt.key
              ? "bg-primary text-white shadow-lg shadow-violet-500/20"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5"
            }
          `}
        >
          {opt.label}
          {opt.badge && (
            <span className={`
              absolute -top-2.5 -right-2 text-[9px] font-black px-1.5 py-0.5 rounded-full
              ${cycle === opt.key
                ? "bg-emerald-500 text-black"
                : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
              }
            `}>
              {opt.badge}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

function PricingCard({ plan, cycle, onSubscribe }: { plan: PricingPlan; cycle: BillingCycle; onSubscribe: (plan: PricingPlan, cycle: BillingCycle) => void }) {
  const price = plan.prices[cycle];
  const monthlyEquivalent =
    cycle === "semiannual" ? (price / 6).toFixed(0)
    : cycle === "annual" ? (price / 12).toFixed(0)
    : null;

  const router = useRouter();
  const handleClick = () => {
    router.push("/manager/register");
  };

  return (
    <div
      className={`
        relative group flex flex-col rounded-[2rem] border overflow-hidden transition-all duration-200
        ${plan.popular
          ? "border-primary/40 bg-gradient-to-b from-primary/10 via-zinc-900/80 to-zinc-950 scale-[1.02] shadow-2xl shadow-primary/10 hover:shadow-primary/20"
          : "border-white/[0.06] bg-gradient-to-b " + plan.gradient + " hover:border-white/10 hover:shadow-xl"
        }
        hover:-translate-y-2
      `}
    >
      {plan.popular && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-primary" />
      )}

      <div className="p-8 flex-1 flex flex-col">
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-11 h-11 ${plan.iconBg} rounded-xl flex items-center justify-center text-white shadow-lg`}>
                {plan.icon}
              </div>
              <div>
                <h3 className="text-lg font-black text-white tracking-tight">{plan.name}</h3>
              </div>
            </div>
            <p className="text-xs text-zinc-500 mt-1 leading-relaxed max-w-[240px]">{plan.description}</p>
          </div>
          {plan.badge && (
            <span className={`
              text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-full
              ${plan.popular
                ? "bg-primary text-black shadow-lg shadow-primary/30"
                : "bg-blue-500/20 text-primary border border-blue-500/30"
              }
            `}>
              {plan.badge}
            </span>
          )}
        </div>

        <div className="mb-8">
          <div className="flex items-baseline gap-1">
            <span className="text-5xl font-black text-white tracking-tight">${price}</span>
            <span className="text-zinc-500 text-sm font-medium">
              /{cycle === "monthly" ? "mois" : cycle === "semiannual" ? "6 mois" : "an"}
            </span>
          </div>
          {monthlyEquivalent && (
            <p className="text-xs text-zinc-500 mt-2 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-emerald-500" />
              Soit <span className="text-emerald-400 font-bold">${monthlyEquivalent}/mois</span>
            </p>
          )}
        </div>

        <ul className="space-y-3 mb-8 flex-1">
          {plan.features.map((f, i) => (
            <li key={i} className={`flex items-center gap-3 text-sm ${f.included ? "text-zinc-300" : "text-zinc-600"}`}>
              {f.included ? (
                <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                  <Check className="w-3 h-3 text-emerald-400" />
                </div>
              ) : (
                <div className="w-5 h-5 rounded-full bg-zinc-800/50 flex items-center justify-center flex-shrink-0">
                  <X className="w-3 h-3 text-zinc-700" />
                </div>
              )}
              {f.text}
            </li>
          ))}
        </ul>

        <button
          onClick={handleClick}
          className={`
            w-full py-4 rounded-2xl font-bold text-sm tracking-wide transition-all duration-300 active:scale-[0.97] flex items-center justify-center gap-2
            ${plan.popular
              ? "bg-primary text-white shadow-xl shadow-primary/20 hover:shadow-primary/40 hover:brightness-110"
              : "bg-white/10 text-white border border-white/10 hover:bg-white/15 hover:border-white/20"
            }
          `}
        >
          {plan.cta}
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

import PayPalPayment from "@/components/client/PayPalPayment";

// ─── Subscription Request Modal ─────────────────────────────
function SubscriptionModal({
  plan,
  cycle,
  onClose,
}: {
  plan: PricingPlan;
  cycle: BillingCycle;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [success, setSuccess] = useState(false);
  const [demandeId, setDemandeId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    nomRestaurant: "",
    nomProprietaire: "",
    email: "",
    telephone: "",
    ville: "Lubumbashi",
  });

  const price = plan.prices[cycle];
  const cycleLabel = cycle === "monthly" ? "Mensuel" : cycle === "semiannual" ? "6 mois" : "Annuel";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await (submitSubscriptionRequest as any)({
        ...formData,
        plan: plan.name.toUpperCase(),
        cycle,
        montant: price,
      });
      if (res.success) {
        if (price === 0) {
            setSuccess(true);
            toast.success("Demande envoyée !");
        } else {
            setDemandeId(res.id);
            setStep(2);
            toast.success("Informations enregistrées. Procédez au paiement.");
        }
      } else {
        toast.error(res.error || "Erreur lors de l'envoi.");
      }
    } catch {
      toast.error("Erreur de connexion au serveur.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-10 text-center animate-in zoom-in-95 duration-300">
          <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-500/30">
            <CheckCircle2 className="w-10 h-10 text-emerald-500" />
          </div>
          <h3 className="text-2xl font-black text-white tracking-tight mb-3">Demande envoyée !</h3>
          <p className="text-zinc-400 text-sm mb-2">
            Votre demande d'abonnement <span className="font-bold text-white">{plan.name}</span> a été transmise à notre équipe.
          </p>
          <p className="text-zinc-500 text-xs mb-8">
            Nous vous contacterons sous 24h à l'adresse <span className="text-primary">{formData.email}</span> ou
            au <span className="text-primary">{formData.telephone}</span> pour finaliser votre inscription.
          </p>
          <button
            onClick={onClose}
            className="px-8 py-3 bg-primary text-white font-bold rounded-2xl shadow-lg transition-all active:scale-95"
          >
            Compris !
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-8 md:p-10 relative animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 hover:bg-zinc-800 rounded-full text-zinc-500 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Plan summary */}
        <div className="flex items-center gap-4 mb-8">
          <div className={`w-12 h-12 ${plan.iconBg} rounded-xl flex items-center justify-center text-white shadow-lg`}>
            {plan.icon}
          </div>
          <div>
            <h3 className="text-xl font-black text-white tracking-tight">{plan.name}</h3>
            <p className="text-xs text-zinc-500">
              ${price} / {cycleLabel}
            </p>
          </div>
        </div>

        {step === 1 ? (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Nom du restaurant</label>
              <div className="relative">
                <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                <input
                  required
                  value={formData.nomRestaurant}
                  onChange={(e) => setFormData({ ...formData, nomRestaurant: e.target.value })}
                  className="w-full bg-zinc-800/50 border border-zinc-700/50 rounded-2xl py-3.5 pl-12 pr-4 text-sm text-white focus:ring-2 focus:ring-primary/50 outline-none transition-all placeholder:text-zinc-600"
                  placeholder="ex: Le Grand Buffet"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Nom du propriétaire</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                <input
                  required
                  value={formData.nomProprietaire}
                  onChange={(e) => setFormData({ ...formData, nomProprietaire: e.target.value })}
                  className="w-full bg-zinc-800/50 border border-zinc-700/50 rounded-2xl py-3.5 pl-12 pr-4 text-sm text-white focus:ring-2 focus:ring-primary/50 outline-none transition-all placeholder:text-zinc-600"
                  placeholder="ex: Jean Mukendi"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Email</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-zinc-800/50 border border-zinc-700/50 rounded-2xl py-3.5 pl-12 pr-4 text-sm text-white focus:ring-2 focus:ring-primary/50 outline-none transition-all placeholder:text-zinc-600"
                    placeholder="email@example.com"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Téléphone</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                  <input
                    type="tel"
                    required
                    value={formData.telephone}
                    onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                    className="w-full bg-zinc-800/50 border border-zinc-700/50 rounded-2xl py-3.5 pl-12 pr-4 text-sm text-white focus:ring-2 focus:ring-primary/50 outline-none transition-all placeholder:text-zinc-600"
                    placeholder="+243 99 000 0000"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Ville</label>
              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                <select
                  value={formData.ville}
                  onChange={(e) => setFormData({ ...formData, ville: e.target.value })}
                  className="w-full bg-zinc-800/50 border border-zinc-700/50 rounded-2xl py-3.5 pl-12 pr-4 text-sm text-white focus:ring-2 focus:ring-primary/50 outline-none transition-all appearance-none"
                >
                  <option value="Lubumbashi">Lubumbashi</option>
                  <option value="Kinshasa">Kinshasa</option>
                  <option value="Likasi">Likasi</option>
                  <option value="Kolwezi">Kolwezi</option>
                  <option value="Autre">Autre</option>
                </select>
              </div>
            </div>

            {/* Summary */}
            <div className="bg-zinc-800/30 border border-zinc-700/30 rounded-2xl p-4 flex justify-between items-center">
              <div>
                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Récapitulatif</p>
                <p className="text-sm font-bold text-white mt-1">
                  {plan.name} — {cycleLabel}
                </p>
              </div>
              <p className="text-2xl font-black text-white">
                {price === 0 ? "Gratuit" : `$${price}`}
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-primary text-white font-bold rounded-2xl shadow-xl shadow-primary/20 hover:shadow-primary/40 transition-all active:scale-[0.97] disabled:opacity-60 flex items-center justify-center gap-2 text-sm uppercase tracking-widest"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Envoi en cours...</>
              ) : (
                <>{price === 0 ? "Envoyer ma demande" : "Procéder au paiement"} <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>
        ) : (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-200">
            <div className="bg-zinc-800/30 border border-zinc-700/30 rounded-3xl p-8 text-center">
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-2">Total à régler</p>
              <div className="flex items-center justify-center gap-1 mb-2">
                <span className="text-2xl font-black text-zinc-500 -mt-2">$</span>
                <span className="text-5xl font-black text-white tracking-tighter">{price}</span>
              </div>
              <p className="text-xs text-zinc-500 font-bold uppercase tracking-tight">
                Pour l'abonnement {plan.name} <span className="text-zinc-700 px-1">•</span> {cycleLabel}
              </p>
            </div>

            {demandeId && (
                <PayPalPayment 
                    amount={price} 
                    demandeId={demandeId} 
                    onSuccess={() => setSuccess(true)} 
                />
            )}

            <button 
                onClick={() => setStep(1)}
                className="w-full py-2 text-[10px] font-black text-zinc-600 hover:text-zinc-400 uppercase tracking-widest transition-colors"
            >
                Modifier mes informations
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-white/5">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-5 text-left group"
      >
        <span className="text-sm font-semibold text-zinc-200 group-hover:text-white transition-colors pr-4">{q}</span>
        <ChevronDown
          className={`w-5 h-5 text-zinc-500 flex-shrink-0 transition-transform duration-300 ${open ? "rotate-180 text-primary" : ""}`}
        />
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ${open ? "max-h-40 pb-5" : "max-h-0"}`}
      >
        <p className="text-sm text-zinc-500 leading-relaxed">{a}</p>
      </div>
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────
export default function PricingPage() {
  const [cycle, setCycle] = useState<BillingCycle>("monthly");
  const [modalPlan, setModalPlan] = useState<PricingPlan | null>(null);
  const [supportModal, setSupportModal] = useState<{ isOpen: boolean; sujet: string }>({
      isOpen: false,
      sujet: "DEMANDE_INFOS",
  });

  const handleOpenModal = (plan: PricingPlan, c: BillingCycle) => {
    setCycle(c);
    setModalPlan(plan);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 overflow-hidden">
      <NavBar />

      {/* ─── Hero ─── */}
      <section className="relative pt-32 pb-16 px-6">
        {/* Background decorations */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-to-b from-primary/10 via-primary/5 to-transparent rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-32 left-[10%] w-2 h-2 bg-violet-400 rounded-full animate-pulse" />
        <div className="absolute top-48 right-[15%] w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse delay-300" />
        <div className="absolute top-64 left-[20%] w-1 h-1 bg-emerald-400 rounded-full animate-pulse delay-700" />

        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary uppercase text-xs font-bold uppercase tracking-widest mb-6">
            <Sparkles className="w-3.5 h-3.5" />
            La plateforme n°1 pour les restaurateurs
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight leading-[1.1] mb-5">
            Gérez votre restaurant
            <br />
            <span className="text-primary">
              en toute simplicité
            </span>
          </h1>
          <p className="text-zinc-400 text-lg max-w-2xl mx-auto leading-relaxed mb-10">
            Rendez vos clients fiers de vos services grâce à une solution de gestion ultra-complète, du menu digitalisé à la cuisine.
          </p>

          <div className="mt-8 mb-4 max-w-5xl mx-auto relative rounded-3xl overflow-hidden shadow-2xl border border-white/10 group">
             <img 
               src="/smiling_manager.png" 
               alt="Gérant de restaurant souriant" 
               className="w-full h-auto max-h-[500px] object-cover rounded-3xl group-hover:scale-105 transition-transform duration-700" 
             />
             <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent pointer-events-none" />
          </div>
        </div>
      </section>

      {/* ─── Features Grid ─── */}
      <section id="features" className="px-6 py-12 md:py-24">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-black tracking-tight mb-3">
              Tout ce dont vous avez besoin
            </h2>
            <p className="text-zinc-500 text-sm max-w-lg mx-auto">
              SmartResto centralise la gestion de votre restaurant en un seul outil puissant.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: <QrCode className="w-5 h-5" />, title: "QR Code & Menu", desc: "Menu digital avec scan de table." },
              { icon: <BarChart3 className="w-5 h-5" />, title: "Dashboard Temps Réel", desc: "Statistiques et CA en direct." },
              { icon: <Printer className="w-5 h-5" />, title: "Impression Thermique", desc: "Tickets cuisine automatisés." },
              { icon: <Users className="w-5 h-5" />, title: "Multi-Utilisateurs", desc: "Caisse, Cuisine, Gérant." },
              { icon: <Package className="w-5 h-5" />, title: "Gestion de Stock", desc: "Suivi des produits en temps réel." },
              { icon: <Clock className="w-5 h-5" />, title: "Commandes SSE", desc: "Flux en temps réel instantané." },
              { icon: <Globe className="w-5 h-5" />, title: "Multi-Restaurant", desc: "Gérez plusieurs établissements." },
              { icon: <HeadphonesIcon className="w-5 h-5" />, title: "Support 24/7", desc: "Assistance dédiée et réactive." },
            ].map((feat, i) => (
              <div
                key={i}
                className="group bg-zinc-900/40 border border-white/[0.04] p-5 rounded-2xl hover:bg-zinc-900/80 hover:border-white/10 transition-all duration-300 hover:-translate-y-1"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-4 group-hover:bg-primary/20 transition-colors">
                  {feat.icon}
                </div>
                <h4 className="text-sm font-bold text-white mb-1">{feat.title}</h4>
                <p className="text-xs text-zinc-500 leading-relaxed">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Pricing Cards ─── */}
      <section id="pricing" className="relative px-6 py-24 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          {/* Toggle */}
          <div className="flex flex-col items-center gap-8 mb-16">
            <BillingToggle cycle={cycle} setCycle={setCycle} />
            
            <Link 
              href="/manager/register"
              className="group relative flex items-center gap-3 px-8 py-5 bg-white/5 border border-white/10 rounded-[2rem] hover:bg-white/10 hover:border-primary/30 transition-all duration-300 shadow-xl"
            >
              <div className="w-10 h-10 bg-primary text-black rounded-xl flex items-center justify-center shadow-lg shadow-violet-600/20 group-hover:scale-110 transition-transform">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div className="text-left">
                <p className="text-xs font-black text-zinc-500 uppercase tracking-widest leading-none mb-1">Offre de Lancement</p>
                <h4 className="text-lg font-black text-white italic tracking-tighter uppercase leading-none">Creez et Gérez votre établissement gratuitement</h4>
              </div>
              <ArrowRight className="w-5 h-5 text-primary group-hover:translate-x-1 transition-transform ml-4" />
              
              <div className="absolute -top-3 -right-3 bg-emerald-500 text-black text-[9px] font-black px-3 py-1 rounded-full shadow-lg">ESSAI 14 JOURS</div>
            </Link>
          </div>

          {/* Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            {plans.map((plan) => (
              <PricingCard key={plan.name} plan={plan} cycle={cycle} onSubscribe={handleOpenModal} />
            ))}
          </div>

          {/* Trust badge */}
          <div className="flex flex-col items-center mt-12 space-y-3">
            <div className="flex items-center gap-2 text-zinc-500 text-xs font-medium">
              <Shield className="w-4 h-4 text-emerald-500" />
              <span>Paiement 100% sécurisé via</span>
              <span className="font-black text-emerald-400">FlexPaie</span>
            </div>
            <div className="flex items-center gap-4 text-zinc-600 text-[10px] font-bold uppercase tracking-widest">
              <span>Airtel Money</span>
              <span className="w-1 h-1 bg-zinc-700 rounded-full" />
              <span>M-Pesa</span>
              <span className="w-1 h-1 bg-zinc-700 rounded-full" />
              <span>Orange Money</span>
              <span className="w-1 h-1 bg-zinc-700 rounded-full" />
              <span>Carte Visa</span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section className="px-6 py-24 border-t border-white/5">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-black tracking-tight mb-3">Questions fréquentes</h2>
            <p className="text-zinc-500 text-sm">Trouvez rapidement les réponses à vos questions.</p>
          </div>
          <div className="bg-zinc-900/40 border border-white/[0.04] rounded-3xl px-8">
            {faqs.map((faq, i) => (
              <FAQItem key={i} q={faq.q} a={faq.a} />
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA Banner ─── */}
      <section className="px-6 py-24">
        <div className="max-w-4xl mx-auto relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-primary/10 via-primary/5 to-zinc-900 border border-primary/20 p-12 md:p-16 text-center">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[200px] bg-primary/20 blur-[100px] rounded-full pointer-events-none" />
          <div className="relative z-10">
            <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-4">
              Prêt à transformer votre restaurant ?
            </h2>
            <p className="text-zinc-400 text-sm max-w-lg mx-auto mb-8">
              Rejoignez des centaines de restaurateurs qui utilisent SmartResto pour digitaliser leur activité et augmenter leur chiffre d'affaires.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="#pricing"
                className="px-8 py-4 bg-primary text-white font-bold rounded-2xl shadow-xl shadow-primary/20 hover:shadow-primary/40 transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                Commencer maintenant <ArrowRight className="w-5 h-5" />
              </a>
              <Link
                href="/manager/login"
                className="px-8 py-4 border border-white/10 text-zinc-300 hover:text-white font-bold rounded-2xl hover:bg-white/5 transition-all flex items-center justify-center gap-2"
              >
                Se connecter
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer id="contact" className="border-t border-white/5 px-6 py-16">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
            <div className="md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <UtensilsCrossed className="w-4 h-4 text-white" />
                </div>
                <span className="text-lg font-black text-white">
                  Smart<span className="text-primary">Resto</span>
                </span>
              </div>
              <p className="text-xs text-zinc-500 leading-relaxed">
                La plateforme SaaS de gestion de restaurant la plus complète en Afrique centrale.
              </p>
            </div>

            <div>
              <h5 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-4">Produit</h5>
              <ul className="space-y-2">
                <li><a href="#features" className="text-sm text-zinc-400 hover:text-white transition-colors">Fonctionnalités</a></li>
                <li><a href="#pricing" className="text-sm text-zinc-400 hover:text-white transition-colors">Tarifs</a></li>
                <li><a href="#" className="text-sm text-zinc-400 hover:text-white transition-colors">Documentation</a></li>
              </ul>
            </div>

            <div>
              <h5 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-4">Support</h5>
              <ul className="space-y-2">
                <li><button onClick={() => setSupportModal({ isOpen: true, sujet: "CENTRE_AIDE" })} className="text-sm text-zinc-400 hover:text-white transition-colors text-left">Centre d'aide</button></li>
                <li><button onClick={() => setSupportModal({ isOpen: true, sujet: "CONTACT" })} className="text-sm text-zinc-400 hover:text-white transition-colors text-left">Contactez-nous</button></li>
                <li><button onClick={() => setSupportModal({ isOpen: true, sujet: "WHATSAPP" })} className="text-sm text-zinc-400 hover:text-white transition-colors text-left">WhatsApp</button></li>
              </ul>
            </div>

            <div>
              <h5 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-4">Légal</h5>
              <ul className="space-y-2">
                <li><a href="#" className="text-sm text-zinc-400 hover:text-white transition-colors">CGU</a></li>
                <li><a href="#" className="text-sm text-zinc-400 hover:text-white transition-colors">Politique de confidentialité</a></li>
                <li><a href="#" className="text-sm text-zinc-400 hover:text-white transition-colors">Mentions légales</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-[11px] text-zinc-600 font-medium">
              © {new Date().getFullYear()} SmartResto SaaS — Tous droits réservés. Conçu avec ❤️ à Lubumbashi.
            </p>
            <div className="flex items-center gap-2 text-zinc-600">
              <Shield className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Paiement sécurisé via FlexPaie</span>
            </div>
          </div>
        </div>
      </footer>
      {/* ─── Modal ─── */}
      {modalPlan && (
        <SubscriptionModal
          plan={modalPlan}
          cycle={cycle}
          onClose={() => setModalPlan(null)}
        />
      )}

      <SupportModal 
        isOpen={supportModal.isOpen}
        initialSujet={supportModal.sujet}
        onClose={() => setSupportModal({ ...supportModal, isOpen: false })}
      />
    </div>
  );
}
