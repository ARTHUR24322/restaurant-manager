export const dynamic = "force-dynamic";

import { getPlats, addPlat } from "@/lib/actions";
import { Plus, Trash2, UtensilsCrossed } from "lucide-react";
import { type Plat } from "@/types";
import { getManagerSession } from "@/lib/manager-actions";

export default async function ManagerMenuPage({ searchParams }: { searchParams: { resto_id?: string } }) {
  let restaurantId = searchParams.resto_id;
  if (!restaurantId) {
    const session = await getManagerSession();
    restaurantId = session?.id || "resto-99-default";
  }
  const plats = (await getPlats(restaurantId)) as unknown as Plat[];

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestion du Menu</h1>
          <p className="text-muted-foreground mt-1">Ajoutez ou modifiez les plats de votre carte.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Formulaire d'ajout */}
        <div className="lg:col-span-1">
          <div className="bg-card border border-border p-6 rounded-2xl shadow-sm sticky top-24">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Plus className="w-5 h-5 text-primary" /> Nouveau Plat
            </h2>
            <form action={addPlat} className="flex flex-col gap-4">
              <input type="hidden" name="restaurantId" value={restaurantId} />
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Nom du plat</label>
                <input 
                  name="nom" 
                  required 
                  placeholder="Ex: Capitaine Grillé" 
                  className="w-full bg-secondary/50 border border-border rounded-xl px-4 py-2 focus:ring-1 focus:ring-primary outline-none text-foreground" 
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Description (optionnel)</label>
                <textarea 
                  name="description" 
                  placeholder="Ingrédients, cuisson..." 
                  className="w-full bg-secondary/50 border border-border rounded-xl px-4 py-2 focus:ring-1 focus:ring-primary outline-none h-24 resize-none text-foreground" 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Prix ($ USD)</label>
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
                  <label className="text-sm font-medium">Catégorie</label>
                  <select 
                    name="categorie" 
                    className="w-full bg-secondary/50 border border-border rounded-xl px-4 py-2 focus:ring-1 focus:ring-primary outline-none appearance-none text-foreground"
                  >
                    <option value="ENTREE">Entrée</option>
                    <option value="PLAT">Plat</option>
                    <option value="BOISSON">Boisson</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Image (URL HD)</label>
                <input 
                  name="image" 
                  type="url" 
                  required 
                  placeholder="https://images.remote.com/..." 
                  className="w-full bg-secondary/50 border border-border rounded-xl px-4 py-2 focus:ring-1 focus:ring-primary outline-none text-xs text-foreground" 
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

        {/* Liste des plats */}
        <div className="lg:col-span-2">
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
                            <p className="font-bold text-sm">{plat.nom}</p>
                            <p className="text-xs text-muted-foreground line-clamp-1">{plat.description}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-[10px] font-bold px-2 py-1 rounded bg-primary/10 text-primary border border-primary/20">
                          {plat.categorie}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-bold text-sm">
                        ${plat.prixUsd.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
