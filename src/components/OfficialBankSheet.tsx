import React, { useState, useMemo } from 'react';
import { BukuBankTransaction, SchoolProfile } from '../types';
import { 
  formatAngkaSen, 
  formatTanggalDash, 
  formatBulanTahunKapital, 
  formatTanggalIndo 
} from '../utils/format';
import { downloadPrintableDocument, executePrint } from '../utils/printHelper';
import { exportBukuBankToExcel } from '../utils/excelExport';
import { Printer, Download, Calendar, FileSpreadsheet, FileText } from 'lucide-react';

interface OfficialBankSheetProps {
  bukuBankData: BukuBankTransaction[];
  schoolProfile: SchoolProfile;
  onBackToInput?: () => void;
}

export const OfficialBankSheet: React.FC<OfficialBankSheetProps> = ({
  bukuBankData,
  schoolProfile,
  onBackToInput,
}) => {
  // Available months
  const availableMonths = useMemo(() => {
    const monthMap = new Map<string, string>();
    bukuBankData.forEach((tx) => {
      if (tx.tanggal) {
        const ym = tx.tanggal.substring(0, 7);
        const label = formatBulanTahunKapital(tx.tanggal);
        if (!monthMap.has(ym)) {
          monthMap.set(ym, label);
        }
      }
    });
    return Array.from(monthMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [bukuBankData]);

  const defaultMonth = availableMonths.length > 0 ? availableMonths[availableMonths.length - 1][0] : '2025-08';
  const [selectedMonth, setSelectedMonth] = useState<string>(defaultMonth);
  const [printNotice, setPrintNotice] = useState<string | null>(null);
  const [isExportingExcel, setIsExportingExcel] = useState<boolean>(false);

  const monthTransactions = useMemo(() => {
    return bukuBankData
      .filter((tx) => tx.tanggal.startsWith(selectedMonth))
      .sort((a, b) => a.tanggal.localeCompare(b.tanggal));
  }, [bukuBankData, selectedMonth]);

  let running = 0;
  const rows = monthTransactions.map((tx) => {
    running += tx.penerimaan - tx.pengeluaran;
    return {
      ...tx,
      saldo: tx.sisa !== undefined ? tx.sisa : running,
    };
  });

  const totalIn = monthTransactions.reduce((acc, c) => acc + c.penerimaan, 0);
  const totalOut = monthTransactions.reduce((acc, c) => acc + c.pengeluaran, 0);
  const sisaBank = totalIn - totalOut;

  const currentMonthLabel = useMemo(() => {
    const found = availableMonths.find((m) => m[0] === selectedMonth);
    return found ? found[1] : 'AGUSTUS 2025';
  }, [selectedMonth, availableMonths]);

  const closingDateIso = useMemo(() => {
    if (monthTransactions.length > 0) {
      return monthTransactions[monthTransactions.length - 1].tanggal;
    }
    const [y, m] = selectedMonth.split('-').map(Number);
    if (!isNaN(y) && !isNaN(m)) {
      const lastDay = new Date(y, m, 0).getDate();
      return `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    }
    return `${selectedMonth}-31`;
  }, [monthTransactions, selectedMonth]);

  const desa = schoolProfile.desa || 'GAPUK';
  const kecamatan = schoolProfile.kecamatan || 'SURALAGA';
  const kabupaten = schoolProfile.kabupatenKota || 'LOMBOK TIMUR';
  const provinsi = schoolProfile.provinsi || 'NTB';
  const singkatan = schoolProfile.singkatanTim || 'P2SP';

  const handlePrint = () => {
    const filename = `Buku_Kas_Bank_${currentMonthLabel.replace(/\s+/g, '_')}_${schoolProfile.namaSekolah.replace(/\s+/g, '_')}`;
    executePrint('bank-printable-area', filename, `Buku Kas Bank - Bulan ${currentMonthLabel}`, 'landscape');
  };

  const handleDownload = () => {
    const filename = `Buku_Kas_Bank_${currentMonthLabel.replace(/\s+/g, '_')}_${schoolProfile.namaSekolah.replace(/\s+/g, '_')}`;
    downloadPrintableDocument('bank-printable-area', filename, `Buku Kas Bank - Bulan ${currentMonthLabel}`, 'landscape');
    setPrintNotice('File dokumen cetak Buku Bank (A4 Landscape) berhasil diunduh.');
    setTimeout(() => setPrintNotice(null), 6000);
  };

  const handleExportExcel = async () => {
    try {
      setIsExportingExcel(true);
      await exportBukuBankToExcel({
        rows: rows.map((r) => ({
          id: r.id,
          tanggal: r.tanggal,
          uraian: r.uraian,
          noBukti: r.noBukti,
          penerimaan: r.penerimaan,
          pengeluaran: r.pengeluaran,
          saldo: r.saldo,
        })),
        currentMonthLabel,
        closingDateIso,
        schoolProfile,
        totalPenerimaan: totalIn,
        totalPengeluaran: totalOut,
        sisaBank,
        desa,
        kecamatan,
        kabupaten,
        provinsi,
        singkatan,
      });
      setPrintNotice('File Excel Buku Kas Bank (.xlsx) berhasil diunduh dengan layout persis seperti pratinjau.');
      setTimeout(() => setPrintNotice(null), 6000);
    } catch (err) {
      console.error('Gagal mengekspor file Excel:', err);
      setPrintNotice('Terjadi kesalahan saat mengekspor file Excel.');
      setTimeout(() => setPrintNotice(null), 6000);
    } finally {
      setIsExportingExcel(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Controls Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-emerald-700" />
            Pilih Bulan Bank:
          </span>

          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="text-xs py-1.5 px-3 bg-white border border-slate-300 rounded-lg font-bold text-emerald-900 cursor-pointer shadow-2xs focus:ring-1 focus:ring-emerald-600"
          >
            {availableMonths.map(([ym, label]) => (
              <option key={ym} value={ym}>
                Bulan {label}
              </option>
            ))}
          </select>

          {/* Badge Format Kertas A4 Landscape */}
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-semibold text-emerald-800">
            <FileText className="w-3.5 h-3.5 text-emerald-700" />
            <span>Kertas A4 Landscape (297 × 210 mm)</span>
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
            title="Ekspor ke Excel (.xlsx) dengan susunan dan layout persis resmi"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>{isExportingExcel ? 'Mengekspor Excel...' : 'Ekspor Excel (.xlsx)'}</span>
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-slate-800 rounded-lg hover:bg-slate-900 transition-colors shadow-xs cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak Dokumen</span>
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-emerald-700" />
            <span>Unduh Dokumen</span>
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

      {/* Printable Sheet Area */}
      <div className="bg-slate-200/60 p-4 sm:p-8 rounded-xl overflow-x-auto flex justify-center print:bg-white print:p-0">
        <div
          id="bank-printable-area"
          className="print-landscape bg-white p-6 sm:p-10 w-full max-w-4xl shadow-md text-black font-sans leading-normal text-xs sm:text-[13px] print:border-none print:shadow-none print:max-w-none print:w-full print:p-0"
        >

          {/* Header */}
          <div className="text-center mb-5">
            <h1 className="text-base sm:text-lg font-bold tracking-wider uppercase text-black">
              BUKU KAS BANK
            </h1>
            <h2 className="text-xs sm:text-sm font-bold tracking-wide text-black mt-0.5">
              Bulan: {currentMonthLabel}
            </h2>
          </div>

          {/* 2-Column Info - Persis Gambar Lampiran */}
          <div className="flex justify-between items-start text-[11px] sm:text-xs font-semibold mb-3 text-black uppercase">
            <div className="space-y-0.5">
              <div className="flex">
                <span className="w-28 sm:w-32">NAMA SEKOLAH</span>
                <span className="mx-1">:</span>
                <span>{schoolProfile.namaSekolah}</span>
              </div>
              <div className="flex">
                <span className="w-28 sm:w-32">DESA</span>
                <span className="mx-1">:</span>
                <span>{desa}</span>
              </div>
              <div className="flex">
                <span className="w-28 sm:w-32">KECAMATAN</span>
                <span className="mx-1">:</span>
                <span>{kecamatan}</span>
              </div>
            </div>

            <div className="space-y-0.5">
              <div className="flex">
                <span className="w-24 sm:w-28">KABUPATEN</span>
                <span className="mx-1">:</span>
                <span>{kabupaten}</span>
              </div>
              <div className="flex">
                <span className="w-24 sm:w-28">PROVINSI</span>
                <span className="mx-1">:</span>
                <span>{provinsi}</span>
              </div>
            </div>
          </div>

          {/* Table */}
          <table className="w-full border-collapse border-2 border-black text-xs text-black">
            <thead>
              <tr className="border-b-2 border-black text-center font-bold">
                <th className="border-r border-black p-1.5 w-10 align-middle">No.</th>
                <th className="border-r border-black p-1.5 w-24 align-middle">Tanggal</th>
                <th className="border-r border-black p-1.5 align-middle">Uraian</th>
                <th className="border-r border-black p-1.5 w-24 align-middle">No. Bukti</th>
                <th className="border-r border-black p-1.5 w-32 align-middle">
                  <div>Penerimaan</div>
                  <div>Rp.</div>
                </th>
                <th className="border-r border-black p-1.5 w-32 align-middle">
                  <div>Pengeluaran</div>
                  <div>Rp.</div>
                </th>
                <th className="p-1.5 w-32 align-middle">
                  <div>Sisa</div>
                  <div>Rp.</div>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-4 text-center text-slate-500 italic">
                    Tidak ada catatan transaksi bank pada bulan ini.
                  </td>
                </tr>
              ) : (
                rows.map((row, idx) => (
                  <tr key={row.id} className="border-b border-dotted border-black hover:bg-slate-50/50 print:hover:bg-transparent">
                    <td className="border-r border-black p-1 text-center font-mono">{idx + 1}</td>
                    <td className="border-r border-black p-1 text-center whitespace-nowrap font-mono text-[11px]">
                      {formatTanggalDash(row.tanggal)}
                    </td>
                    <td className="border-r border-black p-1 text-left">{row.uraian}</td>
                    <td className="border-r border-black p-1 text-center font-mono whitespace-nowrap">{row.noBukti}</td>
                    <td className="border-r border-black p-1 text-right font-mono tabular-nums whitespace-nowrap">
                      {row.penerimaan > 0 ? formatAngkaSen(row.penerimaan) : ''}
                    </td>
                    <td className="border-r border-black p-1 text-right font-mono tabular-nums whitespace-nowrap">
                      {row.pengeluaran > 0 ? formatAngkaSen(row.pengeluaran) : ''}
                    </td>
                    <td className="p-1 text-right font-mono tabular-nums whitespace-nowrap">
                      {formatAngkaSen(row.saldo)}
                    </td>
                  </tr>
                ))
              )}

              {/* Blank rows to match the official government ledger layout */}
              {Array.from({ length: Math.max(0, 4 - rows.length) }).map((_, i) => (
                <tr key={`empty-${i}`} className="border-b border-dotted border-black h-7">
                  <td className="border-r border-black p-1"></td>
                  <td className="border-r border-black p-1"></td>
                  <td className="border-r border-black p-1"></td>
                  <td className="border-r border-black p-1"></td>
                  <td className="border-r border-black p-1"></td>
                  <td className="border-r border-black p-1"></td>
                  <td className="p-1"></td>
                </tr>
              ))}

              {/* Total Footer Row: Jumlah */}
              <tr className="border-t-2 border-b-4 border-double border-black font-bold">
                <td colSpan={4} className="border-r border-black p-1.5 text-center">
                  Jumlah
                </td>
                <td className="border-r border-black p-1.5 text-right font-mono tabular-nums whitespace-nowrap">
                  {formatAngkaSen(totalIn)}
                </td>
                <td className="border-r border-black p-1.5 text-right font-mono tabular-nums whitespace-nowrap">
                  {formatAngkaSen(totalOut)}
                </td>
                <td className="p-1.5 text-right font-mono tabular-nums whitespace-nowrap">
                  {formatAngkaSen(sisaBank)}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Signatures - 3 Kolom Persis Sesuai Gambar Lampiran */}
          <div className="grid grid-cols-3 gap-4 text-center mt-12 text-xs text-black">
            {/* Col 1: Kepala Sekolah */}
            <div className="flex flex-col justify-between">
              <div>
                <p>Mengetahui,</p>
                <p className="font-bold">Kepala {schoolProfile.namaSekolah}</p>
              </div>
              <div className="mt-16 sm:mt-20">
                <p className="font-bold underline uppercase">{schoolProfile.namaKepalaSekolah}</p>
                {schoolProfile.nipKepalaSekolah && <p className="text-[10px] mt-0.5 font-mono">NIP. {schoolProfile.nipKepalaSekolah}</p>}
              </div>
            </div>

            {/* Col 2: Ketua P2SP */}
            <div className="flex flex-col justify-between">
              <div>
                <p>Disetujui oleh:</p>
                <p className="font-bold">Ketua {singkatan}</p>
              </div>
              <div className="mt-16 sm:mt-20">
                <p className="font-bold underline uppercase">{schoolProfile.namaKetuaTim}</p>
                {schoolProfile.nipKetuaTim && <p className="text-[10px] mt-0.5 font-mono">NIP. {schoolProfile.nipKetuaTim}</p>}
              </div>
            </div>

            {/* Col 3: Bendahara P2SP */}
            <div className="flex flex-col justify-between">
              <div>
                <p>{desa}, {formatTanggalIndo(closingDateIso)}</p>
                <p>Disusun Oleh :</p>
                <p className="font-bold">Bendahara {singkatan}</p>
              </div>
              <div className="mt-16 sm:mt-20">
                <p className="font-bold underline uppercase">{schoolProfile.namaBendahara}</p>
                {schoolProfile.nipBendahara && <p className="text-[10px] mt-0.5 font-mono">NIP. {schoolProfile.nipBendahara}</p>}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
