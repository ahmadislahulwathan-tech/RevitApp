/**
 * Reliable Print Utility for iFrame and Browser Environments
 * Guarantees 100% visual fidelity matching the on-screen preview.
 */

export const isInsideIframe = (): boolean => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
};

export type PrintOrientation = 'landscape' | 'portrait';

/**
 * Resolves print orientation:
 * - Kuitansi -> Portrait
 * - BKU, BKT, Bank, Pajak, Laporan -> Landscape
 */
export function resolvePrintOrientation(
  elementId?: string,
  title?: string,
  preferredOrientation?: PrintOrientation
): PrintOrientation {
  if (preferredOrientation) return preferredOrientation;

  const id = (elementId || '').toLowerCase();
  const t = (title || '').toLowerCase();

  if (id.includes('kwitansi') || id.includes('kuitansi') || t.includes('kwitansi') || t.includes('kuitansi')) {
    return 'portrait';
  }

  if (
    id.includes('bku') ||
    id.includes('bkt') ||
    id.includes('bank') ||
    id.includes('pajak') ||
    id.includes('report') ||
    t.includes('bku') ||
    t.includes('bkt') ||
    t.includes('bank') ||
    t.includes('pajak')
  ) {
    return 'landscape';
  }

  return 'landscape';
}

export function executePrint(
  elementId?: string, 
  _filename = 'Dokumen_Cetak',
  documentTitle = 'Dokumen',
  preferredOrientation?: PrintOrientation
): void {
  const orientation = resolvePrintOrientation(elementId, documentTitle, preferredOrientation);

  // Bring window into focus
  window.focus();

  // Inject dynamic @page style for immediate print preview accuracy
  let dynamicStyle = document.getElementById('applet-dynamic-print-orientation') as HTMLStyleElement | null;
  if (!dynamicStyle) {
    dynamicStyle = document.createElement('style');
    dynamicStyle.id = 'applet-dynamic-print-orientation';
    document.head.appendChild(dynamicStyle);
  }
  dynamicStyle.innerHTML = `
    @media print {
      @page {
        size: ${orientation === 'portrait' ? 'A4 portrait' : 'A4 landscape'} !important;
        margin: ${orientation === 'portrait' ? '12mm 15mm' : '8mm 10mm'} !important;
      }
    }
  `;

  // In an iframe sandbox (such as AI Studio preview), window.print() is often blocked by Chromium.
  // We directly open the dedicated print page in a top-level tab without downloading anything,
  // which immediately triggers the native browser print preview dialog.
  if (isInsideIframe() && elementId) {
    openPrintablePage(elementId, documentTitle, orientation);
    return;
  }

  // If outside iframe, try native window.print() directly
  try {
    window.print();
  } catch (err) {
    console.warn('Direct window.print() failed, opening print page:', err);
    if (elementId) {
      openPrintablePage(elementId, documentTitle, orientation);
    }
  }
}

/**
 * Directly opens the dedicated Print Page in a clean tab without downloading any file.
 * The print page immediately launches the native browser print dialog.
 */
