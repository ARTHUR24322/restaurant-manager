import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const exportToExcel = (data: any[], fileName: string, summary: any) => {
  // Création d'une feuille pour le résumé
  const summaryData = [
    ["RÉSUMÉ DU RAPPORT"],
    ["Total Revenu ($)", summary.totalRevenue.toFixed(2)],
    ["Nombre de Commandes", summary.orderCount],
    ["Plat le plus commandé", summary.topDish],
    [""], // Espace
    ["DÉTAILS DES COMMANDES"]
  ];
  const ws = XLSX.utils.aoa_to_sheet(summaryData);
  
  // Ajout des données de commandes après le résumé
  XLSX.utils.sheet_add_json(ws, data, { origin: "A7" });
  
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Rapport");
  XLSX.writeFile(wb, `${fileName}.xlsx`);
};

export const exportToPDF = (data: any[], fileName: string, title: string, summary: any) => {
  const doc = new jsPDF();
  
  // Header Style
  doc.setFillColor(31, 41, 55); // Zinc-900 like
  doc.rect(0, 0, 210, 40, 'F');
  
  // Titre
  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  doc.text(title.toUpperCase(), 14, 25);
  
  // Date de génération
  doc.setFontSize(9);
  doc.setTextColor(161, 161, 170); // Zinc-400
  doc.text(`Généré le : ${new Date().toLocaleString()}`, 14, 34);
  
  // SECTION RÉSUMÉ
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(14);
  doc.text("RÉSUMÉ DES PERFORMANCES", 14, 55);
  
  // Cartes de résumé (simulation visuelle)
  doc.setDrawColor(228, 228, 231);
  doc.roundedRect(14, 60, 55, 25, 3, 3);
  doc.roundedRect(77, 60, 55, 25, 3, 3);
  doc.roundedRect(140, 60, 55, 25, 3, 3);
  
  doc.setFontSize(8);
  doc.setTextColor(113, 113, 122);
  doc.text("TOTAL REVENU", 18, 67);
  doc.text("COMMANDES", 81, 67);
  doc.text("TOP PRODUIT", 144, 67);
  
  doc.setFontSize(12);
  doc.setTextColor(16, 185, 129); // Emerald-500
  doc.text(`$${summary.totalRevenue.toFixed(2)}`, 18, 77);
  doc.setTextColor(79, 70, 229); // Indigo-600
  doc.text(`${summary.orderCount}`, 81, 77);
  doc.setTextColor(245, 158, 11); // Amber-500
  doc.text(`${summary.topDish.substring(0, 15)}`, 144, 77);
  
  // TABLEAU DÉTAILLÉ
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12);
  doc.text("DÉTAIL DES TRANSACTIONS", 14, 100);

  const tableColumn = Object.keys(data[0]);
  const tableRows = data.map(item => Object.values(item));

  autoTable(doc, {
    head: [tableColumn],
    body: tableRows as any[],
    startY: 105,
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [31, 41, 55], textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [249, 250, 251] }
  });

  doc.save(`${fileName}.pdf`);
};

export const formatOrderForReport = (orders: any[]) => {
  return orders.map(order => ({
    REF: order.id.substring(0, 6).toUpperCase(),
    INSTANT: new Date(order.createdAt).toLocaleTimeString('fr-FR'),
    DATE: new Date(order.createdAt).toLocaleDateString('fr-FR'),
    TABLE: order.table,
    MONTANT_USD: `${order.totalUsd.toFixed(2)} $`,
    CONTENU: order.items.map((i: any) => `${i.plat.nom} (x${i.quantite})`).join(", ")
  }));
};

export const calculateSummary = (orders: any[]) => {
  const totalRevenue = orders.reduce((acc, o) => acc + o.totalUsd, 0);
  const orderCount = orders.length;
  
  const platCounts: Record<string, number> = {};
  orders.forEach(o => {
    o.items.forEach((i: any) => {
      platCounts[i.plat.nom] = (platCounts[i.plat.nom] || 0) + i.quantite;
    });
  });
  
  const topDish = Object.entries(platCounts).sort((a,b) => b[1] - a[1])[0]?.[0] || "N/A";
  
  return { totalRevenue, orderCount, topDish };
};
