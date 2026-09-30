import React from 'react';
import { ActiveTab, SchoolProfile, BKUTransaction, BukuBankTransaction } from '../types';
import { formatRupiah } from '../utils/format';
import { 
  LayoutDashboard, 
  BookOpen, 
  Landmark, 
  Wallet, 
  Scale, 
  Receipt, 
  Settings, 
  RotateCcw, 
  X,
  School,
  ChevronRight
} from 'lucide-react';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  schoolProfile: SchoolProfile;
  bkuData: BKUTransaction[];
  bukuBankData: BukuBankTransaction[];
  onResetData: () => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  schoolProfile,
  bkuData,
  bukuBankData,
  onResetData,
  isOpenMobile,
  onCloseMobile,
}) => {
  // Financial summaries for sidebar stats
  const totalIn = bkuData.reduce((acc, c) => acc + (c.jenisTransaksi === 'penerimaan' ? c.jumlah : 0), 0);
  const totalOut = bkuData.reduce((acc, c) => acc + (c.jenisTransaksi === 'pengeluaran' ? c.jumlah : 0), 0);
  const saldoKas = totalIn - totalOut;

  const navItems = [
    {
      id: 'dashboard' as ActiveTab,
      label: 'Ringkasan & Dashboard',
      shortLabel: 'Dashboard',
      icon: LayoutDashboard,
      desc: 'Statistik & rekapitulasi dana',
    },
    {
      id: 'bku' as ActiveTab,
      label: 'Buku Kas Umum (BKU)',
      shortLabel: 'BKU',
      icon: BookOpen,
      desc: 'Kelola transaksi & cetak BKU resmi',
      badge: bkuData.length,
    },
    {
      id: 'buku_bank' as ActiveTab,
      label: 'Buku Kas Bank',
      shortLabel: 'Buku Bank',
      icon: Landmark,
      desc: 'Penerimaan & penarikan bank',
      badge: bukuBankData.length,
    },
    {
      id: 'bkt' as ActiveTab,
      label: 'Buku Kas Tunai (BKT)',
      shortLabel: 'Buku Kas Tunai',
      icon: Wallet,
      desc: 'Transaksi kas tunai brankas',
    },
    {
      id: 'buku_pajak' as ActiveTab,
      label: 'Buku Pembantu Pajak',
      shortLabel: 'Buku Pajak',
      icon: Scale,
      desc: 'Potongan & setoran PPN/PPh',
    },
    {
      id: 'kwitansi' as ActiveTab,
      label: 'Kwitansi Pembayaran',
      shortLabel: 'Kwitansi',
      icon: Receipt,
      desc: 'Pusat cetak kwitansi belanja',
      badge: bkuData.filter((t) => t.jenisTransaksi === 'pengeluaran').length,
    },
    {
      id: 'pengaturan' as ActiveTab,
      label: 'Profil & SK Panitia',
      shortLabel: 'Profil & SK',
      icon: Settings,
      desc: 'Data sekolah, tim pelaksana & SK',
    },
  ];

  const handleSelectTab = (id: ActiveTab) => {
    setActiveTab(id);
    onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-slate-900 text-white flex flex-col border-r border-slate-800 transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:z-auto print:hidden shrink-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-900/30 shrink-0">
              <School className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-white tracking-wide truncate">
                SIP-REVITALISASI
              </h2>
              <p className="text-[11px] text-emerald-400 font-medium truncate">
                {schoolProfile.namaSekolah}
              </p>
              <p className="text-[10px] text-slate-400 truncate">
                TA {schoolProfile.tahunAnggaran} · NPSN {schoolProfile.npsn}
              </p>
            </div>
          </div>

          <button
            onClick={onCloseMobile}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation List */}
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          <div className="px-3 pb-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Menu Utama Penatausahaan
          </div>

          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                onClick={() => handleSelectTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all group cursor-pointer ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/40 font-semibold'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                    isActive
                      ? 'bg-emerald-500/40 text-white'
                      : 'bg-slate-800 text-slate-400 group-hover:text-emerald-400 group-hover:bg-slate-700'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs truncate">{item.label}</span>
                    {item.badge !== undefined && (
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold ml-1 ${
                          isActive
                            ? 'bg-white/20 text-white'
                            : 'bg-slate-800 text-slate-400 group-hover:bg-slate-700'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <p
                    className={`text-[10px] truncate leading-tight ${
                      isActive ? 'text-emerald-100' : 'text-slate-500 group-hover:text-slate-400'
                    }`}
                  >
                    {item.desc}
                  </p>
                </div>

                <ChevronRight
                  className={`w-3.5 h-3.5 transition-transform shrink-0 ${
                    isActive ? 'text-white translate-x-0.5' : 'text-slate-600 opacity-0 group-hover:opacity-100'
                  }`}
                />
              </button>
            );
          })}
        </div>

        {/* Sidebar Footer Widget */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40 space-y-3">
          {/* Quick Balance Status */}
          <div className="bg-slate-800/70 border border-slate-700/60 rounded-xl p-3">
            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
              <span>Sisa Kas BKU:</span>
              <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-1.5 py-0.5 rounded">
                Aktif
              </span>
            </div>
            <div className="text-sm font-bold font-mono text-white tracking-tight tabular-nums">
              {formatRupiah(saldoKas)}
            </div>
            <div className="text-[10px] text-slate-400 mt-1 flex justify-between">
              <span>Keluar: {formatRupiah(totalOut)}</span>
            </div>
          </div>

          {/* Reset Action */}
          <button
            onClick={() => {
              if (window.confirm('Reset semua data ke data sampel bawaan? Perubahan kustom akan kembali ke awal.')) {
                onResetData();
              }
            }}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset Data Sampel</span>
          </button>
        </div>
      </aside>
    </>
  );
};
