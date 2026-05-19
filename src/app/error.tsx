'use client';

import { useEffect } from 'react';
import { RefreshCcw, AlertTriangle } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Root Error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-10 text-center shadow-2xl animate-in zoom-in-95 duration-300">
        <div className="w-20 h-20 bg-red-500/10 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-red-500/20">
          <AlertTriangle className="w-10 h-10 text-red-500" />
        </div>
        
        <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter mb-4">
          Oups ! Une erreur est survenue
        </h2>
        
        <p className="text-zinc-500 text-sm font-medium mb-10 leading-relaxed">
          L&apos;interface a rencontré un problème technique. Pas d&apos;inquiétude, vos données sont en sécurité.
        </p>

        <div className="space-y-4">
          <button
            onClick={() => reset()}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-5 rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-3 shadow-xl shadow-indigo-900/40 uppercase tracking-widest text-xs"
          >
            <RefreshCcw className="w-4 h-4" />
            Réessayer maintenant
          </button>
          
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white font-black py-4 rounded-2xl transition-all text-[10px] uppercase tracking-widest border border-zinc-700"
          >
            Actualiser la page
          </button>
        </div>
        
        <p className="mt-8 text-[9px] font-black text-zinc-700 uppercase tracking-[0.3em]">
          SmartResto Dashboard • Erreur Critique
        </p>
      </div>
    </div>
  );
}
