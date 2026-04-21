"use client"

import React, { useState } from 'react';
import { 
  Wallet, 
  ChefHat, 
  LayoutDashboard, 
  ArrowRight,
  LogOut,
  Building2,
  Lock
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';
import { switchSelectedRestaurant } from '@/lib/auth-actions';
import { verifyManagerPin, getManagerSession, getLinkedEstablishments } from '@/lib/manager-actions';
import { getRestaurantStatus } from '@/lib/actions';
import { PinInput } from '@/components/manager/PinInput';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

function SelectionPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinError, setPinError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [resto, setResto] = useState<any>(null);
  const { setTheme, theme } = useTheme();

  // ID de l'établissement à gérer : soit choisi depuis site-select, soit celui de la session
  const overrideRestoId = searchParams.get('override_resto');

  React.useEffect(() => {
    async function init() {
      const session = await getManagerSession() as any;
      if (!session) {
        router.push('/manager/login');
        return;
      }

      const isExpired = session.subscriptionEnd ? new Date(session.subscriptionEnd) < new Date() : false;
      if (!session.active || isExpired) {
        router.push('/manager/subscription-expired');
        return;
      }

      // CAS CRITIQUE : Si on veut un resto spécifique qui n'est pas celui de la session
      if (overrideRestoId && overrideRestoId !== session.id) {
        setIsVerifying(true);
        const switchRes = await switchSelectedRestaurant(overrideRestoId);
        if (switchRes.success) {
            // On recharge les infos après le switch pour être synchro
            const updatedTarget = await getRestaurantStatus(overrideRestoId) as any;
            if (updatedTarget) {
                setResto(updatedTarget);
                if (updatedTarget.preferredTheme && updatedTarget.preferredTheme !== theme) {
                    setTheme(updatedTarget.preferredTheme);
                }
            }
        } else {
           toast.error("Échec de la synchronisation de l'établissement");
           setResto(session);
        }
        setIsVerifying(false);
      } else if (overrideRestoId) {
        // Déjà sur le bon resto session ou switch réussi
        const target = await getRestaurantStatus(overrideRestoId) as any;
        setResto(target || session);
      } else {
        // Comportement standard : Utiliser le restaurant de la session (Mère par défaut)
        setResto(session);

        // Sync Theme
        if (session.preferredTheme && session.preferredTheme !== theme) {
            setTheme(session.preferredTheme);
        }
      }
    }
    init();
  }, [router, overrideRestoId]);

  const handleRoleSelect = async (role: string) => {
    if (!resto) return;
    
    // La session a déjà été synchronisée dans le useEffect au chargement ou lors de la navigation
    // On peut donc passer directement au PIN ou à l'entrée

    if (role === 'gerant') {
      setShowPinModal(true);
    } else if (role === 'caisse') {
      router.push(`/manager/caisse?resto_id=${resto.id}`);
    } else if (role === 'cuisine') {
      router.push(`/manager/cuisine?resto_id=${resto.id}`);
    }
  };

  const handlePinComplete = async (pin: string) => {
    if (!resto) return;
    setIsVerifying(true);
    setPinError('');
    try {
      const res = await verifyManagerPin(pin);
      if (res.success) {
        router.push(`/manager/dashboard?resto_id=${resto.id}`);
      } else {
        setPinError(res.error || 'Code incorrect');
        toast.error('Code PIN incorrect');
      }
    } catch (err) {
      setPinError('Erreur de vérification');
    } finally {
      setIsVerifying(false);
    }
  };


  const handleLogout = async () => {
    // Import dynamique pour éviter les soucis de bundle client/serveur si nécessaire
    const { logoutManager } = await import('@/lib/auth-actions');
    await logoutManager();
    router.push('/manager/login');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden text-foreground">
      {/* Background Glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary/10 blur-[150px] rounded-full" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-primary/10 blur-[150px] rounded-full" />

      {/* Header */}
      <div className="relative z-10 w-full max-w-5xl flex flex-col items-center mb-16 space-y-4">
        <div className="w-16 h-16 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-center mb-2">
            <Building2 className="w-8 h-8 text-primary" />
        </div>
        <div className="text-center">
            <h1 className="text-4xl font-black text-foreground italic uppercase tracking-tighter sm:text-5xl">
                Portail <span className="text-primary">Opérationnel</span>
            </h1>
            <p className="text-muted-foreground text-sm font-bold uppercase tracking-[0.3em] mt-2">Choisissez votre environnement de travail</p>
        </div>
      </div>

      {/* Role Cards */}
      {!showPinModal ? (
        <div className="relative z-10 w-full max-w-6xl grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-10 duration-300">
          <RoleCard 
            title="Réception & Caisse"
            subtitle="Validation & Encaissement"
            icon={<Wallet className="w-10 h-10" />}
            color="indigo"
            onClick={() => handleRoleSelect('caisse')}
          />
          <RoleCard 
            title="Cuisine & Préparation"
            subtitle="Flux Production Temps Réel"
            icon={<ChefHat className="w-10 h-10" />}
            color="emerald"
            onClick={() => handleRoleSelect('cuisine')}
          />
          <RoleCard 
            title="Gestion & Stratégie"
            subtitle="Administration & Dashboard"
            icon={<LayoutDashboard className="w-10 h-10" />}
            color="primary"
            isLocked
            onClick={() => handleRoleSelect('gerant')}
          />
        </div>
      ) : (
        <div className="relative z-10 w-full max-w-sm">
            <PinInput 
                onComplete={handlePinComplete}
                onCancel={() => setShowPinModal(false)}
                error={pinError}
                isLoading={isVerifying}
            />
        </div>
      )}

      {/* Footer Actions */}
      <div className="relative z-10 mt-16">
        <button 
          onClick={handleLogout}
          className="group flex items-center gap-3 px-6 py-3 rounded-2xl border border-border bg-card hover:bg-secondary text-muted-foreground hover:text-foreground transition-all"
        >
          <LogOut className="w-4 h-4" />
          <span className="text-[10px] font-black uppercase tracking-widest">Se déconnecter de la session</span>
        </button>
      </div>
    </div>
  );
}

