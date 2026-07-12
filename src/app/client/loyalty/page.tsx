/* eslint-disable @next/next/no-img-element */
import { getRestaurantById } from "@/lib/admin-actions";
import { isFeatureInMaintenance } from "@/lib/maintenance";
import { MaintenanceBlockerUI } from "@/components/MaintenanceBlocker";
import { prisma } from "@/lib/prisma";
import { Gift, ArrowLeft } from "lucide-react";
import Link from "next/link";
import LoyaltyClientContent from "./LoyaltyClientContent";

export const dynamic = "force-dynamic";

export default async function ClientLoyaltyPage({
  searchParams,
}: {
  searchParams: { table?: string; resto_id?: string; phone?: string };
}) {
  const restaurantId = searchParams.resto_id || "";

  if (await isFeatureInMaintenance("MAINTENANCE_FIDELITE")) {
    return <MaintenanceBlockerUI />;
  }
  const restaurant = restaurantId ? await getRestaurantById(restaurantId) : null;
  const table = searchParams.table || "Sans table";

  // Vérifier si la fidélité est activée
  const loyaltyConfig = restaurantId ? await prisma.loyaltyConfig.findUnique({
    where: { restaurantId }
  }) : null;

  if (!loyaltyConfig || !loyaltyConfig.isActive) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-pink-500/10 rounded-full flex items-center justify-center mb-6">
          <Gift className="w-10 h-10 text-pink-500 opacity-20" />
        </div>
        <h1 className="text-2xl font-black italic uppercase text-white mb-2">Programme Inactif</h1>
        <p className="text-zinc-500 mb-8 max-w-xs">
          Le programme de fidélité n&apos;est pas activé pour cet établissement.
        </p>
        <Link 
          href={`/client/menu?resto_id=${restaurantId}&table=${table}`}
          className="bg-primary text-black font-black px-8 py-3 rounded-xl uppercase text-xs tracking-widest"
        >
          Retour au Menu
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-12">
      {/* Header Premium (Similaire au menu) */}
      <header className="relative w-full overflow-hidden pb-12 pt-12 rounded-b-[3rem] shadow-2xl z-10">
        <div className="absolute inset-0">
          <img 
            src={restaurant?.logoUrl || "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&q=80&w=2070"} 
            alt="Restaurant Header"
            className="w-full h-full object-cover brightness-[0.3] scale-110 blur-[2px]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/60 to-transparent" />
        </div>

        <div className="relative z-10 px-6">
          <div className="flex items-center justify-between mb-8">
             <Link 
               href={`/client/menu?resto_id=${restaurantId}&table=${table}`}
               className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-center text-white"
             >
                <ArrowLeft className="w-5 h-5" />
             </Link>
             <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center border border-primary/20">
                   <Gift className="w-5 h-5 text-primary" />
                </div>
                <span className="text-sm font-black uppercase tracking-widest text-primary italic">Fidélité</span>
             </div>
          </div>

          <h1 className="text-4xl font-black text-white tracking-tighter leading-tight">
            Vos Récompenses <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-amber-300 italic">{restaurant?.nom}</span>
          </h1>
        </div>
      </header>

      <main className="p-6 -mt-6 relative z-20 max-w-lg mx-auto">
         <LoyaltyClientContent 
            restaurantId={restaurantId} 
            initialPhone={searchParams.phone}
         />
      </main>
    </div>
  );
}
