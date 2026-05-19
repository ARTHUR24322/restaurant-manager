/* eslint-disable @typescript-eslint/no-explicit-any */
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export function ReceiptTicket({ order, restaurantName = "SmartResto" }: { order: any, restaurantName?: string }) {
  if (!order) return null;

  return (
    <div className="hidden print:flex flex-col w-[80mm] p-4 text-black bg-white mx-auto font-mono text-sm leading-tight print:absolute print:top-0 print:left-0 print:m-0 print:w-full">
      {/* En-tête */}
      <div className="text-center mb-6">
        <h1 className="font-black text-xl mb-1 uppercase disable-text-wrap">{restaurantName}</h1>
        <p className="text-xs">Reçu - Table {order.table}</p>
        <p className="text-xs">{format(new Date(), "dd/MM/yyyy HH:mm", { locale: fr })}</p>
        <p className="text-xs mt-1">Ticket #{order.id?.toString().slice(-4)}</p>
      </div>

      {/* Séparateur */}
      <div className="border-t-2 border-dashed border-black my-4" />

      {/* Plats */}
      <div className="flex flex-col gap-2">
        {order.items?.map((item: any, idx: number) => (
          <div key={idx} className="flex justify-between items-start text-xs border-b border-black/10 pb-1">
            <div className="flex gap-2">
              <span className="font-bold">{item.quantite}x</span>
              <span className="max-w-[40mm] break-words uppercase">{item.plat.nom}</span>
            </div>
            <span className="shrink-0 ml-2 whitespace-nowrap">${(item.plat.prixUsd * item.quantite).toFixed(2)}</span>
          </div>
        ))}
      </div>

      {/* Séparateur */}
      <div className="border-t-2 border-dashed border-black my-4" />

      {/* Totaux */}
      <div className="flex justify-between font-black text-lg mb-1">
        <span>TOTAL USD</span>
        <span>${order.totalUsd.toFixed(2)}</span>
      </div>
      <div className="flex justify-between text-xs mb-6 font-bold">
        <span>Total CDF (≃2800)</span>
        <span>{(order.totalUsd * 2800).toLocaleString('fr-CD')} FC</span>
      </div>

      {/* Footer */}
      <div className="text-center text-xs space-y-1">
        <p className="font-bold">Merci de votre visite !</p>
        <p className="opacity-75">À très bientôt.</p>
        <p className="text-[10px] mt-4 opacity-50">Software: SmartResto SaaS</p>
      </div>

    </div>
  );
}
