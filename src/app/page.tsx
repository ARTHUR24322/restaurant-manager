export const dynamic = "force-dynamic";

import { UtensilsCrossed } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

export default function Home({
  searchParams,
}: {
  searchParams: { table?: string };
}) {
  const tableNumber = searchParams.table;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/10 blur-[120px] rounded-full pointer-events-none" />

      <main className="w-full max-w-md bg-card/50 backdrop-blur-xl border border-border/50 p-8 rounded-3xl shadow-2xl relative z-10 flex flex-col items-center">
        {/* Logo area */}
        <div className="w-20 h-20 bg-secondary rounded-2xl flex items-center justify-center mb-8 shadow-inner border border-primary/20">
          <UtensilsCrossed className="w-10 h-10 text-primary" />
        </div>

        <h1 className="text-4xl font-bold mb-2 text-center tracking-tight">
          Smart<span className="text-primary">Resto</span>
        </h1>
        <p className="text-muted-foreground text-center mb-8">
          Vivez une expérience culinaire connectée.
        </p>

        {tableNumber ? (
          <div className="w-full bg-secondary/50 border border-primary/30 p-4 rounded-xl mb-8 flex flex-col items-center justify-center">
            <span className="text-sm text-muted-foreground mb-1">
              Vous êtes installé à la
            </span>
            <span className="text-2xl font-bold text-primary">
              Table {tableNumber}
            </span>
          </div>
        ) : (
          <div className="w-full bg-destructive/10 border border-destructive/30 p-4 rounded-xl mb-8 text-center text-sm text-destructive-foreground">
            Veuillez scanner le QR Code sur votre table pour commander.
          </div>
        )}

        <form className="w-full flex flex-col gap-4" action="/client/menu">
          {tableNumber && (
            <input type="hidden" name="table" value={tableNumber} />
          )}

          <div className="space-y-2 w-full">
            <label htmlFor="name" className="text-sm font-medium ml-1">
              Votre prénom (optionnel)
            </label>
            <input
              type="text"
              id="name"
              name="name"
              placeholder="Ex: Jean"
              className="w-full bg-secondary/50 border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-muted-foreground/50"
            />
          </div>

          <button
            type="submit"
            disabled={!tableNumber}
            className="w-full bg-primary text-primary-foreground font-bold text-lg py-4 rounded-xl mt-4 max-w-full hover:bg-primary/90 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/20"
          >
            Voir le Menu
          </button>
        </form>
      </main>
      
      <p className="fixed bottom-6 text-sm text-muted-foreground opacity-50">
        Propulsé par SmartResto © 2026
      </p>
    </div>
  );
}