interface RoleCardProps {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  color: 'indigo' | 'emerald' | 'primary';
  onClick: () => void;
  isLocked?: boolean;
}

function RoleCard({ title, subtitle, icon, color, onClick, isLocked }: RoleCardProps) {
  const colorMap = {
    indigo: 'from-indigo-500/20 to-indigo-500/5 hover:border-indigo-500/40 text-indigo-400 border-indigo-500/20 shadow-indigo-500/10',
    emerald: 'from-emerald-500/20 to-emerald-500/5 hover:border-emerald-500/40 text-emerald-400 border-emerald-500/20 shadow-emerald-500/10',
    primary: 'from-primary/20 to-primary/5 hover:border-primary/40 text-primary border-primary/20 shadow-primary/10'
  };

  return (
    <button 
      onClick={onClick}
      className={cn(
        "group relative flex flex-col items-start p-8 rounded-[2.5rem] border bg-gradient-to-br transition-all duration-200 transform hover:-translate-y-2 hover:shadow-2xl text-left overflow-hidden",
        colorMap[color]
      )}
    >
      {/* Background Decorative Pattern */}
      <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform duration-300">
        {icon}
      </div>

      <div className={cn(
        "w-16 h-16 rounded-2xl flex items-center justify-center mb-8 transition-transform duration-200 group-hover:scale-110 group-hover:rotate-3 shadow-xl",
        color === 'indigo' ? 'bg-indigo-500 text-white' : 
        color === 'emerald' ? 'bg-emerald-500 text-white' : 
        'bg-primary text-black'
      )}>
        {icon}
      </div>

      <div className="space-y-2 relative z-10">
        <div className="flex items-center gap-2">
            <h3 className="text-xl font-black text-white italic uppercase tracking-tighter">{title}</h3>
            {isLocked && <Lock className="w-4 h-4 text-zinc-500" />}
        </div>
        <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">{subtitle}</p>
      </div>

      <div className="mt-8 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity translate-x-[-10px] group-hover:translate-x-0 transition-transform">
        Entrer <ArrowRight className="w-3 h-3" />
      </div>
    </button>
  );
}

export default function SelectionPage() {
  return (
    <React.Suspense fallback={
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>
    }>
      <SelectionPageInner />
    </React.Suspense>
  );
}
