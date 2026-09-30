import React, { useState } from 'react';
import { BKUTransaction, BukuBankTransaction, SchoolProfile, ActiveTab } from '../types';
import { formatRupiah, formatAngka, formatTanggalShort } from '../utils/format';
import { OfficialReportSheet } from './OfficialReportSheet';
import { 
  Landmark, 
  Wallet, 
  Receipt, 
  Percent, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Plus, 
  FileText, 
  TrendingUp, 
  CheckCircle2, 
  AlertCircle,
  BarChart3,
  Printer,
  Edit3
} from 'lucide-react';

interface DashboardViewProps {
  bkuData: BKUTransaction[];
  bukuBankData: BukuBankTransaction[];
  schoolProfile: SchoolProfile;
  setActiveTab: (tab: ActiveTab) => void;
  onOpenNewTransaction: () => void;
  onSelectKwitansi: (tx: BKUTransaction) => void;
  initialSubTab?: 'input' | 'preview';
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  bkuData,
  bukuBankData,
  schoolProfile,
  setActiveTab,
  onOpenNewTransaction,
  onSelectKwitansi,
  initialSubTab = 'input',
}) => {
  const [subTab, setSubTab] = useState<'input' | 'preview'>(initialSubTab);

  // Bank Balance
  const totalBankIn = bukuBankData.reduce((acc, curr) => acc + curr.penerimaan, 0);
  const totalBankOut = bukuBankData.reduce((acc, curr) => acc + curr.pengeluaran, 0);
  const saldoBank = totalBankIn - totalBankOut;

  // BKU totals
  const totalBKUIn = bkuData.reduce((acc, curr) => acc + (curr.jenisTransaksi === 'penerimaan' ? curr.jumlah : 0), 0);
  const totalBKUOut = bkuData.reduce((acc, curr) => acc + (curr.jenisTransaksi === 'pengeluaran' ? curr.jumlah : 0), 0);
  const saldoBKUKas = totalBKUIn - totalBKUOut;

  // BKT (Cash) totals
  const cashIn = bkuData.reduce((acc, curr) => acc + (curr.metode === 'tunai' && curr.jenisTransaksi === 'penerimaan' ? curr.jumlah : 0), 0);
  const cashOut = bkuData.reduce((acc, curr) => acc + (curr.metode === 'tunai' && curr.jenisTransaksi === 'pengeluaran' ? curr.jumlah : 0), 0);
  const saldoBKT = cashIn - cashOut;

  // Taxes
  const taxItems = bkuData.filter((tx) => tx.jenisTransaksi === 'pengeluaran' && tx.pajak && tx.pajak.totalPajak > 0);
  const totalPajak = taxItems.reduce((acc, tx) => acc + tx.pajak.totalPajak, 0);
  const totalPajakSetor = taxItems
    .filter((tx) => tx.pajak.statusSetor === 'Sudah Disetor')
    .reduce((acc, tx) => acc + tx.pajak.totalPajak, 0);
  const totalPajakBelumSetor = totalPajak - totalPajakSetor;

  // Spending per category
  const categories = [
    { label: 'Pengeluaran Bahan', key: 'Pengeluaran Bahan', color: 'bg-blue-600' },
    { label: 'Pengeluaran Upah', key: 'Pengeluaran Upah', color: 'bg-emerald-600' },
    { label: 'Pengeluaran Alat', key: 'Pengeluaran Alat', color: 'bg-amber-600' },
    { label: 'Biaya Tim Teknis', key: 'Biaya Tim Teknis', color: 'bg-purple-600' },
    { label: 'Pengeluaran Operasional', key: 'Pengeluaran Operasional', color: 'bg-slate-600' },
  ];

  const categoryTotals = categories.map((cat) => {
    const total = bkuData
      .filter((tx) => tx.jenisTransaksi === 'pengeluaran' && tx.jenisBiaya === cat.key)
      .reduce((acc, tx) => acc + tx.jumlah, 0);
    const percentage = totalBKUOut > 0 ? (total / totalBKUOut) * 100 : 0;
    return { ...cat, total, percentage };
  });

  const recentTransactions = [...bkuData]
    .sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-6">
      
      {/* Top Header & Sub-tab Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium mb-1">
            <span>{schoolProfile.kabupatenKota}</span>
            <span>·</span>
            <span>Tahun Anggaran {schoolProfile.tahunAnggaran}</span>
            <span>·</span>
            <span>SK: {schoolProfile.nomorSK}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-emerald-700" />
            <span>{schoolProfile.namaProgram}</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Pengelolaan Keuangan Revitalisasi {schoolProfile.namaSekolah}
          </p>
        </div>

        {/* 2 Sub-menus: Data Summary vs Official Preview */}
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
            <span>Ringkasan & Analisis</span>
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
            <span>Pratinjau Rekap Laporan</span>
          </button>
        </div>
      </div>

      {/* SUB-TAB 2: PRATINJAU REKAPITULASI LAPORAN RESMI */}
      {subTab === 'preview' && (
        <OfficialReportSheet
          type="summary"
          bkuData={bkuData}
          schoolProfile={schoolProfile}
          bukuBankData={bukuBankData}
          onBackToInput={() => setSubTab('input')}
        />
      )}

      {/* SUB-TAB 1: RINGKASAN & ANALISIS DATA */}
      {subTab === 'input' && (
        <>
          {/* Quick Actions Bar */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Semua pembukuan tersinkronisasi otomatis (BKU, Bank, BKT, Pajak, Kwitansi).</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onOpenNewTransaction}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 transition-colors shadow-xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Input Transaksi BKU</span>
              </button>
              <button
                onClick={() => setActiveTab('kwitansi')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <Receipt className="w-3.5 h-3.5 text-emerald-700" />
                <span>Kwitansi Belanja</span>
              </button>
            </div>
          </div>


      {/* Main KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Saldo Bank */}
        <div 
          onClick={() => setActiveTab('buku_bank')}
          className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs hover:border-slate-300 transition-colors cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Saldo Buku Bank (BB)
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
              <Landmark className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-slate-900 tracking-tight tabular-nums">
            {formatRupiah(saldoBank)}
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500 mt-3 pt-2 border-t border-slate-100">
            <span>Rekening: {schoolProfile.namaBank}</span>
            <span className="text-blue-700 font-medium group-hover:underline">Buka BB →</span>
          </div>
        </div>

        {/* Card 2: Saldo BKT (Tunai) */}
        <div 
          onClick={() => setActiveTab('bkt')}
          className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs hover:border-slate-300 transition-colors cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Saldo Kas Tunai (BKT)
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-slate-900 tracking-tight tabular-nums">
            {formatRupiah(saldoBKT)}
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500 mt-3 pt-2 border-t border-slate-100">
            <span>Otomatis Sinkron BKU</span>
            <span className="text-emerald-700 font-medium group-hover:underline">Buka BKT →</span>
          </div>
        </div>

        {/* Card 3: Realisasi Belanja */}
        <div 
          onClick={() => setActiveTab('bku')}
          className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs hover:border-slate-300 transition-colors cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Realisasi Belanja
            </span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-slate-900 tracking-tight tabular-nums">
            {formatRupiah(totalBKUOut)}
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500 mt-3 pt-2 border-t border-slate-100">
            <span>{bkuData.filter((x) => x.jenisTransaksi === 'pengeluaran').length} transaksi belanja</span>
            <span className="text-slate-800 font-medium group-hover:underline">Buka BKU →</span>
          </div>
        </div>

        {/* Card 4: Total Pajak */}
        <div 
          onClick={() => setActiveTab('buku_pajak')}
          className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs hover:border-slate-300 transition-colors cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Rekapitulasi Pajak
            </span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-slate-900 tracking-tight tabular-nums">
            {formatRupiah(totalPajak)}
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500 mt-3 pt-2 border-t border-slate-100">
            <span className={totalPajakBelumSetor > 0 ? 'text-amber-700 font-medium' : 'text-emerald-700 font-medium'}>
              {totalPajakBelumSetor > 0 ? `${formatRupiah(totalPajakBelumSetor)} belum setor` : 'Semua disetor'}
            </span>
            <span className="text-purple-700 font-medium group-hover:underline">Buku Pajak →</span>
          </div>
        </div>

      </div>

      {/* Grid: Spending Breakdown & Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Realisasi per Jenis Biaya */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs lg:col-span-1 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">
              Realisasi per Jenis Biaya
            </h2>
            <span className="text-xs text-slate-500 font-mono">
              {formatRupiah(totalBKUOut)}
            </span>
          </div>

          <div className="space-y-3 pt-1">
            {categoryTotals.map((cat) => (
              <div key={cat.key} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-700 font-medium">{cat.label}</span>
                  <span className="font-mono text-slate-600 tabular-nums">
                    {formatRupiah(cat.total)} ({cat.percentage.toFixed(1)}%)
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className={`${cat.color} h-2 rounded-full transition-all duration-300`}
                    style={{ width: `${Math.min(100, Math.max(0, cat.percentage))}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-slate-100 text-xs text-slate-500">
            Termasuk ketentuan pengenaan pajak PPN (11%), PPh 22 (1.5%), PPh 23 (2%), PPh 4(2) (4%), dan PPh 21 (5%).
          </div>
        </div>

        {/* Transaksi Terbaru di BKU */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">
              Transaksi Terakhir di BKU
            </h2>
            <button
              onClick={() => setActiveTab('bku')}
              className="text-xs text-emerald-700 font-medium hover:underline cursor-pointer"
            >
              Lihat Semua ({bkuData.length})
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {recentTransactions.map((tx) => {
              const isPengeluaran = tx.jenisTransaksi === 'pengeluaran';
              return (
                <div
                  key={tx.id}
                  className="py-3 flex items-center justify-between gap-4 hover:bg-slate-50 -mx-2 px-2 rounded-lg transition-colors"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                        isPengeluaran
                          ? 'bg-rose-50 text-rose-600'
                          : 'bg-emerald-50 text-emerald-700'
                      }`}
                    >
                      {isPengeluaran ? (
                        <ArrowUpRight className="w-4 h-4" />
                      ) : (
                        <ArrowDownLeft className="w-4 h-4" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-medium text-slate-900 truncate">
                        {tx.uraian}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                        <span className="font-mono">{formatTanggalShort(tx.tanggal)}</span>
                        <span>·</span>
                        <span className="font-mono">{tx.noBukti}</span>
                        {tx.jenisBiaya && (
                          <>
                            <span>·</span>
                            <span className="text-slate-600">{tx.jenisBiaya}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0 flex items-center gap-3">
                    <div>
                      <div
                        className={`text-xs sm:text-sm font-bold font-mono tabular-nums ${
                          isPengeluaran ? 'text-slate-900' : 'text-emerald-700'
                        }`}
                      >
                        {isPengeluaran ? '-' : '+'}{formatRupiah(tx.jumlah)}
                      </div>
                      {tx.pajak && tx.pajak.totalPajak > 0 && (
                        <div className="text-[11px] text-slate-500 font-mono">
                          Pajak: {formatRupiah(tx.pajak.totalPajak)}
                        </div>
                      )}
                    </div>

                    {isPengeluaran && (
                      <button
                        onClick={() => onSelectKwitansi(tx)}
                        title="Lihat / Cetak Kwitansi"
                        className="p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-md transition-colors"
                      >
                        <Receipt className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
      </>
      )}

    </div>
  );
};
