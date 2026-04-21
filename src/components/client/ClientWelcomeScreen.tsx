"use client";

import React, { useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Utensils, ArrowRight, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface ClientWelcomeScreenProps {
  restaurantName: string;
  table: string;
  logoUrl?: string;
  children: React.ReactNode;
}

export function ClientWelcomeScreen({ restaurantName, table, logoUrl, children }: ClientWelcomeScreenProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  
  // Si le nom est déjà dans l'URL ou on a une confirmation sessionStorage, on affiche le menu normal (children)
  const queryName = searchParams.get("name");
  const restoId = searchParams.get("resto_id");
  const [name, setName] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);

  // --- LOGIQUE D'EXPIRATION (1 HEURE) ---
  React.useEffect(() => {
    if (!restoId) return;

    const sessionKey = `smartresto_session_${restoId}_${table}`;
    const savedSession = localStorage.getItem(sessionKey);

    if (savedSession) {
      try {
        const { timestamp } = JSON.parse(savedSession);
        const now = Date.now();
        const oneHour = 60 * 60 * 1000;

        if (now - timestamp > oneHour) {
          // SESSION EXPIRÉE DÈS LE CHARGEMENT
          localStorage.removeItem(sessionKey);
          setSessionExpired(true);
          setIsSubmitted(false);
          if (queryName) {
            const current = new URLSearchParams(Array.from(searchParams.entries()));
            current.delete("name");
            window.history.replaceState({}, '', `${pathname}?${current.toString()}`);
          }
        } else {
            // Session valide, on lance le Timer d'expulsion
            if (queryName) setIsSubmitted(true);
            
            const timeLeft = oneHour - (now - timestamp);
            const timeoutId = setTimeout(() => {
                // EXPULSION EN DIRECT
                localStorage.removeItem(sessionKey);
                setSessionExpired(true);
                setIsSubmitted(false);
                
                const current = new URLSearchParams(window.location.search);
                current.delete("name");
                window.history.replaceState({}, '', `${window.location.pathname}?${current.toString()}`);
            }, timeLeft);

            return () => clearTimeout(timeoutId);
        }
      } catch (e) {
        localStorage.removeItem(sessionKey);
      }
    }
  }, [restoId, table, queryName, pathname, searchParams]);

  // ÉCRAN DE SÉCURITÉ : EXPULSION APRÈS 1 HEURE
  if (sessionExpired) {
      return (
          <div className="fixed inset-0 z-[200] bg-zinc-950 flex flex-col items-center justify-center p-6 text-center">
              <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-red-500/10 blur-[150px] rounded-full" />
              <div className="relative z-10 max-w-sm animate-in zoom-in-95 duration-500">
                  <div className="w-20 h-20 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-red-500/20 animate-pulse">
                      <span className="text-3xl">⏳</span>
                  </div>
                  <h1 className="text-3xl font-black italic uppercase tracking-tighter text-white mb-4">Temps Écoulé</h1>
                  <p className="text-zinc-400 font-medium mb-8">
                      Pour des raisons de sécurité, votre session de commande (1 heure) a été automatiquement fermée.
                  </p>
                  <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-[2rem] shadow-xl">
                      <p className="text-sm font-bold text-zinc-300">
                          Veuillez <span className="text-emerald-500 font-black">scanner à nouveau</span> le QR code physique présent sur votre table pour réactiver la carte et commander.
                      </p>
                  </div>
              </div>
          </div>
      );
  }

  // Si on a un nom dans l'URL, ou on a déja soumis le formulaire avec succès dans cette vue
  if ((queryName || isSubmitted) && !sessionExpired) {
    return <>{children}</>;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    // Enregistrer la session localement (1 heure de validité)
    if (restoId) {
      localStorage.setItem(`smartresto_session_${restoId}_${table}`, JSON.stringify({
        name: name.trim(),
        timestamp: Date.now()
      }));
    }

    // Créer une nouvelle URL avec les mêmes paramètres + le nom
    const current = new URLSearchParams(Array.from(searchParams.entries()));
    current.set("name", name.trim());
    
    // On met à jour l'état local pour disparaître visuellement tout de suite
    setIsSubmitted(true);
    setSessionExpired(false);

    // On redirige vers la même page mais avec le paramètre ?name=...
    const search = current.toString();
    const query = search ? `?${search}` : "";
    router.replace(`${pathname}${query}`);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-background flex flex-col items-center justify-center p-6 text-foreground overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary/20 blur-[150px] rounded-full" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-indigo-500/10 blur-[150px] rounded-full" />

      <div className="relative z-10 w-full max-w-md animate-in zoom-in-95 duration-300 fade-in flex flex-col items-center">
        
        {/* Logo or Icon */}
        <div className="mb-8 relative">
          <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
          {logoUrl ? (
            <img 
              src={logoUrl} 
              alt={restaurantName} 
              className="relative w-28 h-28 object-cover rounded-[2rem] border-2 border-border shadow-2xl"
            />
          ) : (
            <div className="relative w-28 h-28 bg-card border-2 border-border rounded-[2rem] flex items-center justify-center shadow-2xl shadow-primary/10">
              <Utensils className="w-12 h-12 text-primary" />
            </div>
          )}
        </div>

        <div className="text-center mb-10 w-full">
          <div className="inline-block px-4 py-1.5 bg-secondary border border-border rounded-full text-xs font-black uppercase tracking-widest text-muted-foreground mb-6">
            Table {table}
          </div>
          <h1 className="text-4xl sm:text-5xl font-black italic tracking-tighter mb-4 leading-tight">
            Bienvenue chez <br/>
            <span className="text-primary">{restaurantName}</span>
          </h1>
          <p className="text-muted-foreground">Veuillez entrer votre nom pour accéder à notre menu numérique.</p>
        </div>

        <form onSubmit={handleSubmit} className="w-full space-y-4">
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
              <User className="w-5 h-5" />
            </div>
            <input 
              type="text" 
              placeholder="Votre Prénom"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={30}
              className="w-full bg-secondary/50 border border-border/50 text-foreground font-medium text-lg rounded-2xl pl-12 pr-4 py-4 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-muted-foreground/30"
            />
          </div>
          <button 
            type="submit"
            disabled={!name.trim()}
            className={cn(
              "w-full py-4 rounded-2xl font-black uppercase tracking-widest text-sm flex items-center justify-center gap-2 transition-all",
              name.trim() 
                ? "bg-primary text-primary-foreground shadow-xl shadow-primary/25 hover:scale-[1.02] active:scale-[0.98]"
                : "bg-secondary text-muted-foreground cursor-not-allowed opacity-70"
            )}
          >
            Voir le Menu <ArrowRight className="w-5 h-5" />
          </button>
        </form>

      </div>
    </div>
  );
}
