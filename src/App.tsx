import React, { useState, useEffect } from 'react';
import { 
  ActiveTab, 
  BKUTransaction, 
  BukuBankTransaction, 
  SchoolProfile 
} from './types';
import { 
  initialBKUData, 
  initialBukuBankData, 
  initialSchoolProfile 
} from './data/initialData';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { BKUView } from './components/BKUView';
import { BukuBankView } from './components/BukuBankView';
import { BKTView } from './components/BKTView';
import { BukuPajakView } from './components/BukuPajakView';
import { KwitansiView } from './components/KwitansiView';
import { SchoolSettingsView } from './components/SchoolSettingsView';
import { 
  saveBKUToIndexedDB, 
  getBKUFromIndexedDB, 
  saveBankToIndexedDB, 
  getBankFromIndexedDB, 
  saveProfileToIndexedDB, 
  getProfileFromIndexedDB,
  clearIndexedDB 
} from './utils/indexedDbStorage';

const STORAGE_KEYS = {
  BKU: 'revitalisasi_bku_v1',
  BANK: 'revitalisasi_bank_v1',
  PROFILE: 'revitalisasi_profile_v1',
};

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // SubTab memory when navigating between sections
  const [bkuSubTab, setBkuSubTab] = useState<'input' | 'preview'>('input');
  const [bankSubTab, setBankSubTab] = useState<'input' | 'preview'>('input');
  const [bktSubTab, setBktSubTab] = useState<'input' | 'preview'>('input');
  const [pajakSubTab, setPajakSubTab] = useState<'input' | 'preview'>('input');
  const [kwitansiSubTab, setKwitansiSubTab] = useState<'input' | 'preview'>('input');
  const [dashboardSubTab, setDashboardSubTab] = useState<'input' | 'preview'>('input');

  // School Profile state with localStorage fallback
  const [schoolProfile, setSchoolProfile] = useState<SchoolProfile>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PROFILE);
      return saved ? JSON.parse(saved) : initialSchoolProfile;
    } catch {
      return initialSchoolProfile;
    }
  });

  // BKU transactions state
  const [bkuData, setBKUData] = useState<BKUTransaction[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.BKU);
      return saved ? JSON.parse(saved) : initialBKUData;
    } catch {
      return initialBKUData;
    }
  });

  // Buku Bank state
  const [bukuBankData, setBukuBankData] = useState<BukuBankTransaction[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.BANK);
      return saved ? JSON.parse(saved) : initialBukuBankData;
    } catch {
      return initialBukuBankData;
    }
  });

  // State for form opening & active kwitansi transaction
  const [isBKUModalOpen, setIsBKUModalOpen] = useState(false);
  const [selectedKwitansiTx, setSelectedKwitansiTx] = useState<BKUTransaction | null>(null);

  // Load from local browser IndexedDB on startup if available
  useEffect(() => {
    async function loadFromLocalIndexedDB() {
      try {
        const [dbProfile, dbBKU, dbBank] = await Promise.all([
          getProfileFromIndexedDB(),
          getBKUFromIndexedDB(),
          getBankFromIndexedDB(),
        ]);
        if (dbProfile) setSchoolProfile(dbProfile);
        if (dbBKU && dbBKU.length > 0) setBKUData(dbBKU);
        if (dbBank && dbBank.length > 0) setBukuBankData(dbBank);
      } catch (err) {
        console.warn('Gagal membaca IndexedDB lokal:', err);
      }
    }
    loadFromLocalIndexedDB();
  }, []);

  // Dual Persistence to localStorage and IndexedDB (100% offline & local)
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(schoolProfile));
      saveProfileToIndexedDB(schoolProfile);
    } catch (err) {
      console.error('Failed to save profile to local storage', err);
    }
  }, [schoolProfile]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.BKU, JSON.stringify(bkuData));
      saveBKUToIndexedDB(bkuData);
    } catch (err) {
      console.error('Failed to save BKU to local storage', err);
    }
  }, [bkuData]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.BANK, JSON.stringify(bukuBankData));
      saveBankToIndexedDB(bukuBankData);
    } catch (err) {
      console.error('Failed to save Bank to local storage', err);
    }
  }, [bukuBankData]);

  // Handlers for BKU
  const handleAddBKU = (tx: BKUTransaction, deductFromBank = false) => {
    setBKUData((prev) => [tx, ...prev]);

    // If penerimaan and deductFromBank is true, automatically deduct from Buku Kas Bank
    if (tx.jenisTransaksi === 'penerimaan' && deductFromBank && tx.jumlah > 0) {
      const bankWithdrawalTx: BukuBankTransaction = {
        id: `bank-wd-${Date.now()}`,
        tanggal: tx.tanggal,
        uraian: tx.uraian ? `Penarikan Tunai: ${tx.uraian}` : 'Penarikan Tunai Kas BKU',
        noBukti: tx.noBukti ? `TRK-${tx.noBukti}` : `TRK-${Date.now()}`,
        penerimaan: 0,
        pengeluaran: tx.jumlah,
        linkedBKUId: tx.id,
        createdAt: Date.now(),
      };
      setBukuBankData((prev) => [bankWithdrawalTx, ...prev]);
    }
  };

  const handleUpdateBKU = (updated: BKUTransaction) => {
    setBKUData((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
    setBukuBankData((prev) =>
      prev.map((bankItem) => {
        if (bankItem.linkedBKUId === updated.id) {
          return {
            ...bankItem,
            tanggal: updated.tanggal,
            uraian: `Penarikan Tunai: ${updated.uraian}`,
            noBukti: updated.noBukti ? `TRK-${updated.noBukti}` : bankItem.noBukti,
            pengeluaran: updated.jumlah,
          };
        }
        return bankItem;
      })
    );
  };

  const handleDeleteBKU = (id: string) => {
    setBKUData((prev) => prev.filter((item) => String(item.id) !== String(id)));
    setBukuBankData((prev) => prev.filter((item) => item.linkedBKUId !== id));
  };

  // Handlers for Buku Bank
  const handleAddBank = (tx: BukuBankTransaction, syncToBKU = false) => {
    setBukuBankData((prev) => [tx, ...prev]);

    // If user checked sync to BKU (e.g. cash withdrawal from bank)
    if (syncToBKU && tx.pengeluaran > 0) {
      const syncedBKU: BKUTransaction = {
        id: `bku-sync-${Date.now()}`,
        tanggal: tx.tanggal,
        jenisTransaksi: 'penerimaan',
        uraian: `Penerimaan Penarikan Tunai dari Bank (${tx.uraian})`,
        noBukti: `TRK-${tx.noBukti}`,
        jumlah: tx.pengeluaran,
        metode: 'tunai',
        pajak: {
          hasPPN: false,
          hasPPh22: false,
          hasPPh23: false,
          hasPPh4Ayat2: false,
          hasPPh21: false,
          dpp: 0,
          ppn: 0,
          pph22: 0,
          pph23: 0,
          pph4_2: 0,
          pph21: 0,
          totalPajak: 0,
          jumlahNetto: tx.pengeluaran,
          statusSetor: 'Belum Disetor',
        },
        createdAt: Date.now(),
      };
      setBKUData((prev) => [syncedBKU, ...prev]);
    }
  };

  const handleUpdateBank = (updated: BukuBankTransaction) => {
    setBukuBankData((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
  };

  const handleDeleteBank = (id: string) => {
    setBukuBankData((prev) => prev.filter((item) => item.id !== id));
  };

  // Reset to initial dummy data
  const handleResetSampleData = () => {
    setSchoolProfile(initialSchoolProfile);
    setBKUData(initialBKUData);
    setBukuBankData(initialBukuBankData);
    localStorage.removeItem(STORAGE_KEYS.PROFILE);
    localStorage.removeItem(STORAGE_KEYS.BKU);
    localStorage.removeItem(STORAGE_KEYS.BANK);
    clearIndexedDB();
  };

  // Direct in-window navigation to Kwitansi Preview without popup
  const handleSelectKwitansi = (tx: BKUTransaction) => {
    setSelectedKwitansiTx(tx);
    setKwitansiSubTab('preview');
    setActiveTab('kwitansi');
  };

  // Direct in-window navigation to BKU Preview without popup
  const handleNavigateToBKUPreview = () => {
    setBkuSubTab('preview');
    setActiveTab('bku');
  };

  // Direct in-window navigation to Bank Preview without popup
  const handleNavigateToBankPreview = () => {
    setBankSubTab('preview');
    setActiveTab('buku_bank');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex font-sans selection:bg-emerald-100 selection:text-emerald-900">
      
      {/* 1. Left Sidebar Navigation (Main Menu on the Left) */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          // Default subTab to input when navigating via sidebar unless already previewing
        }}
        schoolProfile={schoolProfile}
        bkuData={bkuData}
        bukuBankData={bukuBankData}
        onResetData={handleResetSampleData}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* 2. Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Top Header Bar */}
        <Header
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          schoolProfile={schoolProfile}
          onOpenNewTransaction={() => {
            setActiveTab('bku');
            setBkuSubTab('input');
            setIsBKUModalOpen(true);
          }}
          onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        />

        {/* Dynamic Section Content */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          
          {activeTab === 'dashboard' && (
            <DashboardView
              bkuData={bkuData}
              bukuBankData={bukuBankData}
              schoolProfile={schoolProfile}
              setActiveTab={setActiveTab}
              onOpenNewTransaction={() => {
                setActiveTab('bku');
                setBkuSubTab('input');
                setIsBKUModalOpen(true);
              }}
              onSelectKwitansi={handleSelectKwitansi}
              initialSubTab={dashboardSubTab}
            />
          )}

          {activeTab === 'bku' && (
            <BKUView
              bkuData={bkuData}
              onAddTransaction={handleAddBKU}
              onUpdateTransaction={handleUpdateBKU}
              onDeleteTransaction={handleDeleteBKU}
              onSelectKwitansi={handleSelectKwitansi}
              schoolProfile={schoolProfile}
              bukuBankData={bukuBankData}
              isModalOpen={isBKUModalOpen}
              setIsModalOpen={setIsBKUModalOpen}
              onOpenPrintReport={handleNavigateToBKUPreview}
              onOpenPrintBKU={handleNavigateToBKUPreview}
              initialSubTab={bkuSubTab}
              onUpdateProfile={(updatedProfile) => setSchoolProfile(updatedProfile)}
              onBulkUpdateBKU={(updatedList) => setBKUData(updatedList)}
            />
          )}

          {activeTab === 'buku_bank' && (
            <BukuBankView
              bukuBankData={bukuBankData}
              onAddTransaction={handleAddBank}
              onUpdateTransaction={handleUpdateBank}
              onDeleteTransaction={handleDeleteBank}
              schoolProfile={schoolProfile}
              onOpenPrintReport={handleNavigateToBankPreview}
              onOpenPrintBukuBank={handleNavigateToBankPreview}
              initialSubTab={bankSubTab}
            />
          )}

          {activeTab === 'bkt' && (
            <BKTView
              bkuData={bkuData}
              schoolProfile={schoolProfile}
              onSelectKwitansi={handleSelectKwitansi}
              onOpenPrintReport={() => setBktSubTab('preview')}
              onNavigateToBKU={() => {
                setActiveTab('bku');
                setBkuSubTab('input');
                setIsBKUModalOpen(true);
              }}
              initialSubTab={bktSubTab}
            />
          )}

          {activeTab === 'buku_pajak' && (
            <BukuPajakView
              bkuData={bkuData}
              schoolProfile={schoolProfile}
              onUpdateTransaction={handleUpdateBKU}
              onOpenPrintReport={() => setPajakSubTab('preview')}
              initialSubTab={pajakSubTab}
            />
          )}

          {activeTab === 'kwitansi' && (
            <KwitansiView
              bkuData={bkuData}
              schoolProfile={schoolProfile}
              onSelectKwitansi={handleSelectKwitansi}
              onNavigateToBKU={() => {
                setActiveTab('bku');
                setBkuSubTab('input');
                setIsBKUModalOpen(true);
              }}
              onDeleteTransaction={handleDeleteBKU}
              initialSubTab={kwitansiSubTab}
              activeTransactionId={selectedKwitansiTx?.id}
            />
          )}

          {activeTab === 'pengaturan' && (
            <SchoolSettingsView
              profile={schoolProfile}
              onSave={setSchoolProfile}
              onResetData={handleResetSampleData}
            />
          )}

        </main>

        {/* Footer */}
        <footer className="border-t border-slate-200 bg-white py-4 print:hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
            <div>
              <span className="font-semibold text-slate-700">{schoolProfile.namaSekolah}</span>
              <span className="mx-1.5">·</span>
              <span>{schoolProfile.namaProgram} (TA {schoolProfile.tahunAnggaran})</span>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setActiveTab('pengaturan')}
                className="hover:text-emerald-700 font-medium transition-colors cursor-pointer"
              >
                Ubah Profil Sekolah & SK Panitia
              </button>
              <span>·</span>
              <button
                onClick={handleResetSampleData}
                className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                Reset Data Sampel
              </button>
            </div>
          </div>
        </footer>

      </div>

    </div>
  );
}