export function openPrintablePage(
  elementId?: string, 
  title = 'Dokumen',
  preferredOrientation?: PrintOrientation
) {
  const orientation = resolvePrintOrientation(elementId, title, preferredOrientation);

  let element = elementId ? document.getElementById(elementId) : null;
  if (!element) {
    element = document.getElementById('bku-printable-area') || 
              document.getElementById('bank-printable-area') || 
              document.getElementById('bkt-printable-area') || 
              document.getElementById('pajak-printable-area') || 
              document.getElementById('kwitansi-printable-area') ||
              document.getElementById('report-printable-area') || 
              document.getElementById('dashboard-printable-area') || 
              document.getElementById('settings-printable-area') || 
              (document.querySelector('[id$="-printable-area"]') as HTMLElement);
  }

  if (!element) {
    try {
      window.print();
    } catch (e) {
      console.warn('Print trigger failed:', e);
    }
    return;
  }

  // Clone element to sanitize for printable page
  const clone = element.cloneNode(true) as HTMLElement;

  // Remove buttons, inputs, selects, and print:hidden elements
  const hiddenElements = clone.querySelectorAll('.print\\:hidden, button, select, input');
  hiddenElements.forEach((el) => {
    if (el.tagName.toLowerCase() === 'button' || el.classList.contains('print:hidden')) {
      el.remove();
    }
  });

  // Extract all existing style sheets and tags to ensure exact visual parity
  const existingStyles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
    .map((tag) => tag.outerHTML)
    .join('\n');

  const containerMaxWidth = orientation === 'portrait' ? '210mm' : '297mm';

  const fullHtml = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <!-- Load Tailwind CSS via CDN for 100% style fidelity -->
  <script src="https://cdn.tailwindcss.com"></script>
  <!-- Injected app styles -->
  ${existingStyles}
  <style>
    @page {
      size: ${orientation === 'portrait' ? 'A4 portrait' : 'A4 landscape'};
      margin: ${orientation === 'portrait' ? '12mm 15mm' : '8mm 10mm'};
    }
    *, *::before, *::after {
      box-sizing: border-box;
    }
    body {
      background-color: #f1f5f9;
      color: #000000;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      font-size: 12px;
      margin: 0;
      padding: 24px;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    #print-container {
      width: 100%;
      max-width: ${containerMaxWidth};
      background: transparent;
    }
    .a4-landscape-page {
      width: 297mm;
      min-height: 200mm;
      background: #ffffff !important;
      box-sizing: border-box !important;
      page-break-after: always !important;
      break-after: page !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
      margin: 0 auto 24px auto;
      padding: 10mm 12mm !important;
      border: 1px solid #cbd5e1;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }
    .a4-landscape-page:last-child {
      page-break-after: auto !important;
      break-after: auto !important;
      margin-bottom: 0;
    }
    #kwitansi-printable-area {
      width: 100%;
      max-width: 210mm;
      background: #ffffff !important;
      box-sizing: border-box !important;
      margin: 0 auto;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      border: 1px solid #cbd5e1;
    }
    table {
      border-collapse: collapse !important;
      width: 100%;
    }

    th, td {
      vertical-align: top;
    }
    .print-top-bar {
      margin-bottom: 20px;
      padding: 12px 20px;
      background-color: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      width: 100%;
      max-width: ${containerMaxWidth};
      box-shadow: 0 2px 4px rgba(0,0,0,0.06);
      font-family: sans-serif;
    }
    @media print {
      body {
        background-color: #ffffff !important;
        padding: 0 !important;
        margin: 0 !important;
      }
      #print-container {
        max-width: none !important;
        width: 100% !important;
      }
      .a4-landscape-page {
        margin: 0 !important;
        padding: 0 !important;
        border: none !important;
        box-shadow: none !important;
        width: 100% !important;
        min-height: 100vh !important;
      }
      #kwitansi-printable-area {
        margin: 0 !important;
        padding: 0 !important;
        border: none !important;
        box-shadow: none !important;
        width: 100% !important;
      }
      .print-top-bar, .no-print, [data-print-hide] {
        display: none !important;
      }
    }
    @media print {
      body {
        background-color: #ffffff !important;
        padding: 0 !important;
      }
      #print-container {
        max-width: 100% !important;
        width: 100% !important;
      }
      .print-top-bar {
        display: none !important;
      }
      button {
        display: none !important;
      }
    }
  </style>
</head>
<body>
  <div class="print-top-bar">
    <div style="display: flex; align-items: center; gap: 10px;">
      <span style="font-size: 22px;">🖨️</span>
      <div>
        <strong style="color: #0f172a; font-size: 14px; display: block;">Halaman Cetak Resmi: ${title}</strong>
        <span style="font-size: 12px; color: #64748b;">Dialog printer otomatis terbuka. Jika tertutup, klik tombol di sebelah kanan.</span>
      </div>
    </div>
    <div style="display: flex; gap: 8px;">
      <button onclick="window.focus(); window.print();" style="background-color: #047857; color: white; border: none; padding: 10px 18px; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 13px; display: flex; align-items: center; gap: 6px;">
        🖨️ Cetak / Simpan PDF
      </button>
      <button onclick="window.close()" style="background-color: #f1f5f9; color: #334155; border: 1px solid #cbd5e1; padding: 10px 14px; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 13px;">
        ✕ Tutup
      </button>
    </div>
  </div>

  <div id="print-container">
    ${clone.outerHTML}
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.focus();
        window.print();
      }, 400);
    };
  </script>
