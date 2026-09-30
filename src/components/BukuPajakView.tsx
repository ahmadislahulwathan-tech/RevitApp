import React, { useState } from 'react';
import { BKUTransaction, SchoolProfile } from '../types';
import { OfficialReportSheet } from './OfficialReportSheet';
import { formatRupiah, formatAngka, formatTanggalShort, exportToCSV } from '../utils/format';
import { 
  Percent, 
  Search, 
  Download, 
  Printer, 
  CheckCircle2, 
  Clock, 
  Check, 
  Edit3, 
  X,
  Scale
} from 'lucide-react';

interface BukuPajakViewProps {
  bkuData: BKUTransaction[];
  schoolProfile: SchoolProfile;
  onUpdateTransaction: (tx: BKUTransaction) => void;
  onOpenPrintReport?: () => void;
  initialSubTab?: 'input' | 'preview';
}

export const BukuPajakView: React.FC<BukuPajakViewProps> = ({
  bkuData,
  schoolProfile,
  onUpdateTransaction,
  onOpenPrintReport,
  initialSubTab = 'input',
}) => {
  const [subTab, setSubTab] = useState<'input' | 'preview'>(initialSubTab);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'Sudah Disetor' | 'Belum Disetor'>('all');
  const [filterJenisBiaya, setFilterJenisBiaya] = useState<string>('all');
  
  // Quick NTPN edit modal
  const [editingNTPNItem, setEditingNTPNItem] = useState<BKUTransaction | null>(null);
  const [ntpnInput, setNtpnInput] = useState('');
  const [statusInput, setStatusInput] = useState<'Sudah Disetor' | 'Belum Disetor'>('Sudah Disetor');

  // Filter only expenditures that have taxes or DPP
  const taxTransactions = bkuData.filter((item) => {
    return (
      item.jenisTransaksi === 'pengeluaran' &&
      item.pajak &&
      (item.pajak.totalPajak > 0 || item.pajak.dpp > 0)
    );
  });

  const filteredRows = taxTransactions.filter((item) => {
    const term = searchTerm.toLowerCase();
    const matchSearch =
      item.uraian.toLowerCase().includes(term) ||
      item.noBukti.toLowerCase().includes(term) ||
      (item.pajak?.ntpn && item.pajak.ntpn.toLowerCase().includes(term)) ||
      (item.penerimaNama && item.penerimaNama.toLowerCase().includes(term));

    const matchStatus =
      filterStatus === 'all' || item.pajak.statusSetor === filterStatus;

    const matchBiaya =
      filterJenisBiaya === 'all' || item.jenisBiaya === filterJenisBiaya;

    return matchSearch && matchStatus && matchBiaya;
  });

  // Calculate totals
  const totalAlat = filteredRows.reduce((acc, c) => acc + (c.jenisBiaya === 'Pengeluaran Alat' ? c.jumlah : 0), 0);
  const totalBahan = filteredRows.reduce((acc, c) => acc + (c.jenisBiaya === 'Pengeluaran Bahan' ? c.jumlah : 0), 0);
  const totalUpah = filteredRows.reduce((acc, c) => acc + (c.jenisBiaya === 'Pengeluaran Upah' ? c.jumlah : 0), 0);
  const totalOperasional = filteredRows.reduce((acc, c) => acc + (c.jenisBiaya === 'Pengeluaran Operasional' ? c.jumlah : 0), 0);
  const totalTimTeknis = filteredRows.reduce((acc, c) => acc + (c.jenisBiaya === 'Biaya Tim Teknis' ? c.jumlah : 0), 0);

  const totalDPP = filteredRows.reduce((acc, c) => acc + c.pajak.dpp, 0);
  const totalPPN = filteredRows.reduce((acc, c) => acc + c.pajak.ppn, 0);
  const totalPPh22 = filteredRows.reduce((acc, c) => acc + c.pajak.pph22, 0);
  const totalPPh23 = filteredRows.reduce((acc, c) => acc + c.pajak.pph23, 0);
  const totalPPh4_2 = filteredRows.reduce((acc, c) => acc + c.pajak.pph4_2, 0);
  const totalPPh21 = filteredRows.reduce((acc, c) => acc + c.pajak.pph21, 0);
  const grandTotalPajak = filteredRows.reduce((acc, c) => acc + c.pajak.totalPajak, 0);

  const totalSudahSetor = taxTransactions
    .filter((tx) => tx.pajak.statusSetor === 'Sudah Disetor')
    .reduce((acc, tx) => acc + tx.pajak.totalPajak, 0);

  const totalBelumSetor = taxTransactions
    .filter((tx) => tx.pajak.statusSetor !== 'Sudah Disetor')
    .reduce((acc, tx) => acc + tx.pajak.totalPajak, 0);

  const handleOpenNTPN = (item: BKUTransaction) => {
    setEditingNTPNItem(item);
    setNtpnInput(item.pajak.ntpn || '');
    setStatusInput(item.pajak.statusSetor || 'Sudah Disetor');
  };

  const handleSaveNTPN = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNTPNItem) return;

    onUpdateTransaction({
      ...editingNTPNItem,
      pajak: {
        ...editingNTPNItem.pajak,
        statusSetor: statusInput,
        ntpn: ntpnInput,
        tanggalSetor: statusInput === 'Sudah Disetor' ? new Date().toISOString().split('T')[0] : undefined,
      },
    });

    setEditingNTPNItem(null);
  };

  const handleExportCSV = () => {
    const headers = [
      'No',
      'Tanggal',
      'Uraian Transaksi',
      'Nomor Bukti',
      'Jenis Biaya',
      'Pengeluaran Alat (Rp)',
      'Pengeluaran Bahan (Rp)',
      'Pengeluaran Upah (Rp)',
      'Pengeluaran Operasional (Rp)',
      'Biaya Tim Teknis (Rp)',
      'DPP (Rp)',
      'PPN 11% (Rp)',
      'PPh 22 (1.5%) (Rp)',
      'PPh 23 (2%) (Rp)',
      'PPh 4(2) (4%) (Rp)',
      'PPh 21 (5%) (Rp)',
      'Total Pajak (Rp)',
      'Status Setor',
      'NTPN',
    ];

    const rows = filteredRows.map((r, idx) => [
      idx + 1,
      r.tanggal,
      r.uraian,
      r.noBukti,
      r.jenisBiaya || '-',
      r.jenisBiaya === 'Pengeluaran Alat' ? r.jumlah : 0,
      r.jenisBiaya === 'Pengeluaran Bahan' ? r.jumlah : 0,
      r.jenisBiaya === 'Pengeluaran Upah' ? r.jumlah : 0,
      r.jenisBiaya === 'Pengeluaran Operasional' ? r.jumlah : 0,
      r.jenisBiaya === 'Biaya Tim Teknis' ? r.jumlah : 0,
      r.pajak.dpp,
      r.pajak.ppn,
      r.pajak.pph22,
      r.pajak.pph23,
      r.pajak.pph4_2,
      r.pajak.pph21,
      r.pajak.totalPajak,
      r.pajak.statusSetor,
      r.pajak.ntpn || '-',
    ]);

    exportToCSV(`Buku_Pajak_Revitalisasi_${schoolProfile.tahunAnggaran}`, headers, rows);
  };

  return (
    <div className="space-y-6">
      
      {/* Header bar with Sub-tab Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Scale className="w-6 h-6 text-emerald-700" />
            <span>Buku Pembantu Pajak</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Rekapitulasi seluruh potongan pajak pembelanjaan BKU: PPN 11%, PPh 22, 23, 4(2), 21, dan status NTPN.
          </p>
        </div>

        {/* 2 Sub-menus: Input/Status vs Preview */}
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
            <span>Catatan & Status Pajak</span>
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
            <span>Pratinjau & Cetak Pajak</span>
          </button>
        </div>
      </div>

      {/* SUB-TAB 2: PRATINJAU & CETAK RESMI */}
      {subTab === 'preview' && (
        <OfficialReportSheet
          type="buku_pajak"
          bkuData={bkuData}
          schoolProfile={schoolProfile}
          onBackToInput={() => setSubTab('input')}
        />
      )}

      {/* SUB-TAB 1: KELOLA & CATATAN PAJAK */}
      {subTab === 'input' && (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                Rekapitulasi Pemotongan Pajak Pembelanjaan
              </h2>
              <p className="text-xs text-slate-500">
                Klik ikon edit pada baris transaksi untuk mengisi nomor NTPN bukti setor.
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
                <span>Pratinjau Cetak Pajak</span>
              </button>
            </div>
          </div>

      {/* Tax Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase">PPN (11%)</span>
          <div className="text-base sm:text-lg font-bold font-mono text-slate-900 mt-1 tabular-nums">
            {formatRupiah(totalPPN)}
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5 block">100/111 × Nilai</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase">PPh 22 (1,5%)</span>
          <div className="text-base sm:text-lg font-bold font-mono text-slate-900 mt-1 tabular-nums">
            {formatRupiah(totalPPh22)}
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Pengadaan Bahan</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase">PPh 23 (2%)</span>
          <div className="text-base sm:text-lg font-bold font-mono text-slate-900 mt-1 tabular-nums">
            {formatRupiah(totalPPh23)}
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Sewa Alat & Molen</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase">PPh 4(2) (4%)</span>
          <div className="text-base sm:text-lg font-bold font-mono text-slate-900 mt-1 tabular-nums">
            {formatRupiah(totalPPh4_2)}
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Jasa Konstruksi</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase">PPh 21 (5%)</span>
          <div className="text-base sm:text-lg font-bold font-mono text-slate-900 mt-1 tabular-nums">
            {formatRupiah(totalPPh21)}
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Upah & Tim Teknis</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs bg-purple-50/40">
          <span className="text-[11px] font-semibold text-purple-800 uppercase">Total Pajak</span>
          <div className="text-base sm:text-lg font-bold font-mono text-purple-900 mt-1 tabular-nums">
            {formatRupiah(grandTotalPajak)}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5 flex items-center justify-between">
            <span>Setor: {formatRupiah(totalSudahSetor)}</span>
          </div>
        </div>

      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Cari uraian, nomor bukti, atau NTPN..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs sm:text-sm border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          
          {/* Status Filter */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg text-xs font-medium">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                filterStatus === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semua
            </button>
            <button
              onClick={() => setFilterStatus('Sudah Disetor')}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                filterStatus === 'Sudah Disetor' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Sudah Disetor
            </button>
            <button
              onClick={() => setFilterStatus('Belum Disetor')}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                filterStatus === 'Belum Disetor' ? 'bg-white text-amber-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Belum Disetor
            </button>
          </div>

          {/* Filter Jenis Biaya */}
          <select
            value={filterJenisBiaya}
            onChange={(e) => setFilterJenisBiaya(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 cursor-pointer"
          >
            <option value="all">Semua Jenis Biaya</option>
            <option value="Pengeluaran Bahan">Pengeluaran Bahan</option>
            <option value="Pengeluaran Upah">Pengeluaran Upah</option>
            <option value="Pengeluaran Alat">Pengeluaran Alat</option>
            <option value="Biaya Tim Teknis">Biaya Tim Teknis</option>
            <option value="Pengeluaran Operasional">Pengeluaran Operasional</option>
          </select>

        </div>

      </div>

      {/* Main Tax Table with Exact Columns Requested */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold text-center text-[11px]">
                <th rowSpan={2} className="py-2.5 px-2 border-r border-slate-200 w-10">No</th>
                <th rowSpan={2} className="py-2.5 px-2 border-r border-slate-200 w-20">Tanggal</th>
                <th rowSpan={2} className="py-2.5 px-3 border-r border-slate-200 text-left min-w-[180px]">Uraian</th>
                <th rowSpan={2} className="py-2.5 px-2 border-r border-slate-200 w-28">Nomor Bukti</th>
                <th rowSpan={2} className="py-2.5 px-2 border-r border-slate-200 w-24">Jenis Biaya</th>
                <th colSpan={5} className="py-1.5 px-2 border-r border-b border-slate-200 bg-slate-100/70">
                  Rincian Pengeluaran Belanja (Rp)
                </th>
                <th rowSpan={2} className="py-2.5 px-2 border-r border-slate-200 w-24">DPP (Rp)</th>
                <th colSpan={5} className="py-1.5 px-2 border-r border-b border-slate-200 bg-slate-100/70">
                  Rincian Potongan Pajak (Rp)
                </th>
                <th rowSpan={2} className="py-2.5 px-2 border-r border-slate-200 w-24">Total Pajak</th>
                <th rowSpan={2} className="py-2.5 px-2 text-center w-28">Status / NTPN</th>
              </tr>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[10px] text-center">
                {/* 5 columns of expenditures */}
                <th className="py-1.5 px-2 border-r border-slate-200 w-20">Alat</th>
                <th className="py-1.5 px-2 border-r border-slate-200 w-20">Bahan</th>
                <th className="py-1.5 px-2 border-r border-slate-200 w-20">Upah</th>
                <th className="py-1.5 px-2 border-r border-slate-200 w-20">Operasional</th>
                <th className="py-1.5 px-2 border-r border-slate-200 w-20">Tim Teknis</th>
                {/* 5 columns of taxes */}
                <th className="py-1.5 px-2 border-r border-slate-200 w-20">PPN (11%)</th>
                <th className="py-1.5 px-2 border-r border-slate-200 w-20">PPh 22 (1.5%)</th>
                <th className="py-1.5 px-2 border-r border-slate-200 w-20">PPh 23 (2%)</th>
                <th className="py-1.5 px-2 border-r border-slate-200 w-20">PPh 4(2) (4%)</th>
                <th className="py-1.5 px-2 border-r border-slate-200 w-20">PPh 21 (5%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={18} className="py-10 text-center text-slate-400">
                    Tidak ada transaksi belanja berpajak yang sesuai kriteria.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row, idx) => (
                  <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-2 text-center text-slate-400 border-r border-slate-100">{idx + 1}</td>
                    <td className="py-2.5 px-2 font-mono text-slate-700 whitespace-nowrap border-r border-slate-100 text-[11px]">
                      {formatTanggalShort(row.tanggal)}
                    </td>
                    <td className="py-2.5 px-3 text-slate-900 border-r border-slate-100">
                      <div className="font-medium line-clamp-2">{row.uraian}</div>
                    </td>
                    <td className="py-2.5 px-2 font-mono text-[11px] text-slate-800 whitespace-nowrap border-r border-slate-100">
                      {row.noBukti}
                    </td>
                    <td className="py-2.5 px-2 text-[11px] text-slate-600 whitespace-nowrap border-r border-slate-100">
                      {row.jenisBiaya}
                    </td>

                    {/* Breakdown expenditures */}
                    <td className="py-2.5 px-2 text-right font-mono tabular-nums border-r border-slate-100 text-slate-700">
                      {row.jenisBiaya === 'Pengeluaran Alat' ? formatAngka(row.jumlah) : '-'}
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono tabular-nums border-r border-slate-100 text-slate-700">
                      {row.jenisBiaya === 'Pengeluaran Bahan' ? formatAngka(row.jumlah) : '-'}
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono tabular-nums border-r border-slate-100 text-slate-700">
                      {row.jenisBiaya === 'Pengeluaran Upah' ? formatAngka(row.jumlah) : '-'}
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono tabular-nums border-r border-slate-100 text-slate-700">
                      {row.jenisBiaya === 'Pengeluaran Operasional' ? formatAngka(row.jumlah) : '-'}
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono tabular-nums border-r border-slate-100 text-slate-700">
                      {row.jenisBiaya === 'Biaya Tim Teknis' ? formatAngka(row.jumlah) : '-'}
                    </td>

                    {/* DPP */}
                    <td className="py-2.5 px-2 text-right font-mono tabular-nums font-semibold border-r border-slate-100 text-slate-900">
                      {row.pajak.dpp > 0 ? formatAngka(row.pajak.dpp) : '-'}
                    </td>

                    {/* Taxes */}
                    <td className="py-2.5 px-2 text-right font-mono tabular-nums border-r border-slate-100 text-slate-800">
                      {row.pajak.ppn > 0 ? formatAngka(row.pajak.ppn) : '-'}
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono tabular-nums border-r border-slate-100 text-slate-800">
                      {row.pajak.pph22 > 0 ? formatAngka(row.pajak.pph22) : '-'}
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono tabular-nums border-r border-slate-100 text-slate-800">
                      {row.pajak.pph23 > 0 ? formatAngka(row.pajak.pph23) : '-'}
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono tabular-nums border-r border-slate-100 text-slate-800">
                      {row.pajak.pph4_2 > 0 ? formatAngka(row.pajak.pph4_2) : '-'}
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono tabular-nums border-r border-slate-100 text-slate-800">
                      {row.pajak.pph21 > 0 ? formatAngka(row.pajak.pph21) : '-'}
                    </td>

                    {/* Total Pajak */}
                    <td className="py-2.5 px-2 text-right font-mono tabular-nums font-bold text-red-700 border-r border-slate-100">
                      {row.pajak.totalPajak > 0 ? formatAngka(row.pajak.totalPajak) : '-'}
                    </td>

                    {/* Status & NTPN Action */}
                    <td className="py-2.5 px-2 text-center whitespace-nowrap">
                      <button
                        onClick={() => handleOpenNTPN(row)}
                        title="Klik untuk ubah status setor / masukkan NTPN"
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-700 hover:text-emerald-800 transition-colors p-1 rounded"
                      >
                        {row.pajak.statusSetor === 'Sudah Disetor' ? (
                          <span className="text-emerald-700 flex items-center gap-0.5 font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Disetor
                          </span>
                        ) : (
                          <span className="text-amber-700 flex items-center gap-0.5">
                            <Clock className="w-3.5 h-3.5" /> Belum
                          </span>
                        )}
                        <Edit3 className="w-3 h-3 text-slate-400" />
                      </button>
                      {row.pajak.ntpn && (
                        <div className="font-mono text-[10px] text-slate-500 truncate max-w-[90px] mx-auto">
                          {row.pajak.ntpn}
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {filteredRows.length > 0 && (
              <tfoot>
                <tr className="bg-slate-100 font-bold border-t-2 border-slate-300 text-slate-900 text-[11px]">
                  <td colSpan={5} className="py-3 px-3 text-center border-r border-slate-300">
                    JUMLAH REKAPITULASI
                  </td>
                  <td className="py-2.5 px-2 text-right font-mono tabular-nums border-r border-slate-300">
                    {formatAngka(totalAlat)}
                  </td>
                  <td className="py-2.5 px-2 text-right font-mono tabular-nums border-r border-slate-300">
                    {formatAngka(totalBahan)}
                  </td>
                  <td className="py-2.5 px-2 text-right font-mono tabular-nums border-r border-slate-300">
                    {formatAngka(totalUpah)}
                  </td>
                  <td className="py-2.5 px-2 text-right font-mono tabular-nums border-r border-slate-300">
                    {formatAngka(totalOperasional)}
                  </td>
                  <td className="py-2.5 px-2 text-right font-mono tabular-nums border-r border-slate-300">
                    {formatAngka(totalTimTeknis)}
                  </td>
                  <td className="py-2.5 px-2 text-right font-mono tabular-nums font-bold border-r border-slate-300">
                    {formatAngka(totalDPP)}
                  </td>
                  <td className="py-2.5 px-2 text-right font-mono tabular-nums border-r border-slate-300">
                    {formatAngka(totalPPN)}
                  </td>
                  <td className="py-2.5 px-2 text-right font-mono tabular-nums border-r border-slate-300">
                    {formatAngka(totalPPh22)}
                  </td>
                  <td className="py-2.5 px-2 text-right font-mono tabular-nums border-r border-slate-300">
                    {formatAngka(totalPPh23)}
                  </td>
                  <td className="py-2.5 px-2 text-right font-mono tabular-nums border-r border-slate-300">
                    {formatAngka(totalPPh4_2)}
                  </td>
                  <td className="py-2.5 px-2 text-right font-mono tabular-nums border-r border-slate-300">
                    {formatAngka(totalPPh21)}
                  </td>
                  <td className="py-2.5 px-2 text-right font-mono tabular-nums font-bold text-red-700 border-r border-slate-300">
                    {formatAngka(grandTotalPajak)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Quick NTPN Modal */}
      {editingNTPNItem && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-semibold text-slate-900">
                Pembaruan Status Penyetoran Pajak
              </h3>
              <button
                onClick={() => setEditingNTPNItem(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-slate-600">
              <span className="font-medium text-slate-900">{editingNTPNItem.noBukti}</span> · {editingNTPNItem.uraian}
            </div>

            <form onSubmit={handleSaveNTPN} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-medium mb-1">
                  Status Penyetoran ke Kas Negara
                </label>
                <select
                  value={statusInput}
                  onChange={(e) => setStatusInput(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-1 focus:ring-emerald-600"
                >
                  <option value="Sudah Disetor">Sudah Disetor</option>
                  <option value="Belum Disetor">Belum Disetor</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">
                  Nomor Transaksi Penerimaan Negara (NTPN) / Kode Billing
                </label>
                <input
                  type="text"
                  placeholder="Contoh: 98C4E7812A45F01"
                  value={ntpnInput}
                  onChange={(e) => setNtpnInput(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-1 focus:ring-emerald-600 font-mono text-xs"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingNTPNItem(null)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-700 rounded-md hover:bg-emerald-800"
                >
                  Simpan Status
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
        </>
      )}

    </div>
  );
};
