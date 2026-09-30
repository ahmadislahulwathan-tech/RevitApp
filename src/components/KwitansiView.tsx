import React, { useState } from 'react';
import { BKUTransaction, SchoolProfile } from '../types';
import { OfficialKwitansiSheet } from './OfficialKwitansiSheet';
import { formatRupiah, formatTanggalShort } from '../utils/format';
import { terbilangRupiah } from '../utils/terbilang';
import { Receipt, Search, Printer, Eye, CheckCircle2, FileText, ArrowRight, Trash2, Edit3 } from 'lucide-react';

interface KwitansiViewProps {
  bkuData: BKUTransaction[];
  schoolProfile: SchoolProfile;
  onSelectKwitansi?: (tx: BKUTransaction) => void;
  onNavigateToBKU: () => void;
  onDeleteTransaction?: (id: string) => void;
  initialSubTab?: 'input' | 'preview';
  activeTransactionId?: string;
}

export const KwitansiView: React.FC<KwitansiViewProps> = ({
  bkuData,
  schoolProfile,
  onSelectKwitansi,
  onNavigateToBKU,
  onDeleteTransaction,
  initialSubTab = 'input',
  activeTransactionId,
}) => {
  const [subTab, setSubTab] = useState<'input' | 'preview'>(initialSubTab);
  const [selectedTxId, setSelectedTxId] = useState<string>(activeTransactionId || '');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBiaya, setFilterBiaya] = useState<string>('all');
  const [deletingTx, setDeletingTx] = useState<BKUTransaction | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Filter only expenditures
  const expenditures = bkuData
    .filter((tx) => tx.jenisTransaksi === 'pengeluaran')
    .sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());

  const filteredExpenditures = expenditures.filter((tx) => {
    const term = searchTerm.toLowerCase();
    const matchSearch =
      tx.uraian.toLowerCase().includes(term) ||
      tx.noBukti.toLowerCase().includes(term) ||
      (tx.penerimaNama && tx.penerimaNama.toLowerCase().includes(term));

    const matchBiaya =
      filterBiaya === 'all' || tx.jenisBiaya === filterBiaya;

    return matchSearch && matchBiaya;
  });

  const handleOpenPreview = (tx: BKUTransaction) => {
    setSelectedTxId(tx.id);
    setSubTab('preview');
    if (onSelectKwitansi) {
      onSelectKwitansi(tx);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header bar with Sub-tab Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Receipt className="w-6 h-6 text-emerald-700" />
            <span>Kwitansi Pembayaran Belanja</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Bukti pembayaran dan kwitansi resmi dana revitalisasi sekolah untuk semua transaksi belanja di BKU.
          </p>
        </div>

        {/* 2 Sub-menus: Input/List Data vs Official Preview */}
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
            <span>Daftar & Kelola Kwitansi</span>
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
            <span>Pratinjau & Cetak Resmi</span>
          </button>
        </div>
      </div>

      {/* SUB-TAB 2: PRATINJAU & CETAK RESMI KWITANSI */}
      {subTab === 'preview' && (
        <OfficialKwitansiSheet
          bkuData={bkuData}
          schoolProfile={schoolProfile}
          activeTxId={selectedTxId}
          onBackToInput={() => setSubTab('input')}
        />
      )}

      {/* SUB-TAB 1: DAFTAR & KELOLA DATA KWITANSI */}
      {subTab === 'input' && (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
              Pilih Transaksi Belanja untuk Dicetak
            </h2>
            <button
              onClick={onNavigateToBKU}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors shadow-2xs cursor-pointer self-start sm:self-auto"
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>Input Belanja Baru di BKU</span>
            </button>
          </div>


      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Cari kwitansi berdasarkan nomor bukti, uraian, rekanan..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs sm:text-sm border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600"
          />
        </div>

        <div className="flex items-center gap-3">
          <select
            value={filterBiaya}
            onChange={(e) => setFilterBiaya(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-700 cursor-pointer"
          >
            <option value="all">Semua Jenis Belanja</option>
            <option value="Pengeluaran Bahan">Pengeluaran Bahan</option>
            <option value="Pengeluaran Upah">Pengeluaran Upah</option>
            <option value="Pengeluaran Alat">Pengeluaran Alat</option>
            <option value="Biaya Tim Teknis">Biaya Tim Teknis</option>
            <option value="Pengeluaran Operasional">Pengeluaran Operasional</option>
          </select>
          <span className="text-xs text-slate-400">
            {filteredExpenditures.length} kwitansi
          </span>
        </div>

      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredExpenditures.length === 0 ? (
          <div className="col-span-full bg-white border border-slate-200 rounded-xl p-10 text-center text-slate-400">
            Tidak ada pembelanjaan yang ditemukan untuk dicetak kwitansinya.
          </div>
        ) : (
          filteredExpenditures.map((tx) => {
            const hasTax = tx.pajak && tx.pajak.totalPajak > 0;
            const isHighValue = tx.jumlah >= 5000000;

            return (
              <div
                key={tx.id}
                className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Top Bar of Card */}
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                    <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                      {tx.noBukti}
                    </span>
                    <span className="font-mono">{formatTanggalShort(tx.tanggal)}</span>
                  </div>

                  {/* Uraian */}
                  <h3 className="text-sm font-bold text-slate-900 line-clamp-2 mb-1">
                    {tx.uraian}
                  </h3>

                  {/* Penerima / Toko */}
                  <p className="text-xs text-slate-600 mb-3">
                    Penerima: <span className="font-semibold text-slate-800">{tx.penerimaNama || 'Penyedia Barang / Jasa'}</span>
                  </p>

                  {/* Financial Breakdown Pill Box */}
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-1.5 text-xs font-mono mb-4">
                    <div className="flex justify-between text-slate-600">
                      <span>Bruto Belanja:</span>
                      <span className="font-bold text-slate-900">{formatRupiah(tx.jumlah)}</span>
                    </div>

                    {hasTax ? (
                      <div className="flex justify-between text-red-700 text-[11px]">
                        <span>Potongan Pajak:</span>
                        <span>- {formatRupiah(tx.pajak.totalPajak)}</span>
                      </div>
                    ) : (
                      <div className="flex justify-between text-slate-400 text-[11px]">
                        <span>Pajak:</span>
                        <span>Non-Pajak</span>
                      </div>
                    )}

                    <div className="flex justify-between text-emerald-900 font-bold pt-1 border-t border-slate-200 text-xs">
                      <span>Netto Diterima:</span>
                      <span>{formatRupiah(tx.pajak.jumlahNetto || tx.jumlah)}</span>
                    </div>
                  </div>

                  {/* Terbilang Snip */}
                  <div className="text-[11px] italic text-slate-500 line-clamp-1 mb-4">
                    "{terbilangRupiah(tx.jumlah)}"
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div className="text-[11px] text-slate-400">
                    {isHighValue && (
                      <span className="text-amber-800 font-medium bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                        Materai 10.000
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {onDeleteTransaction && (
                      <button
                        type="button"
                        onClick={() => setDeletingTx(tx)}
                        title="Hapus Transaksi Belanja Ini"
                        className="p-1.5 text-slate-400 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleOpenPreview(tx)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-700 rounded-md hover:bg-emerald-800 transition-colors shadow-xs cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Pratinjau & Cetak</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal Konfirmasi Hapus Transaksi Belanja & Kwitansi */}
      {deletingTx && (
        <div className="fixed inset-0 z-[100] overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0 font-bold">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Hapus Transaksi & Kwitansi?
                </h3>
                <p className="text-xs text-slate-500">
                  Data transaksi belanja di BKU dan lembar kwitansi ini akan dihapus secara permanen.
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-2">
              <div className="flex justify-between items-center text-slate-600">
                <span className="font-medium">No. Bukti:</span>
                <span className="font-mono font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200">
                  {deletingTx.noBukti}
                </span>
              </div>
              <div className="text-slate-800 font-medium leading-relaxed">
                {deletingTx.uraian}
              </div>
              <div className="flex justify-between items-center text-slate-600 pt-2 border-t border-slate-200">
                <span className="font-medium">Jumlah:</span>
                <span className="font-mono font-bold text-base text-red-600">
                  {formatRupiah(deletingTx.jumlah)}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingTx(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onDeleteTransaction) {
                    onDeleteTransaction(deletingTx.id);
                  }
                  setToastMessage(`Transaksi "${deletingTx.noBukti}" berhasil dihapus.`);
                  setDeletingTx(null);
                  setTimeout(() => setToastMessage(null), 5000);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors shadow-xs cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Ya, Hapus Sekarang</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-[110] bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 text-xs border border-slate-700">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="text-slate-400 hover:text-white font-bold ml-2 text-sm cursor-pointer"
          >
            ×
          </button>
        </div>
      )}
      </>
      )}

    </div>
  );
};
