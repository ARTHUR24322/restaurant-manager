import React from 'react';

interface KitchenTicketProps {
  order: any;
}

export const KitchenTicket = ({ order }: KitchenTicketProps) => {
  if (!order) return null;

  return (
    <div id="kitchen-ticket" className="p-4 bg-white text-black font-mono w-[58mm] text-center border-2 border-black">
      <p className="text-[10px] uppercase font-bold border-b border-black pb-1 mb-2">Bon de Cuisine</p>
      
      <div className="mb-4">
        <p className="text-[8px] uppercase tracking-widest text-gray-600">Client</p>
        <p className="text-xl font-black uppercase leading-none">{order.client}</p>
      </div>

      <div className="border-t border-black pt-2">
        <p className="text-[8px] uppercase tracking-widest text-gray-600">Table / N°</p>
        <p className="text-3xl font-black leading-none">{order.table}</p>
      </div>

      <div className="mt-4 pt-2 border-t border-dashed border-black text-[8px]">
        {new Date().toLocaleTimeString()} • SmartResto
      </div>
    </div>
  );
};
