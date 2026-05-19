"use client"

import React, { useEffect, useState } from 'react';
import { Star, Gift, ChevronRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getClientLoyalty } from '@/lib/actions-loyalty';
import Link from 'next/link';

export function LoyaltyQuickTrack({ restaurantId }: { restaurantId: string }) {
  const [phone, setPhone] = useState<string | null>(null);
  const [loyalty, setLoyalty] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const savedPhone = localStorage.getItem('sr_loyalty_phone');
    if (savedPhone) {
      setPhone(savedPhone);
      fetchLoyalty(savedPhone);
    }
  }, [restaurantId]);

  const fetchLoyalty = async (phoneStr: string) => {
    setLoading(true);
    const res = await getClientLoyalty(restaurantId, phoneStr);
    if (res.success) {
      setLoyalty(res);
    }
    setLoading(false);
  };

  if (!phone) return null;

  // Find the next reachable reward in catalog
  const nextReward = loyalty?.catalog?.find((item: any) => item.requiredPoints > (loyalty?.points || 0));
  const currentPoints = loyalty?.points || 0;
  const targetPoints = nextReward?.requiredPoints || 0;
  const progress = targetPoints > 0 ? (currentPoints / targetPoints) * 100 : 100;

  return (
    <Link 
      href={`/client/loyalty?resto_id=${restaurantId}`}
      className="block w-full bg-zinc-950/50 backdrop-blur-xl border border-white/5 rounded-2xl p-4 transition-all hover:border-primary/30 group"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center">
             <Star className="w-3 h-3 text-primary" />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-white/90">Ma Fidélité</span>
        </div>
        <div className="flex items-center gap-2">
            <span className="text-[10px] font-black italic text-primary">{currentPoints} PTS</span>
            <ChevronRight className="w-3 h-3 text-zinc-600 group-hover:translate-x-1 transition-transform" />
        </div>
      </div>

      <div className="relative w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <div 
          className="absolute top-0 left-0 h-full bg-primary transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(var(--primary),0.5)]"
          style={{ width: `${progress}%` }}
        />
      </div>
      
      <div className="flex justify-between items-center mt-2">
         <p className="text-[8px] font-bold text-zinc-500 uppercase tracking-tighter">
            {nextReward ? `Encore ${targetPoints - currentPoints} pts pour un cadeau` : 'Toutes les récompenses débloquées !'}
         </p>
         <Gift className="w-3 h-3 text-zinc-700" />
      </div>
    </Link>
  );
}
