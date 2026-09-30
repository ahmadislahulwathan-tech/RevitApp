import React, { useState, useMemo } from 'react';
import { BKUTransaction, BukuBankTransaction, SchoolProfile } from '../types';
import { formatRupiah, formatAngkaSen, formatTanggalDinas, formatBulanTahunKapital, formatTanggalIndo } from '../utils/format';
import { downloadPrintableDocument, executePrint } from '../utils/printHelper';
import { Printer, Download, Calendar, FileText } from 'lucide-react';

interface OfficialReportSheetProps {
  type: 'bkt' | 'buku_pajak' | 'summary';
  bkuData: BKUTransaction[];
  schoolProfile: SchoolProfile;
  bukuBankData?: BukuBankTransaction[];
  onBackToInput?: () => void;
}

export const OfficialReportSheet: React.FC<OfficialReportSheetProps> = ({
  type,
  bkuData,
  schoolProfile,
  bukuBankData = [],
  onBackToInput,
}) => {
  const [printNotice, setPrintNotice] = useState<string | null>(null);

  // Filter months
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

  const [selectedMonth, setSelectedMonth] = useState<string>('all');

  // Filtered transactions
  const filteredBKU = useMemo(() => {
    let list = bkuData;
    if (selectedMonth !== 'all') {
      list = list.filter((tx) => tx.tanggal.startsWith(selectedMonth));
    }
    return [...list].sort((a, b) => a.tanggal.localeCompare(b.tanggal));
  }, [bkuData, selectedMonth]);

  // BKT data: only cash
  const cashRows = useMemo(() => {
    let running = 0;
    return filteredBKU
      .filter((t) => t.metode === 'tunai')
      .map((t) => {
        const inAmt = t.jenisTransaksi === 'penerimaan' ? t.jumlah : 0;
        const outAmt = t.jenisTransaksi === 'pengeluaran' ? t.jumlah : 0;
        running += inAmt - outAmt;
        return {
          ...t,
          penerimaan: inAmt,
          pengeluaran: outAmt,
          sisa: running,
        };
      });
  }, [filteredBKU]);

  // Tax rows
  const taxRows = useMemo(() => {
    return filteredBKU.filter((t) => t.jenisTransaksi === 'pengeluaran' && t.pajak && (t.pajak.totalPajak > 0 || t.pajak.dpp > 0));
  }, [filteredBKU]);

  // Totals
  const totalBKTIn = cashRows.reduce((acc, c) => acc + c.penerimaan, 0);
  const totalBKTOut = cashRows.reduce((acc, c) => acc + c.pengeluaran, 0);
  const sisaBKT = totalBKTIn - totalBKTOut;

  const totalDPP = taxRows.reduce((acc, c) => acc + c.pajak.dpp, 0);
  const totalPPN = taxRows.reduce((acc, c) => acc + c.pajak.ppn, 0);
  const totalPPh22 = taxRows.reduce((acc, c) => acc + c.pajak.pph22, 0);
  const totalPPh23 = taxRows.reduce((acc, c) => acc + c.pajak.pph23, 0);
  const totalPPh4_2 = taxRows.reduce((acc, c) => acc + c.pajak.pph4_2, 0);
  const totalPPh21 = taxRows.reduce((acc, c) => acc + c.pajak.pph21, 0);
  const totalPajak = taxRows.reduce((acc, c) => acc + c.pajak.totalPajak, 0);

  const containerId = type === 'bkt' ? 'bkt-printable-area' : type === 'buku_pajak' ? 'pajak-printable-area' : 'report-printable-area';
  const reportTitle = type === 'bkt' ? 'BUKU KAS TUNAI (BKT)' : type === 'buku_pajak' ? 'BUKU PEMBANTU PAJAK' : 'REKAPITULASI LAPORAN KEUANGAN REVITALISASI';

  const handlePrint = () => {
    const filename = `${type.toUpperCase()}_${schoolProfile.namaSekolah.replace(/\s+/g, '_')}`;
    executePrint(containerId, filename, reportTitle, 'landscape');
  };

  const handleDownload = () => {
    const filename = `${type.toUpperCase()}_${schoolProfile.namaSekolah.replace(/\s+/g, '_')}`;
    downloadPrintableDocument(containerId, filename, reportTitle, 'landscape');
    setPrintNotice('File dokumen siap cetak (A4 Landscape) berhasil diunduh.');
    setTimeout(() => setPrintNotice(null), 6000);
  };

  return (
    <div className="space-y-4">
      {/* Controls Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-emerald-700" />
            Filter Periode:
          </span>

          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="text-xs py-1.5 px-3 bg-white border border-slate-300 rounded-lg font-bold text-emerald-900 cursor-pointer shadow-2xs focus:ring-1 focus:ring-emerald-600"
          >
            <option value="all">Semua Bulan (Tahun {schoolProfile.tahunAnggaran})</option>
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
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 transition-colors shadow-xs cursor-pointer"
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

      {/* Printable Sheet Canvas */}
      <div className="bg-slate-200/60 p-4 sm:p-8 rounded-xl overflow-x-auto flex justify-center print:bg-white print:p-0">
        <div
          id={containerId}
          className="print-landscape bg-white p-6 sm:p-10 w-full max-w-4xl shadow-md text-black font-sans leading-normal text-xs sm:text-[13px] print:border-none print:shadow-none print:max-w-none print:w-full print:p-0"
        >

          {/* Header */}
          <div className="text-center mb-6">
            <h1 className="text-base sm:text-lg font-bold tracking-wider uppercase text-black">
              {reportTitle}
            </h1>
            <h2 className="text-xs sm:text-sm font-bold tracking-wide uppercase text-black mt-0.5">
              {schoolProfile.namaSekolah} · TAHUN ANGGARAN {schoolProfile.tahunAnggaran}
            </h2>
            <p className="text-[11px] text-black">
              SK Penetapan: {schoolProfile.nomorSK} · Program: {schoolProfile.namaProgram}
            </p>
          </div>

          {/* 2-Column Info */}
          <div className="grid grid-cols-2 gap-4 text-xs font-semibold mb-3 tracking-wide text-black uppercase">
            <div className="space-y-0.5">
              <div className="grid grid-cols-12">
                <span className="col-span-5 sm:col-span-4">DESA</span>
                <span className="col-span-1 text-center">:</span>
                <span className="col-span-6 sm:col-span-7">{schoolProfile.desa || 'GAPUK'}</span>
              </div>
              <div className="grid grid-cols-12">
                <span className="col-span-5 sm:col-span-4">KECAMATAN</span>
                <span className="col-span-1 text-center">:</span>
                <span className="col-span-6 sm:col-span-7">{schoolProfile.kecamatan || 'SURALAGA'}</span>
              </div>
            </div>

            <div className="space-y-0.5">
              <div className="grid grid-cols-12">
                <span className="col-span-5 sm:col-span-4">KABUPATEN</span>
                <span className="col-span-1 text-center">:</span>
                <span className="col-span-6 sm:col-span-7">{schoolProfile.kabupatenKota}</span>
              </div>
              <div className="grid grid-cols-12">
                <span className="col-span-5 sm:col-span-4">PROVINSI</span>
                <span className="col-span-1 text-center">:</span>
                <span className="col-span-6 sm:col-span-7">{schoolProfile.provinsi}</span>
              </div>
            </div>
          </div>

          {/* TABLE: BKT TYPE */}
          {type === 'bkt' && (
            <table className="w-full border-collapse border-2 border-black text-xs text-black">
              <thead>
                <tr className="border-b-2 border-black text-center font-bold">
                  <th className="border-r border-black p-1.5 w-10 align-middle">No.</th>
                  <th className="border-r border-black p-1.5 w-24 align-middle">Tanggal</th>
                  <th className="border-r border-black p-1.5 w-28 align-middle">No. Bukti</th>
                  <th className="border-r border-black p-1.5 align-middle">Uraian Transaksi Tunai</th>
                  <th className="border-r border-black p-1.5 w-32 align-middle">
                    <div>Penerimaan (Rp)</div>
                  </th>
                  <th className="border-r border-black p-1.5 w-32 align-middle">
                    <div>Pengeluaran (Rp)</div>
                  </th>
                  <th className="p-1.5 w-32 align-middle">
                    <div>Sisa Kas (Rp)</div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {cashRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-4 text-center text-slate-500 italic">
                      Tidak ada catatan transaksi kas tunai pada periode ini.
                    </td>
                  </tr>
                ) : (
                  cashRows.map((row, idx) => (
                    <tr key={row.id} className="border-b border-dotted border-black">
                      <td className="border-r border-black p-1 text-center">{idx + 1}.</td>
                      <td className="border-r border-black p-1 text-center whitespace-nowrap">{formatTanggalDinas(row.tanggal)}</td>
                      <td className="border-r border-black p-1 text-center font-mono whitespace-nowrap">{row.noBukti}</td>
                      <td className="border-r border-black p-1 text-left">{row.uraian}</td>
                      <td className="border-r border-black p-1 text-right font-mono tabular-nums whitespace-nowrap">
                        {row.penerimaan > 0 ? formatAngkaSen(row.penerimaan) : '-'}
                      </td>
                      <td className="border-r border-black p-1 text-right font-mono tabular-nums whitespace-nowrap">
                        {row.pengeluaran > 0 ? formatAngkaSen(row.pengeluaran) : '-'}
                      </td>
                      <td className="p-1 text-right font-mono tabular-nums whitespace-nowrap font-semibold">
                        {formatAngkaSen(row.sisa)}
                      </td>
                    </tr>
                  ))
                )}
                <tr className="border-t-2 border-black font-bold">
                  <td colSpan={4} className="border-r border-black p-1.5 text-center">TOTAL KAS TUNAI</td>
                  <td className="border-r border-black p-1.5 text-right font-mono tabular-nums">{formatAngkaSen(totalBKTIn)}</td>
                  <td className="border-r border-black p-1.5 text-right font-mono tabular-nums">{formatAngkaSen(totalBKTOut)}</td>
                  <td className="p-1.5 text-right font-mono tabular-nums">{formatAngkaSen(sisaBKT)}</td>
                </tr>
              </tbody>
            </table>
          )}

          {/* TABLE: BUKU PAJAK TYPE */}
          {type === 'buku_pajak' && (
            <table className="w-full border-collapse border-2 border-black text-xs text-black">
              <thead>
                <tr className="border-b-2 border-black text-center font-bold">
                  <th className="border-r border-black p-1 w-8 align-middle">No</th>
                  <th className="border-r border-black p-1 w-20 align-middle">Tgl</th>
                  <th className="border-r border-black p-1 w-24 align-middle">No. Bukti</th>
                  <th className="border-r border-black p-1 align-middle">Uraian Belanja</th>
                  <th className="border-r border-black p-1 w-24 align-middle">Bruto</th>
                  <th className="border-r border-black p-1 w-20 align-middle">PPN</th>
                  <th className="border-r border-black p-1 w-20 align-middle">PPh 22</th>
                  <th className="border-r border-black p-1 w-20 align-middle">PPh 21/Lain</th>
                  <th className="border-r border-black p-1 w-20 align-middle">Total Pajak</th>
                  <th className="p-1 w-24 align-middle">NTPN / Status</th>
                </tr>
              </thead>
              <tbody>
                {taxRows.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-4 text-center text-slate-500 italic">
                      Tidak ada catatan pemotongan pajak pada periode ini.
                    </td>
                  </tr>
                ) : (
                  taxRows.map((row, idx) => (
                    <tr key={row.id} className="border-b border-dotted border-black">
                      <td className="border-r border-black p-1 text-center">{idx + 1}</td>
                      <td className="border-r border-black p-1 text-center whitespace-nowrap">{formatTanggalDinas(row.tanggal)}</td>
                      <td className="border-r border-black p-1 text-center font-mono whitespace-nowrap text-[11px]">{row.noBukti}</td>
                      <td className="border-r border-black p-1 text-left">{row.uraian}</td>
                      <td className="border-r border-black p-1 text-right font-mono tabular-nums whitespace-nowrap">{formatAngkaSen(row.jumlah)}</td>
                      <td className="border-r border-black p-1 text-right font-mono tabular-nums whitespace-nowrap">{row.pajak.ppn > 0 ? formatAngkaSen(row.pajak.ppn) : '-'}</td>
                      <td className="border-r border-black p-1 text-right font-mono tabular-nums whitespace-nowrap">{row.pajak.pph22 > 0 ? formatAngkaSen(row.pajak.pph22) : '-'}</td>
                      <td className="border-r border-black p-1 text-right font-mono tabular-nums whitespace-nowrap">{(row.pajak.pph21 + row.pajak.pph23 + row.pajak.pph4_2) > 0 ? formatAngkaSen(row.pajak.pph21 + row.pajak.pph23 + row.pajak.pph4_2) : '-'}</td>
                      <td className="border-r border-black p-1 text-right font-mono tabular-nums whitespace-nowrap font-bold">{formatAngkaSen(row.pajak.totalPajak)}</td>
                      <td className="p-1 text-center font-mono text-[10px] whitespace-nowrap">
                        {row.pajak.ntpn ? <span className="font-bold">{row.pajak.ntpn}</span> : row.pajak.statusSetor}
                      </td>
                    </tr>
                  ))
                )}
                <tr className="border-t-2 border-black font-bold">
                  <td colSpan={4} className="border-r border-black p-1.5 text-center">TOTAL REKAPITULASI PAJAK</td>
                  <td className="border-r border-black p-1.5 text-right font-mono tabular-nums">{formatAngkaSen(taxRows.reduce((a, c) => a + c.jumlah, 0))}</td>
                  <td className="border-r border-black p-1.5 text-right font-mono tabular-nums">{formatAngkaSen(totalPPN)}</td>
                  <td className="border-r border-black p-1.5 text-right font-mono tabular-nums">{formatAngkaSen(totalPPh22)}</td>
                  <td className="border-r border-black p-1.5 text-right font-mono tabular-nums">{formatAngkaSen(totalPPh21 + totalPPh23 + totalPPh4_2)}</td>
                  <td className="border-r border-black p-1.5 text-right font-mono tabular-nums">{formatAngkaSen(totalPajak)}</td>
                  <td className="p-1.5 text-center">-</td>
                </tr>
              </tbody>
            </table>
          )}

          {/* TABLE: SUMMARY DINAS TYPE */}
          {type === 'summary' && (
            <div className="space-y-6">
              <div className="border border-black p-4 bg-slate-50 space-y-2 text-xs">
                <div className="font-bold uppercase tracking-wide border-b border-black pb-1 mb-2">
                  Ringkasan Konsolidasi Kas & Bank
                </div>
                <div className="grid grid-cols-2 gap-4 font-mono">
                  <div>
                    <div className="flex justify-between py-1">
                      <span>Total Penerimaan BKU:</span>
                      <span className="font-bold">{formatRupiah(bkuData.reduce((a, c) => a + (c.jenisTransaksi === 'penerimaan' ? c.jumlah : 0), 0))}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span>Total Pengeluaran BKU:</span>
                      <span className="font-bold">{formatRupiah(bkuData.reduce((a, c) => a + (c.jenisTransaksi === 'pengeluaran' ? c.jumlah : 0), 0))}</span>
                    </div>
                    <div className="flex justify-between py-1 border-t border-black font-bold">
                      <span>Sisa Kas BKU:</span>
                      <span>{formatRupiah(bkuData.reduce((a, c) => a + (c.jenisTransaksi === 'penerimaan' ? c.jumlah : -c.jumlah), 0))}</span>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between py-1">
                      <span>Penerimaan Kas Bank:</span>
                      <span>{formatRupiah(bukuBankData.reduce((a, c) => a + c.penerimaan, 0))}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span>Penarikan Kas Bank:</span>
                      <span>{formatRupiah(bukuBankData.reduce((a, c) => a + c.pengeluaran, 0))}</span>
                    </div>
                    <div className="flex justify-between py-1 border-t border-black font-bold">
                      <span>Saldo Akhir Bank:</span>
                      <span>{formatRupiah(bukuBankData.reduce((a, c) => a + (c.penerimaan - c.pengeluaran), 0))}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Signatures */}
          <div className="grid grid-cols-3 gap-4 text-center mt-10 text-xs text-black">
            <div>
              <p>Mengetahui,</p>
              <p className="font-bold">Kepala Sekolah {schoolProfile.namaSekolah}</p>
              <div className="h-20"></div>
              <p className="font-bold underline uppercase">{schoolProfile.namaKepalaSekolah}</p>
              {schoolProfile.nipKepalaSekolah && <p className="text-[10px]">NIP. {schoolProfile.nipKepalaSekolah}</p>}
            </div>

            <div>
              <p>Disetujui oleh:</p>
              <p className="font-bold">Ketua {schoolProfile.singkatanTim || 'P2SP'}</p>
              <div className="h-20"></div>
              <p className="font-bold underline uppercase">{schoolProfile.namaKetuaTim}</p>
              {schoolProfile.nipKetuaTim && <p className="text-[10px]">NIP. {schoolProfile.nipKetuaTim}</p>}
            </div>

            <div>
              <p>{schoolProfile.desa || 'Gapuk'}, {formatTanggalIndo(new Date().toISOString().split('T')[0])}</p>
              <p className="font-bold">Bendahara {schoolProfile.singkatanTim || 'P2SP'}</p>
              <div className="h-20"></div>
              <p className="font-bold underline uppercase">{schoolProfile.namaBendahara}</p>
              {schoolProfile.nipBendahara && <p className="text-[10px]">NIP. {schoolProfile.nipBendahara}</p>}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
