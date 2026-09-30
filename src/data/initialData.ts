import { BKUTransaction, BukuBankTransaction, SchoolProfile } from '../types';
import { calculateTaxDetail } from '../utils/format';

export const initialSchoolProfile: SchoolProfile = {
  namaSekolah: 'SDN 1 GAPUK',
  npsn: '50202914',
  namaProgram: 'Dana Revitalisasi Pembangunan Sekolah',
  tahunAnggaran: '2025',
  nomorSK: 'SK.045.2/DISDIK/P2SP-GAPUK/2025',
  namaKepalaSekolah: 'H. MASRUN, S.Pd.',
  nipKepalaSekolah: '19681231 198803 1 141',
  namaKetuaTim: 'SAMSUDIN',
  nipKetuaTim: '',
  singkatanTim: 'P2SP',
  namaBendahara: 'HERIYADI, S.Pd.',
  nipBendahara: '19661231 198902 1 026',
  desa: 'GAPUK',
  kecamatan: 'SURALAGA',
  kabupatenKota: 'LOMBOK TIMUR',
  provinsi: 'NTB',
  alamatSekolah: 'Desa Gapuk, Kec. Suralaga',
  namaBank: 'BRI Selong',
  noRekening: '0157010003606307',
  namaRekening: 'P2SP SDN 1 GAPUK',
};

const createBKUItem = (
  id: string,
  tanggal: string,
  jenisTransaksi: 'penerimaan' | 'pengeluaran',
  uraian: string,
  noBukti: string,
  jumlah: number,
  metode: 'tunai' | 'bank',
  jenisBiaya?: any,
  penerimaNama?: string,
  penerimaAlamat?: string,
  taxOpts?: {
    hasPPN: boolean;
    hasPPh22: boolean;
    hasPPh23: boolean;
    hasPPh4Ayat2: boolean;
    hasPPh21: boolean;
    statusSetor?: 'Belum Disetor' | 'Sudah Disetor';
    ntpn?: string;
  }
): BKUTransaction => {
  const pajak = jenisTransaksi === 'pengeluaran' && taxOpts
    ? calculateTaxDetail({
        jumlah,
        hasPPN: taxOpts.hasPPN,
        hasPPh22: taxOpts.hasPPh22,
        hasPPh23: taxOpts.hasPPh23,
        hasPPh4Ayat2: taxOpts.hasPPh4Ayat2,
        hasPPh21: taxOpts.hasPPh21,
      })
    : calculateTaxDetail({
        jumlah: 0,
        hasPPN: false,
        hasPPh22: false,
        hasPPh23: false,
        hasPPh4Ayat2: false,
        hasPPh21: false,
      });

  if (taxOpts?.statusSetor) {
    pajak.statusSetor = taxOpts.statusSetor;
    pajak.ntpn = taxOpts.ntpn;
  }

  return {
    id,
    tanggal,
    jenisTransaksi,
    uraian,
    noBukti,
    jenisBiaya,
    jumlah,
    metode,
    penerimaNama,
    penerimaAlamat,
    pajak,
    createdAt: Date.now() - Math.floor(Math.random() * 10000000),
  };
};

