/* eslint-disable react/no-unescaped-entities, @next/next/no-img-element */
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { ShoppingBag } from "lucide-react";
import { BoutiquePlatCard } from "@/components/client/BoutiquePlatCard";
import { BoutiqueCart } from "@/components/client/BoutiqueCart";
import { BoutiqueWelcomeScreen } from "@/components/client/BoutiqueWelcomeScreen";
import { BoutiqueMenuContent } from "@/components/client/BoutiqueMenuContent";
import { type Plat } from "@/types";

export default async function BoutiqueClientPage({ params }: { params: { restoId: string } }) {
    // 1. Fetch restaurant — try slug first, then id
    let restaurant = await prisma.restaurant.findUnique({
        where: { boutiqueSlug: params.restoId }
    });

    if (!restaurant) {
        restaurant = await prisma.restaurant.findUnique({
            where: { id: params.restoId }
        });
    }

    if (!restaurant || !restaurant.isBoutiqueEnabled) {
        return notFound();
    }

    // 2. Fetch available plats
    const plats = await prisma.plat.findMany({
        where: {
            restaurantId: restaurant.id,
            isAvailableOnline: true,
            disponible: true
        }
    });

    // 3. Fetch loyalty config
    const loyaltyConfig = await prisma.loyaltyConfig.findUnique({
        where: { restaurantId: restaurant.id }
    });
    const isLoyaltyActive = loyaltyConfig?.isActive || false;

    // The shop content (shown inside the welcome screen after registration)
    const shopContent = (
        <div className="min-h-screen bg-background p-4 md:p-8">
            <div className="max-w-4xl mx-auto">
                <header className="flex flex-col items-center justify-center text-center gap-3 mb-10">
                    {restaurant.logoUrl && (
                        <div className="relative">
                            <div className="absolute inset-0 bg-primary/20 rounded-[2rem] blur-xl" />
                            <img src={restaurant.logoUrl} alt="Logo" className="w-24 h-24 rounded-[2rem] object-cover border-2 border-border shadow-2xl relative z-10 bg-card" />
                        </div>
                    )}
                    <div>
                        <h1 className="text-3xl font-black italic tracking-tighter text-foreground">{restaurant.nom}</h1>
                        <p className="text-muted-foreground mt-1 text-sm font-medium">Commandez nos meilleures spécialités</p>
                    </div>
                </header>

                {plats.length === 0 ? (
                    <div className="text-center py-20 bg-card rounded-2xl border border-border">
                        <ShoppingBag className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <h2 className="text-xl font-bold">Aucun article disponible</h2>
                        <p className="text-muted-foreground">Cette boutique n&apos;a pas encore ajouté d&apos;articles.</p>
                    </div>
                ) : (
                    <BoutiqueMenuContent initialPlats={plats as unknown as Plat[]} exchangeRate={restaurant.tauxChange} />
                )}
            </div>

            <BoutiqueCart restaurantId={restaurant.id} exchangeRate={restaurant.tauxChange} isLoyaltyActive={isLoyaltyActive} />
        </div>
    );

    return (
        <BoutiqueWelcomeScreen
            restaurantId={restaurant.id}
            restaurantName={restaurant.nom}
            logoUrl={restaurant.logoUrl ?? undefined}
        >
            {shopContent}
        </BoutiqueWelcomeScreen>
    );
}
