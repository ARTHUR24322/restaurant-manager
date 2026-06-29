export const dynamic = "force-dynamic";

import { getPlats } from "@/lib/actions";
import { getManagerSession } from "@/lib/manager-actions";
import { BoutiqueManager } from "@/components/manager/BoutiqueManager";
import { type Plat } from "@/types";

export default async function ManagerBoutiquePage({ searchParams }: { searchParams: { resto_id?: string } }) {
  let restaurantId = searchParams.resto_id;
  const session = await getManagerSession();
  
  if (!restaurantId) {
    restaurantId = session?.id || "";
  }
  const finalRestaurantId = restaurantId as string;
  const plats = (finalRestaurantId ? await getPlats(finalRestaurantId) : []) as unknown as Plat[];

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Boutique en Ligne</h1>
          <p className="text-muted-foreground mt-1">Gérez votre vitrine numérique et choisissez les plats à vendre en ligne.</p>
        </div>
      </div>

      {session && (
        <BoutiqueManager 
            restaurantId={finalRestaurantId} 
            plats={plats} 
            initialIsBoutiqueEnabled={session.isBoutiqueEnabled ?? false} 
            initialBoutiqueSlug={session.boutiqueSlug ?? ""} 
        />
      )}
    </div>
  );
}
