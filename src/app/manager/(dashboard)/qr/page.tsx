"use client"

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Printer, Download, Plus, Minus, QrCode } from "lucide-react";
import { toast } from "sonner";
import { getRestaurantById } from "@/lib/admin-actions";
import { getManagerSession } from "@/lib/manager-actions";
import { useEffect } from "react";

export default function QRGeneratorPage({ searchParams }: { searchParams: { resto_id?: string } }) {
  const restoId = searchParams.resto_id || "resto-99-default";
  const [tableCount, setTableCount] = useState(10);
  const [baseUrl, setBaseUrl] = useState("");
  const [restaurant, setRestaurant] = useState<any>(null);

  useEffect(() => {
    // Set the base URL dynamically based on the current domain
    if (typeof window !== "undefined") {
      setBaseUrl(`${window.location.origin}/client/menu`);
    }
  }, []);

  useEffect(() => {
    async function fetchRestaurant() {
      if (searchParams.resto_id) {
        const r = await getRestaurantById(searchParams.resto_id);
        if (r) setRestaurant(r);
      } else {
        const session = await getManagerSession();
        if (session) setRestaurant(session);
      }
    }
    fetchRestaurant();
  }, [searchParams.resto_id]);

  const restaurantName = restaurant?.nom || "SmartResto";

  const tables = Array.from({ length: tableCount }, (_, i) => i + 1);

  const downloadQRCode = (tableNum: number) => {
    toast.info("Génération de l'image haute définition en cours...", { duration: 2000 });
    
    const svgId = `qr-svg-${tableNum}`;
    const svgElement = document.getElementById(svgId);
    if (!svgElement) return;

    svgElement.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    const svgData = new XMLSerializer().serializeToString(svgElement);
    const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      // 7cm x 10cm @ 300DPI
      canvas.width = 827; 
      canvas.height = 1181; 
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Background
      ctx.fillStyle = "#0F172A"; 
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Deco
      ctx.fillStyle = "rgba(212, 175, 55, 0.1)";
      ctx.beginPath();
      ctx.arc(827, 0, 450, 0, 2 * Math.PI);
      ctx.fill();

      // Border
      ctx.strokeStyle = "rgba(212, 175, 55, 0.2)";
      ctx.lineWidth = 15;
      ctx.strokeRect(15, 15, 797, 1151);

      // Restaurant Pill
      const pillY = 120;
      const pillHeight = 80;
      ctx.font = "900 36px sans-serif";
      const textWidth = ctx.measureText(restaurantName.toUpperCase()).width;
      const pillWidth = Math.max(textWidth + 100, 450);
      const pillX = (827 - pillWidth) / 2;
      
      ctx.fillStyle = "#D4AF37";
      ctx.beginPath();
      (ctx as any).roundRect(pillX, pillY, pillWidth, pillHeight, 40);
      ctx.fill();
      
      ctx.fillStyle = "#0F172A";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(restaurantName.toUpperCase(), 827 / 2, pillY + pillHeight / 2 + 5);

      // QR Code Box
      const boxSize = 560;
      const boxX = (827 - boxSize) / 2;
      const boxY = 300;
      
      ctx.fillStyle = "white";
      ctx.strokeStyle = "rgba(212, 175, 55, 0.2)";
      ctx.lineWidth = 6;
      ctx.beginPath();
      (ctx as any).roundRect(boxX, boxY, boxSize, boxSize, 40);
      ctx.fill();
      ctx.stroke();

      // Draw SVG
      const qrPadding = 40;
      const qrSize = boxSize - qrPadding * 2;
      ctx.drawImage(img, boxX + qrPadding, boxY + qrPadding, qrSize, qrSize);

      // Bottom Text
      ctx.fillStyle = "#D4AF37";
      ctx.font = "900 32px sans-serif";
      ctx.fillText("NOTRE MENU NUMÉRIQUE", 827 / 2, 980);

      // Table Number
      ctx.fillStyle = "white";
      ctx.font = "900 100px sans-serif";
      ctx.fillText(`TABLE ${tableNum}`, 827 / 2, 1080);
      
      URL.revokeObjectURL(url);

      const dataUrl = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `QR_Table_${tableNum}_${restaurantName.replace(/\\s+/g, '_')}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    };
    img.src = url;
  };

  const handlePrint = () => {
    toast.info("Génération du document PDF en cours...", { duration: 3000 });
    setTimeout(() => {
      window.print();
    }, 500);
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <title>Impression QR Codes - {restaurantName}</title>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6 print:hidden">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">QR Codes - {restaurantName}</h1>
          <p className="text-muted-foreground mt-1">Générez et imprimez les codes pour vos tables.</p>
        </div>

        <div className="flex items-center gap-4 bg-card border border-border p-2 rounded-2xl shadow-sm">
          <div className="flex items-center gap-3 px-4">
            <span className="text-sm font-bold text-muted-foreground">Nombre de tables</span>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setTableCount(Math.max(1, tableCount - 1))}
                className="p-1 rounded-lg hover:bg-secondary border border-border"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="w-6 text-center font-bold">{tableCount}</span>
              <button 
                onClick={() => setTableCount(tableCount + 1)}
                className="p-1 rounded-lg hover:bg-secondary border border-border"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          <div className="w-px h-8 bg-border" />

          <button 
            onClick={handlePrint}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2.5 rounded-xl font-bold hover:bg-primary/90 transition-all active:scale-95"
          >
            <Printer className="w-4 h-4" />
            Imprimer Tout
          </button>
        </div>
      </div>

      {/* Input URL pour simulation (car en local on n'a pas encore le domaine final) */}
      <div className="mb-8 bg-secondary/30 p-4 rounded-xl border border-border/50 print:hidden">
        <label className="text-xs font-bold text-muted-foreground uppercase mb-2 block">URL de votre site (pour le QR)</label>
        <input 
          type="text" 
          value={baseUrl} 
          onChange={(e) => setBaseUrl(e.target.value)}
          className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
          placeholder="https://votre-restaurant.com"
        />
      </div>

      {/* Grille des QR Codes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8 print:block">
        {tables.map((num) => (
          <div 
            key={num} 
            className="bg-[#0F172A] text-white p-8 rounded-[2.5rem] border-2 border-[#D4AF37]/20 flex flex-col items-center justify-between gap-6 shadow-2xl relative overflow-hidden print:shadow-none print:border-none print:mb-12 print:break-inside-avoid"
          >
            {/* Décoration subtile dorée */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#D4AF37]/10 rounded-bl-full pointer-events-none" />
            
            <div className="bg-[#D4AF37] text-[#0F172A] px-6 py-2 rounded-full text-[11px] font-black uppercase tracking-widest z-10 shadow-lg shadow-[#D4AF37]/20 truncate max-w-full">
              {restaurantName}
            </div>
            
            <div className="p-4 bg-white border-2 border-[#D4AF37]/20 rounded-3xl shadow-inner z-10 w-full max-w-[200px] aspect-square flex items-center justify-center">
              <QRCodeSVG 
                id={`qr-svg-${num}`}
                value={restaurant?.slug 
                  ? `${baseUrl}/${restaurant.slug}?table=${num}` 
                  : `${baseUrl}?resto_id=${restaurant?.id || restoId}&table=${num}`
                } 
                size={180}
                level={"H"}
                includeMargin={false}
                bgColor="#ffffff"
                fgColor="#0F172A"
                imageSettings={{
                  src: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="%23D4AF37" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg>',
                  x: undefined,
                  y: undefined,
                  height: 48,
                  width: 48,
                  excavate: true,
                }}
              />
            </div>

            <div className="text-center z-10 w-full mt-auto pt-4 border-t border-[#D4AF37]/20">
              <span className="text-xs font-black text-[#D4AF37] uppercase tracking-[0.2em] mb-1 block">Notre Menu Numérique</span>
              <div className="flex items-end justify-center gap-2 mt-2">
                 <span className="text-sm font-bold opacity-70 uppercase tracking-widest pb-1">Table</span>
                 <h2 className="text-5xl font-black text-white">{num}</h2>
              </div>
              <button 
                onClick={() => downloadQRCode(num)}
                className="mt-6 w-full flex items-center justify-center gap-2 bg-[#D4AF37] text-[#0F172A] py-3 rounded-2xl font-bold hover:bg-[#D4AF37]/80 transition-all print:hidden"
              >
                <Download className="w-5 h-5" /> Exporter (7x10cm)
              </button>
            </div>
          </div>
        ))}
      </div>

      <style jsx global>{`
        @media print {
          /* Masquage complet des éléments d'interface */
          aside, header, nav, .print\:hidden { 
            display: none !important; 
          }
          
          /* Réinitialisation du corps de page */
          body, html, main, .flex-1 { 
            background: white !important; 
            color: black !important;
            margin: 0 !important;
            padding: 0 !important;
            height: auto !important;
            min-height: auto !important;
            overflow: visible !important;
          }

          /* Optimisation de la grille pour l'impression */
          .grid { 
            display: block !important; 
            width: 100% !important;
          }

          /* Force l'affichage des cartes QR */
          .bg-\\[\\#0F172A\\] {
            background-color: #0F172A !important;
            color: white !important;
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
            page-break-inside: avoid;
            margin-bottom: 3rem !important;
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            border: 2px solid #D4AF37 !important; 
            border-radius: 2rem !important;
          }

          /* Pilules dorées */
          .bg-\\[\\#D4AF37\\] {
            background-color: #D4AF37 !important;
            color: #0F172A !important;
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }

          /* Le conteneur blanc du SVG */
          .bg-white {
             background-color: white !important;
             print-color-adjust: exact;
             -webkit-print-color-adjust: exact;
          }

          /* Textes */
          .text-\\[\\#D4AF37\\] {
             color: #D4AF37 !important;
          }

          /* Assure que le SVG est visible */
          svg {
            display: block !important;
            margin: 0 auto !important;
          }
        }
      `}</style>
    </div>
  );
}
