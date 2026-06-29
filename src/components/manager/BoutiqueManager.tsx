"use client";
/* eslint-disable react/no-unescaped-entities, @typescript-eslint/no-explicit-any, @next/next/no-img-element */

import { useState, useTransition } from "react";
import { type Plat } from "@/types";
import { updateBoutiqueSettings, togglePlatOnlineVisibility } from "@/lib/actions-boutique";
import { toast } from "sonner";
import { Store, Globe, EyeOff, Eye, Loader2, Copy, Check, ExternalLink } from "lucide-react";

interface BoutiqueManagerProps {
  restaurantId: string;
  plats: Plat[];
  initialIsBoutiqueEnabled: boolean;
  initialBoutiqueSlug: string;
}

export function BoutiqueManager({ restaurantId, plats, initialIsBoutiqueEnabled, initialBoutiqueSlug }: BoutiqueManagerProps) {
  const [isPending, startTransition] = useTransition();
  const [isEnabled, setIsEnabled] = useState(initialIsBoutiqueEnabled);
  const [slug, setSlug] = useState(initialBoutiqueSlug || "");
  const [copied, setCopied] = useState(false);

  const boutiqueUrl = typeof window !== "undefined" && slug ? `${window.location.origin}/boutique/${slug}` : "";

  const handleCopyLink = () => {
    if (!boutiqueUrl) return;
    navigator.clipboard.writeText(boutiqueUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleSaveSettings = async () => {
    startTransition(async () => {
      const res = await updateBoutiqueSettings(restaurantId, isEnabled, slug);
      if (res.success) {
        toast.success("Paramètres de la boutique enregistrés avec succès.");
      } else {
        toast.error(res.error || "Erreur lors de la sauvegarde.");
        setIsEnabled(initialIsBoutiqueEnabled);
        setSlug(initialBoutiqueSlug);
      }
    });
  };

  const handleTogglePlat = async (platId: string, currentStatus: boolean) => {
    startTransition(async () => {
      const res = await togglePlatOnlineVisibility(restaurantId, platId, !currentStatus);
      if (res.success) {
        toast.success("Disponibilité du plat mise à jour.");
      } else {
        toast.error(res.error || "Erreur lors de la mise à jour du plat.");
      }
    });
  };

  return (
    <div className="space-y-8">
      {/* Paramètres Généraux */}
      <div className="bg-card border border-border p-6 rounded-2xl shadow-sm">
        <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-foreground">
          <Store className="w-5 h-5 text-primary" /> Configuration
        </h2>
        
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-xl">
            <div>
              <p className="font-bold text-foreground">Activer la boutique en ligne</p>
              <p className="text-sm text-muted-foreground mt-1">Permet à vos clients de consulter vos plats en ligne.</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer"
                checked={isEnabled}
                onChange={(e) => setIsEnabled(e.target.checked)}
                disabled={isPending}
              />
              <div className="w-11 h-6 bg-secondary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>

          <div className="space-y-1.5 p-4 bg-secondary/50 rounded-xl">
             <label className="font-bold text-foreground block">Lien de votre boutique</label>
             <p className="text-sm text-muted-foreground mb-4">Personnalisez l'URL de votre vitrine. (ex: mon-super-resto)</p>
             <div className="flex mt-2">
                <span className="inline-flex items-center px-3 text-sm text-muted-foreground bg-background border border-r-0 border-border rounded-l-md truncate max-w-[200px] overflow-hidden">
                   {typeof window !== "undefined" ? window.location.origin : ""}/boutique/
                </span>
                <input 
                   type="text" 
                   value={slug}
                   onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                   placeholder="votre-restaurant"
                   className="rounded-none bg-background border border-border text-foreground focus:ring-primary focus:border-primary block flex-1 min-w-0 w-full text-sm p-2.5 outline-none" 
                   disabled={!isEnabled || isPending}
                />
                <button
                  onClick={handleCopyLink}
                  disabled={!slug || !isEnabled}
                  title="Copier le lien"
                  className="inline-flex items-center gap-1.5 px-3 text-sm bg-primary text-primary-foreground border border-primary rounded-r-lg hover:bg-primary/90 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap font-bold"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? "Copié!" : "Copier"}
                </button>
             </div>
             {slug && isEnabled && boutiqueUrl && (
               <div className="mt-3 flex items-center gap-2 bg-primary/5 border border-primary/20 rounded-xl px-4 py-3">
                 <Globe className="w-4 h-4 text-primary flex-shrink-0" />
                 <a
                   href={boutiqueUrl}
                   target="_blank"
                   rel="noopener noreferrer"
                   className="text-primary text-sm font-medium truncate hover:underline flex-1"
                 >
                   {boutiqueUrl}
                 </a>
                 <ExternalLink className="w-3.5 h-3.5 text-primary/60 flex-shrink-0" />
               </div>
             )}
          </div>

          <button 
            onClick={handleSaveSettings}
            disabled={isPending}
            className="flex items-center justify-center gap-2 bg-primary text-primary-foreground px-6 py-2.5 rounded-xl font-bold hover:bg-primary/90 transition-all active:scale-95 self-end"
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
            Enregistrer les modifications
          </button>
        </div>
      </div>

      {/* Liste des Plats */}
      {isEnabled && (
          <div className="bg-card border border-border p-6 rounded-2xl shadow-sm">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-foreground">
              Sélection des Plats
            </h2>
            <p className="text-sm text-muted-foreground mb-6">Sélectionnez les plats que vous souhaitez faire apparaître sur votre boutique en ligne.</p>

            {plats.length === 0 ? (
                <div className="text-center py-10">
                    <p className="text-muted-foreground">Aucun plat dans votre menu. Allez dans l'onglet "Menu" pour en ajouter.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {plats.map((plat) => {
                        const isOnline = plat.isAvailableOnline ?? false;
                        return (
                            <div key={plat.id} className="p-4 border border-border rounded-xl flex items-center justify-between gap-4 bg-secondary/20">
                                <div className="flex items-center gap-4 truncate">
                                    <img src={plat.image || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c"} alt={plat.nom} className="w-12 h-12 rounded-lg object-cover bg-secondary" />
                                    <div className="truncate">
                                        <p className="font-bold text-sm truncate">{plat.nom}</p>
                                        <p className="text-sm text-muted-foreground">{plat.prixUsd} $</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleTogglePlat(plat.id, isOnline)}
                                    disabled={isPending}
                                    className={`p-2 rounded-lg transition-colors flex-shrink-0 ${isOnline ? "bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20" : "bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20"}`}
                                    title={isOnline ? "Masquer de la boutique" : "Afficher sur la boutique"}
                                >
                                    {isOnline ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}
          </div>
      )}
    </div>
  );
}
