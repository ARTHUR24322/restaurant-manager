"use client";
/* eslint-disable react-hooks/exhaustive-deps, react/no-unescaped-entities, @typescript-eslint/no-unused-vars */

import React, { useState, useEffect } from "react";
import { X, Plus, Trash2, Save, Loader2, BookOpen } from "lucide-react";
import { type Plat, type ArticleStock } from "@/types";
import { getInventory, getRecipeForPlat, updateRecipe } from "@/lib/inventory-actions";
import { toast } from "sonner";

export function RecipeModal({ 
  plat, 
  restaurantId, 
  isOpen, 
  onClose 
}: { 
  plat: Plat | null; 
  restaurantId: string; 
  isOpen: boolean; 
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [articles, setArticles] = useState<ArticleStock[]>([]);
  const [recipeItems, setRecipeItems] = useState<{articleId: string, quantite: number, nom?: string, unite?: string}[]>([]);

  useEffect(() => {
    if (isOpen && plat) {
      loadData();
    }
  }, [isOpen, plat]);

  async function loadData() {
    setLoading(true);
    try {
      const [invData, recData] = await Promise.all([
        getInventory(restaurantId),
        getRecipeForPlat(plat!.id, restaurantId)
      ]);
      setArticles(invData);
      
      setRecipeItems(recData.map((r: { articleId: string; quantite: number; article?: { nom: string; unite: string } }) => ({
        articleId: r.articleId,
        quantite: r.quantite,
        nom: r.article?.nom,
        unite: r.article?.unite
      })));
    } catch (e) {
      console.error(e);
      toast.error("Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }

  const handleAddItem = () => {
    setRecipeItems([...recipeItems, { articleId: "", quantite: 1 }]);
  };

  const handleUpdateItem = (index: number, field: string, value: string | number) => {
    const newItems = [...recipeItems];
    newItems[index] = { ...newItems[index], [field]: value };
    if (field === "articleId") {
      const art = articles.find(a => a.id === value);
      if (art) {
        newItems[index].unite = art.unite;
      }
    }
    setRecipeItems(newItems);
  };

  const handleRemoveItem = (index: number) => {
    const newItems = [...recipeItems];
    newItems.splice(index, 1);
    setRecipeItems(newItems);
  };

  const handleSave = async () => {
    // Valider
    const validItems = recipeItems.filter(i => i.articleId && i.quantite > 0);
    
    setSaving(true);
    try {
      const res = await updateRecipe(plat!.id, restaurantId, validItems.map(i => ({
        articleId: i.articleId,
        quantite: i.quantite
      })));
      if (res.success) {
        toast.success("Recette enregistrée avec succès");
        onClose();
      } else {
        toast.error(res.error || "Erreur de sauvegarde");
      }
    } catch (e) {
      toast.error("Erreur serveur");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen || !plat) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-6 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-500">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Recette / Composition</h2>
              <p className="text-xs text-zinc-400">Pour: {plat.nom}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-zinc-500 hover:text-white rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-zinc-800/50 p-4 rounded-xl text-xs text-zinc-400 border border-zinc-800">
                La recette détermine quels articles sont déduits du stock lorsqu'une commande pour ce plat est confirmée.
              </div>

              {recipeItems.length === 0 ? (
                <div className="text-center py-8 text-zinc-500">
                  <p>Aucun ingrédient défini.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recipeItems.map((item, index) => (
                    <div key={index} className="flex items-center gap-3 bg-zinc-800/30 p-3 rounded-xl border border-zinc-800">
                      <select 
                        value={item.articleId} 
                        onChange={(e) => handleUpdateItem(index, 'articleId', e.target.value)}
                        className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg p-2 text-sm text-white outline-none focus:border-primary"
                      >
                        <option value="">Sélectionner un article...</option>
                        {articles.map(a => (
                          <option key={a.id} value={a.id}>{a.nom} ({a.stockActuel} {a.unite})</option>
                        ))}
                      </select>
                      
                      <div className="flex items-center gap-2 w-32">
                        <input 
                          type="number" 
                          min="0.01" 
                          step="0.01" 
                          value={item.quantite} 
                          onChange={(e) => handleUpdateItem(index, 'quantite', parseFloat(e.target.value) || 0)}
                          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2 text-sm text-white outline-none focus:border-primary"
                        />
                        <span className="text-xs text-zinc-500 w-12">{item.unite || "-"}</span>
                      </div>

                      <button onClick={() => handleRemoveItem(index)} className="p-2 text-zinc-500 hover:text-red-500 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <button 
                onClick={handleAddItem}
                className="w-full py-3 border-2 border-dashed border-zinc-700 rounded-xl text-sm text-zinc-400 hover:text-white hover:border-zinc-500 transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" /> Ajouter un ingrédient
              </button>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-zinc-800 flex justify-end gap-3 bg-zinc-950">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-bold text-zinc-400 hover:text-white transition-colors">
            Annuler
          </button>
          <button 
            onClick={handleSave} 
            disabled={saving || loading}
            className="flex items-center gap-2 bg-primary text-black px-6 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all disabled:opacity-50"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            <Save className="w-4 h-4" /> Enregistrer la Recette
          </button>
        </div>
      </div>
    </div>
  );
}
