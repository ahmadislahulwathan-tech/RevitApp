import React, { useState } from 'react';
import { BKUTransaction, SchoolProfile } from '../types';
import { OfficialReportSheet } from './OfficialReportSheet';
import { formatRupiah, formatAngka, formatTanggalShort, exportToCSV } from '../utils/format';
import { Search, Download, Printer, Receipt, Wallet, ArrowDownLeft, ArrowUpRight, CheckCircle2, Edit3 } from 'lucide-react';

interface BKTViewProps {
  bkuData: BKUTransaction[];
  schoolProfile: SchoolProfile;
  onSelectKwitansi: (tx: BKUTransaction) => void;
  onOpenPrintReport?: () => void;
  onNavigateToBKU: () => void;
  initialSubTab?: 'input' | 'preview';
}

export const BKTView: React.FC<BKTViewProps> = ({
  bkuData,
  schoolProfile,
  onSelectKwitansi,
  onOpenPrintReport,
  onNavigateToBKU,
  initialSubTab = 'input',
}) => {
  const [subTab, setSubTab] = useState<'input' | 'preview'>(initialSubTab);
  const [searchTerm, setSearchTerm] = useState('');

  // Automatically take all cash transactions from BKU and sort chronologically
  const cashTransactions = bkuData
    .filter((tx) => tx.metode === 'tunai')
    .sort((a, b) => new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime());

  // Compute running balance Sisa (Rp) row by row
  let running = 0;
  const enrichedRows = cashTransactions.map((tx) => {
    const penerimaan = tx.jenisTransaksi === 'penerimaan' ? tx.jumlah : 0;
    const pengeluaran = tx.jenisTransaksi === 'pengeluaran' ? tx.jumlah : 0;
    running += penerimaan - pengeluaran;
    return {
      ...tx,
      penerimaan,
      pengeluaran,
      sisa: running,
    };
  });

  const filteredRows = enrichedRows.filter((tx) => {
    const term = searchTerm.toLowerCase();
    return (
      tx.uraian.toLowerCase().includes(term) ||
      tx.noBukti.toLowerCase().includes(term) ||
      (tx.penerimaNama && tx.penerimaNama.toLowerCase().includes(term))
    );
  });

  const totalPenerimaan = enrichedRows.reduce((acc, c) => acc + c.penerimaan, 0);
  const totalPengeluaran = enrichedRows.reduce((acc, c) => acc + c.pengeluaran, 0);
  const sisaKasTunai = totalPenerimaan - totalPengeluaran;

  const handleExportCSV = () => {
    const headers = [
      'No',
      'Tanggal',
      'Uraian Transaksi',
      'Nomor Bukti',
      'Penerimaan (Rp)',
      'Pengeluaran (Rp)',
      'Sisa (Rp)',
    ];

    const rows = enrichedRows.map((r, idx) => [
      idx + 1,
      r.tanggal,
      r.uraian,
      r.noBukti,
      r.penerimaan,
      r.pengeluaran,
      r.sisa,
    ]);

    exportToCSV(`Buku_Kas_Tunai_${schoolProfile.tahunAnggaran}`, headers, rows);
  };

  return (
    <div className="space-y-6">
      
      {/* Header bar with Sub-tab Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Wallet className="w-6 h-6 text-emerald-700" />
              <span>Buku Kas Tunai (BKT)</span>
            </h1>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              <CheckCircle2 className="w-3 h-3" /> Auto-Sinkron BKU
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Pencatatan kas tunai brankas yang tersinkronisasi otomatis dengan belanja BKU.
          </p>
        </div>

        {/* 2 Sub-menus: Input/Catatan vs Preview */}
        <div className="flex items-center bg-slate-200/80 p-1 rounded-xl shrink-0 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setSubTab('input')}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              subTab === 'input'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5 text-emerald-700" />
            <span>Catatan Kas Tunai</span>
          </button>
          <button
            type="button"
            onClick={() => setSubTab('preview')}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              subTab === 'preview'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Pratinjau & Cetak BKT</span>
          </button>
        </div>
      </div>

      {/* SUB-TAB 2: PRATINJAU & CETAK RESMI */}
      {subTab === 'preview' && (
        <OfficialReportSheet
          type="bkt"
          bkuData={bkuData}
          schoolProfile={schoolProfile}
          onBackToInput={() => setSubTab('input')}
        />
      )}

      {/* SUB-TAB 1: KELOLA DATA */}
      {subTab === 'input' && (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                Buku Kas Tunai (BKT) Brankas
              </h2>
              <p className="text-xs text-slate-500">
                Pencatatan mutasi uang tunai yang dipegang bendahara.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportCSV}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>Ekspor CSV</span>
              </button>
              
              <button
                type="button"
                onClick={() => setSubTab('preview')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-900 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors cursor-pointer shadow-2xs font-semibold"
              >
                <Printer className="w-3.5 h-3.5 text-emerald-700" />
                <span>Pratinjau Cetak BKT</span>
              </button>

              <button
                type="button"
                onClick={onNavigateToBKU}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-700 rounded-md hover:bg-emerald-800 transition-colors shadow-xs cursor-pointer"
              >
                <Wallet className="w-4 h-4" />
                <span>Input Transaksi di BKU</span>
              </button>
            </div>
          </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase">Total Penerimaan Tunai</span>
            <div className="w-7 h-7 rounded bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-bold font-mono text-emerald-800 mt-2 tabular-nums">
            {formatRupiah(totalPenerimaan)}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Uang masuk ke kas brankas</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase">Total Pengeluaran Tunai</span>
            <div className="w-7 h-7 rounded bg-rose-50 text-rose-600 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-bold font-mono text-slate-900 mt-2 tabular-nums">
            {formatRupiah(totalPengeluaran)}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Belanja material, upah & alat</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase">Sisa Saldo Kas Tunai</span>
            <div className="w-7 h-7 rounded bg-slate-100 text-slate-700 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-bold font-mono text-emerald-900 mt-2 tabular-nums">
            {formatRupiah(sisaKasTunai)}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Fisik uang di bendahara</span>
        </div>

      </div>

      {/* Search Input */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Cari uraian atau nomor bukti di Buku Kas Tunai..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs sm:text-sm border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600"
          />
        </div>
        <div className="text-xs text-slate-500 hidden sm:block">
          Menampilkan <span className="font-semibold text-slate-800">{filteredRows.length}</span> transaksi tunai
        </div>
      </div>

      {/* Main BKT Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-3 text-center w-12">No</th>
                <th className="py-3 px-3 w-28">Tanggal</th>
                <th className="py-3 px-4">Uraian</th>
                <th className="py-3 px-3 w-36">Nomor Bukti</th>
                <th className="py-3 px-3 text-right w-32">Penerimaan (Rp)</th>
                <th className="py-3 px-3 text-right w-32">Pengeluaran (Rp)</th>
                <th className="py-3 px-3 text-right w-32">Sisa (Rp)</th>
                <th className="py-3 px-3 text-center w-20">Kwitansi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400">
                    Tidak ada transaksi tunai di BKT.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row, idx) => {
                  const isPengeluaran = row.pengeluaran > 0;
                  return (
                    <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 text-center text-slate-400">{idx + 1}</td>
                      <td className="py-3 px-3 font-mono text-slate-700 whitespace-nowrap">
                        {formatTanggalShort(row.tanggal)}
                      </td>
                      <td className="py-3 px-4 text-slate-900 font-medium">
                        {row.uraian}
                        {row.penerimaNama && (
                          <div className="text-[11px] text-slate-500 font-normal">
                            Rekanan: {row.penerimaNama}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] font-medium text-slate-800 whitespace-nowrap">
                        {row.noBukti}
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums text-emerald-700 font-medium">
                        {row.penerimaan > 0 ? formatRupiah(row.penerimaan) : '-'}
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-900 font-medium">
                        {row.pengeluaran > 0 ? formatRupiah(row.pengeluaran) : '-'}
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums font-bold text-slate-900">
                        {formatRupiah(row.sisa)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {isPengeluaran && (
                          <button
                            onClick={() => onSelectKwitansi(row)}
                            title="Cetak Kwitansi Pembayaran"
                            className="p-1.5 text-emerald-700 hover:bg-emerald-50 rounded transition-colors cursor-pointer"
                          >
                            <Receipt className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {filteredRows.length > 0 && (
              <tfoot>
                <tr className="bg-slate-100 font-bold border-t-2 border-slate-300 text-slate-900">
                  <td colSpan={4} className="py-3 px-4 text-center">
                    JUMLAH SALDO KAS TUNAI
                  </td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums text-emerald-800">
                    {formatRupiah(totalPenerimaan)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-900">
                    {formatRupiah(totalPengeluaran)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums text-emerald-900">
                    {formatRupiah(sisaKasTunai)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
        </>
      )}

    </div>
  );
};
