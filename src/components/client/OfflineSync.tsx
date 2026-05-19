"use client";
/* eslint-disable react-hooks/exhaustive-deps */

import { useEffect, useState } from "react";
import { useCartStore } from "@/store/cartStore";
import { createCommande } from "@/lib/actions";
import { toast } from "sonner";
import { CloudOff, RefreshCw, Wifi } from "lucide-react";

export function OfflineSync() {
  const { offlineOrders, removeOfflineOrder, addSubmittedOrderId } = useCartStore();
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  // Gérer l'état de la connexion
  useEffect(() => {
    setIsOnline(navigator.onLine);
    
    const handleOnline = () => {
      setIsOnline(true);
      toast.success("Vous êtes de nouveau en ligne. Synchronisation...");
    };
    const handleOffline = () => {
      setIsOnline(false);
      toast.error("Connexion internet perdue.");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Tentative de synchronisation dès qu'on est en ligne et qu'il y a des commandes en attente
  useEffect(() => {
    if (isOnline && offlineOrders.length > 0 && !isSyncing) {
      syncOrders();
    }
  }, [isOnline, offlineOrders.length]);

  const syncOrders = async () => {
    setIsSyncing(true);
    let successCount = 0;

    for (const order of offlineOrders) {
      try {
        const res = await createCommande({
            cartItems: order.cartItems,
            tableNumber: order.tableNumber,
            customerName: order.customerName,
            totalUsd: order.totalUsd,
            notes: order.notes,
            restaurantId: order.restaurantId
        });

        if (res.success) {
          removeOfflineOrder(order.id);
          if (res.orderId) {
            addSubmittedOrderId(res.orderId);
          }
          successCount++;
        }
      } catch (error) {
        console.error("Erreur synchro commande:", error);
      }
    }

    if (successCount > 0) {
      toast.success(`${successCount} commande(s) synchronisée(s) avec succès !`);
    }
    setIsSyncing(false);
  };

  if (offlineOrders.length === 0 && isOnline) return null;

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2">
      {/* Badge Hors-Ligne */}
      {!isOnline && (
        <div className="bg-red-600 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 text-xs font-black animate-pulse">
            <CloudOff className="w-4 h-4" />
            MODE HORS-LIGNE
        </div>
      )}

      {/* Badge de Synchronisation */}
      {offlineOrders.length > 0 && (
        <div className="bg-indigo-600 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-3 text-xs font-black">
            {isSyncing ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
                <Wifi className="w-4 h-4" />
            )}
            {offlineOrders.length} COMMANDE(S) EN ATTENTE
        </div>
      )}
    </div>
  );
}