export const initialBKUData: BKUTransaction[] = [
  // --- BULAN JULI 2025 (Persiapan & Penutupan Kas Bulan Juli) ---
  createBKUItem(
    'bku-juli-1',
    '2025-07-15',
    'penerimaan',
    'Terima Penarikan Kas Tunai Persiapan Operasional Revitalisasi',
    '1/M',
    4000000,
    'tunai'
  ),
  createBKUItem(
    'bku-juli-2',
    '2025-07-20',
    'pengeluaran',
    'Belanja Kertas HVS F4 & A4, Tinta Printer & ATK Panitia P2SP',
    '1/K',
    850000,
    'tunai',
    'Pengeluaran Operasional',
    'Toko Percetakan Gapuk Grafika',
    'Pasar Baru Gapuk, Suralaga'
  ),
  createBKUItem(
    'bku-juli-3',
    '2025-07-25',
    'pengeluaran',
    'Penggandaan Dokumen Rencana Kerja & RAB Revitalisasi 6 Rangkap',
    '2/K',
    508000,
    'tunai',
    'Pengeluaran Operasional',
    'Fotokopi Mandiri Gapuk',
    'Jl. Jurusan Selong - Gapuk'
  ),
  createBKUItem(
    'bku-juli-4',
    '2025-07-28',
    'pengeluaran',
    'Pembuatan & Pemasangan Spanduk Papan Nama Proyek Revitalisasi Sekolah',
    '3/K',
    400000,
    'tunai',
    'Pengeluaran Operasional',
    'Percetakan Gapuk Grafika',
    'Jl. Raya Gapuk'
  ),
  createBKUItem(
    'bku-juli-5',
    '2025-07-31',
    'pengeluaran',
    'Penjilidan Dokumen Laporan Awal (4 bh Jilid A4 @ Rp. 12.500)',
    '4/K',
    50000,
    'tunai',
    'Pengeluaran Operasional',
    'Fotokopi Mandiri Gapuk',
    'Jl. Jurusan Selong - Gapuk'
  ),

  // --- BULAN AGUSTUS 2025 (Pencairan & Pekerjaan Fisik Tahap 1) ---
  createBKUItem(
    'bku-1',
    '2025-08-28',
    'penerimaan',
    'Terima Penarikan Dana Revitalisasi Tahap 1 Melalui Rekening BRI Selong No. Rek 0157010003606307',
    '5/M',
    160000000,
    'tunai'
  ),
  createBKUItem(
    'bku-2',
    '2025-08-28',
    'pengeluaran',
    'Pembelian Semen Padang 150 Sak, Pasir Pasang & Batu Belah Fondasi',
    '1/K',
    22200000,
    'tunai',
    'Pengeluaran Bahan',
    'TB. Harapan Baru Gapuk',
    'Jl. Raya Gapuk No. 15, Suralaga',
    {
      hasPPN: true,
      hasPPh22: true,
      hasPPh23: false,
      hasPPh4Ayat2: false,
      hasPPh21: false,
      statusSetor: 'Sudah Disetor',
      ntpn: '98C4E7812A45F01',
    }
  ),
  createBKUItem(
    'bku-3',
    '2025-08-29',
    'pengeluaran',
    'Pembelian Besi Beton Ulir 12mm & Kawat Bendrat Rangka Balok',
    '2/K',
    14430000,
    'tunai',
    'Pengeluaran Bahan',
    'UD. Logam Perkasa Gapuk',
    'Jl. Selong - Gapuk Km 4',
    {
      hasPPN: true,
      hasPPh22: true,
      hasPPh23: false,
      hasPPh4Ayat2: false,
      hasPPh21: false,
      statusSetor: 'Sudah Disetor',
      ntpn: 'A1B2C3D4E5F6789',
    }
  ),
  createBKUItem(
    'bku-4',
    '2025-08-29',
    'pengeluaran',
    'Sewa Mesin Molen Cor Beton & Pemadat Tanah Stamper 7 Hari',
    '3/K',
    4000000,
    'tunai',
    'Pengeluaran Alat',
    'CV. Karya Mandiri Teknik Selong',
    'Jl. Ahmad Yani Selong',
    {
      hasPPN: false,
      hasPPh22: false,
      hasPPh23: true,
      hasPPh4Ayat2: false,
      hasPPh21: false,
      statusSetor: 'Sudah Disetor',
      ntpn: 'D4577889AAB1234',
    }
  ),
  createBKUItem(
    'bku-5',
    '2025-08-30',
    'pengeluaran',
    'Pembayaran Upah Mandor & Pekerja Tukang Revitalisasi Tahap I (10 Orang)',
    '4/K',
    12500000,
    'tunai',
    'Pengeluaran Upah',
    'Ahmad Zaini (Mandor Tukang)',
    'Dusun Gapuk Lauk RT 02',
    {
      hasPPN: false,
      hasPPh22: false,
      hasPPh23: false,
      hasPPh4Ayat2: false,
      hasPPh21: true,
      statusSetor: 'Sudah Disetor',
      ntpn: 'E8912378BB90C11',
    }
  ),
  createBKUItem(
    'bku-6',
    '2025-08-30',
    'pengeluaran',
    'Belanja Pengadaan ATK, Pembuatan Spanduk / Papan Proyek & Buku Catatan BKU',
    '5/K',
    850000,
    'tunai',
    'Pengeluaran Operasional',
    'Toko Percetakan Gapuk Grafika',
    'Pasar Baru Gapuk, Suralaga',
    {
      hasPPN: false,
      hasPPh22: false,
      hasPPh23: false,
      hasPPh4Ayat2: false,
      hasPPh21: false,
    }
  ),
  createBKUItem(
    'bku-7',
    '2025-08-31',
    'pengeluaran',
    'Honorarium Pengawasan Lapangan Tim Teknis P2SP Revitalisasi Tahap I',
    '6/K',
    3000000,
    'tunai',
    'Biaya Tim Teknis',
    'Ir. Baiq Rohani, S.T. (Tim Teknis)',
    'Jl. Hos Cokroaminoto Selong',
    {
      hasPPN: false,
      hasPPh22: false,
      hasPPh23: false,
      hasPPh4Ayat2: false,
      hasPPh21: true,
      statusSetor: 'Belum Disetor',
    }
  ),
];

export const initialBukuBankData: BukuBankTransaction[] = [
  {
    id: 'bb-1',
    tanggal: '2025-08-14',
    uraian: 'Terima Transfer Dana Revitalisasi Melalui BRI Selong No. Rekening 0157010003606307 Tahap Ke -1 70%',
    noBukti: '1/M',
    penerimaan: 1113195735,
    pengeluaran: 0,
    sisa: 1113195735,
    createdAt: Date.now() - 5000000,
  },
  {
    id: 'bb-2',
    tanggal: '2025-08-28',
    uraian: 'Penarikan ke-1 dana tahap 1',
    noBukti: '1/K',
    penerimaan: 0,
    pengeluaran: 160000000,
    sisa: 953195735,
    linkedBKUId: 'bku-1',
    createdAt: Date.now() - 4000000,
  },
];
