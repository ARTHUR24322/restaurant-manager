export const dynamic = "force-dynamic";

import { getPlats, addPlat } from "@/lib/actions";
import { Plus } from "lucide-react";
import { type Plat } from "@/types";
import { getManagerSession } from "@/lib/manager-actions";
import { MenuTable } from "@/components/manager/MenuTable";

export default async function ManagerMenuPage({ searchParams }: { searchParams: { resto_id?: string } }) {
  let restaurantId = searchParams.resto_id;
  if (!restaurantId) {
    const session = await getManagerSession();
    restaurantId = session?.id || "";
  }
  const plats = (restaurantId ? await getPlats(restaurantId) : []) as unknown as Plat[];

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Gestion du Menu</h1>
          <p className="text-muted-foreground mt-1">Ajoutez ou modifiez les plats de votre carte.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Formulaire d'ajout */}
        <div className="lg:col-span-1">
          <div className="bg-card border border-border p-6 rounded-2xl shadow-sm sticky top-24">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-foreground">
              <Plus className="w-5 h-5 text-primary" /> Nouveau Plat
            </h2>
            <form action={addPlat} className="flex flex-col gap-4">
              <input type="hidden" name="restaurantId" value={restaurantId} />
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Nom du plat</label>
                <input 
                  name="nom" 
                  required 
                  placeholder="Ex: Capitaine Grillé" 
                  className="w-full bg-secondary/50 border border-border rounded-xl px-4 py-2 focus:ring-1 focus:ring-primary outline-none text-foreground" 
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Description (optionnel)</label>
                <textarea 
                  name="description" 
                  placeholder="Ingrédients, cuisson..." 
                  className="w-full bg-secondary/50 border border-border rounded-xl px-4 py-2 focus:ring-1 focus:ring-primary outline-none h-24 resize-none text-foreground" 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Prix ($ USD)</label>
                  <input 
                    name="prixUsd" 
                    type="number" 
                    step="0.01" 
                    required 
                    placeholder="12.50" 
                    className="w-full bg-secondary/50 border border-border rounded-xl px-4 py-2 focus:ring-1 focus:ring-primary outline-none text-foreground" 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Catégorie</label>
                  <select 
                    name="categorie" 
                    className="w-full bg-secondary/50 border border-border rounded-xl px-4 py-2 focus:ring-1 focus:ring-primary outline-none appearance-none text-foreground"
                  >
                    <option value="ENTREE">Entrée</option>
                    <option value="PLAT">Plat De Résistance</option>
                    <option value="DESSERT">Dessert / Sucré</option>
                    <option value="JUS">Jus Naturels</option>
                    <option value="VIN">Vins & Domaines</option>
                    <option value="BIERE">Bières</option>
                    <option value="SODA">Sodas</option>
                    <option value="EAU">Eaux</option>
                    <option value="CAFE">Cafés & Thés</option>
                    <option value="COCKTAIL">Cocktails</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Image (URL HD)</label>
                <input 
                  name="image" 
                  type="url" 
                  required 
                  placeholder="https://images.remote.com/..." 
                  className="w-full bg-secondary/50 border border-border rounded-xl px-4 py-2 focus:ring-1 focus:ring-primary outline-none text-xs text-foreground" 
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Options (séparées par des virgules)</label>
                <input 
                  name="options" 
                  placeholder="Ex: Pimenté, Moyen, Pas pimenté" 
                  className="w-full bg-secondary/50 border border-border rounded-xl px-4 py-2 focus:ring-1 focus:ring-primary outline-none text-sm text-foreground" 
                />
              </div>

              <button 
                type="submit" 
                className="w-full bg-primary text-primary-foreground font-bold py-3 rounded-xl mt-2 hover:bg-primary/90 transition-all active:scale-95 shadow-lg shadow-primary/20"
              >
                Ajouter au Menu
              </button>
            </form>
          </div>
        </div>

        {/* Liste des plats (Composant Client) */}
        <div className="lg:col-span-2">
          <MenuTable plats={plats} restaurantId={restaurantId} />
        </div>
      </div>
    </div>
  );
}
