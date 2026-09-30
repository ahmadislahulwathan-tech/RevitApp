import { TaxDetail } from '../types';

export function formatRupiah(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatAngka(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) return '0';
  return new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatAngkaSen(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) return '0,00';
  return new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function parseRupiahInput(value: string): number {
  const clean = value.replace(/[^0-9]/g, '');
  return clean ? parseInt(clean, 10) : 0;
}

export function formatTanggalIndo(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;

  const bulan = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  ];

  const day = date.getDate();
  const month = bulan[date.getMonth()];
  const year = date.getFullYear();

  return `${day} ${month} ${year}`;
}

export function formatBulanTahunKapital(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';

  const bulan = [
    'JANUARI', 'FEBRUARI', 'MARET', 'APRIL', 'MEI', 'JUNI',
    'JULI', 'AGUSTUS', 'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DESEMBER',
  ];

  return `${bulan[date.getMonth()]} ${date.getFullYear()}`;
}

export function formatTanggalDinas(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const year = parts[0];
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);
    return `${day}-${month}-${year}`;
  }
  return dateStr;
}

export function formatTanggalShort(dateStr: string): string {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  if (!day) return dateStr;
  return `${day}/${month}/${year}`;
}

export function formatTanggalSlash(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const year = parts[0];
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);
    return `${day}/${month}/${year}`;
  }
  return dateStr;
}

export function formatTanggalDash(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const year = parts[0];
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);
    return `${day}-${month}-${year}`;
  }
  return dateStr;
}

/**
 * Menghasilkan nomor bukti BKU berikutnya secara cerdas sesuai konfigurasi penomoran.
 */
export { getNextBKUBelanjaNoBukti, generateBKUNoBukti } from './bkuNumbering';


export interface TaxCalculationParams {
  jumlah: number; // Gross amount (E)
  hasPPN: boolean;
  hasPPh22: boolean;
  hasPPh23: boolean;
  hasPPh4Ayat2: boolean;
  hasPPh21: boolean;
  customDPP?: number;
}

/**
 * Calculates DPP and taxes strictly following the user's defined rules:
 * - If PPN applies: DPP = 100/111 * E
 * - If PPN does not apply: DPP = E (unless custom DPP is explicitly provided)
 * - PPN = 11% of DPP
 * - PPh 22 = 1.5% of DPP
 * - PPh 23 = 2% of DPP
 * - PPh 4 ayat (2) = 4% of DPP
 * - PPh 21 = 5% of DPP
 */
export function calculateTaxDetail(params: TaxCalculationParams): TaxDetail {
  const { jumlah, hasPPN, hasPPh22, hasPPh23, hasPPh4Ayat2, hasPPh21, customDPP } = params;

  let dpp = 0;
  if (hasPPN) {
    dpp = customDPP !== undefined && customDPP > 0 
      ? customDPP 
      : Math.round((100 / 111) * jumlah);
  } else if (hasPPh22 || hasPPh23 || hasPPh4Ayat2 || hasPPh21) {
    dpp = customDPP !== undefined && customDPP > 0 
      ? customDPP 
      : jumlah;
  } else {
    dpp = 0;
  }

  const ppn = hasPPN ? Math.round(dpp * 0.11) : 0;
  const pph22 = hasPPh22 ? Math.round(dpp * 0.015) : 0;
  const pph23 = hasPPh23 ? Math.round(dpp * 0.02) : 0;
  const pph4_2 = hasPPh4Ayat2 ? Math.round(dpp * 0.04) : 0;
  const pph21 = hasPPh21 ? Math.round(dpp * 0.05) : 0;

  const totalPajak = ppn + pph22 + pph23 + pph4_2 + pph21;
  const jumlahNetto = Math.max(0, jumlah - totalPajak);

  return {
    hasPPN,
    hasPPh22,
    hasPPh23,
    hasPPh4Ayat2,
    hasPPh21,
    dpp,
    ppn,
    pph22,
    pph23,
    pph4_2,
    pph21,
    totalPajak,
    jumlahNetto,
    statusSetor: 'Belum Disetor',
  };
}

export interface ExpandedTaxItem {
  key: string;
  label: string;
  amount: number;
}

/**
 * Extracts each individual tax applicable to a transaction for official "Terima Pajak" and "Setor Pajak" ledger entries.
 */
export function extractTaxItems(pajak?: TaxDetail): ExpandedTaxItem[] {
  if (!pajak) return [];
  const items: ExpandedTaxItem[] = [];

  if (pajak.hasPPN && pajak.ppn > 0) {
    items.push({ key: 'ppn', label: 'PPN 11%', amount: pajak.ppn });
  }
  if (pajak.hasPPh22 && pajak.pph22 > 0) {
    items.push({ key: 'pph22', label: 'PPh 22 1,5%', amount: pajak.pph22 });
  }
  if (pajak.hasPPh23 && pajak.pph23 > 0) {
    items.push({ key: 'pph23', label: 'PPh 23 2%', amount: pajak.pph23 });
  }
  if (pajak.hasPPh4Ayat2 && pajak.pph4_2 > 0) {
    items.push({ key: 'pph4_2', label: 'PPh Final Pasal 4(2) 4%', amount: pajak.pph4_2 });
  }
  if (pajak.hasPPh21 && pajak.pph21 > 0) {
    items.push({ key: 'pph21', label: 'PPh 21 5%', amount: pajak.pph21 });
  }

  // Fallback if totalPajak > 0 but none of the specific flags are true
  if (items.length === 0 && pajak.totalPajak > 0) {
    items.push({ key: 'pajak', label: 'Pajak', amount: pajak.totalPajak });
  }

  return items;
}

export function exportToCSV(filename: string, headers: string[], rows: (string | number)[][]) {
  const processCell = (cell: string | number) => {
    let str = String(cell ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      str = `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const csvContent = [
    headers.map(processCell).join(';'),
    ...rows.map(row => row.map(processCell).join(';')),
  ].join('\r\n');

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
