/* eslint-disable @next/next/no-img-element */
import { getPlats } from "@/lib/actions";
import { Utensils } from "lucide-react";
import { CartFloat } from "@/components/client/CartFloat";
import ClientMenuContent from "./ClientMenuContent";
import { recordVisit } from "@/lib/analytics-actions";
import { CurrencyBadge } from "@/components/client/CurrencyBadge";
import { PromoGiftModal } from "@/components/client/PromoGiftModal";

import { ClientWelcomeScreen } from "@/components/client/ClientWelcomeScreen";

import { getRestaurantById } from "@/lib/admin-actions";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ClientMenuPage({
  searchParams,
}: {
  searchParams: { table?: string; name?: string; resto_id?: string };
}) {
  const restaurantId = searchParams.resto_id || "";
  const restaurant = restaurantId ? await getRestaurantById(restaurantId) : null;
  const plats = restaurantId ? await getPlats(restaurantId) : [];
  const table = searchParams.table || "Inconnue";
  const clientName = searchParams.name || "Client";

  // Récupérer la config de fidélité pour vérifier si elle est active
  const loyaltyConfig = restaurantId ? await prisma.loyaltyConfig.findUnique({
    where: { restaurantId }
  }) : null;
  const isLoyaltyActive = loyaltyConfig ? loyaltyConfig.isActive : false;

  // Enregistrer le scan (visite) en arrière-plan
  recordVisit(restaurantId, table);

  return (
    <ClientWelcomeScreen 
        restaurantName={restaurant?.nom || "SmartResto"} 
        table={table}
        logoUrl={restaurant?.logoUrl || undefined}
    >
      <div className="min-h-screen bg-background pb-32">
      {/* ... header remains same ... */}
      {/* Header Premium 2.0 */}
      <header className="relative w-full z-10 pt-10 pb-6 px-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="w-12 h-12 rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-zinc-900 group transition-transform hover:scale-105">
                <img 
                  src={restaurant?.logoUrl || "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&q=80&w=2070"} 
                  alt="Logo" 
                  className="w-full h-full object-cover" 
                />
             </div>
             <div>
                <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/80">
                  {restaurant?.nom || "SmartResto"}
                </h2>
                <div className="flex items-center gap-2 mt-1">
                   <div className="flex items-center gap-1.5 text-white text-[10px] font-black uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded-lg border border-white/5">
                     <Utensils className="w-3 h-3 text-primary" /> Table {table}
                   </div>
                </div>
             </div>
          </div>
          
          <div className="flex items-center gap-3">
            <CurrencyBadge exchangeRate={restaurant?.tauxChange || 2800} />
            <PromoGiftModal restaurantId={restaurantId} isLoyaltyActive={isLoyaltyActive} />
          </div>
        </div>

        <div className="mt-10">
          <h1 className="text-4xl font-black text-white tracking-tighter leading-none">
            Bonjour, <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-primary/80 to-amber-200 italic">
              {clientName}
            </span>
          </h1>
          <p className="text-zinc-500 mt-4 text-xs font-medium tracking-wide uppercase opacity-70">
            Explorer le menu & commander
          </p>
        </div>
      </header>

      <main className="p-6 max-w-4xl mx-auto">
        <ClientMenuContent 
          initialPlats={JSON.parse(JSON.stringify(plats))} 
          tableNumber={table}
          restaurantId={restaurantId}
        />
      </main>

      {/* Le panier flottant restera en bas de page */}
      <CartFloat 
        restaurantId={restaurantId} 
        exchangeRate={restaurant?.tauxChange || 2800} 
        isLoyaltyActive={isLoyaltyActive}
      />
    </div>
    </ClientWelcomeScreen>
  );
}
