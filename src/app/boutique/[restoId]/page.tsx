/* eslint-disable react/no-unescaped-entities, @next/next/no-img-element */
import { prisma } from "@/lib/prisma";
import { isFeatureInMaintenance } from "@/lib/maintenance";
import { MaintenanceBlockerUI } from "@/components/MaintenanceBlocker";
import { notFound } from "next/navigation";
import { ShoppingBag, Store } from "lucide-react";
import { BoutiqueMenuContent } from "@/components/client/BoutiqueMenuContent";
import { BoutiqueCart } from "@/components/client/BoutiqueCart";
import { BoutiqueWelcomeScreen } from "@/components/client/BoutiqueWelcomeScreen";
import { type Plat } from "@/types";

export default async function BoutiqueClientPage({ params }: { params: { restoId: string } }) {
    if (await isFeatureInMaintenance("MAINTENANCE_BOUTIQUE")) {
        return <MaintenanceBlockerUI />;
    }

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
        <div className="min-h-screen bg-background">
            {/* ─── HERO BANNER — Logo full width, clear top / blurred bottom ─── */}
            <div className="relative w-full h-[45vh] min-h-[280px] max-h-[420px] overflow-hidden">
                {restaurant.logoUrl ? (
                    <>
                        {/* Full-width background image */}
                        <img 
                            src={restaurant.logoUrl} 
                            alt={restaurant.nom} 
                            className="absolute inset-0 w-full h-full object-cover" 
                        />
                        {/* Gradient: clear top → dark bottom transition */}
                        <div 
                            className="absolute inset-0" 
                            style={{
                                background: "linear-gradient(to bottom, transparent 20%, rgba(0,0,0,0.2) 45%, rgba(0,0,0,0.7) 75%, hsl(var(--background)) 100%)"
                            }} 
                        />
                        {/* Blur mask on lower portion */}
                        <div 
                            className="absolute inset-0 pointer-events-none"
                            style={{
                                maskImage: "linear-gradient(to bottom, transparent 35%, black 70%)",
                                WebkitMaskImage: "linear-gradient(to bottom, transparent 35%, black 70%)",
                            }}
                        >
                            <div 
                                className="w-full h-full" 
                                style={{ 
                                    backdropFilter: "blur(16px)", 
                                    WebkitBackdropFilter: "blur(16px)" 
                                }} 
                            />
                        </div>
                    </>
                ) : (
                    <>
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-indigo-900/10" />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-24 h-24 bg-card/50 border-2 border-border rounded-[2rem] flex items-center justify-center backdrop-blur-xl">
                                <Store className="w-12 h-12 text-primary" />
                            </div>
                        </div>
                        <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, transparent 50%, hsl(var(--background)) 100%)" }} />
                    </>
                )}

                {/* Restaurant name + tagline at bottom of hero */}
                <div className="absolute bottom-0 left-0 right-0 z-20 px-6 pb-8">
                    <h1 className="text-3xl sm:text-4xl font-black italic tracking-tighter text-white drop-shadow-2xl leading-tight">
                        {restaurant.nom}
                    </h1>
                    <p className="text-white/50 mt-1.5 text-xs font-medium tracking-wide uppercase">
                        Commandez nos meilleures spécialités
                    </p>
                </div>
            </div>

            {/* ─── MENU CONTENT (search + categories + plats) ─── */}
            <div className="relative z-10 -mt-4 rounded-t-[2rem] bg-background px-4 pt-6 pb-32 md:px-8 max-w-5xl mx-auto">
                {plats.length === 0 ? (
                    <div className="text-center py-20 bg-card rounded-2xl border border-border">
                        <ShoppingBag className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <h2 className="text-xl font-bold">Aucun article disponible</h2>
                        <p className="text-muted-foreground">Cette boutique n&apos;a pas encore ajouté d&apos;articles.</p>
                    </div>
                ) : (
                    <BoutiqueMenuContent 
                        initialPlats={plats as unknown as Plat[]} 
                        exchangeRate={restaurant.tauxChange} 
                    />
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
