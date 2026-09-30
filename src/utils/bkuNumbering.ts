import { BKUNumberingConfig, BKUNumberingPattern, BKUTransaction, SchoolProfile } from '../types';

export const DEFAULT_BKU_NUMBERING: BKUNumberingConfig = {
  pola: 'bku_prefix',
  customTemplate: 'BKU-{nomor}/{tahun}',
  digitPadding: 3,
  startNumber: 1,
  resetCycle: 'tahunan',
};

export interface PatternPreset {
  id: BKUNumberingPattern;
  name: string;
  example: string;
  description: string;
  template: string;
}

export const NUMBERING_PRESETS: PatternPreset[] = [
  {
    id: 'bku_prefix',
    name: 'BKU-{nomor}/{tahun}',
    example: 'BKU-001/2026',
    description: 'Format baku standar penatausahaan BKU dengan kode tahun anggaran',
    template: 'BKU-{nomor}/{tahun}',
  },
  {
    id: 'bku_middle',
    name: '{nomor}/BKU/{tahun}',
    example: '001/BKU/2026',
    description: 'Format penomoran buku kas umum dinas pendidikan',
    template: '{nomor}/BKU/{tahun}',
  },
  {
    id: 'k_kas_keluar',
    name: '{nomor}/K/{tahun}',
    example: '001/K/2026',
    description: 'Format akuntansi kas keluar pemerintah (K = Keluar)',
    template: '{nomor}/K/{tahun}',
  },
  {
    id: 'k_kas_short',
    name: '{nomor}/K (Ringkas)',
    example: '01/K',
    description: 'Format ringkas tanda bukti kas pengeluaran',
    template: '{nomor}/K',
  },
  {
    id: 'tim_middle',
    name: '{nomor}/{singkatan}/{tahun}',
    example: '001/P2SP/2026',
    description: 'Format identitas resmi tim pelaksana revitalisasi',
    template: '{nomor}/{singkatan}/{tahun}',
  },
  {
    id: 'no_prefix',
    name: 'No. {nomor}',
    example: 'No. 001',
    description: 'Penomoran sederhana dokumen bukti belanja',
    template: 'No. {nomor}',
  },
  {
    id: 'number_only',
    name: '{nomor} (Hanya Angka)',
    example: '001',
    description: 'Nomor urut langsung tanpa imbuhan huruf',
    template: '{nomor}',
  },
  {
    id: 'custom',
    name: 'Kustom (Pola Bebas)',
    example: 'Contoh: {nomor}/K/{bulan_romawi}/{tahun}',
    description: 'Sesuaikan pola sendiri menggunakan variabel dinamis',
    template: '{nomor}/K/{bulan_romawi}/{tahun}',
  },
];

const ROMAN_MONTHS = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

/**
 * Generate formatted No. Bukti based on sequence number, date, and configuration
 */
export function generateBKUNoBukti(
  seqNumber: number,
  dateStr?: string,
  config?: BKUNumberingConfig,
  schoolProfile?: Partial<SchoolProfile>,
  jenisBiaya?: string
): string {
  const cfg = config || DEFAULT_BKU_NUMBERING;
  const padding = cfg.digitPadding || 3;
  const numStr = String(seqNumber).padStart(padding, '0');

  let year = schoolProfile?.tahunAnggaran || '2025';
  let month = '01';
  let day = '01';

  if (dateStr && dateStr.length >= 10) {
    year = dateStr.substring(0, 4);
    month = dateStr.substring(5, 7);
    day = dateStr.substring(8, 10);
  } else if (dateStr && dateStr.length >= 7) {
    year = dateStr.substring(0, 4);
    month = dateStr.substring(5, 7);
  } else if (dateStr && dateStr.length >= 4) {
    year = dateStr.substring(0, 4);
  }

  const monthNum = parseInt(month, 10) || 1;
  const romanMonth = ROMAN_MONTHS[monthNum] || 'I';
  const singkatan = schoolProfile?.singkatanTim || 'P2SP';
  const shortYear = year.length >= 4 ? year.substring(2) : year;

  let kodeBiaya = 'B';
  if (jenisBiaya) {
    if (jenisBiaya.includes('Bahan')) kodeBiaya = 'BAHAN';
    else if (jenisBiaya.includes('Alat')) kodeBiaya = 'ALAT';
    else if (jenisBiaya.includes('Upah')) kodeBiaya = 'UPAH';
    else if (jenisBiaya.includes('Operasional')) kodeBiaya = 'OPR';
    else if (jenisBiaya.includes('Teknis')) kodeBiaya = 'TEKNIS';
  }

  if (cfg.pola === 'custom' && cfg.customTemplate) {
    return cfg.customTemplate
      .replace(/{nomor}/gi, numStr)
      .replace(/{tahun}/gi, year)
      .replace(/{tahun_pendek}/gi, shortYear)
      .replace(/{bulan_angka}/gi, month)
      .replace(/{bulan_romawi}/gi, romanMonth)
      .replace(/{hari}/gi, day)
      .replace(/{singkatan}/gi, singkatan)
      .replace(/{kode_biaya}/gi, kodeBiaya);
  }

  switch (cfg.pola) {
    case 'bku_middle':
      return `${numStr}/BKU/${year}`;
    case 'k_kas_keluar':
      return `${numStr}/K/${year}`;
    case 'k_kas_short':
      return `${String(seqNumber).padStart(Math.max(cfg.digitPadding || 2, 2), '0')}/K`;
    case 'tim_middle':
      return `${numStr}/${singkatan}/${year}`;
    case 'no_prefix':
      return `No. ${numStr}`;
    case 'number_only':
      return numStr;
    case 'bku_prefix':
    default:
      return `BKU-${numStr}/${year}`;
  }
}

