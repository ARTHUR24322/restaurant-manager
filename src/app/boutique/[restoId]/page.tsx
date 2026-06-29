/* eslint-disable react/no-unescaped-entities, @next/next/no-img-element */
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { ShoppingBag } from "lucide-react";
import { BoutiquePlatCard } from "@/components/client/BoutiquePlatCard";
import { BoutiqueCart } from "@/components/client/BoutiqueCart";
import { type Plat } from "@/types";

export default async function BoutiqueClientPage({ params }: { params: { restoId: string } }) {
    // 1. Fetch restaurant
    // Try to find by slug first, then id
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

    return (
        <div className="min-h-screen bg-background p-4 md:p-8">
            <div className="max-w-4xl mx-auto">
                <header className="flex items-center gap-4 mb-8">
                    {restaurant.logoUrl && (
                        <img src={restaurant.logoUrl} alt="Logo" className="w-16 h-16 rounded-full object-cover" />
                    )}
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Boutique de {restaurant.nom}</h1>
                        <p className="text-muted-foreground">Commandez en ligne nos meilleures spécialités</p>
                    </div>
                </header>

                {plats.length === 0 ? (
                    <div className="text-center py-20 bg-card rounded-2xl border border-border">
                        <ShoppingBag className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <h2 className="text-xl font-bold">Aucun article disponible</h2>
                        <p className="text-muted-foreground">Cette boutique n'a pas encore ajouté d'articles.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {plats.map(plat => (
                            <BoutiquePlatCard key={plat.id} plat={plat as unknown as Plat} exchangeRate={restaurant.tauxChange} />
                        ))}
                    </div>
                )}
            </div>

            <BoutiqueCart restaurantId={restaurant.id} exchangeRate={restaurant.tauxChange} isLoyaltyActive={isLoyaltyActive} />
        </div>
    );
}
