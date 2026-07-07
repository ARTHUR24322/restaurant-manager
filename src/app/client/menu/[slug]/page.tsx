/* eslint-disable @next/next/no-img-element */
import { getPlats } from "@/lib/actions";
import { getRestaurantBySlug } from "@/lib/admin-actions";
import { prisma } from "@/lib/prisma";
import { Clock } from "lucide-react";
import { CartFloat } from "@/components/client/CartFloat";
import ClientMenuContent from "../ClientMenuContent";
import { recordVisit } from "@/lib/analytics-actions";
import { notFound } from "next/navigation";

import { ClientWelcomeScreen } from "@/components/client/ClientWelcomeScreen";
import { PromoGiftModal } from "@/components/client/PromoGiftModal";
import { LoyaltyQuickTrack } from "@/components/client/LoyaltyQuickTrack";

export const dynamic = "force-dynamic";

export default async function ClientMenuSlugPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { table?: string; name?: string };
}) {
  const { slug } = params;
  const restaurant = await getRestaurantBySlug(slug);

  if (!restaurant) {
    return notFound();
  }

  const restaurantId = restaurant.id;
  const plats = await getPlats(restaurantId);
  const table = searchParams.table || "Inconnue";
  const clientName = searchParams.name || "Client";

  // Récupérer la config de fidélité pour vérifier si elle est active
  const loyaltyConfig = await prisma.loyaltyConfig.findUnique({
    where: { restaurantId }
  });
  const isLoyaltyActive = loyaltyConfig ? loyaltyConfig.isActive : false;

  // Enregistrer le scan (visite)
  recordVisit(restaurantId, table);

  return (
    <ClientWelcomeScreen 
        restaurantName={restaurant.nom} 
        table={table}
        logoUrl={restaurant.logoUrl || undefined}
    >
    <div className="min-h-screen bg-background pb-32">
      {/* Header Premium */}
      <header className="relative h-64 flex items-end p-6 overflow-hidden">
        <div className="absolute inset-0 z-0 bg-background">
          <img 
            src={restaurant.logoUrl || "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&q=80&w=2070"} 
            alt={restaurant.nom}
            className="w-full h-full object-cover scale-105"
            style={{ 
                WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 30%, rgba(0,0,0,0) 100%)',
                maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 30%, rgba(0,0,0,0) 100%)'
            }} 
          />
        </div>

        <div className="relative z-10 w-full flex justify-between items-end">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-primary/20 text-primary border border-primary/30 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full">
                Table {table}
              </span>
              <div className="flex items-center gap-1.5 text-muted-foreground text-[10px] font-bold uppercase tracking-widest">
                <Clock className="w-3 h-3" /> {restaurant.nom}
              </div>
              <div className="flex items-center gap-1.5 text-zinc-400 text-[10px] font-bold uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded-full w-fit border border-white/5">
                1$ = {restaurant.tauxChange} FC
              </div>
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight text-white italic flex items-center gap-3">
               <span>Bonjour, <span className="text-primary">{clientName}</span></span>
            </h1>
            <p className="text-zinc-400 mt-1 mb-3 font-medium">Prêt pour une expérience culinaire unique ?</p>
            {isLoyaltyActive && (
               <div className="w-64 max-w-full">
                  <LoyaltyQuickTrack restaurantId={restaurantId} />
               </div>
            )}
          </div>
          <div className="flex flex-col items-end gap-3">
            <PromoGiftModal restaurantId={restaurantId} isLoyaltyActive={isLoyaltyActive} />
          </div>
        </div>
      </header>

      <main className="p-6 max-w-4xl mx-auto">
        <ClientMenuContent 
          initialPlats={JSON.parse(JSON.stringify(plats))} 
          tableNumber={table}
          restaurantId={restaurantId}
        />
      </main>

      <CartFloat 
        restaurantId={restaurantId} 
        exchangeRate={restaurant.tauxChange} 
        isLoyaltyActive={isLoyaltyActive}
      />
    </div>
    </ClientWelcomeScreen>
  );
}
