import React from 'react';
import { Utensils } from 'lucide-react';

interface InvoiceProps {
  order: any;
}

export const InvoiceTemplate = ({ order }: InvoiceProps) => {
  if (!order) return null;

  const date = new Date().toLocaleString();
  const tva = order.totalUsd * 0.16;
  const totalCdf = order.totalUsd * 2800;

  return (
    <div id="printable-invoice" className="p-8 bg-white text-black font-mono w-[80mm] text-xs">
      <div className="text-center border-b border-dashed border-black pb-4 mb-4">
        <h2 className="text-xl font-bold uppercase tracking-tighter">SmartResto</h2>
        <p className="text-[9px]">Goma, RD Congo</p>
        <p className="text-[9px]">Tél: +243 000 000 000</p>
      </div>

      <div className="mb-4 space-y-1">
        <div className="flex justify-between">
          <span className="font-bold">Facture #</span>
          <span>{order.id.slice(-6).toUpperCase()}</span>
        </div>
        <div className="flex justify-between">
          <span className="font-bold">Date:</span>
          <span>{date}</span>
        </div>
        <div className="flex justify-between border-t border-black pt-1 mt-1">
          <span className="font-bold uppercase">Table:</span>
          <span className="text-lg font-black">{order.table}</span>
        </div>
        <div className="flex justify-between">
          <span className="font-bold uppercase">Client:</span>
          <span className="font-bold uppercase">{order.client}</span>
        </div>
      </div>

      <div className="border-t border-b border-dashed border-black py-2 mb-4">
        <div className="flex justify-between font-bold mb-1">
          <span>Article</span>
          <span>Total</span>
        </div>
        {order.items && order.items.length > 0 ? (
          order.items.map((item: any, idx: number) => (
            <div key={idx} className="mb-1">
              <div className="flex justify-between">
                <span>{item.quantite}x {item.plat.nom}</span>
                <span>${(item.plat.prixUsd * item.quantite).toFixed(2)}</span>
              </div>
              {item.selectedOptions?.detail?.length > 0 && (
                <p className="text-[7px] italic ml-2">- {item.selectedOptions.detail.join(', ')}</p>
              )}
            </div>
          ))
        ) : (
          <div className="flex justify-between">
            <span>Dégustation (Global)</span>
            <span>${order.totalUsd.toFixed(2)}</span>
          </div>
        )}
      </div>

      <div className="space-y-1 text-right italic text-[10px]">
         <p>Sous-total: ${ (order.totalUsd - tva).toFixed(2) }</p>
         <p>TVA (16%): ${ tva.toFixed(2) }</p>
      </div>

      <div className="border-t border-black pt-2 mt-2">
        <div className="flex justify-between text-base font-black">
          <span>TOTAL USD:</span>
          <span>${order.totalUsd.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm font-bold opacity-80">
          <span>TOTAL CDF:</span>
          <span>{totalCdf.toLocaleString()} FC</span>
        </div>
      </div>

      <div className="text-center mt-8 pt-4 border-t border-dashed border-black">
        <p className="font-bold uppercase">Merci de votre visite !</p>
        <p className="text-[8px] mt-2">Logiciel de gestion par SmartResto</p>
      </div>
    </div>
  );
};
