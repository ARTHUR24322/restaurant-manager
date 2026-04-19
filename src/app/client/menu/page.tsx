import { getPlats } from "@/lib/actions";
import { Utensils, Search, Clock, Info } from "lucide-react";
import { CartFloat } from "@/components/client/CartFloat";
import ClientMenuContent from "./ClientMenuContent";
import { recordVisit } from "@/lib/analytics-actions";

import { ClientWelcomeScreen } from "@/components/client/ClientWelcomeScreen";

export const dynamic = "force-dynamic";

export default async function ClientMenuPage({
  searchParams,
}: {
  searchParams: { table?: string; name?: string; resto_id?: string };
}) {
  const restaurantId = searchParams.resto_id || "resto-99-default";
  const plats = await getPlats(restaurantId);
  const table = searchParams.table || "Inconnue";
  const clientName = searchParams.name || "Client";

  // Enregistrer le scan (visite) en arrière-plan
  recordVisit(restaurantId, table);

  return (
    <ClientWelcomeScreen restaurantName="SmartResto" table={table}>
      <div className="min-h-screen bg-background pb-32">
      {/* ... header remains same ... */}
      {/* Header Premium */}
      <header className="relative h-64 flex items-end p-6 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&q=80&w=2070" 
            alt="Restaurant Header"
            className="w-full h-full object-cover brightness-[0.4] scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        </div>

        <div className="relative z-10 w-full flex justify-between items-end">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-primary/20 text-primary border border-primary/30 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full">
                Table {table}
              </span>
              <div className="flex items-center gap-1.5 text-muted-foreground text-[10px] font-bold uppercase tracking-widest">
                <Clock className="w-3 h-3" /> 15-20 min
              </div>
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight">
              Bonjour, <span className="text-primary">{clientName}</span>
            </h1>
            <p className="text-muted-foreground mt-1">Que souhaitez-vous déguster aujourd'hui ?</p>
          </div>
          
          <div className="bg-card/50 backdrop-blur-md border border-border/50 p-3 rounded-2xl hidden md:block">
            <Utensils className="w-6 h-6 text-primary" />
          </div>
        </div>
      </header>

      {/* Barre de recherche et catégories interactives */}
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border/50 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Rechercher un délice..."
              className="w-full bg-secondary/50 border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-muted-foreground/50"
            />
          </div>
        </div>
      </div>

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
