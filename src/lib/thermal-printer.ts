/**
 * SmartResto — Thermal Printer Utility
 * 
 * Opens a dedicated popup window formatted for 80mm thermal paper.
 * Auto-prints and auto-closes. The main page is never affected.
 */


const PAPER_WIDTH = "80mm";

function openPrintWindow(htmlContent: string) {
  if (typeof window === "undefined") return;

  const printWindow = window.open("", "_blank", "width=400,height=600,scrollbars=no,menubar=no,toolbar=no,location=no,status=no");
  if (!printWindow) {
    alert("Veuillez autoriser les popups pour imprimer.");
    return;
  }

  printWindow.document.open();
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8" />
      <title>Impression SmartResto</title>
      <style>
        @page {
          margin: 0;
          size: ${PAPER_WIDTH} auto;
        }
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: 'Courier New', Courier, monospace;
          font-size: 12px;
          line-height: 1.4;
          color: #000;
          background: #fff;
          width: ${PAPER_WIDTH};
          padding: 8px;
        }
        .center { text-align: center; }
        .bold { font-weight: bold; }
        .big { font-size: 16px; }
        .small { font-size: 10px; }
        .tiny { font-size: 8px; }
        .upper { text-transform: uppercase; }
        .separator {
          border-top: 2px dashed #000;
          margin: 8px 0;
        }
        .row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 4px;
        }
        .row .left { flex: 1; }
        .row .right { text-align: right; white-space: nowrap; }
        .item-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding: 2px 0;
          border-bottom: 1px dotted #ccc;
        }
        .item-name { flex: 1; word-break: break-word; }
        .total-row {
          display: flex;
          justify-content: space-between;
          font-weight: bold;
          font-size: 16px;
          padding: 4px 0;
        }
        .footer {
          text-align: center;
          margin-top: 12px;
          padding-top: 8px;
          border-top: 2px dashed #000;
        }
        @media print {
          body { width: 100%; }
        }
      </style>
    </head>
    <body>
      ${htmlContent}
      <script>
        window.onload = function() {
          setTimeout(function() {
            window.print();
            setTimeout(function() { window.close(); }, 800);
          }, 400);
        };
      <\/script>
    </body>
    </html>
  `);
  printWindow.document.close();
}

function formatDate(): string {
  const now = new Date();
  const d = String(now.getDate()).padStart(2, "0");
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const y = now.getFullYear();
  const h = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");
  return `${d}/${m}/${y} ${h}:${min}`;
}

function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

// ─── RECEIPT (Caisse) ────────────────────────────────────────────

export function printReceipt(order: any, restaurantName: string = "SmartResto", telephone: string = "") {
  const taux = order.tauxChange || 2800;
  const itemsHtml = order.items?.map((item: any) => `
    <div class="item-row">
      <div class="item-name"><span class="bold">${item.quantite}x</span> ${(item.plat?.nom || "Article").toUpperCase()}</div>
      <div class="right">${formatCurrency((item.plat?.prixUsd || 0) * item.quantite)}</div>
    </div>
  `).join("") || `<div class="item-row"><div>Dégustation</div><div>${formatCurrency(order.totalUsd)}</div></div>`;

  const orderIdSuffix = order.id ? order.id.toString().slice(-4).toUpperCase() : "0000";

  const html = `
    <div class="center" style="margin-bottom: 12px;">
      <div class="bold big upper" style="letter-spacing: 1px;">${restaurantName}</div>
      ${telephone ? `<div class="tiny" style="opacity: 0.8;">Tél: ${telephone}</div>` : ""}
      <div class="small" style="margin-top: 4px; border: 1px solid #000; display: inline-block; padding: 2px 8px; border-radius: 4px;">RECEIPT</div>
      <div class="tiny" style="margin-top: 4px;">${formatDate()}</div>
    </div>

    <div style="display: flex; justify-content: space-between; font-size: 10px; margin-bottom: 8px;">
      <span>Table: <span class="bold">${order.table || "—"}</span></span>
      <span>Ticket: <span class="bold">#${orderIdSuffix}</span></span>
    </div>

    <div class="separator"></div>

    <div class="bold upper tiny" style="margin-bottom: 6px; display: flex; justify-content: space-between;">
      <span>Description</span>
      <span>Total</span>
    </div>
    ${itemsHtml}

    <div class="separator"></div>

    <div class="total-row" style="margin-top: 8px;">
      <span class="upper">Total USD</span>
      <span>${formatCurrency(order.totalUsd)}</span>
    </div>
    
    <div style="background: #f0f0f0; padding: 8px; border-radius: 4px; margin-top: 4px; border: 1px dashed #000;">
      <div class="row">
        <span class="bold tiny upper">Total Francs (CDF)</span>
        <span class="bold small">${(order.totalUsd * taux).toLocaleString("fr-CD")} FC</span>
      </div>
      <div class="tiny center" style="margin-top: 4px; opacity: 0.6; font-style: italic;">
        Taux appliqué : 1$ = ${taux} FC
      </div>
    </div>

    <div class="footer" style="margin-top: 20px;">
      <div class="bold small upper">Merci de votre visite !</div>
      <div class="tiny" style="margin-top: 2px; opacity: 0.7;">Veuillez conserver ce ticket.</div>
      <div class="tiny" style="margin-top: 10px; border-top: 1px solid #eee; padding-top: 4px; opacity: 0.4;">
        Powered by SmartResto Platform
      </div>
    </div>
  `;

  openPrintWindow(html);
}

// ─── KITCHEN TICKET (Cuisine) ────────────────────────────────────

export function printKitchenTicket(order: any) {
  const itemsHtml = order.items?.map((item: any) => `
    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
      <span class="bold" style="font-size: 18px; min-width: 30px;">${item.quantite}x</span>
      <span class="bold upper" style="font-size: 15px;">${item.plat?.nom || "Article"}</span>
    </div>
    ${item.selectedOptions?.detail?.length > 0 ? `<div class="tiny" style="margin-left: 38px; margin-bottom: 4px; font-style: italic;">- ${item.selectedOptions.detail.join(", ")}</div>` : ""}
  `).join("") || `<div class="bold big center">Dégustation Royale</div>`;

  const html = `
    <div class="center bold upper small" style="border-bottom: 2px solid #000; padding-bottom: 6px; margin-bottom: 8px; letter-spacing: 2px;">
      BON DE CUISINE
    </div>

    <div class="center" style="margin-bottom: 12px;">
      <div class="tiny upper" style="color: #666; letter-spacing: 2px;">Client</div>
      <div class="bold" style="font-size: 20px; text-transform: uppercase;">${order.client || "—"}</div>
    </div>

    <div class="separator"></div>

    <div class="center" style="margin-bottom: 12px;">
      <div class="tiny upper" style="color: #666; letter-spacing: 2px;">Table / N°</div>
      <div class="bold" style="font-size: 36px;">${order.table || "—"}</div>
    </div>

    <div class="separator"></div>

    <div style="margin-bottom: 8px;">
      <div class="tiny upper bold" style="color: #666; letter-spacing: 2px; margin-bottom: 8px;">Articles à préparer</div>
      ${itemsHtml}
    </div>

    ${order.noteSpeciale ? `
    <div class="separator"></div>
    <div style="margin-bottom: 8px;">
      <div class="tiny upper bold" style="color: #666; letter-spacing: 2px; margin-bottom: 4px;">Note spéciale</div>
      <div class="small" style="font-style: italic;">"${order.noteSpeciale}"</div>
    </div>
    ` : ""}

    <div class="separator"></div>
    <div class="center tiny" style="margin-top: 8px;">
      ${formatDate()} • SmartResto
    </div>
  `;

  openPrintWindow(html);
}

// ─── INVOICE (Dashboard / Facture) ───────────────────────────────

export function printInvoice(order: any, restaurantName: string = "SmartResto", telephone: string = "") {
  const tva = order.totalUsd * 0.16;
  const totalCdf = order.totalUsd * (order.tauxChange || 2800);

  const itemsHtml = order.items?.map((item: any) => `
    <div class="item-row">
      <div class="item-name">${item.quantite}x ${item.plat?.nom || "Article"}</div>
      <div class="right">${formatCurrency((item.plat?.prixUsd || 0) * item.quantite)}</div>
    </div>
    ${item.selectedOptions?.detail?.length > 0 ? `<div class="tiny" style="margin-left: 4px; font-style: italic; margin-bottom: 4px;">- ${item.selectedOptions.detail.join(", ")}</div>` : ""}
  `).join("") || `<div class="item-row"><div>Dégustation (Global)</div><div>${formatCurrency(order.totalUsd)}</div></div>`;

  const orderIdSuffix = order.id ? order.id.slice(-6).toUpperCase() : "INV-0000";

  const html = `
  const html = `
    <div class="center" style="margin-bottom: 15px;">
      <div class="bold big upper" style="font-size: 20px; letter-spacing: -0.5px;">${restaurantName}</div>
      ${telephone ? `<div class="small bold">SERVICE CLIENT : ${telephone}</div>` : ""}
      <div class="tiny uppercase" style="letter-spacing: 1px; margin-top: 4px; opacity: 0.6;">Facture Officielle</div>
    </div>

    <div style="background: #000; color: #fff; padding: 4px; text-align: center; font-weight: bold; font-size: 10px; margin-bottom: 10px; border-radius: 4px;">
      FACTURE N° ${orderIdSuffix}
    </div>

    <div style="margin-bottom: 12px; font-size: 11px;">
      <div class="row"><span>DATE :</span><span>${formatDate()}</span></div>
      <div class="row"><span>TABLE :</span><span class="bold big">${order.table || "—"}</span></div>
      <div class="row"><span>CLIENT :</span><span class="upper">${order.client || "—"}</span></div>
    </div>

    <div style="border-top: 2px solid #000; border-bottom: 1px solid #000; padding: 8px 0; margin-bottom: 8px;">
      <div class="row bold tiny upper" style="margin-bottom: 6px;">
        <span>Désignation</span><span>Total</span>
      </div>
      ${itemsHtml}
    </div>

    <div style="text-align: right; margin-bottom: 12px;">
      <div class="row tiny"><span>Sous-total HT:</span><span>${formatCurrency(order.totalUsd - tva)}</span></div>
      <div class="row tiny"><span>TVA (16.0%):</span><span>${formatCurrency(tva)}</span></div>
    </div>

    <div style="border-top: 2px solid #000; padding-top: 8px;">
      <div class="total-row">
        <span class="upper">NET À PAYER (USD)</span>
        <span>${formatCurrency(order.totalUsd)}</span>
      </div>
      
      <div style="background: #f0f0f0; padding: 10px; border-radius: 4px; margin-top: 6px; border: 1px solid #000;">
        <div class="row" style="font-size: 14px;">
          <span class="bold upper">TOTAL CDF</span>
          <span class="bold">${totalCdf.toLocaleString()} FC</span>
        </div>
        <div class="tiny center" style="margin-top: 4px; opacity: 0.7; font-size: 8px;">
          Taux appliqué : 1 USD = ${order.tauxChange || 2800} FC
        </div>
      </div>
    </div>

    <div class="footer" style="margin-top: 25px;">
      <div class="bold upper small">Merci de votre fidélité</div>
      <div class="tiny" style="margin-top: 4px; font-style: italic;">Logiciel de gestion : SmartResto SaaS</div>
      <div class="tiny" style="margin-top: 8px; opacity: 0.3;">---------------------------</div>
    </div>
  `;

  openPrintWindow(html);
}
