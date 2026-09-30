import React, { useState, useMemo, useEffect } from 'react';
import { BKUTransaction, BukuBankTransaction, SchoolProfile } from '../types';
import { 
  formatAngkaSen, 
  formatTanggalDinas, 
  formatBulanTahunKapital,
  formatTanggalIndo,
  formatTanggalSlash,
  extractTaxItems 
} from '../utils/format';
import { kalimatPenutupanKas } from '../utils/terbilang';
import { downloadPrintableDocument, executePrint } from '../utils/printHelper';
import { exportBKUToExcel } from '../utils/excelExport';
import { 
  Printer, 
  Download, 
  Settings2, 
  Calendar, 
  CheckCircle2, 
  FileSpreadsheet,
  FileText,
  Layers,
  ZoomIn
} from 'lucide-react';

interface OfficialBKUSheetProps {
  bkuData: BKUTransaction[];
  schoolProfile: SchoolProfile;
  bukuBankData?: BukuBankTransaction[];
  onBackToInput?: () => void;
  initialMonth?: string;
}

export const OfficialBKUSheet: React.FC<OfficialBKUSheetProps> = ({
  bkuData,
  schoolProfile,
  bukuBankData = [],
  onBackToInput,
  initialMonth,
}) => {
  // Extract distinct available months from transactions
  const availableMonths = useMemo(() => {
    const monthMap = new Map<string, string>();
    bkuData.forEach((tx) => {
      if (tx.tanggal) {
        const ym = tx.tanggal.substring(0, 7);
        const label = formatBulanTahunKapital(tx.tanggal);
        if (!monthMap.has(ym)) {
          monthMap.set(ym, label);
        }
      }
    });
    return Array.from(monthMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [bkuData]);

  // Selected Month (can be a YYYY-MM string, or 'all')
  const defaultMonth = initialMonth || (availableMonths.length > 0 ? availableMonths[0][0] : '2025-07');
  const [selectedMonth, setSelectedMonth] = useState<string>(defaultMonth);

  useEffect(() => {
    if (initialMonth) {
      setSelectedMonth(initialMonth);
      updateClosingDateForMonth(initialMonth);
    }
  }, [initialMonth]);

  const updateClosingDateForMonth = (m: string) => {
    if (m === 'all') {
      if (bkuData.length > 0) {
        const sorted = [...bkuData].sort((a, b) => a.tanggal.localeCompare(b.tanggal));
        setClosingDateIso(sorted[sorted.length - 1].tanggal);
      } else {
        setClosingDateIso(`${schoolProfile.tahunAnggaran || '2025'}-12-31`);
      }
    } else {
      const txInMonth = bkuData.filter((tx) => tx.tanggal.startsWith(m));
      if (txInMonth.length > 0) {
        const sorted = [...txInMonth].sort((a, b) => a.tanggal.localeCompare(b.tanggal));
        setClosingDateIso(sorted[sorted.length - 1].tanggal);
      } else {
        const [y, mon] = m.split('-').map(Number);
        if (!isNaN(y) && !isNaN(mon)) {
          const lastDay = new Date(y, mon, 0).getDate();
          setClosingDateIso(`${y}-${String(mon).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`);
        }
      }
    }
    setManualCash('');
    setManualBank('');
  };

  const defaultClosingDateIso = useMemo(() => {
    if (selectedMonth === 'all') {
      if (bkuData.length > 0) {
        const sorted = [...bkuData].sort((a, b) => a.tanggal.localeCompare(b.tanggal));
        return sorted[sorted.length - 1].tanggal;
      }
      return `${schoolProfile.tahunAnggaran || '2025'}-12-31`;
    }
    const txInMonth = bkuData.filter((tx) => tx.tanggal.startsWith(selectedMonth));
    if (txInMonth.length > 0) {
      const sorted = [...txInMonth].sort((a, b) => a.tanggal.localeCompare(b.tanggal));
      return sorted[sorted.length - 1].tanggal;
    }
    const [y, m] = selectedMonth.split('-').map(Number);
    if (!isNaN(y) && !isNaN(m)) {
      const lastDay = new Date(y, m, 0).getDate();
      return `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    }
    return '2025-07-31';
  }, [selectedMonth, bkuData, schoolProfile.tahunAnggaran]);

  const [closingDateIso, setClosingDateIso] = useState<string>(defaultClosingDateIso);
  const [customBulanTahun, setCustomBulanTahun] = useState<string>('');
  const [showConfig, setShowConfig] = useState(false);
  const [printNotice, setPrintNotice] = useState<string | null>(null);

  // Filter transactions for the selected month or all
  const isAllMonths = selectedMonth === 'all';

  const monthTransactions = useMemo(() => {
    const list = isAllMonths
      ? [...bkuData]
      : bkuData.filter((tx) => tx.tanggal.startsWith(selectedMonth));
    return list.sort((a, b) => {
      const dateComp = a.tanggal.localeCompare(b.tanggal);
      if (dateComp !== 0) return dateComp;
      return (a.createdAt || 0) - (b.createdAt || 0);
    });
  }, [bkuData, selectedMonth, isAllMonths]);

  // Balance from months before the selected month
  const saldoAwalBulan = useMemo(() => {
    if (isAllMonths) return 0;
    const priorTransactions = bkuData.filter((tx) => tx.tanggal < `${selectedMonth}-01`);
    return priorTransactions.reduce(
      (acc, c) => acc + (c.jenisTransaksi === 'penerimaan' ? c.jumlah : -c.jumlah),
      0
    );
  }, [bkuData, selectedMonth, isAllMonths]);

  // Running balance across rows (termasuk baris resmi Pungut & Setor Pajak tepat di bawah transaksi)
  let running = saldoAwalBulan;
  const rows: Array<{
    id: string;
    isTaxRow: boolean;
    isSaldoAwal?: boolean;
    taxRole?: 'terima' | 'setor';
    tanggal: string;
    uraian: string;
    noBukti: string;
    penerimaan: number;
    pengeluaran: number;
    sisaFinal: number;
  }> = [];

  monthTransactions.forEach((tx) => {
    const inAmt = tx.jenisTransaksi === 'penerimaan' ? tx.jumlah : 0;
    const outAmt = tx.jenisTransaksi === 'pengeluaran' ? tx.jumlah : 0;
    running += inAmt - outAmt;

    rows.push({
      id: tx.id,
      isTaxRow: false,
      tanggal: tx.tanggal,
      uraian: tx.uraian,
      noBukti: tx.noBukti,
      penerimaan: inAmt,
      pengeluaran: outAmt,
      sisaFinal: running,
    });

    if (tx.jenisTransaksi === 'pengeluaran' && tx.pajak && tx.pajak.totalPajak > 0) {
      const taxItems = extractTaxItems(tx.pajak);

      // 1. Terima dulu semua pajak
      taxItems.forEach((tax) => {
        running += tax.amount;
        rows.push({
          id: `${tx.id}-tax-terima-${tax.key}`,
          isTaxRow: true,
          taxRole: 'terima',
          tanggal: tx.tanggal,
          uraian: `Terima ${tax.label} ${tx.uraian}`,
          noBukti: '',
          penerimaan: tax.amount,
          pengeluaran: 0,
          sisaFinal: running,
        });
      });

      // 2. Baru setor semua pajak
      taxItems.forEach((tax) => {
        running -= tax.amount;
        rows.push({
          id: `${tx.id}-tax-setor-${tax.key}`,
          isTaxRow: true,
          taxRole: 'setor',
          tanggal: tx.tanggal,
          uraian: `Setor ${tax.label} ${tx.uraian}`,
          noBukti: tx.pajak?.ntpn ? `NTPN: ${tx.pajak.ntpn}` : '',
          penerimaan: 0,
          pengeluaran: tax.amount,
          sisaFinal: running,
        });
      });
    }
  });

  const totalPenerimaan = saldoAwalBulan + rows.reduce((acc, c) => acc + c.penerimaan, 0);
  const totalPengeluaran = rows.reduce((acc, c) => acc + c.pengeluaran, 0);
  const sisaBukuKasUmum = totalPenerimaan - totalPengeluaran;

  // Bank balance at selected month closing (sisa dana di rekening bank yang belum ditarik ke kas tunai)
  const bankBalanceForSheet = useMemo(() => {
    if (!bukuBankData || bukuBankData.length === 0) return 0;
    if (isAllMonths) {
      return bukuBankData.reduce((acc, row) => acc + (row.penerimaan - row.pengeluaran), 0);
    }
    const endOfMonth = `${selectedMonth}-31`;
    const cutoffDate = closingDateIso > endOfMonth ? closingDateIso : endOfMonth;
    const txsUpToMonth = bukuBankData.filter((row) => row.tanggal <= cutoffDate);
    return txsUpToMonth.reduce((acc, row) => acc + (row.penerimaan - row.pengeluaran), 0);
  }, [bukuBankData, isAllMonths, selectedMonth, closingDateIso]);

  // Physical cash & bank breakdown:
  // - Saldo Kas Tunai: saldo kas yang ada di BKU (ditarik dari rekening bank dikurangi pengeluaran belanja tunai)
  // - Saldo Bank: sisa dana di rekening bank setelah diambil/ditarik ke kas tunai
  // - Sisa Buku Kas Umum: semua dana yang ada (Saldo Kas Tunai + Saldo Bank)
  const [manualCash, setManualCash] = useState<string>('');
  const [manualBank, setManualBank] = useState<string>('');

  const displayKasTunai = manualCash !== '' ? Number(manualCash) : sisaBukuKasUmum;
  const displayBank = manualBank !== '' ? Number(manualBank) : bankBalanceForSheet;
  const totalSemuaDana = displayKasTunai + displayBank;
  const totalKasFisik = displayKasTunai + displayBank;
  const selisih = totalSemuaDana - totalKasFisik; // Selalu NIHIL secara default

  const currentMonthLabel = useMemo(() => {
    if (customBulanTahun.trim() !== '') return customBulanTahun.toUpperCase();
    if (selectedMonth === 'all') return `TAHUN ANGGARAN ${schoolProfile.tahunAnggaran || '2025'}`;
    const found = availableMonths.find((m) => m[0] === selectedMonth);
    if (found) return found[1];
    return formatBulanTahunKapital(closingDateIso) || 'JULI 2025';
  }, [customBulanTahun, selectedMonth, availableMonths, closingDateIso, schoolProfile.tahunAnggaran]);

  const handleMonthChange = (newMonth: string) => {
    setSelectedMonth(newMonth);
    updateClosingDateForMonth(newMonth);
  };

  const singkatan = schoolProfile.singkatanTim || 'P2SP';
  const desa = schoolProfile.desa || 'GAPUK';
  const kecamatan = schoolProfile.kecamatan || 'SURALAGA';
  const kabupaten = schoolProfile.kabupatenKota || 'LOMBOK TIMUR';
  const provinsi = schoolProfile.provinsi || 'NTB';

  const handleDownload = () => {
    downloadPrintableDocument(
      'bku-printable-area',
      `BKU_${currentMonthLabel.replace(/\s+/g, '_')}_${schoolProfile.namaSekolah.replace(/\s+/g, '_')}`,
      `Buku Kas Umum (BKU) - Bulan ${currentMonthLabel}`,
      'landscape'
    );
    setPrintNotice('File dokumen BKU siap cetak (A4 Landscape) berhasil diunduh.');
    setTimeout(() => setPrintNotice(null), 6000);
  };

  const handlePrint = () => {
    const filename = `BKU_${currentMonthLabel.replace(/\s+/g, '_')}_${schoolProfile.namaSekolah.replace(/\s+/g, '_')}`;
    executePrint('bku-printable-area', filename, `Buku Kas Umum (BKU) - Bulan ${currentMonthLabel}`, 'landscape');
  };

  const [isExportingExcel, setIsExportingExcel] = useState(false);

  const handleExportExcel = async () => {
    try {
      setIsExportingExcel(true);
      await exportBKUToExcel({
        rows,
        saldoAwalBulan,
        selectedMonth,
        isAllMonths,
        currentMonthLabel,
        closingDateIso,
        schoolProfile,
        totalPengeluaran,
        totalSemuaDana,
        displayKasTunai,
        displayBank,
        selisih,
        desa,
        kecamatan,
        kabupaten,
        provinsi,
        singkatan,
      });
      setPrintNotice('File Excel BKU (.xlsx) berhasil diunduh dengan isi dan layout persis seperti pratinjau.');
      setTimeout(() => setPrintNotice(null), 6000);
    } catch (err) {
      console.error('Gagal mengekspor file Excel:', err);
      setPrintNotice('Terjadi kesalahan saat mengekspor file Excel. Silakan coba kembali.');
      setTimeout(() => setPrintNotice(null), 6000);
    } finally {
      setIsExportingExcel(false);
    }
  };

  // Opsi baris per halaman & skala pratinjau A4 Landscape
  const [rowsPerPageOption, setRowsPerPageOption] = useState<'auto' | '14' | '16' | '18' | '20'>('auto');
  const [zoomLevel, setZoomLevel] = useState<'fit' | '100' | '85' | '75'>('fit');

  // Gabungkan baris Saldo Awal Bulan (jika ada) dan seluruh baris transaksi BKU
  const allTableRows = useMemo(() => {
    const list: Array<{
      id: string;
      isTaxRow: boolean;
      isSaldoAwal?: boolean;
      taxRole?: 'terima' | 'setor';
      tanggal: string;
      uraian: string;
      noBukti: string;
      penerimaan: number;
      pengeluaran: number;
      sisaFinal: number;
    }> = [];

    if (saldoAwalBulan > 0 && !isAllMonths) {
      list.push({
        id: 'row-saldo-awal-bulan',
        isTaxRow: false,
        isSaldoAwal: true,
        tanggal: `${selectedMonth}-01`,
        uraian: 'Saldo Kas Bulan Lalu (Bulan Sebelumnya)',
        noBukti: '-',
        penerimaan: saldoAwalBulan,
        pengeluaran: 0,
        sisaFinal: saldoAwalBulan,
      });
    }

    return [...list, ...rows];
  }, [saldoAwalBulan, isAllMonths, selectedMonth, rows]);

  // Pembagian halaman resmi siap cetak A4 Landscape (297 x 210 mm)
  // Dioptimalkan agar halaman sebelum halaman terakhir padat dan hanya menyisakan 15px dari footer
  const pages = useMemo(() => {
    if (allTableRows.length === 0) {
      return [
        {
          pageNumber: 1,
          totalPages: 1,
          isFirstPage: true,
          isLastPage: true,
          rows: [],
          startingMainIndex: 1,
          pindahanFromPrevious: undefined,
          cumulativePenerimaan: 0,
          cumulativePengeluaran: 0,
          lastSisa: saldoAwalBulan,
        },
      ];
    }

    const chunks: Array<typeof allTableRows> = [];

    if (rowsPerPageOption !== 'auto') {
      const limit = parseInt(rowsPerPageOption, 10);
      for (let i = 0; i < allTableRows.length; i += limit) {
        chunks.push(allTableRows.slice(i, i + limit));
      }
    } else {
      // Pembagian optimal otomatis:
      // A4 Landscape: jika <= 7 baris, muat 1 halaman penuh bersama penutupan kas & 3 tanda tangan
      if (allTableRows.length <= 7) {
        chunks.push(allTableRows);
      } else {
        let currentIndex = 0;
        let pageNum = 1;

        while (currentIndex < allTableRows.length) {
          const remaining = allTableRows.length - currentIndex;

          if (pageNum === 1) {
            // Halaman 1: kapasitas optimal 17-18 baris jika bukan halaman terakhir
            if (remaining <= 7) {
              chunks.push(allTableRows.slice(currentIndex));
              currentIndex = allTableRows.length;
            } else if (remaining <= 24) {
              // Jika total tersisa 8 s.d 24 baris (2 halaman):
              // Isi halaman 1 sepadat mungkin (hingga 17 baris), sisakan 4-7 baris untuk halaman tanda tangan
              const forLast = Math.min(7, Math.max(3, remaining - 17));
              const take = remaining - forLast;
              chunks.push(allTableRows.slice(currentIndex, currentIndex + take));
              currentIndex += take;
            } else {
              // Jika masih banyak data (3+ halaman): isi halaman 1 hingga 18 baris penuh
              const take = Math.min(18, remaining - 4);
              chunks.push(allTableRows.slice(currentIndex, currentIndex + take));
              currentIndex += take;
            }
          } else {
            // Halaman 2 dan seterusnya
            if (remaining <= 7) {
              // Sisa baris muat nyaman di halaman terakhir bersama tanda tangan
              chunks.push(allTableRows.slice(currentIndex));
              currentIndex = allTableRows.length;
            } else if (remaining <= 28) {
              // Menjelang halaman terakhir: isi halaman ini sepadat mungkin (hingga 21 baris), sisakan 4-7 untuk penutup
              const forLast = Math.min(7, Math.max(3, remaining - 21));
              const take = remaining - forLast;
              chunks.push(allTableRows.slice(currentIndex, currentIndex + take));
              currentIndex += take;
            } else {
              // Halaman lanjutan reguler: muat hingga 21 baris padat
              const take = Math.min(21, remaining - 4);
              chunks.push(allTableRows.slice(currentIndex, currentIndex + take));
              currentIndex += take;
            }
          }
          pageNum++;
        }
      }
    }

    const totalPages = Math.max(1, chunks.length);
    let runningPenerimaan = 0;
    let runningPengeluaran = 0;
    let runningSisa = saldoAwalBulan;
    let currentMainIndex = 1;

    const result: Array<{
      pageNumber: number;
      totalPages: number;
      isFirstPage: boolean;
      isLastPage: boolean;
      rows: typeof allTableRows;
      startingMainIndex: number;
      pindahanFromPrevious?: {
        penerimaan: number;
        pengeluaran: number;
        sisa: number;
      };
      cumulativePenerimaan: number;
      cumulativePengeluaran: number;
      lastSisa: number;
    }> = [];

    chunks.forEach((chunkRows, idx) => {
      const pageNum = idx + 1;
      const isFirst = pageNum === 1;
      const isLast = pageNum === totalPages;

      const pindahanFromPrevious = isFirst
        ? undefined
        : {
            penerimaan: runningPenerimaan,
            pengeluaran: runningPengeluaran,
            sisa: runningSisa,
          };

      const startingIndexForPage = currentMainIndex;

      chunkRows.forEach((r) => {
        runningPenerimaan += r.penerimaan;
        runningPengeluaran += r.pengeluaran;
        runningSisa = r.sisaFinal;
        if (!r.isTaxRow && !r.isSaldoAwal) {
          currentMainIndex++;
        }
      });

      result.push({
        pageNumber: pageNum,
        totalPages,
        isFirstPage: isFirst,
        isLastPage: isLast,
        rows: chunkRows,
        startingMainIndex: startingIndexForPage,
        pindahanFromPrevious,
        cumulativePenerimaan: runningPenerimaan,
        cumulativePengeluaran: runningPengeluaran,
        lastSisa: runningSisa,
      });
    });

    return result;
  }, [allTableRows, rowsPerPageOption, saldoAwalBulan]);

  return (
    <div className="space-y-4">
      {/* Controls Bar (Hidden in Print) */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-emerald-700" />
            Pilih Bulan:
          </span>

          <select
            value={selectedMonth}
            onChange={(e) => handleMonthChange(e.target.value)}
            className="text-xs py-1.5 px-3 bg-white border border-slate-300 rounded-lg font-bold text-emerald-900 cursor-pointer shadow-2xs focus:ring-1 focus:ring-emerald-600"
          >
            {availableMonths.map(([ym, label]) => (
              <option key={ym} value={ym}>
                Bulan {label}
              </option>
            ))}
            <option value="all">
              Semua Transaksi / Keseluruhan ({schoolProfile.tahunAnggaran || '2025'})
            </option>
          </select>

          <button
            type="button"
            onClick={() => setShowConfig(!showConfig)}
            className="inline-flex items-center gap-1 text-xs text-slate-700 bg-white px-2.5 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
          >
            <Settings2 className="w-3.5 h-3.5 text-slate-500" />
            <span>Sesuaikan Kas & Tanggal</span>
          </button>

          {/* Badge Format Kertas A4 Landscape */}
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-semibold text-emerald-800">
            <FileText className="w-3.5 h-3.5 text-emerald-700" />
            <span>Kertas A4 Landscape (297 × 210 mm)</span>
          </div>

          {/* Pengaturan Baris per Halaman */}
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-300 rounded-lg px-2 py-1 text-xs">
            <Layers className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-[11px] font-medium text-slate-600">Baris / Hlm:</span>
            <select
              value={rowsPerPageOption}
              onChange={(e) => setRowsPerPageOption(e.target.value as any)}
              className="bg-transparent font-bold text-slate-800 cursor-pointer focus:outline-none"
            >
              <option value="auto">Otomatis ({pages.length} Hlm)</option>
              <option value="14">14 Baris</option>
              <option value="16">16 Baris</option>
              <option value="18">18 Baris</option>
              <option value="20">20 Baris</option>
            </select>
          </div>

          {/* Pengaturan Zoom Pratinjau di Layar */}
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-300 rounded-lg px-2 py-1 text-xs">
            <ZoomIn className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-[11px] font-medium text-slate-600">Skala:</span>
            <select
              value={zoomLevel}
              onChange={(e) => setZoomLevel(e.target.value as any)}
              className="bg-transparent font-bold text-slate-800 cursor-pointer focus:outline-none"
            >
              <option value="fit">Fit Layar</option>
              <option value="100">100% Asli</option>
              <option value="85">85%</option>
              <option value="75">75%</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onBackToInput && (
            <button
              type="button"
              onClick={onBackToInput}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              Kembali ke Kelola Data
            </button>
          )}
          <button
            type="button"
            onClick={handleExportExcel}
            disabled={isExportingExcel}
            title="Ekspor ke spreadsheet Excel (.xlsx) dengan susunan, format angka, dan layout persis pratinjau"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>{isExportingExcel ? 'Mengekspor Excel...' : 'Ekspor Excel (.xlsx)'}</span>
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-800 rounded-lg hover:bg-slate-900 transition-colors shadow-xs cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak Dokumen</span>
          </button>
          <button
            type="button"
            onClick={handleDownload}
            title="Unduh file HTML siap cetak / simpan ke PDF"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-emerald-700" />
            <span>Unduh Siap Cetak</span>
          </button>
        </div>
      </div>

      {/* Print Notice Banner */}
      {printNotice && (
        <div className="bg-emerald-50 border border-emerald-200 px-4 py-2.5 rounded-xl text-xs text-emerald-800 flex items-center justify-between print:hidden">
          <span>{printNotice}</span>
          <button onClick={() => setPrintNotice(null)} className="text-emerald-600 hover:text-emerald-900 font-bold ml-2">×</button>
        </div>
      )}

      {/* Quick Config Accordion (Hidden during print) */}
      {showConfig && (
        <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-xl flex flex-wrap items-center gap-4 text-xs print:hidden">
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
              Tanggal Penutupan (YYYY-MM-DD):
            </label>
            <input
              type="date"
              value={closingDateIso}
              onChange={(e) => setClosingDateIso(e.target.value)}
              className="px-2.5 py-1 bg-white border border-slate-300 rounded font-semibold text-slate-800 text-xs"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
              Judul Bulan (Kop Laporan):
            </label>
            <input
              type="text"
              value={customBulanTahun}
              onChange={(e) => setCustomBulanTahun(e.target.value)}
              placeholder={currentMonthLabel}
              className="px-2.5 py-1 bg-white border border-slate-300 rounded font-semibold text-slate-800 text-xs w-44"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
              Saldo Kas Tunai (Fisik):
            </label>
            <input
              type="number"
              value={manualCash}
              onChange={(e) => setManualCash(e.target.value)}
              placeholder={String(displayKasTunai)}
              className="px-2.5 py-1 bg-white border border-slate-300 rounded font-mono text-slate-800 text-xs w-36"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
              Saldo Rekening Bank:
            </label>
            <input
              type="number"
              value={manualBank}
              onChange={(e) => setManualBank(e.target.value)}
              placeholder={String(displayBank)}
              className="px-2.5 py-1 bg-white border border-slate-300 rounded font-mono text-slate-800 text-xs w-36"
            />
          </div>

          <div className="flex items-center gap-1 text-[11px] text-emerald-800 font-medium self-end pb-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Perbedaan Kas: {selisih === 0 ? 'NIHIL (Cocok)' : `Rp ${formatAngkaSen(selisih)}`}</span>
          </div>
        </div>
      )}

      {/* Info Status Halaman Siap Cetak (Hidden in print) */}
      <div className="flex items-center justify-between text-xs text-slate-600 px-2 print:hidden">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-800">Format Lembar:</span>
          <span>A4 Landscape (297 mm × 210 mm)</span>
          <span className="text-slate-400">·</span>
          <span>Tampilan Siap Cetak Per Halaman</span>
        </div>
        <div className="font-mono text-slate-700 font-semibold bg-white border border-slate-200 px-2.5 py-0.5 rounded shadow-2xs">
          Total: {pages.length} Halaman
        </div>
      </div>

      {/* Printable Paper Canvas - Format Kertas A4 Landscape Per Halaman */}
      <div className="bg-slate-200/80 p-3 sm:p-6 lg:p-8 rounded-2xl overflow-x-auto print:bg-white print:p-0">
        <div
          id="bku-printable-area"
          className="mx-auto flex flex-col items-center gap-8 print:gap-0 print:block"
          style={{
            transform: zoomLevel === '85' ? 'scale(0.85)' : zoomLevel === '75' ? 'scale(0.75)' : 'none',
            transformOrigin: 'top center',
          }}
        >
          {pages.map((page, pageIdx) => {
            let rowCounter = page.startingMainIndex;

            return (
              <div
                key={pageIdx}
                className="a4-landscape-page bg-white shadow-xl border border-slate-300 print:border-none print:shadow-none mx-auto relative flex flex-col justify-between text-black font-sans leading-normal text-xs print:m-0 print:p-0"
                style={{
                  width: '297mm',
                  minHeight: '210mm',
                  maxWidth: '100%',
                  padding: '8mm 12mm 8mm 12mm',
                  boxSizing: 'border-box',
                }}
              >
                {/* Header Badge di Layar (Disembunyikan saat dicetak) */}
                <div className="absolute top-2 right-4 text-[10px] font-mono text-slate-500 print:hidden flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded shadow-2xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                  <span>Halaman {page.pageNumber} dari {page.totalPages} · A4 Landscape (Siap Cetak)</span>
                </div>

                <div className="flex-1 flex flex-col min-h-0">
                  {/* Kop Halaman 1: Judul Lengkap & Metadata Sekolah */}
                  {page.isFirstPage ? (
                    <>
                      <div className="text-center mb-2.5">
                        <h1 className="text-base sm:text-lg font-bold tracking-wider uppercase text-black">
                          BUKU KAS UMUM
                        </h1>
                        <h2 className="text-xs sm:text-sm font-bold tracking-wide uppercase text-black mt-0.5">
                          {selectedMonth === 'all' ? currentMonthLabel : `Bulan: ${currentMonthLabel}`}
                        </h2>
                      </div>

                      {/* Baris Metadata 2 Kolom: Kiri & Kanan */}
                      <div className="grid grid-cols-2 gap-4 text-xs font-semibold mb-2.5 tracking-wide text-black uppercase">
                        {/* Kolom Kiri */}
                        <div className="space-y-0.5">
                          <div className="grid grid-cols-12">
                            <span className="col-span-5 sm:col-span-4">NAMA SEKOLAH</span>
                            <span className="col-span-1 text-center">:</span>
                            <span className="col-span-6 sm:col-span-7">{schoolProfile.namaSekolah}</span>
                          </div>
                          <div className="grid grid-cols-12">
                            <span className="col-span-5 sm:col-span-4">DESA</span>
                            <span className="col-span-1 text-center">:</span>
                            <span className="col-span-6 sm:col-span-7">{desa}</span>
                          </div>
                          <div className="grid grid-cols-12">
                            <span className="col-span-5 sm:col-span-4">KECAMATAN</span>
                            <span className="col-span-1 text-center">:</span>
                            <span className="col-span-6 sm:col-span-7">{kecamatan}</span>
                          </div>
                        </div>

                        {/* Kolom Kanan */}
                        <div className="space-y-0.5">
                          <div className="grid grid-cols-12">
                            <span className="col-span-5 sm:col-span-4">KABUPATEN</span>
                            <span className="col-span-1 text-center">:</span>
                            <span className="col-span-6 sm:col-span-7">{kabupaten}</span>
                          </div>
                          <div className="grid grid-cols-12">
                            <span className="col-span-5 sm:col-span-4">PROVINSI</span>
                            <span className="col-span-1 text-center">:</span>
                            <span className="col-span-6 sm:col-span-7">{provinsi}</span>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    /* Kop Halaman Lanjutan (Halaman 2 ke atas) */
                    <div className="flex items-center justify-between border-b-2 border-black pb-1.5 mb-2 text-black">
                      <div>
                        <h1 className="text-sm font-bold tracking-wider uppercase">
                          BUKU KAS UMUM (Lanjutan)
                        </h1>
                        <p className="text-[11px] font-semibold text-slate-800">
                          {selectedMonth === 'all' ? currentMonthLabel : `Bulan: ${currentMonthLabel}`} · {schoolProfile.namaSekolah}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-[11px] font-mono font-bold bg-slate-100 border border-slate-300 px-2.5 py-0.5 rounded">
                          Halaman {page.pageNumber} dari {page.totalPages}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Tabel Utama Format Resmi A4 Landscape */}
                  <div className={!page.isLastPage ? "flex-1 flex flex-col min-h-0" : ""}>
                    <table className={`w-full border-collapse border-2 border-black text-xs text-black ${!page.isLastPage ? "flex-1 h-full" : ""}`}>
                      <thead>
                        <tr className="border-b-2 border-black text-center font-bold bg-slate-50/80 print:bg-transparent">
                          <th className="border-r border-black p-1.5 w-10 align-middle">No.</th>
                          <th className="border-r border-black p-1.5 w-24 align-middle">Tanggal</th>
                          <th className="border-r border-black p-1.5 align-middle">Uraian</th>
                          <th className="border-r border-black p-1.5 w-24 align-middle">No. Bukti</th>
                          <th className="border-r border-black p-1.5 w-32 align-middle">
                            <div>Penerimaan</div>
                            <div className="font-normal text-[10px]">Rp.</div>
                          </th>
                          <th className="border-r border-black p-1.5 w-32 align-middle">
                            <div>Pengeluaran</div>
                            <div className="font-normal text-[10px]">Rp.</div>
                          </th>
                          <th className="p-1.5 w-32 align-middle">
                            <div>Sisa</div>
                            <div className="font-normal text-[10px]">Rp.</div>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {/* Baris Pindahan jika halaman lanjutan */}
                        {page.pindahanFromPrevious && (
                          <tr className="border-b border-black font-semibold bg-slate-100/70 italic print:bg-transparent">
                            <td className="border-r border-black p-1 text-center font-mono align-middle">-</td>
                            <td className="border-r border-black p-1 text-center font-mono text-[11px] align-middle">-</td>
                            <td className="border-r border-black p-1 text-left align-middle" colSpan={2}>
                              Jumlah Pindahan dari Halaman {page.pageNumber - 1}
                            </td>
                            <td className="border-r border-black p-1 text-right font-mono tabular-nums whitespace-nowrap align-middle">
                              {formatAngkaSen(page.pindahanFromPrevious.penerimaan)}
                            </td>
                            <td className="border-r border-black p-1 text-right font-mono tabular-nums whitespace-nowrap align-middle">
                              {formatAngkaSen(page.pindahanFromPrevious.pengeluaran)}
                            </td>
                            <td className="p-1 text-right font-mono tabular-nums whitespace-nowrap align-middle">
                              {formatAngkaSen(page.pindahanFromPrevious.sisa)}
                            </td>
                          </tr>
                        )}

                        {/* Baris Transaksi Pada Halaman Ini */}
                        {page.rows.map((row) => {
                          const isTax = row.isTaxRow;
                          const isSaldoAwal = row.isSaldoAwal;
                          const numLabel = isTax || isSaldoAwal ? '' : `${rowCounter++}.`;

                          return (
                            <tr
                              key={row.id}
                              className={`border-b border-dotted border-black hover:bg-slate-50/50 print:hover:bg-transparent ${
                                isTax ? 'bg-slate-50/40 print:bg-transparent' : isSaldoAwal ? 'bg-slate-50 font-semibold print:bg-transparent' : ''
                              }`}
                            >
                              <td className="border-r border-black p-1 text-center font-mono align-middle">
                                {numLabel || (isSaldoAwal ? '-' : '')}
                              </td>
                              <td className="border-r border-black p-1 text-center whitespace-nowrap font-mono text-[11px] align-middle">
                                {isTax ? '' : formatTanggalDinas(row.tanggal)}
                              </td>
                              <td className={`border-r border-black p-1 text-left align-middle ${isTax ? 'pl-3' : isSaldoAwal ? 'italic' : ''}`}>
                                {row.uraian}
                              </td>
                              <td className="border-r border-black p-1 text-center font-mono whitespace-nowrap align-middle">
                                {row.noBukti}
                              </td>
                              <td className="border-r border-black p-1 text-right font-mono tabular-nums whitespace-nowrap align-middle">
                                {row.penerimaan > 0 ? formatAngkaSen(row.penerimaan) : '-'}
                              </td>
                              <td className="border-r border-black p-1 text-right font-mono tabular-nums whitespace-nowrap align-middle">
                                {row.pengeluaran > 0 ? formatAngkaSen(row.pengeluaran) : '-'}
                              </td>
                              <td className="p-1 text-right font-mono tabular-nums whitespace-nowrap align-middle">
                                {formatAngkaSen(row.sisaFinal)}
                              </td>
                            </tr>
                          );
                        })}

                        {/* Baris Dipindahkan jika berlanjut ke halaman berikutnya */}
                        {!page.isLastPage && (
                          <tr className="border-t-2 border-black font-semibold bg-slate-100/70 italic print:bg-transparent">
                            <td className="border-r border-black p-1 text-center font-mono align-middle">-</td>
                            <td className="border-r border-black p-1 text-center font-mono text-[11px] align-middle">-</td>
                            <td className="border-r border-black p-1 text-left align-middle" colSpan={2}>
                              Jumlah Dipindahkan ke Halaman {page.pageNumber + 1}
                            </td>
                            <td className="border-r border-black p-1 text-right font-mono tabular-nums whitespace-nowrap align-middle">
                              {formatAngkaSen(page.cumulativePenerimaan)}
                            </td>
                            <td className="border-r border-black p-1 text-right font-mono tabular-nums whitespace-nowrap align-middle">
                              {formatAngkaSen(page.cumulativePengeluaran)}
                            </td>
                            <td className="p-1 text-right font-mono tabular-nums whitespace-nowrap align-middle">
                              {formatAngkaSen(page.lastSisa)}
                            </td>
                          </tr>
                        )}

                        {/* Baris Penutupan Buku Kas Umum Bulanan (Hanya di Halaman Terakhir) */}
                        {page.isLastPage && (
                          <>
                            <tr className="border-t-2 border-b border-dotted border-black font-semibold">
                              <td className="border-r border-black p-1 text-center align-middle"></td>
                              <td className="border-r border-black p-1 text-center whitespace-nowrap font-mono text-[11px] align-middle">
                                {formatTanggalSlash(closingDateIso)}
                              </td>
                              <td className="border-r border-black p-1 text-left align-middle">
                                Jumlah Pengeluaran
                              </td>
                              <td className="border-r border-black p-1 align-middle"></td>
                              <td className="border-r border-black p-1 align-middle"></td>
                              <td className="border-r border-black p-1 align-middle"></td>
                              <td className="p-1 text-right font-mono tabular-nums whitespace-nowrap align-middle">
                                {formatAngkaSen(totalPengeluaran)}
                              </td>
                            </tr>

                            <tr className="border-b border-dotted border-black font-semibold">
                              <td className="border-r border-black p-1 text-center align-middle"></td>
                              <td className="border-r border-black p-1 text-center align-middle"></td>
                              <td className="border-r border-black p-1 text-left align-middle">
                                Saldo Kas Umum
                              </td>
                              <td className="border-r border-black p-1 align-middle"></td>
                              <td className="border-r border-black p-1 align-middle"></td>
                              <td className="border-r border-black p-1 align-middle"></td>
                              <td className="p-1 text-right font-mono tabular-nums whitespace-nowrap align-middle">
                                {formatAngkaSen(totalSemuaDana)}
                              </td>
                            </tr>

                            <tr className="border-b-4 border-double border-black font-bold">
                              <td className="border-r border-black p-1 text-center align-middle"></td>
                              <td className="border-r border-black p-1 text-center align-middle"></td>
                              <td className="border-r border-black p-1 text-left align-middle">
                                Jumlah Total
                              </td>
                              <td className="border-r border-black p-1 align-middle"></td>
                              <td className="border-r border-black p-1 align-middle"></td>
                              <td className="border-r border-black p-1 align-middle"></td>
                              <td className="p-1 text-right font-mono tabular-nums whitespace-nowrap border-t border-black align-middle">
                                {formatAngkaSen(totalPengeluaran + totalSemuaDana)}
                              </td>
                            </tr>
                          </>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Bagian Penutupan & Tanda Tangan (Hanya pada Halaman Terakhir) */}
                  {page.isLastPage && (
                    <>
                      {/* Kalimat Penutupan Kas */}
                      <div className="mt-3 text-justify leading-relaxed">
                        <p className="font-medium text-xs">
                          {kalimatPenutupanKas(closingDateIso)}
                        </p>
                      </div>

                      {/* Tabel Rincian Kas & Perbedaan NIHIL */}
                      <div className="mt-3 border border-black p-2.5 bg-white text-xs max-w-md">
                        <div className="space-y-1">
                          <div className="flex items-center">
                            <span className="w-52 font-medium">Sisa Buku Kas Umum</span>
                            <span className="w-8 text-center">Rp.</span>
                            <span className="w-32 text-right tabular-nums font-mono font-bold">
                              {formatAngkaSen(totalSemuaDana)}
                            </span>
                          </div>
                          <div className="font-semibold text-slate-800 pt-0.5">Terdiri dari:</div>
                          <div className="flex items-center pl-4">
                            <span className="w-48">- Saldo Kas Tunai</span>
                            <span className="w-8 text-center">Rp.</span>
                            <span className="w-32 text-right tabular-nums font-mono font-medium">
                              {formatAngkaSen(displayKasTunai)}
                            </span>
                          </div>
                          <div className="flex items-center pl-4">
                            <span className="w-48">- Saldo Bank</span>
                            <span className="w-8 text-center">Rp.</span>
                            <span className="w-32 text-right tabular-nums font-mono font-medium">
                              {displayBank > 0 ? formatAngkaSen(displayBank) : (displayBank === 0 ? '0,00' : formatAngkaSen(displayBank))}
                            </span>
                          </div>
                          <div className="flex items-center pt-1 border-t border-black">
                            <span className="w-52 text-right pr-6 font-semibold">Jumlah</span>
                            <span className="w-8 text-center">Rp.</span>
                            <span className="w-32 text-right tabular-nums font-mono font-bold">
                              {formatAngkaSen(totalSemuaDana)}
                            </span>
                          </div>
                          <div className="flex items-center pt-0.5">
                            <span className="w-52 text-right pr-6 font-bold">Perbedaan</span>
                            <span className="w-8" />
                            <div className="w-32 text-center border-b-2 border-black pb-0.5 font-bold tracking-widest text-emerald-900 uppercase">
                              {selisih === 0 ? 'NIHIL' : `Rp ${formatAngkaSen(selisih)}`}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 3 Blok Tanda Tangan Resmi */}
                      <div className="grid grid-cols-3 gap-4 text-center mt-5 text-xs text-black">
                        <div>
                          <p>Mengetahui,</p>
                          <p className="font-bold">Kepala Sekolah {schoolProfile.namaSekolah}</p>
                          <div className="h-16"></div>
                          <p className="font-bold underline uppercase">{schoolProfile.namaKepalaSekolah}</p>
                          {schoolProfile.nipKepalaSekolah && <p className="text-[10px]">NIP. {schoolProfile.nipKepalaSekolah}</p>}
                        </div>

                        <div>
                          <p>Disetujui oleh:</p>
                          <p className="font-bold">Ketua {singkatan}</p>
                          <div className="h-16"></div>
                          <p className="font-bold underline uppercase">{schoolProfile.namaKetuaTim}</p>
                          {schoolProfile.nipKetuaTim && <p className="text-[10px]">NIP. {schoolProfile.nipKetuaTim}</p>}
                        </div>

                        <div>
                          <p>{desa}, {formatTanggalIndo(closingDateIso)}</p>
                          <p className="font-bold">Bendahara {singkatan}</p>
                          <div className="h-16"></div>
                          <p className="font-bold underline uppercase">{schoolProfile.namaBendahara}</p>
                          {schoolProfile.nipBendahara && <p className="text-[10px]">NIP. {schoolProfile.nipBendahara}</p>}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Footer Kertas Resmi di Bagian Bawah Tiap Halaman: tepat 15px dari tabel / konten atas */}
                <div className="mt-[15px] pt-1.5 border-t border-slate-300 text-[10px] text-slate-600 flex items-center justify-between font-sans print:border-black shrink-0">
                  <div>
                    <span className="font-semibold">{schoolProfile.namaSekolah}</span> · Buku Kas Umum (BKU) · TA {schoolProfile.tahunAnggaran || '2025'}
                  </div>
                  <div className="font-mono font-medium">
                    Halaman {page.pageNumber} dari {page.totalPages} (A4 Landscape)
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

