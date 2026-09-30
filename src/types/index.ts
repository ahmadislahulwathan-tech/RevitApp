export type JenisBiaya = 
  | 'Pengeluaran Alat'
  | 'Pengeluaran Bahan'
  | 'Pengeluaran Upah'
  | 'Pengeluaran Operasional'
  | 'Biaya Tim Teknis';

export interface TaxDetail {
  hasPPN: boolean;
  hasPPh22: boolean;
  hasPPh23: boolean;
  hasPPh4Ayat2: boolean;
  hasPPh21: boolean;
  dpp: number;
  ppn: number;
  pph22: number;
  pph23: number;
  pph4_2: number;
  pph21: number;
  totalPajak: number;
  jumlahNetto: number;
  statusSetor: 'Belum Disetor' | 'Sudah Disetor';
  ntpn?: string;
  tanggalSetor?: string;
}

export interface BKUTransaction {
  id: string;
  tanggal: string; // YYYY-MM-DD
  jenisTransaksi: 'penerimaan' | 'pengeluaran';
  uraian: string;
  noBukti: string;
  jenisBiaya?: JenisBiaya; // for pengeluaran
  jumlah: number; // Gross amount (E)
  metode: 'tunai' | 'bank'; // For BKT derivation
  penerimaNama?: string; // e.g. Toko Bangunan Berkah, Mandor Samsul
  penerimaAlamat?: string;
  pajak: TaxDetail;
  createdAt: number;
}

export interface BukuBankTransaction {
  id: string;
  tanggal: string; // YYYY-MM-DD
  uraian: string;
  noBukti: string;
  penerimaan: number;
  pengeluaran: number;
  sisa?: number;
  linkedBKUId?: string;
  createdAt: number;
}

export type BKUNumberingPattern = 
  | 'bku_prefix'      // BKU-001/2026
  | 'bku_middle'      // 001/BKU/2026
  | 'k_kas_keluar'    // 001/K/2026
  | 'k_kas_short'     // 01/K
  | 'tim_middle'      // 001/P2SP/2026
  | 'number_only'     // 001
  | 'no_prefix'       // No. 001
  | 'custom';         // Custom template

export interface BKUNumberingConfig {
  pola: BKUNumberingPattern;
  customTemplate?: string;       // e.g. "{nomor}/BKU/{tahun}" or "{nomor}/K/{bulan_angka}/{tahun}"
  digitPadding: number;          // 1, 2, 3, 4
  startNumber: number;           // default 1
  resetCycle: 'tahunan' | 'bulanan' | 'tidak_reset'; // default 'tahunan'
}

export interface SchoolProfile {
  namaSekolah: string;
  npsn: string;
  namaProgram: string;
  tahunAnggaran: string;
  nomorSK: string;
  namaKepalaSekolah: string;
  nipKepalaSekolah: string;
  namaKetuaTim: string;
  nipKetuaTim: string;
  singkatanTim?: string; // e.g. P2SP, Tim Revitalisasi
  namaBendahara: string;
  nipBendahara: string;
  namaPpk?: string;
  nipPpk?: string;
  desa?: string;
  kecamatan?: string;
  kabupatenKota: string;
  provinsi: string;
  alamatSekolah: string;
  namaBank: string;
  noRekening: string;
  namaRekening: string;
  bkuNumbering?: BKUNumberingConfig;
}

export type ActiveTab = 'dashboard' | 'bku' | 'buku_bank' | 'bkt' | 'buku_pajak' | 'kwitansi' | 'pengaturan';