/**
 * Extract integer number from an existing No. Bukti string
 */
export function extractNumberFromNoBukti(noBukti: string): number | null {
  if (!noBukti) return null;
  // Match any digits group that likely represents the number sequence
  // e.g. BKU-005/2026 -> 5; 003/K/2026 -> 3; 02/K -> 2; No. 012 -> 12
  const bkuMatch = noBukti.match(/BKU-(\d+)/i);
  if (bkuMatch) return parseInt(bkuMatch[1], 10);

  const kMatch = noBukti.match(/^(\d+)\/K/i);
  if (kMatch) return parseInt(kMatch[1], 10);

  const middleMatch = noBukti.match(/^(\d+)\//);
  if (middleMatch) return parseInt(middleMatch[1], 10);

  const noPrefixMatch = noBukti.match(/No\.?\s*(\d+)/i);
  if (noPrefixMatch) return parseInt(noPrefixMatch[1], 10);

  // Fallback to first numbers sequence that is not 4-digit year if there are multiple
  const allNums = Array.from(noBukti.matchAll(/\d+/g)).map(m => m[0]);
  for (const n of allNums) {
    if (n.length !== 4) {
      const parsed = parseInt(n, 10);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
  }

  if (allNums.length > 0) {
    return parseInt(allNums[0], 10);
  }

  return null;
}

/**
 * Calculates next automatic No. Bukti for new expenditure transaction
 */
export function getNextBKUBelanjaNoBukti(
  bkuList: Array<{ jenisTransaksi: string; noBukti?: string; tanggal?: string; createdAt?: number }>,
  targetDate?: string,
  config?: BKUNumberingConfig,
  schoolProfile?: Partial<SchoolProfile>
): string {
  const cfg = config || schoolProfile?.bkuNumbering || DEFAULT_BKU_NUMBERING;
  const startNum = Math.max(1, cfg.startNumber || 1);

  // Filter only expenditure transactions
  const belanjaList = (bkuList || []).filter(
    (tx) => tx.jenisTransaksi === 'pengeluaran' && tx.noBukti && tx.noBukti.trim() !== ''
  );

  if (belanjaList.length === 0) {
    return generateBKUNoBukti(startNum, targetDate, cfg, schoolProfile);
  }

  // Filter by reset cycle if monthly
  let relevantList = belanjaList;
  if (cfg.resetCycle === 'bulanan' && targetDate && targetDate.length >= 7) {
    const targetYM = targetDate.substring(0, 7);
    relevantList = belanjaList.filter((tx) => (tx.tanggal || '').startsWith(targetYM));
  } else if (cfg.resetCycle === 'tahunan' && targetDate && targetDate.length >= 4) {
    const targetY = targetDate.substring(0, 4);
    const inYear = belanjaList.filter((tx) => (tx.tanggal || '').startsWith(targetY));
    if (inYear.length > 0) {
      relevantList = inYear;
    }
  }

  let maxNum = 0;
  relevantList.forEach((tx) => {
    const num = extractNumberFromNoBukti(tx.noBukti || '');
    if (num !== null && num > maxNum) {
      maxNum = num;
    }
  });

  const nextSeq = Math.max(startNum, maxNum + 1);
  return generateBKUNoBukti(nextSeq, targetDate, cfg, schoolProfile);
}

/**
 * Re-number all existing BKU expenditure transactions sequentially based on date and time
 */
export function renumberAllBKUTransactions(
  bkuList: BKUTransaction[],
  config: BKUNumberingConfig,
  schoolProfile: SchoolProfile
): BKUTransaction[] {
  // Separate expenditures and non-expenditures
  const expenditures = bkuList.filter((tx) => tx.jenisTransaksi === 'pengeluaran');
  const nonExpenditures = bkuList.filter((tx) => tx.jenisTransaksi !== 'pengeluaran');

  // Sort expenditures chronologically
  const sortedExpenditures = [...expenditures].sort((a, b) => {
    const dComp = a.tanggal.localeCompare(b.tanggal);
    if (dComp !== 0) return dComp;
    return a.createdAt - b.createdAt;
  });

  const startNum = Math.max(1, config.startNumber || 1);
  const updatedExpMap = new Map<string, string>();

  if (config.resetCycle === 'bulanan') {
    // Group by YYYY-MM
    const monthGroups = new Map<string, BKUTransaction[]>();
    sortedExpenditures.forEach((tx) => {
      const ym = tx.tanggal.substring(0, 7);
      if (!monthGroups.has(ym)) {
        monthGroups.set(ym, []);
      }
      monthGroups.get(ym)!.push(tx);
    });

    monthGroups.forEach((items) => {
      let cur = startNum;
      items.forEach((tx) => {
        const newNoBukti = generateBKUNoBukti(cur, tx.tanggal, config, schoolProfile, tx.jenisBiaya);
        updatedExpMap.set(tx.id, newNoBukti);
        cur++;
      });
    });
  } else {
    // Sequential throughout
    let cur = startNum;
    sortedExpenditures.forEach((tx) => {
      const newNoBukti = generateBKUNoBukti(cur, tx.tanggal, config, schoolProfile, tx.jenisBiaya);
      updatedExpMap.set(tx.id, newNoBukti);
      cur++;
    });
  }

  // Return new array with updated noBukti
  return bkuList.map((tx) => {
    if (tx.jenisTransaksi === 'pengeluaran' && updatedExpMap.has(tx.id)) {
      return {
        ...tx,
        noBukti: updatedExpMap.get(tx.id)!,
      };
    }
    return tx;
  });
}
