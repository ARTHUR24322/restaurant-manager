"use client"
/* eslint-disable react-hooks/exhaustive-deps, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */

import React, { useState } from 'react';
import { 
  Wallet, 
  ChefHat, 
  LayoutDashboard, 
  ArrowRight,
  LogOut,
  Building2,
  Lock,
  ShoppingBag,
  UserCheck,
  Banknote
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';
import { switchSelectedRestaurant } from '@/lib/auth-actions';
import { verifyManagerPin, getManagerSession } from '@/lib/manager-actions';
import { getRestaurantStatus } from '@/lib/actions';
import { loginEmployeByPin, ouvrirShift, logEmployeConnection } from '@/lib/employe-actions';
import { PinInput } from '@/components/manager/PinInput';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

function SelectionPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinError, setPinError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [loadingRole, setLoadingRole] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [resto, setResto] = useState<any>(null);
  const { setTheme, theme } = useTheme();

  // Shift Modal State
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [fondsInitial, setFondsInitial] = useState("0");
  const [shiftLoading, setShiftLoading] = useState(false);
  const [loggedEmploye, setLoggedEmploye] = useState<any>(null);

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

      if (overrideRestoId && overrideRestoId !== session.id) {
        const switchRes = await switchSelectedRestaurant(overrideRestoId);
        if (switchRes.success) {
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
      } else if (overrideRestoId) {
        const target = await getRestaurantStatus(overrideRestoId) as any;
        setResto(target || session);
      } else {
        setResto(session);
        if (session.preferredTheme && session.preferredTheme !== theme) {
            setTheme(session.preferredTheme);
        }
      }
    }
    init();
  }, [router, overrideRestoId]);

  const handleRoleSelect = async (role: string) => {
    if (!resto) return;
    setSelectedRole(role);
    setShowPinModal(true);
    setPinError('');
  };

  const navigateBasedOnRole = () => {
    if (!selectedRole || !resto) return;
    setLoadingRole(selectedRole);
    if (selectedRole === 'gerant') router.push(`/manager/dashboard?resto_id=${resto.id}`);
    else if (selectedRole === 'caisse') router.push(`/manager/caisse?resto_id=${resto.id}`);
    else if (selectedRole === 'cuisine') router.push(`/manager/cuisine?resto_id=${resto.id}`);
    else if (selectedRole === 'boutique') router.push(`/manager/gestion-boutique?resto_id=${resto.id}`);
    else if (selectedRole === 'serveur') router.push(`/manager/service?resto_id=${resto.id}`); // Ajustez la route cible si nécessaire
  };

  const handlePinComplete = async (pin: string) => {
    if (!resto || !selectedRole) return;
    setIsVerifying(true);
    setPinError('');
    
    try {
      let verified = false;
      let employeeData = null;

      if (selectedRole === 'gerant') {
        const empRes = await loginEmployeByPin(resto.id, pin);
        if (empRes.success && empRes.employe && empRes.employe.role === 'MANAGER') {
            verified = true;
            employeeData = empRes.employe;
        } else {
            const res = await verifyManagerPin(pin);
            if (res.success) verified = true;
        }
      } else {
        const targetRole = selectedRole === 'caisse' ? 'CAISSIER' : 
                           selectedRole === 'cuisine' ? 'CUISINIER' :
                           selectedRole === 'serveur' ? 'SERVEUR' : null;

        const empRes = await loginEmployeByPin(resto.id, pin);
        if (empRes.success && empRes.employe) {
            if (empRes.employe.role === targetRole || empRes.employe.role === 'MANAGER') {
                verified = true;
                employeeData = empRes.employe;
            }
        }
      }

      if (!verified) {
        setPinError('Code PIN incorrect ou rôle non autorisé');
        toast.error('Accès refusé');
        setIsVerifying(false);
        return;
      }

      if (employeeData) {
        await logEmployeConnection(resto.id, employeeData.id, employeeData.nom, employeeData.role);
        setLoggedEmploye(employeeData);

        if (selectedRole === 'caisse' || selectedRole === 'gerant') {
          setShowShiftModal(true);
          setShowPinModal(false);
          setIsVerifying(false);
          return;
        }
        
        sessionStorage.setItem("employe_actif", JSON.stringify(employeeData));
      }

      navigateBasedOnRole();
    } catch (err) {
      setPinError('Erreur de vérification');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleOuvrirShift = async (skipShift = false) => {
    if (!loggedEmploye || !resto) return;

    if (!skipShift) {
      setShiftLoading(true);
      const res = await ouvrirShift(resto.id, loggedEmploye.id, parseFloat(fondsInitial) || 0);
      if (res.success) {
        sessionStorage.setItem("employe_actif", JSON.stringify(loggedEmploye));
        sessionStorage.setItem("shift_actif", JSON.stringify(res.shift));
      } else {
        toast.error("Erreur lors de l'ouverture du shift");
      }
      setShiftLoading(false);
    } else {
      sessionStorage.setItem("employe_actif", JSON.stringify(loggedEmploye));
    }

    setShowShiftModal(false);
    navigateBasedOnRole();
  };

  const handleLogout = async () => {
    const { logoutManager } = await import('@/lib/auth-actions');
    await logoutManager();
    router.push('/manager/login');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden text-foreground">
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary/10 blur-[150px] rounded-full" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-primary/10 blur-[150px] rounded-full" />

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

      {!showPinModal && !showShiftModal ? (
        <div className="relative z-10 w-full max-w-6xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 animate-in fade-in slide-in-from-bottom-10 duration-300">
          <RoleCard 
            title="Réception & Caisse"
            subtitle="Validation & Encaissement"
            icon={<Wallet className="w-10 h-10" />}
            color="indigo"
            onClick={() => handleRoleSelect('caisse')}
            isLoading={loadingRole === 'caisse'}
          />
          <RoleCard 
            title="Cuisine & Préparation"
            subtitle="Flux Production Temps Réel"
            icon={<ChefHat className="w-10 h-10" />}
            color="emerald"
            onClick={() => handleRoleSelect('cuisine')}
            isLoading={loadingRole === 'cuisine'}
          />
          <RoleCard 
            title="Gestion Boutique"
            subtitle="Commandes En Ligne"
            icon={<ShoppingBag className="w-10 h-10" />}
            color="violet"
            onClick={() => handleRoleSelect('boutique')}
            isLoading={loadingRole === 'boutique'}
          />
          <RoleCard 
            title="Service en Salle"
            subtitle="Prise de Commandes"
            icon={<UserCheck className="w-10 h-10" />}
            color="blue"
            onClick={() => handleRoleSelect('serveur')}
            isLoading={loadingRole === 'serveur'}
          />
          <RoleCard 
            title="Gestion & Stratégie"
            subtitle="Administration"
            icon={<LayoutDashboard className="w-10 h-10" />}
            color="primary"
            isLocked
            onClick={() => handleRoleSelect('gerant')}
            isLoading={loadingRole === 'gerant'}
          />
        </div>
      ) : showPinModal ? (
        <div className="relative z-10 w-full max-w-sm">
            <PinInput 
                onComplete={handlePinComplete}
                onCancel={() => { setShowPinModal(false); setSelectedRole(null); }}
                error={pinError}
                isLoading={isVerifying}
            />
        </div>
      ) : showShiftModal ? (
        <div className="relative z-10 w-full max-w-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-[2rem] p-8 shadow-2xl animate-in zoom-in-95 duration-200 text-center">
            <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto mb-5 border border-emerald-500/20">
              <Banknote className="w-8 h-8 text-emerald-500" />
            </div>
            <h3 className="text-lg font-black italic text-white mb-1">Ouverture de Caisse</h3>
            <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-6">
              Entrez le fonds de départ
            </p>

            <div className="mb-6">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 block mb-2">
                Fonds Initial ($)
              </label>
              <input
                type="number"
                value={fondsInitial}
                onChange={(e) => setFondsInitial(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 focus:border-emerald-500 rounded-xl py-4 px-5 text-white text-xl font-black outline-none text-center focus:ring-2 focus:ring-emerald-500/30 transition-all"
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <button
                onClick={() => handleOuvrirShift(false)}
                disabled={shiftLoading}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-4 rounded-xl uppercase text-xs tracking-widest transition-all shadow-lg shadow-emerald-500/10 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {shiftLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Banknote className="w-4 h-4" />}
                {shiftLoading ? "Ouverture..." : "Ouvrir la Caisse"}
              </button>
              <button
                onClick={() => handleOuvrirShift(true)}
                className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400 font-black py-3 rounded-xl uppercase text-[10px] tracking-widest transition-all"
              >
                Continuer sans ouvrir
              </button>
            </div>
          </div>
        </div>
      ) : null}

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
  color: 'indigo' | 'emerald' | 'primary' | 'violet' | 'blue';
  onClick: () => void;
  isLocked?: boolean;
  isLoading?: boolean;
}

function RoleCard({ title, subtitle, icon, color, onClick, isLocked, isLoading }: RoleCardProps) {
  const colorMap = {
    indigo: 'from-indigo-500/20 to-indigo-500/5 hover:border-indigo-500/40 text-indigo-400 border-indigo-500/20 shadow-indigo-500/10',
    emerald: 'from-emerald-500/20 to-emerald-500/5 hover:border-emerald-500/40 text-emerald-400 border-emerald-500/20 shadow-emerald-500/10',
    violet: 'from-violet-500/20 to-violet-500/5 hover:border-violet-500/40 text-violet-400 border-violet-500/20 shadow-violet-500/10',
    primary: 'from-primary/20 to-primary/5 hover:border-primary/40 text-primary border-primary/20 shadow-primary/10',
    blue: 'from-blue-500/20 to-blue-500/5 hover:border-blue-500/40 text-blue-400 border-blue-500/20 shadow-blue-500/10'
  };

  const iconBgMap = {
    indigo: 'bg-indigo-500 text-white',
    emerald: 'bg-emerald-500 text-white',
    violet: 'bg-violet-500 text-white',
    primary: 'bg-primary text-black',
    blue: 'bg-blue-500 text-white'
  };

  return (
    <button 
      onClick={onClick}
      disabled={isLoading}
      className={cn(
        "group relative flex flex-col items-start p-8 rounded-[2.5rem] border bg-gradient-to-br transition-all duration-200 transform hover:-translate-y-2 hover:shadow-2xl text-left overflow-hidden",
        colorMap[color],
        isLoading && "opacity-50 cursor-not-allowed scale-[0.98]"
      )}
    >
      <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform duration-300">
        {icon}
      </div>

      <div className={cn(
        "w-16 h-16 rounded-2xl flex items-center justify-center mb-8 transition-transform duration-200 group-hover:scale-110 group-hover:rotate-3 shadow-xl",
        iconBgMap[color]
      )}>
        {isLoading ? <Loader2 className="w-8 h-8 animate-spin" /> : icon}
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
