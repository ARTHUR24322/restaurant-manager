"use client"

import React, { useState } from "react";
import { Trash2, UtensilsCrossed, BookOpen } from "lucide-react";
import { type Plat } from "@/types";
import { deletePlat } from "@/lib/actions";
import { ConfirmModal } from "./ConfirmModal";
import { RecipeModal } from "./RecipeModal";
import { toast } from "sonner";

interface MenuTableProps {
  plats: Plat[];
  restaurantId: string;
}

export function MenuTable({ plats, restaurantId }: MenuTableProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [selectedPlat, setSelectedPlat] = useState<Plat | null>(null);
  
  const [showRecipe, setShowRecipe] = useState(false);
  const [recipePlat, setRecipePlat] = useState<Plat | null>(null);

  const handleDeleteClick = (plat: Plat) => {
    setSelectedPlat(plat);
    setShowConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedPlat) return;
    
    setIsDeleting(true);
    try {
      const formData = new FormData();
      formData.append("restaurantId", restaurantId);
      formData.append("platId", selectedPlat.id);
      
      await deletePlat(formData);
      toast.success(`${selectedPlat.nom} a été retiré du menu.`);
    } catch (error) {
      toast.error("Erreur lors de la suppression.");
      console.error(error);
    } finally {
      setIsDeleting(false);
      setShowConfirm(false);
      setSelectedPlat(null);
    }
  };

  return (
    <>
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-secondary/50 text-xs font-bold uppercase text-muted-foreground border-b border-border">
            <tr>
              <th className="px-6 py-4">Plat</th>
              <th className="px-6 py-4">Catégorie</th>
              <th className="px-6 py-4">Prix</th>
              <th className="px-6 py-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {plats.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">
                  <UtensilsCrossed className="w-10 h-10 mx-auto mb-3 opacity-20" />
                  <p>Aucun plat dans votre menu pour le moment.</p>
                </td>
              </tr>
            ) : (
              plats.map((plat) => (
                <tr key={plat.id} className="hover:bg-secondary/20 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-secondary overflow-hidden border border-border shrink-0">
                        <img src={plat.image} alt={plat.nom} className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <p className="font-bold text-sm text-foreground">{plat.nom}</p>
                        <p className="text-xs text-muted-foreground line-clamp-1">{plat.description}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[10px] font-bold px-2 py-1 rounded bg-primary/10 text-primary border border-primary/20">
                      {plat.categorie}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-bold text-sm text-foreground">
                    ${plat.prixUsd.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 md:opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => { setRecipePlat(plat); setShowRecipe(true); }}
                        className="p-2 text-indigo-500 hover:bg-indigo-500/10 rounded-lg transition-colors border border-transparent hover:border-indigo-500/20"
                        title="Gérer la recette"
                      >
                        <BookOpen className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDeleteClick(plat)}
                        className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors border border-transparent hover:border-destructive/20"
                        title="Supprimer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <ConfirmModal
        show={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleConfirmDelete}
        title="Supprimer le plat"
        message={`Êtes-vous sûr de vouloir retirer "${selectedPlat?.nom}" de votre menu ?`}
        confirmLabel="Supprimer"
        isLoading={isDeleting}
        variant="danger"
      />

      <RecipeModal 
        isOpen={showRecipe}
        onClose={() => setShowRecipe(false)}
        plat={recipePlat}
        restaurantId={restaurantId}
      />
    </>
  );
}
