import React from 'react';
import { ActiveTab, SchoolProfile } from '../types';
import { Menu, Plus, Settings, Building2, BookOpen, Landmark, Wallet, Scale, Receipt, LayoutDashboard } from 'lucide-react';

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  schoolProfile: SchoolProfile;
  onOpenNewTransaction: () => void;
  onToggleMobileSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  schoolProfile,
  onOpenNewTransaction,
  onToggleMobileSidebar,
}) => {
  const getTabInfo = () => {
    switch (activeTab) {
      case 'dashboard':
        return { title: 'Dashboard & Ringkasan Dana', icon: LayoutDashboard };
      case 'bku':
        return { title: 'Buku Kas Umum (BKU)', icon: BookOpen };
      case 'buku_bank':
        return { title: 'Buku Kas Bank', icon: Landmark };
      case 'bkt':
        return { title: 'Buku Kas Tunai (BKT)', icon: Wallet };
      case 'buku_pajak':
        return { title: 'Buku Pembantu Pajak', icon: Scale };
      case 'kwitansi':
        return { title: 'Kwitansi Pembayaran Belanja', icon: Receipt };
      case 'pengaturan':
        return { title: 'Profil Sekolah & SK Panitia', icon: Building2 };
      default:
        return { title: 'SIP-Revitalisasi', icon: BookOpen };
    }
  };

  const { title, icon: ActiveIcon } = getTabInfo();

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-2xs print:hidden">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          
          {/* Left: Mobile hamburger & Active section title */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onToggleMobileSidebar}
              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg lg:hidden transition-colors cursor-pointer"
              title="Buka Menu Samping"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold shrink-0 border border-emerald-200">
                <ActiveIcon className="w-4 h-4" />
              </div>
              <div>
                <h1 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight leading-tight">
                  {title}
                </h1>
                <p className="text-[11px] text-slate-500 hidden sm:block truncate max-w-md">
                  {schoolProfile.namaSekolah} · TA {schoolProfile.tahunAnggaran}
                </p>
              </div>
            </div>
          </div>

          {/* Right: Quick Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenNewTransaction}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 transition-colors shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Input BKU</span>
              <span className="sm:hidden">Input</span>
            </button>

            <button
              onClick={() => setActiveTab('pengaturan')}
              title="Profil & SK Panitia"
              className={`p-2 rounded-lg transition-colors cursor-pointer ${
                activeTab === 'pengaturan'
                  ? 'bg-emerald-100 text-emerald-900 font-bold'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>

        </div>
      </div>
    </header>
  );
};

