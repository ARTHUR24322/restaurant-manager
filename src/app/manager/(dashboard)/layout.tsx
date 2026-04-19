"use client"

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { 
  LayoutDashboard, 
  Utensils, 
  QrCode, 
  Settings, 
  LogOut,
  Bell,
  Loader2,
  Package,
  Wallet,
  ChefHat,
  Monitor,
  Menu,
  Globe,
  X,
  Lock
} from "lucide-react";
import { cn } from "@/lib/utils";
import { logoutManager } from "@/lib/auth-actions";
import { getRestaurantById, checkIsMainAccount } from "@/lib/admin-actions";
import { checkSubscriptionAlerts } from "@/lib/notification-actions";
import { NotificationMenu } from "@/components/manager/NotificationMenu";
import { useTheme } from "next-themes";

function ManagerLayoutContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [restoProfile, setRestoProfile] = useState<any>(null);
  const [isMainAccount, setIsMainAccount] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const restoId = searchParams.get("resto_id");
  const { setTheme, theme } = useTheme();

  useEffect(() => {
    async function checkAuth() {
        if (!restoId) {
            router.push("/manager/login");
        } else {
            const profile = await getRestaurantById(restoId);
            const isExpired = profile?.subscriptionEnd ? new Date(profile.subscriptionEnd) < new Date() : false;
            
            if (!profile || !profile.active || isExpired) {
                router.push('/manager/subscription-expired');
                return;
            }

            // Vérifier si c'est le compte principal pour restreindre l'accès à certains menus
            const isMain = await checkIsMainAccount(restoId);
            setIsMainAccount(isMain);

            setRestoProfile(profile);
            setAuthorized(true);

            // Synchroniser le thème de l'établissement
            if (profile.preferredTheme && profile.preferredTheme !== theme) {
              setTheme(profile.preferredTheme);
            }

            // Vérifier les alertes d'abonnement en arrière-plan
            checkSubscriptionAlerts(restoId);
        }
    }
    checkAuth();
  }, [restoId, router]);

  if (!authorized) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
          <p className="text-muted-foreground text-xs mt-4 font-black uppercase tracking-widest">Vérification de sécurité...</p>
      </div>
    );
  }

  const currentPlan = restoProfile?.plan?.toUpperCase() || "STANDARD";

  const navItems = [
    { label: "Tableau de Bord", href: "/manager/dashboard", icon: LayoutDashboard },
    { label: "Gestion du Menu", href: "/manager/menu", icon: Utensils },
    { label: "QR Codes Tables", href: "/manager/qr", icon: QrCode },
    { 
      label: "Gestion de Stock", 
      href: "/manager/inventory", 
      icon: Package, 
      locked: !["PRO", "PLATINUM"].includes(currentPlan) 
    },
    ...(isMainAccount ? [{ 
      label: "Multi-sites", 
      href: "/manager/multi-site", 
      icon: Globe, 
      locked: currentPlan !== "PLATINUM" 
    }] : []),
    ...(isMainAccount ? [{ label: "Paramètres", href: "/manager/settings", icon: Settings }] : []),
  ];

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "w-64 border-r border-border bg-card flex-col fixed inset-y-0 left-0 z-50 md:sticky md:top-0 h-screen transition-transform duration-300 ease-in-out md:translate-x-0 md:flex",
        isMobileMenuOpen ? "translate-x-0 flex" : "-translate-x-full hidden md:flex"
      )}>
        <div className="p-6 border-b border-border flex flex-col gap-4 relative text-foreground">
          <button 
            className="md:hidden absolute top-4 right-4 p-2 text-muted-foreground hover:text-foreground"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-xl overflow-hidden flex items-center justify-center border border-primary/20">
                {restoProfile?.logoUrl ? (
                    <img src={restoProfile.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                    <Utensils className="w-5 h-5 text-primary" />
                )}
            </div>
            <span className="font-black text-lg tracking-tight uppercase italic leading-tight truncate">
                {restoProfile?.nom || "Mon Restaurant"}
            </span>
          </div>
          <div className="flex items-center gap-2 px-1">
             <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
             <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">ESPACE GÉRANT</span>
          </div>
        </div>

        <div className="px-4 py-2 mt-2">
            <Link 
              href="/manager/selection"
              className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-bold transition-all text-zinc-600 dark:text-zinc-400 w-full"
            >
              Changer de rôle
            </Link>
        </div>

        <nav className="flex-1 p-4 space-y-2 mt-4">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={`${item.href}?resto_id=${restoId}`}
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center justify-between px-4 py-3 rounded-xl hover:bg-secondary transition-all text-muted-foreground hover:text-foreground font-medium group"
            >
              <div className="flex items-center gap-3">
                 <item.icon className={cn("w-5 h-5 transition-colors", item.locked ? "text-zinc-600" : "group-hover:text-primary")} />
                 <span className={item.locked ? "text-zinc-500" : ""}>{item.label}</span>
              </div>
              {(item as any).locked && <Lock className="w-4 h-4 text-zinc-600 ml-2" />}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-border">
          <button
            onClick={async () => {
              await logoutManager();
              router.push("/manager/login");
            }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-destructive/10 text-destructive transition-all font-medium active:scale-95"
          >
            <LogOut className="w-5 h-5" />
            Déconnexion
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-border flex items-center justify-between px-4 md:px-8 bg-card/50 backdrop-blur-sm sticky top-0 z-20">
          <div className="md:hidden flex items-center gap-3">
             <button 
               onClick={() => setIsMobileMenuOpen(true)} 
               className="p-2 -ml-2 rounded-xl text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
             >
               <Menu className="w-6 h-6" />
             </button>
             <span className="font-bold text-lg">Smart<span className="text-primary">Resto</span> Admin</span>
          </div>
          <div className="flex-1 hidden md:block">
          </div>
          <div className="flex items-center gap-4">
            <NotificationMenu restaurantId={restoId || ""} />
            <div className="w-8 h-8 rounded-full bg-secondary border border-border" />
          </div>
        </header>

        {/* Subscription Alert Banner */}
        {(() => {
            if (!restoProfile) return null;
            const now = new Date();
            const start = new Date(restoProfile.createdAt);
            const end = new Date(restoProfile.subscriptionEnd);
            const total = end.getTime() - start.getTime();
            const elapsed = now.getTime() - start.getTime();
            const percent = (elapsed / total) * 100;
            const daysRemaining = Math.max(0, Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

            if (percent >= 90) {
                return (
                    <div className="mx-8 mt-4 bg-red-500/10 border border-red-500/20 p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 animate-in slide-in-from-top-4 duration-500 print:hidden">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center animate-pulse">
                                <Bell className="w-5 h-5 text-black" />
                            </div>
                            <div>
                                <h4 className="text-sm font-black text-white uppercase tracking-tighter">Action Requise : Réabonnement</h4>
                                <p className="text-[10px] text-red-500 font-bold uppercase tracking-tight">
                                    Votre abonnement expire dans {daysRemaining} {daysRemaining > 1 ? 'jours' : 'jour'}. 
                                    Évitez toute interruption de service.
                                </p>
                            </div>
                        </div>
                        <button className="bg-red-500 hover:bg-red-600 text-black text-[10px] font-black uppercase px-6 py-2.5 rounded-xl transition-all shadow-lg shadow-red-500/20 active:scale-95">
                            Se réabonner maintenant
                        </button>
                    </div>
                );
            }
            return null;
        })()}

        <div className="flex-1 overflow-auto print:overflow-visible print:h-auto">
          {children}
        </div>

        <style jsx global>{`
          @media print {
            aside, header, nav, [role="alert"] { display: none !important; }
            body, html, main, .flex, .flex-1, div { 
              overflow: visible !important; 
              height: auto !important; 
              min-height: 0 !important;
              background: white !important;
              color: black !important;
              position: static !important;
            }
          }
        `}</style>
      </main>
    </div>
  );
}

export default function ManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <React.Suspense fallback={
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>
    }>
      <ManagerLayoutContent>{children}</ManagerLayoutContent>
    </React.Suspense>
  );
}
