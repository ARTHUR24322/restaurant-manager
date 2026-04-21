import { getPlats } from "@/lib/actions";
import { Utensils, Search, Clock, Info } from "lucide-react";
import { CartFloat } from "@/components/client/CartFloat";
import ClientMenuContent from "./ClientMenuContent";
import { recordVisit } from "@/lib/analytics-actions";

import { ClientWelcomeScreen } from "@/components/client/ClientWelcomeScreen";

import { getRestaurantById } from "@/lib/admin-actions";

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
      <header className="relative w-full overflow-hidden pb-8 pt-12 rounded-b-[3rem] shadow-2xl z-10">
        <div className="absolute inset-0">
          <img 
            src={restaurant?.logoUrl || "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&q=80&w=2070"} 
            alt="Restaurant Header"
            className="w-full h-full object-cover brightness-[0.3] scale-110 blur-[2px]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/60 to-transparent" />
        </div>

        <div className="relative z-10 px-6 mt-8">
          <div className="flex items-center justify-between mb-4">
             <div className="flex items-center gap-3">
               <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-primary/50 shadow-lg bg-zinc-900">
                  <img src={restaurant?.logoUrl || "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&q=80&w=2070"} alt="Logo" className="w-full h-full object-cover" />
               </div>
               <div>
                  <h2 className="text-sm font-black uppercase tracking-widest text-white/90">{restaurant?.nom || "SmartResto"}</h2>
                  <div className="flex items-center gap-1.5 text-primary text-[10px] font-bold uppercase tracking-widest bg-primary/10 px-2 py-0.5 rounded-full w-fit mt-1">
                    <Clock className="w-3 h-3" /> Table {table}
                  </div>
               </div>
             </div>
             
             <button className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors">
                <Info className="w-5 h-5" />
             </button>
          </div>

          <h1 className="text-4xl md:text-5xl font-black text-white tracking-tighter mt-6 leading-tight">
            Bonjour, <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-amber-300 italic">{clientName}</span>
          </h1>
          <p className="text-zinc-400 mt-3 text-sm max-w-sm font-medium leading-relaxed">
            Découvrez notre carte élaborée avec passion et commandez directement depuis votre table.
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
      <CartFloat restaurantId={restaurantId} />
    </div>
    </ClientWelcomeScreen>
  );
}
