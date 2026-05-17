"use client"

import React, { useState, useEffect } from "react";
import { X, Plus, Save } from "lucide-react";
import { type Plat } from "@/types";
import { updatePlat } from "@/lib/actions";
import { SubmitButton } from "./SubmitButton";
import { toast } from "sonner";

interface EditPlatModalProps {
  isOpen: boolean;
  onClose: () => void;
  plat: Plat | null;
  restaurantId: string;
}

export function EditPlatModal({ isOpen, onClose, plat, restaurantId }: EditPlatModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !plat) return null;

  const handleSubmit = async (formData: FormData) => {
    setIsSubmitting(true);
    try {
      await updatePlat(formData);
      toast.success("Plat mis à jour avec succès !");
      onClose();
    } catch (error) {
      toast.error("Erreur lors de la mise à jour.");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-card border border-border w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-zinc-900/50">
          <h2 className="text-xl font-bold flex items-center gap-2 text-foreground">
            <Save className="w-5 h-5 text-primary" /> Modifier le Plat
          </h2>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-secondary rounded-full transition-colors text-muted-foreground hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form action={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto no-scrollbar">
          <input type="hidden" name="restaurantId" value={restaurantId} />
          <input type="hidden" name="platId" value={plat.id} />
          
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Nom du plat</label>
            <input 
              name="nom" 
              required 
              defaultValue={plat.nom}
              className="w-full bg-secondary/50 border border-border rounded-xl px-4 py-2 focus:ring-1 focus:ring-primary outline-none text-foreground" 
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Description (optionnel)</label>
            <textarea 
              name="description" 
              defaultValue={plat.description}
              className="w-full bg-secondary/50 border border-border rounded-xl px-4 py-2 focus:ring-1 focus:ring-primary outline-none h-24 resize-none text-foreground" 
            />
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Prix</label>
              <div className="flex gap-2">
                <input 
                  name="prixUsd" 
                  type="number" 
                  step="0.01" 
                  required 
                  defaultValue={plat.prixUsd}
                  className="flex-1 bg-secondary/50 border border-border rounded-xl px-4 py-2 focus:ring-1 focus:ring-primary outline-none text-foreground w-full" 
                />
                <select 
                  name="devise"
                  defaultValue={plat.devise}
                  className="bg-secondary/50 border border-border rounded-xl px-2 py-2 focus:ring-1 focus:ring-primary outline-none text-foreground font-bold"
                >
                  <option value="USD">$ USD</option>
                  <option value="FC">FC</option>
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Catégorie</label>
              <select 
                name="categorie" 
                defaultValue={plat.categorie}
                className="w-full bg-secondary/50 border border-border rounded-xl px-4 py-2 focus:ring-1 focus:ring-primary outline-none appearance-none text-foreground"
              >
                <option value="ENTREE">Entrée</option>
                <option value="PLAT">Plat De Résistance</option>
                <option value="DESSERT">Dessert / Sucré</option>
                <option value="SOFT">Soft Drinks</option>
                <option value="JUS">Jus Naturels</option>
                <option value="VIN">Vins & Domaines</option>
                <option value="WHISKY">Whisky</option>
                <option value="CHAMPAGNE">Champagnes</option>
                <option value="BIERE">Bières</option>
                <option value="VIANDE">Viandes & Autres</option>
                <option value="POISSON">Poisson</option>
                <option value="LEGUME">Légumes</option>
                <option value="GARNITURE">Garnitures</option>
                <option value="EAU">Eaux</option>
                <option value="CAFE">Cafés & Thés</option>
                <option value="COCKTAIL">Cocktails</option>
              </select>
            </div>
          </div>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Photo du plat</label>
              <div className="flex flex-col gap-3">
                <div className="relative group">
                  <input 
                    name="imageFile" 
                    type="file" 
                    accept="image/*"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div className="w-full bg-secondary/30 border-2 border-dashed border-border rounded-xl px-4 py-4 flex flex-col items-center justify-center gap-2 group-hover:border-primary/50 transition-colors">
                    <Plus className="w-6 h-6 text-muted-foreground group-hover:text-primary" />
                    <span className="text-xs text-muted-foreground group-hover:text-foreground">Remplacer la photo locale</span>
                  </div>
                </div>
                
                <div className="relative">
                  <input 
                    name="image" 
                    type="url" 
                    defaultValue={plat.image}
                    placeholder="Lien URL de l'image" 
                    className="w-full bg-secondary/50 border border-border rounded-xl px-4 py-2 focus:ring-1 focus:ring-primary outline-none text-xs text-foreground" 
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Options (séparées par des virgules)</label>
            <input 
              name="options" 
              defaultValue={plat.options?.map(o => o.nom).join(", ")}
              placeholder="Ex: Pimenté, Moyen, Pas pimenté" 
              className="w-full bg-secondary/50 border border-border rounded-xl px-4 py-2 focus:ring-1 focus:ring-primary outline-none text-sm text-foreground" 
            />
          </div>

          <div className="flex items-center gap-2 p-3 bg-primary/5 border border-primary/20 rounded-xl">
            <input 
              type="checkbox" 
              name="isLoyaltyReward" 
              value="true"
              id="edit-isLoyaltyReward"
              defaultChecked={plat.isLoyaltyReward}
              className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
            />
            <label htmlFor="edit-isLoyaltyReward" className="text-xs font-bold text-primary flex items-center gap-1.5">
               Éligible Cadeau Fidélité
            </label>
          </div>

          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-border rounded-2xl font-bold text-sm hover:bg-secondary transition-colors"
            >
              Annuler
            </button>
            <SubmitButton loadingText="Mise à jour..." className="flex-[2]">
              Enregistrer les modifications
            </SubmitButton>
          </div>
        </form>
      </div>
    </div>
  );
}
