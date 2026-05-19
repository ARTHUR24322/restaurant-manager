"use client"
/* eslint-disable react-hooks/exhaustive-deps, @typescript-eslint/no-explicit-any */

import React, { useState, useEffect } from 'react';
import { Bell, Info, AlertTriangle, CheckCircle, Trash2, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getNotifications, markAsRead, clearAllNotifications } from '@/lib/notification-actions';
import { toast } from 'sonner';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: Date;
}

export function NotificationMenu({ restaurantId }: { restaurantId: string }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifs = async () => {
    try {
      const data = await getNotifications(restaurantId);
      const safeData = Array.isArray(data) ? data : [];
      setNotifications(safeData);
      setUnreadCount(safeData.filter((n: any) => !n.read).length);
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
      setNotifications([]);
      setUnreadCount(0);
    }
  };

  useEffect(() => {
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 15000); // Check every 15s
    return () => clearInterval(interval);
  }, [restaurantId]);

  const handleRead = async (id: string) => {
    await markAsRead(id);
    fetchNotifs();
  };

  const handleClearAll = async () => {
    await clearAllNotifications(restaurantId);
    fetchNotifs();
    toast.success("Notifications effacées");
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'WARNING': return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      case 'SUCCESS': return <CheckCircle className="w-4 h-4 text-emerald-500" />;
      case 'URGENT': return <AlertTriangle className="w-4 h-4 text-red-500 animate-pulse" />;
      default: return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-xl border border-border bg-card/50 hover:bg-secondary transition-all relative group"
      >
        <Bell className={cn("w-5 h-5 transition-transform group-hover:rotate-12", unreadCount > 0 ? "text-primary" : "text-zinc-400")} />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-primary text-black text-[10px] font-black rounded-full flex items-center justify-center animate-in zoom-in">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-4 w-80 md:w-96 bg-card border border-border rounded-3xl shadow-2xl z-50 overflow-hidden animate-in slide-in-from-top-4 duration-300">
            <div className="p-5 border-b border-border flex items-center justify-between bg-zinc-900/50">
              <h3 className="font-black text-xs uppercase tracking-[0.2em] italic">Notifications</h3>
              <button 
                onClick={handleClearAll}
                className="p-1.5 hover:bg-destructive/10 text-zinc-500 hover:text-destructive rounded-lg transition-colors"
                title="Tout effacer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
              {notifications.length === 0 ? (
                <div className="p-12 text-center text-zinc-500 italic text-sm">
                  Aucune notification pour le moment.
                </div>
              ) : (
                notifications.map((n: any) => (
                  <div 
                    key={n.id} 
                    className={cn(
                      "p-4 border-b border-border/50 hover:bg-secondary/50 transition-colors flex gap-4 cursor-pointer relative",
                      !n.read && "bg-primary/5"
                    )}
                    onClick={() => handleRead(n.id)}
                  >
                    {!n.read && (
                      <div className="absolute top-4 right-4 w-2 h-2 bg-primary rounded-full" />
                    )}
                    <div className="mt-1">{getTypeIcon(n.type)}</div>
                    <div className="space-y-1">
                      <p className="font-bold text-sm leading-tight">{n.title}</p>
                      <p className="text-xs text-zinc-400 leading-relaxed">{n.message}</p>
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-500 mt-2 uppercase">
                         <Clock className="w-3 h-3" />
                         {new Date(n.createdAt).toLocaleDateString('fr-FR')} à {new Date(n.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {notifications.length > 0 && (
              <div className="p-3 bg-zinc-900/50 text-center">
                 <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Centre de contrôle SmartResto</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
