import { getPlats } from "@/lib/actions";
import { 
  Phone, Star, Gift, Ticket, Loader2, 
  ChevronRight, Calendar, ArrowRight, CheckCircle2,
  AlertCircle, X, Clock, Info, Search, Utensils
} from "lucide-react";
import Link from "next/link";
import { CartFloat } from "@/components/client/CartFloat";
import ClientMenuContent from "./ClientMenuContent";
import { recordVisit } from "@/lib/analytics-actions";
import { CurrencyBadge } from "@/components/client/CurrencyBadge";

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
            
            <Link 
              href={`/client/loyalty?resto_id=${restaurantId}&table=${table}`}
              className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-primary hover:text-black transition-all duration-300"
            >
                <Gift className="w-5 h-5" />
            </Link>
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
      <CartFloat restaurantId={restaurantId} exchangeRate={restaurant?.tauxChange || 2800} />
    </div>
    </ClientWelcomeScreen>
  );
}
