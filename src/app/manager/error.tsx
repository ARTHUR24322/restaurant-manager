'use client';

import { useEffect } from 'react';
import { RefreshCcw, LayoutDashboard, ShieldAlert } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ManagerError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    console.error('Manager Dashboard Error:', error);
  }, [error]);

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-6 mt-10">
      <div className="max-w-xl w-full bg-zinc-900 border border-zinc-800 rounded-[3rem] p-12 text-center shadow-2xl">
        <div className="w-24 h-24 bg-amber-500/10 rounded-[2rem] flex items-center justify-center mx-auto mb-8 border border-amber-500/20">
          <ShieldAlert className="w-12 h-12 text-amber-500" />
        </div>
        
        <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter mb-4">
          Incident Console Manager
        </h2>
        
        <p className="text-zinc-500 text-sm font-medium mb-12 leading-relaxed">
          Une erreur inattendue a interrompu la console. Vos inventaires et commandes en cours ne sont pas affectés. 
          Veuillez réinitialiser l'interface pour reprendre votre activité.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            onClick={() => reset()}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-black py-5 rounded-[1.5rem] transition-all active:scale-95 flex items-center justify-center gap-3 shadow-xl shadow-emerald-900/40 uppercase tracking-widest text-xs"
          >
            <RefreshCcw className="w-4 h-4" />
            Réinitialiser
          </button>
          
          <button
            onClick={() => router.push('/manager/selection')}
            className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-black py-5 rounded-[1.5rem] transition-all flex items-center justify-center gap-3 border border-zinc-700 uppercase tracking-widest text-xs"
          >
            <LayoutDashboard className="w-4 h-4" />
            Retour Sélection
          </button>
        </div>
        
        <div className="mt-12 flex items-center justify-center gap-4 opacity-30">
          <div className="h-px flex-1 bg-zinc-800" />
          <span className="text-[9px] font-black tracking-[0.4em] uppercase text-zinc-500">Security Protocol Alpha</span>
          <div className="h-px flex-1 bg-zinc-800" />
        </div>
      </div>
    </div>
  );
}
