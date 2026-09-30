/**
 * Indonesian Number to Words (Terbilang) Utility
 * Converts numbers into Indonesian spelling for official financial receipts/kwitansi.
 */

const satuan = [
  '',
  'Satu',
  'Dua',
  'Tiga',
  'Empat',
  'Lima',
  'Enam',
  'Tujuh',
  'Delapan',
  'Sembilan',
  'Sepuluh',
  'Sebelas',
];

export function terbilang(n: number): string {
  const num = Math.floor(Math.abs(n));

  if (num === 0) {
    return 'Nol';
  }

  if (num < 12) {
    return satuan[num];
  } else if (num < 20) {
    return `${terbilang(num - 10)} Belas`;
  } else if (num < 100) {
    const sisa = num % 10;
    return `${terbilang(Math.floor(num / 10))} Puluh${sisa > 0 ? ` ${terbilang(sisa)}` : ''}`;
  } else if (num < 200) {
    const sisa = num - 100;
    return `Seratus${sisa > 0 ? ` ${terbilang(sisa)}` : ''}`;
  } else if (num < 1000) {
    const sisa = num % 100;
    return `${terbilang(Math.floor(num / 100))} Ratus${sisa > 0 ? ` ${terbilang(sisa)}` : ''}`;
  } else if (num < 2000) {
    const sisa = num - 1000;
    return `Seribu${sisa > 0 ? ` ${terbilang(sisa)}` : ''}`;
  } else if (num < 1000000) {
    const sisa = num % 1000;
    return `${terbilang(Math.floor(num / 1000))} Ribu${sisa > 0 ? ` ${terbilang(sisa)}` : ''}`;
  } else if (num < 1000000000) {
    const sisa = num % 1000000;
    return `${terbilang(Math.floor(num / 1000000))} Juta${sisa > 0 ? ` ${terbilang(sisa)}` : ''}`;
  } else if (num < 1000000000000) {
    const sisa = num % 1000000000;
    return `${terbilang(Math.floor(num / 1000000000))} Miliar${sisa > 0 ? ` ${terbilang(sisa)}` : ''}`;
  } else {
    const sisa = num % 1000000000000;
    return `${terbilang(Math.floor(num / 1000000000000))} Triliun${sisa > 0 ? ` ${terbilang(sisa)}` : ''}`;
  }
}

export function terbilangRupiah(n: number): string {
  const result = terbilang(n).trim();
  return `${result} Rupiah`;
}

export function terbilangTanggalIndo(dateStr: string): {
  hari: string;
  tanggalTerbilang: string;
  bulan: string;
  tahunTerbilang: string;
} {
  const hariArr = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const bulanArr = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  ];

  let date: Date;
  if (!dateStr) {
    date = new Date(2025, 6, 31); // Default 31 Juli 2025
  } else if (dateStr.includes('-')) {
    const parts = dateStr.split('-').map(Number);
    if (parts.length === 3) {
      date = new Date(parts[0], parts[1] - 1, parts[2]);
    } else {
      date = new Date(dateStr);
    }
  } else if (dateStr.includes('/')) {
    const parts = dateStr.split('/').map(Number);
    if (parts.length === 3) {
      // Format d/m/yyyy or yyyy/m/d
      if (parts[0] > 1000) {
        date = new Date(parts[0], parts[1] - 1, parts[2]);
      } else {
        date = new Date(parts[2], parts[1] - 1, parts[0]);
      }
    } else {
      date = new Date(dateStr);
    }
  } else {
    // Maybe format like "31 Juli 2025"
    const parts = dateStr.trim().split(/\s+/);
    if (parts.length === 3) {
      const d = parseInt(parts[0], 10);
      const mIdx = bulanArr.findIndex(b => b.toLowerCase() === parts[1].toLowerCase());
      const y = parseInt(parts[2], 10);
      if (!isNaN(d) && mIdx !== -1 && !isNaN(y)) {
        date = new Date(y, mIdx, d);
      } else {
        date = new Date(dateStr);
      }
    } else {
      date = new Date(dateStr);
    }
  }

  const isValid = !isNaN(date.getTime());
  const hari = isValid ? hariArr[date.getDay()] : 'Kamis';
  const tgl = isValid ? date.getDate() : 31;
  const bln = isValid ? bulanArr[date.getMonth()] : 'Juli';
  const thn = isValid ? date.getFullYear() : 2025;

  return {
    hari,
    tanggalTerbilang: terbilang(tgl),
    bulan: bln,
    tahunTerbilang: terbilang(thn),
  };
}

export function kalimatPenutupanKas(dateStr: string): string {
  const { hari, tanggalTerbilang, bulan, tahunTerbilang } = terbilangTanggalIndo(dateStr);
  return `Pada hari ini ${hari} tanggal ${tanggalTerbilang} Bulan ${bulan} Tahun ${tahunTerbilang}, Buku Kas Umum ditutup dengan keadaan/posisi sebagai berikut:`;
}