</body>
</html>`;

  const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  // Directly open the page in a new tab - WITHOUT ANY a.download attribute!
  const a = document.createElement('a');
  a.href = url;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  setTimeout(() => URL.revokeObjectURL(url), 60000);
}




/**
 * Downloads a standalone, pre-styled HTML file that auto-triggers the print dialog when opened.
 * This guarantees 100% exact visual fidelity matching the on-screen preview.
 */
export function downloadPrintableDocument(
  elementId: string, 
  filename: string, 
  title: string,
  preferredOrientation?: PrintOrientation
) {
  const orientation = resolvePrintOrientation(elementId, title, preferredOrientation);

  let element = elementId ? document.getElementById(elementId) : null;
  if (!element) {
    element = document.getElementById('bku-printable-area') || 
              document.getElementById('bank-printable-area') || 
              document.getElementById('bkt-printable-area') || 
              document.getElementById('pajak-printable-area') || 
              document.getElementById('kwitansi-printable-area') ||
              document.getElementById('report-printable-area') || 
              document.getElementById('dashboard-printable-area') || 
              document.getElementById('settings-printable-area') || 
              (document.querySelector('[id$="-printable-area"]') as HTMLElement);
  }

  if (!element) {
    try {
      window.print();
    } catch (e) {
      console.warn('Fallback print failed:', e);
    }
    return;
  }

  // Clone element to sanitize for standalone document
  const clone = element.cloneNode(true) as HTMLElement;

  // Remove any elements marked print:hidden
  const hiddenElements = clone.querySelectorAll('.print\\:hidden, button, select, input');
  hiddenElements.forEach((el) => {
    if (el.tagName.toLowerCase() === 'button' || el.classList.contains('print:hidden')) {
      el.remove();
    }
  });

  // Extract all existing style sheets and tags to ensure exact visual parity
  const existingStyles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
    .map((tag) => tag.outerHTML)
    .join('\n');

  const containerMaxWidth = orientation === 'portrait' ? '210mm' : '297mm';

  const fullHtml = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <!-- Load Tailwind CSS via CDN so all Tailwind classes are 100% rendered -->
  <script src="https://cdn.tailwindcss.com"></script>
  <!-- Injected app styles -->
  ${existingStyles}
  <style>
    @page {
      size: ${orientation === 'portrait' ? 'A4 portrait' : 'A4 landscape'};
      margin: ${orientation === 'portrait' ? '12mm 15mm' : '8mm 10mm'};
    }
    *, *::before, *::after {
      box-sizing: border-box;
    }
    body {
      background-color: #f8fafc;
      color: #000000;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      font-size: 12px;
      margin: 0;
      padding: 24px;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    #print-container {
      width: 100%;
      max-width: ${containerMaxWidth};
      background: transparent;
    }
    .a4-landscape-page {
      width: 297mm;
      min-height: 200mm;
      background: #ffffff !important;
      box-sizing: border-box !important;
      page-break-after: always !important;
      break-after: page !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
      margin: 0 auto 24px auto;
      padding: 10mm 12mm !important;
      border: 1px solid #cbd5e1;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }
    .a4-landscape-page:last-child {
      page-break-after: auto !important;
      break-after: auto !important;
      margin-bottom: 0;
    }
    #kwitansi-printable-area {
      width: 100%;
      max-width: 210mm;
      background: #ffffff !important;
      box-sizing: border-box !important;
      margin: 0 auto;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      border: 1px solid #cbd5e1;
    }
    #print-container > div, [id$="-printable-area"] {
      border: none !important;
      box-shadow: none !important;
    }
    table {
      border-collapse: collapse !important;
      width: 100%;
    }

    th, td {
      vertical-align: top;
    }
    .no-print {
      margin-bottom: 20px;
      padding: 14px 20px;
      background-color: #ecfdf5;
      border: 1px solid #10b981;
      border-radius: 10px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      width: 100%;
      max-width: ${containerMaxWidth};
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      font-family: sans-serif;
    }
    @media print {
      body {
        background-color: #ffffff !important;
        padding: 0 !important;
      }
      #print-container {
        max-width: 100% !important;
        width: 100% !important;
      }
      .no-print {
        display: none !important;
      }
      button {
        display: none !important;
      }
      .a4-landscape-page {
        margin: 0 !important;
        padding: 0 !important;
        border: none !important;
        box-shadow: none !important;
        width: 100% !important;
        min-height: 100vh !important;
      }
      #kwitansi-printable-area {
        margin: 0 !important;
        padding: 0 !important;
        border: none !important;
        box-shadow: none !important;
        width: 100% !important;
      }
    }
  </style>
</head>
<body>
  <div class="no-print">
    <div>
      <strong style="color: #065f46; font-size: 15px; display: block;">📄 Dokumen Siap Cetak: ${title}</strong>
      <p style="margin: 4px 0 0 0; font-size: 12px; color: #047857;">Tampilan dokumen ini sama persis dengan preview. Klik tombol di kanan untuk langsung mencetak atau simpan ke file PDF.</p>
    </div>
    <div style="display: flex; gap: 8px;">
      <button onclick="window.print()" style="background-color: #047857; color: white; border: none; padding: 10px 18px; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 13px; display: flex; align-items: center; gap: 6px;">
        🖨️ Cetak / Simpan PDF
      </button>
      <button onclick="window.close()" style="background-color: #e2e8f0; color: #334155; border: none; padding: 10px 14px; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 13px;">
        Tutup
      </button>
    </div>
  </div>

  <div id="print-container">
    ${clone.outerHTML}
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        try {
          window.focus();
          window.print();
        } catch (e) {
          console.warn('Auto print trigger:', e);
        }
      }, 500);
    };
  </script>
</body>
</html>`;

  const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

