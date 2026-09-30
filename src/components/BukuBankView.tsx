import React, { useState, useEffect } from 'react';
import { BukuBankTransaction, BKUTransaction, SchoolProfile } from '../types';
import { OfficialBankSheet } from './OfficialBankSheet';
import { formatRupiah, formatAngka, formatTanggalShort, formatBulanTahunKapital, exportToCSV } from '../utils/format';
import { exportBukuBankToExcel } from '../utils/excelExport';
import { 
  Plus, 
  Search, 
  Trash2, 
  Edit3, 
  Download, 
  Printer, 
  Check, 
  X, 
  Landmark, 
  ArrowUpRight, 
  ArrowDownLeft,
  FileSpreadsheet
} from 'lucide-react';

interface BukuBankViewProps {
  bukuBankData: BukuBankTransaction[];
  onAddTransaction: (tx: BukuBankTransaction, syncToBKU?: boolean) => void;
  onUpdateTransaction: (tx: BukuBankTransaction) => void;
  onDeleteTransaction: (id: string) => void;
  schoolProfile: SchoolProfile;
  onOpenPrintReport?: () => void;
  onOpenPrintBukuBank?: () => void;
  initialSubTab?: 'input' | 'preview';
}

export const BukuBankView: React.FC<BukuBankViewProps> = ({
  bukuBankData,
  onAddTransaction,
  onUpdateTransaction,
  onDeleteTransaction,
  schoolProfile,
  onOpenPrintReport,
  onOpenPrintBukuBank,
  initialSubTab = 'input',
}) => {
  const [subTab, setSubTab] = useState<'input' | 'preview'>(initialSubTab);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<BukuBankTransaction | null>(null);
  const [deletingTx, setDeletingTx] = useState<BukuBankTransaction | null>(null);

  useEffect(() => {
    if (initialSubTab) {
      setSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  useEffect(() => {
    if (isModalOpen) {
      setSubTab('input');
    }
  }, [isModalOpen]);

  // Form State
  const [formData, setFormData] = useState<{
    tanggal: string;
    uraian: string;
    noBukti: string;
    tipe: 'penerimaan' | 'pengeluaran';
    jumlah: number;
    sisaManual: string; // optional manual override
    syncToBKU: boolean;
  }>({
    tanggal: new Date().toISOString().split('T')[0],
    uraian: '',
    noBukti: '',
    tipe: 'penerimaan',
    jumlah: 0,
    sisaManual: '',
    syncToBKU: false,
  });

  const openAddModal = () => {
    setEditingTx(null);
    setFormData({
      tanggal: new Date().toISOString().split('T')[0],
      uraian: '',
      noBukti: `BB-${String(bukuBankData.length + 1).padStart(2, '0')}/BNK/${new Date().getFullYear()}`,
      tipe: 'penerimaan',
      jumlah: 0,
      sisaManual: '',
      syncToBKU: false,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (tx: BukuBankTransaction) => {
    setEditingTx(tx);
    const isPenerimaan = tx.penerimaan > 0;
    setFormData({
      tanggal: tx.tanggal,
      uraian: tx.uraian,
      noBukti: tx.noBukti,
      tipe: isPenerimaan ? 'penerimaan' : 'pengeluaran',
      jumlah: isPenerimaan ? tx.penerimaan : tx.pengeluaran,
      sisaManual: tx.sisa !== undefined ? String(tx.sisa) : '',
      syncToBKU: false,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const penerimaan = formData.tipe === 'penerimaan' ? formData.jumlah : 0;
    const pengeluaran = formData.tipe === 'pengeluaran' ? formData.jumlah : 0;
    const sisa = formData.sisaManual.trim() !== '' ? Number(formData.sisaManual) : undefined;

    if (editingTx) {
      onUpdateTransaction({
        ...editingTx,
        tanggal: formData.tanggal,
        uraian: formData.uraian,
        noBukti: formData.noBukti,
        penerimaan,
        pengeluaran,
        sisa,
      });
    } else {
      const newTx: BukuBankTransaction = {
        id: `bb-${Date.now()}`,
        tanggal: formData.tanggal,
        uraian: formData.uraian,
        noBukti: formData.noBukti,
        penerimaan,
        pengeluaran,
        sisa,
        createdAt: Date.now(),
      };
      onAddTransaction(newTx, formData.syncToBKU);
    }

    setIsModalOpen(false);
  };

  // Sort and calculate running balances
  const sorted = [...bukuBankData].sort((a, b) => new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime());
  let running = 0;
  const enrichedRows = sorted.map((row) => {
    running += row.penerimaan - row.pengeluaran;
    return {
      ...row,
      sisaOtomatis: running,
      sisaFinal: row.sisa !== undefined ? row.sisa : running,
    };
  });

  const filteredRows = enrichedRows.filter((row) => {
    const term = searchTerm.toLowerCase();
    return (
      row.uraian.toLowerCase().includes(term) ||
      row.noBukti.toLowerCase().includes(term)
    );
  });

  const totalIn = bukuBankData.reduce((acc, c) => acc + c.penerimaan, 0);
  const totalOut = bukuBankData.reduce((acc, c) => acc + c.pengeluaran, 0);
  const currentSaldo = totalIn - totalOut;

  const handleExportCSV = () => {
    const headers = ['No', 'Tanggal', 'Nomor Bukti', 'Uraian Transaksi', 'Penerimaan (Rp)', 'Pengeluaran (Rp)', 'Sisa (Rp)'];
    const rows = enrichedRows.map((r, i) => [
      i + 1,
      r.tanggal,
      r.noBukti,
      r.uraian,
      r.penerimaan,
      r.pengeluaran,
      r.sisaFinal,
    ]);
    exportToCSV(`Buku_Bank_${schoolProfile.tahunAnggaran}`, headers, rows);
  };

  const [isExportingExcel, setIsExportingExcel] = useState(false);

  const handleDirectExportExcel = async () => {
    try {
      setIsExportingExcel(true);
      const activeTransactions = filteredRows.length > 0 ? filteredRows : enrichedRows;
      const totalIn = activeTransactions.reduce((acc, c) => acc + c.penerimaan, 0);
      const totalOut = activeTransactions.reduce((acc, c) => acc + c.pengeluaran, 0);
      const sisaBank = totalIn - totalOut;

      const latestDate = activeTransactions.length > 0
        ? activeTransactions[activeTransactions.length - 1].tanggal
        : new Date().toISOString().split('T')[0];

      const monthLabel = activeTransactions.length > 0
        ? formatBulanTahunKapital(latestDate)
        : `TAHUN ANGGARAN ${schoolProfile.tahunAnggaran || '2025'}`;

      await exportBukuBankToExcel({
        rows: activeTransactions.map((r) => ({
          id: r.id,
          tanggal: r.tanggal,
          uraian: r.uraian,
          noBukti: r.noBukti,
          penerimaan: r.penerimaan,
          pengeluaran: r.pengeluaran,
          saldo: r.sisaFinal,
        })),
        currentMonthLabel: monthLabel,
        closingDateIso: latestDate,
        schoolProfile,
        totalPenerimaan: totalIn,
        totalPengeluaran: totalOut,
        sisaBank,
        desa: schoolProfile.desa || 'GAPUK',
        kecamatan: schoolProfile.kecamatan || 'SURALAGA',
        kabupaten: schoolProfile.kabupatenKota || 'LOMBOK TIMUR',
        provinsi: schoolProfile.provinsi || 'NTB',
        singkatan: schoolProfile.singkatanTim || 'P2SP',
      });
    } catch (err) {
      console.error('Gagal mengekspor Excel Buku Kas Bank:', err);
    } finally {
      setIsExportingExcel(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header bar with Sub-tab Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Landmark className="w-6 h-6 text-emerald-700" />
            <span>Buku Kas Bank (BB)</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Pencatatan mutasi kas bank, pencairan termin dana revitalisasi, bunga bank, dan penarikan kas.
          </p>
        </div>

        {/* 2 Sub-menus: Edit/Input Data & Pratinjau/Cetak */}
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
            <span>Input & Catat Bank</span>
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
            <span>Pratinjau & Cetak Bank</span>
          </button>
        </div>
      </div>

      {/* SUB-TAB 2: PRATINJAU & CETAK RESMI */}
      {subTab === 'preview' && (
        <OfficialBankSheet
          bukuBankData={bukuBankData}
          schoolProfile={schoolProfile}
          onBackToInput={() => setSubTab('input')}
        />
      )}

      {/* SUB-TAB 1: KELOLA & INPUT DATA */}
      {subTab === 'input' && (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                Daftar Mutasi Buku Kas Bank
              </h2>
              <p className="text-xs text-slate-500">
                Pencatatan saldo giro/tabungan resmi bantuan revitalisasi sekolah.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDirectExportExcel}
                disabled={isExportingExcel}
                title="Ekspor ke Excel (.xlsx) dengan tata letak resmi persis cetakan"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 rounded-md hover:bg-emerald-700 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>{isExportingExcel ? 'Mengekspor...' : 'Ekspor Excel (.xlsx)'}</span>
              </button>

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
                <span>Pratinjau Cetak Bank</span>
              </button>

              <button
                type="button"
                onClick={openAddModal}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-700 rounded-md hover:bg-emerald-800 transition-colors shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Catatan Bank</span>
              </button>
            </div>
          </div>

      {/* Account Info & Stats Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        
        {/* Info Rekening */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs md:col-span-1 space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase">
            <Landmark className="w-3.5 h-3.5 text-blue-600" />
            <span>Rekening Bank</span>
          </div>
          <div className="text-sm font-bold text-slate-900">{schoolProfile.namaBank}</div>
          <div className="text-xs font-mono text-slate-600 font-semibold">{schoolProfile.noRekening}</div>
          <div className="text-[11px] text-slate-500 truncate">{schoolProfile.namaRekening}</div>
        </div>

        {/* Total Masuk */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <span className="text-xs font-medium text-slate-500 uppercase">Total Penerimaan Bank</span>
          <div className="text-lg sm:text-xl font-bold font-mono text-emerald-800 mt-1 tabular-nums">
            {formatRupiah(totalIn)}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Termin pencairan & bunga</span>
        </div>

        {/* Total Keluar */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <span className="text-xs font-medium text-slate-500 uppercase">Total Pengeluaran Bank</span>
          <div className="text-lg sm:text-xl font-bold font-mono text-slate-900 mt-1 tabular-nums">
            {formatRupiah(totalOut)}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Penarikan tunai & transfer</span>
        </div>

        {/* Saldo Akhir */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <span className="text-xs font-medium text-slate-500 uppercase">Sisa Saldo Rekening</span>
          <div className="text-lg sm:text-xl font-bold font-mono text-blue-800 mt-1 tabular-nums">
            {formatRupiah(currentSaldo)}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Saldo riil di bank</span>
        </div>

      </div>

      {/* Filter and Search */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Cari uraian atau nomor bukti..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs sm:text-sm border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600"
          />
        </div>
      </div>

      {/* Table Buku Bank */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-3 text-center w-12">No</th>
                <th className="py-3 px-3 w-28">Tanggal</th>
                <th className="py-3 px-3 w-36">Nomor Bukti</th>
                <th className="py-3 px-4">Uraian Transaksi</th>
                <th className="py-3 px-3 text-right w-32">Penerimaan (Rp)</th>
                <th className="py-3 px-3 text-right w-32">Pengeluaran (Rp)</th>
                <th className="py-3 px-3 text-right w-32">Sisa (Rp)</th>
                <th className="py-3 px-3 text-center w-24">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400">
                    Belum ada transaksi di Buku Bank.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row, idx) => (
                  <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 text-center text-slate-400">{idx + 1}</td>
                    <td className="py-3 px-3 font-mono text-slate-700 whitespace-nowrap">
                      {formatTanggalShort(row.tanggal)}
                    </td>
                    <td className="py-3 px-3 font-mono text-[11px] font-medium text-slate-800 whitespace-nowrap">
                      {row.noBukti}
                    </td>
                    <td className="py-3 px-4 text-slate-900 font-medium">
                      {row.uraian}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-emerald-700 font-medium">
                      {row.penerimaan > 0 ? formatRupiah(row.penerimaan) : '-'}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-900 font-medium">
                      {row.pengeluaran > 0 ? formatRupiah(row.pengeluaran) : '-'}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums font-bold text-slate-900">
                      {formatRupiah(row.sisaFinal)}
                    </td>
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => openEditModal(row)}
                          title="Edit Catatan"
                          className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeletingTx(row)}
                          title="Hapus"
                          className="p-1.5 text-slate-400 hover:text-red-700 hover:bg-red-50 rounded transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {filteredRows.length > 0 && (
              <tfoot>
                <tr className="bg-slate-100 font-bold border-t-2 border-slate-300 text-slate-900">
                  <td colSpan={4} className="py-3 px-4 text-center">
                    TOTAL SALDO BUKU BANK
                  </td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums text-emerald-800">
                    {formatRupiah(totalIn)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-900">
                    {formatRupiah(totalOut)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums text-blue-900">
                    {formatRupiah(currentSaldo)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Modal Popup Input/Edit Transaksi Buku Bank */}
      {isModalOpen && (
        <div 
          className="fixed inset-0 z-[100] overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200"
          onClick={() => setIsModalOpen(false)}
        >
          <div 
            id="bank-form-container" 
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl my-auto p-5 sm:p-7 space-y-4 max-h-[92vh] overflow-y-auto animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
                <span>{editingTx ? 'Ubah Catatan Buku Bank' : 'Catat Transaksi Buku Bank Baru'}</span>
              </h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                title="Tutup Formulir"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

          <form onSubmit={handleSubmit} className="space-y-4 text-sm">
              
              {/* Type Switcher */}
              <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-lg max-w-xs">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, tipe: 'penerimaan' })}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                    formData.tipe === 'penerimaan'
                      ? 'bg-white text-emerald-800 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Penerimaan (Masuk)
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, tipe: 'pengeluaran' })}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                    formData.tipe === 'pengeluaran'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Pengeluaran (Keluar)
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Tanggal
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.tanggal}
                    onChange={(e) => setFormData({ ...formData, tanggal: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-1 focus:ring-emerald-600 text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Nomor Bukti
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: SP2D-001 atau CEK-98124"
                    value={formData.noBukti}
                    onChange={(e) => setFormData({ ...formData, noBukti: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-1 focus:ring-emerald-600 text-slate-800 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Uraian Transaksi Bank
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="Contoh: Penerimaan Pencairan DAK Fisik Revitalisasi Sekolah Tahap I atau Penarikan Tunai Kas"
                  value={formData.uraian}
                  onChange={(e) => setFormData({ ...formData, uraian: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-1 focus:ring-emerald-600 text-slate-800"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Jumlah Nominal (Rp)
                  </label>
                  <input
                    type="number"
                    min={0}
                    required
                    placeholder="0"
                    value={formData.jumlah || ''}
                    onChange={(e) => setFormData({ ...formData, jumlah: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-1 focus:ring-emerald-600 text-slate-900 font-mono font-semibold"
                  />
                  <span className="text-[11px] text-slate-400 mt-0.5 block font-mono">
                    {formatRupiah(formData.jumlah)}
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Sisa / Saldo Akhir (Opsional)
                  </label>
                  <input
                    type="number"
                    placeholder="Kosongkan jika auto-hitung"
                    value={formData.sisaManual}
                    onChange={(e) => setFormData({ ...formData, sisaManual: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-1 focus:ring-emerald-600 text-slate-800 font-mono"
                  />
                  <span className="text-[11px] text-slate-400 mt-0.5 block">
                    Secara default saldo dihitung otomatis.
                  </span>
                </div>
              </div>

              {/* Sync with BKU Option */}
              {formData.tipe === 'pengeluaran' && !editingTx && (
                <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.syncToBKU}
                      onChange={(e) => setFormData({ ...formData, syncToBKU: e.target.checked })}
                      className="mt-0.5 rounded text-emerald-700 focus:ring-emerald-600"
                    />
                    <div>
                      <span className="text-xs font-semibold text-emerald-900">
                        Catat Otomatis Sebagai Penerimaan Kas di BKU & BKT
                      </span>
                      <p className="text-[11px] text-emerald-700 mt-0.5">
                        Centang ini jika transaksi adalah penarikan tunai dari bank untuk persediaan uang tunai panitia revitalisasi.
                      </p>
                    </div>
                  </label>
                </div>
              )}

              <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 shadow-xs cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingTx ? 'Perbarui Catatan' : 'Simpan Transaksi'}</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Modal Popup Konfirmasi Hapus Catatan Bank */}
      {deletingTx && (
        <div 
          className="fixed inset-0 z-[100] overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setDeletingTx(null)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-4 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0 font-bold">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-slate-900 leading-snug">
                  Hapus Catatan Buku Bank?
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Catatan transaksi bank ini akan dihapus secara permanen dari pembukuan bank.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDeletingTx(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                title="Tutup"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2.5">
              <div className="flex justify-between items-center text-slate-600">
                <span className="font-medium text-slate-500">No. Bukti:</span>
                <span className="font-mono font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200">
                  {deletingTx.noBukti}
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span className="font-medium text-slate-500">Tanggal:</span>
                <span className="font-medium text-slate-700">
                  {deletingTx.tanggal}
                </span>
              </div>
              <div>
                <span className="block text-slate-500 font-medium mb-1">Uraian:</span>
                <div className="text-slate-800 font-medium leading-relaxed bg-white p-2.5 rounded-lg border border-slate-200">
                  {deletingTx.uraian}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeletingTx(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteTransaction(deletingTx.id);
                  setDeletingTx(null);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-red-600 rounded-xl hover:bg-red-700 transition-colors shadow-xs cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Ya, Hapus Sekarang</span>
              </button>
            </div>
          </div>
        </div>
      )}
        </>
      )}

    </div>
  );
};
