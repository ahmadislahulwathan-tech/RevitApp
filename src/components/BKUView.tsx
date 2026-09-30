import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { BKUTransaction, BukuBankTransaction, JenisBiaya, SchoolProfile } from '../types';
import { OfficialBKUSheet } from './OfficialBKUSheet';
import { 
  formatRupiah, 
  formatAngka, 
  formatAngkaSen,
  formatTanggalShort, 
  formatTanggalDinas,
  formatTanggalSlash,
  formatBulanTahunKapital,
  formatTanggalIndo,
  calculateTaxDetail, 
  extractTaxItems,
  exportToCSV,
  getNextBKUBelanjaNoBukti
} from '../utils/format';

export interface BKUTableDisplayRow {
  id: string;
  originalTxId: string;
  isTaxRow: boolean;
  taxRole?: 'terima' | 'setor';
  taxLabel?: string;
  tanggal: string;
  uraian: string;
  noBukti: string;
  jenisTransaksi: 'penerimaan' | 'pengeluaran';
  jenisBiaya?: JenisBiaya;
  metode: 'tunai' | 'bank';
  penerimaan: number;
  pengeluaran: number;
  saldoRunning: number;
  penerimaNama?: string;
  penerimaAlamat?: string;
  pajak?: BKUTransaction['pajak'];
  originalTx?: BKUTransaction;
}
import { kalimatPenutupanKas } from '../utils/terbilang';
import { exportBKUToExcel } from '../utils/excelExport';
import { BKUNumberingSettingsModal } from './BKUNumberingSettingsModal';
import { 
  Plus, 
  Search, 
  Receipt, 
  Trash2, 
  Edit3, 
  Download, 
  Printer, 
  Check, 
  X, 
  Percent, 
  Sparkles,
  Wallet,
  Landmark,
  Calendar,
  CheckCircle2,
  Lock,
  BookOpen,
  FileSpreadsheet,
  Hash,
  Settings
} from 'lucide-react';

interface BKUViewProps {
  bkuData: BKUTransaction[];
  onAddTransaction: (tx: BKUTransaction, deductFromBank?: boolean) => void;
  onUpdateTransaction: (tx: BKUTransaction) => void;
  onDeleteTransaction: (id: string) => void;
  onSelectKwitansi: (tx: BKUTransaction) => void;
  schoolProfile: SchoolProfile;
  bukuBankData?: BukuBankTransaction[];
  isModalOpen: boolean;
  setIsModalOpen: (open: boolean) => void;
  onOpenPrintReport: () => void;
  onOpenPrintBKU?: () => void;
  initialSubTab?: 'input' | 'preview';
  onUpdateProfile?: (profile: SchoolProfile) => void;
  onBulkUpdateBKU?: (updatedBKUList: BKUTransaction[]) => void;
}

export const BKUView: React.FC<BKUViewProps> = ({
  bkuData,
  onAddTransaction,
  onUpdateTransaction,
  onDeleteTransaction,
  onSelectKwitansi,
  schoolProfile,
  bukuBankData = [],
  isModalOpen,
  setIsModalOpen,
  onOpenPrintReport,
  onOpenPrintBKU,
  initialSubTab = 'input',
  onUpdateProfile,
  onBulkUpdateBKU,
}) => {
  const [subTab, setSubTab] = useState<'input' | 'preview'>(initialSubTab);

  useEffect(() => {
    if (initialSubTab) {
      setSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterJenis, setFilterJenis] = useState<'all' | 'penerimaan' | 'pengeluaran'>('all');
  const [filterBiaya, setFilterBiaya] = useState<string>('all');
  const [filterBulan, setFilterBulan] = useState<string>('all');
  const [editingTx, setEditingTx] = useState<BKUTransaction | null>(null);
  const [deletingTx, setDeletingTx] = useState<BKUTransaction | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isNumberingModalOpen, setIsNumberingModalOpen] = useState(false);

  // Helper untuk mendapatkan tanggal pembelanjaan (pengeluaran) terakhir yang ada di BKU
  const getLatestPembelanjaanTanggal = useCallback((): string => {
    // 1. Prioritaskan transaksi jenis pengeluaran (belanja) yang bertanggal valid
    const pengeluaranList = bkuData.filter(
      (tx) => tx.jenisTransaksi === 'pengeluaran' && tx.tanggal && tx.tanggal.trim() !== ''
    );
    if (pengeluaranList.length > 0) {
      // Urutkan tanggal secara menurun untuk mendapatkan tanggal pembelanjaan terakhir
      const sorted = [...pengeluaranList].sort((a, b) => b.tanggal.localeCompare(a.tanggal));
      return sorted[0].tanggal;
    }

    // 2. Jika belum ada pengeluaran, periksa transaksi apapun di BKU (misal penarikan dana awal)
    const allList = bkuData.filter((tx) => tx.tanggal && tx.tanggal.trim() !== '');
    if (allList.length > 0) {
      const sorted = [...allList].sort((a, b) => b.tanggal.localeCompare(a.tanggal));
      return sorted[0].tanggal;
    }

    // 3. Cadangan ke tanggal hari ini
    return new Date().toISOString().split('T')[0];
  }, [bkuData]);

  // Form State
  const [formData, setFormData] = useState<{
    jenisTransaksi: 'penerimaan' | 'pengeluaran';
    tanggal: string;
    uraian: string;
    noBukti: string;
    jenisBiaya: JenisBiaya;
    jumlah: number;
    metode: 'tunai' | 'bank';
    penerimaNama: string;
    penerimaAlamat: string;
    deductFromBank: boolean;
    // Taxes
    hasPPN: boolean;
    hasPPh22: boolean;
    hasPPh23: boolean;
    hasPPh4Ayat2: boolean;
    hasPPh21: boolean;
    customDPP: number;
    useCustomDPP: boolean;
    statusSetor: 'Belum Disetor' | 'Sudah Disetor';
    ntpn: string;
  }>({
    jenisTransaksi: 'pengeluaran',
    tanggal: new Date().toISOString().split('T')[0],
    uraian: '',
    noBukti: '',
    jenisBiaya: 'Pengeluaran Bahan',
    jumlah: 0,
    metode: 'tunai',
    penerimaNama: '',
    penerimaAlamat: '',
    deductFromBank: true,
    hasPPN: false,
    hasPPh22: false,
    hasPPh23: false,
    hasPPh4Ayat2: false,
    hasPPh21: false,
    customDPP: 0,
    useCustomDPP: false,
    statusSetor: 'Belum Disetor',
    ntpn: '',
  });

  useEffect(() => {
    if (isModalOpen) {
      setSubTab('input');
      // Jika modal dibuka untuk input baru (bukan ubah/edit), otomatis set tanggal & noBukti ke belanja terakhir
      if (!editingTx) {
        const latestTanggal = getLatestPembelanjaanTanggal();
        const nextNoBukti = getNextBKUBelanjaNoBukti(bkuData, latestTanggal, schoolProfile.bkuNumbering, schoolProfile);
        setFormData((prev) => ({
          ...prev,
          tanggal: latestTanggal,
          noBukti: nextNoBukti,
        }));
      }
    }
  }, [isModalOpen, editingTx, getLatestPembelanjaanTanggal, bkuData, schoolProfile.bkuNumbering, schoolProfile]);

  // Available months from BKU
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

  // Selected closing month for bottom report
  const [selectedClosingMonth, setSelectedClosingMonth] = useState<string>(() => {
    if (bkuData.length > 0) {
      const dates = bkuData.map(t => t.tanggal).sort();
      return dates[0].substring(0, 7); // Default to first month e.g. July 2025
    }
    return '2025-07';
  });

  // Current bank balance from Buku Kas Bank
  const currentBankBalance = useMemo(() => {
    return (bukuBankData || []).reduce((acc, row) => acc + (row.penerimaan - row.pengeluaran), 0);
  }, [bukuBankData]);

  const openAddModal = () => {
    setEditingTx(null);
    const initialTanggal = getLatestPembelanjaanTanggal();
    const nextNoBukti = getNextBKUBelanjaNoBukti(bkuData, initialTanggal, schoolProfile.bkuNumbering, schoolProfile);
    setFormData({
      jenisTransaksi: 'pengeluaran',
      tanggal: initialTanggal,
      uraian: '',
      noBukti: nextNoBukti,
      jenisBiaya: 'Pengeluaran Bahan',
      jumlah: 0,
      metode: 'tunai',
      penerimaNama: '',
      penerimaAlamat: '',
      deductFromBank: true,
      hasPPN: false,
      hasPPh22: false,
      hasPPh23: false,
      hasPPh4Ayat2: false,
      hasPPh21: false,
      customDPP: 0,
      useCustomDPP: false,
      statusSetor: 'Belum Disetor',
      ntpn: '',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (tx: BKUTransaction) => {
    setEditingTx(tx);
    setFormData({
      jenisTransaksi: tx.jenisTransaksi,
      tanggal: tx.tanggal,
      uraian: tx.uraian,
      noBukti: tx.noBukti,
      jenisBiaya: tx.jenisBiaya || 'Pengeluaran Bahan',
      jumlah: tx.jumlah,
      metode: tx.metode,
      penerimaNama: tx.penerimaNama || '',
      penerimaAlamat: tx.penerimaAlamat || '',
      deductFromBank: false,
      hasPPN: tx.pajak?.hasPPN || false,
      hasPPh22: tx.pajak?.hasPPh22 || false,
      hasPPh23: tx.pajak?.hasPPh23 || false,
      hasPPh4Ayat2: tx.pajak?.hasPPh4Ayat2 || false,
      hasPPh21: tx.pajak?.hasPPh21 || false,
      customDPP: tx.pajak?.dpp || 0,
      useCustomDPP: false,
      statusSetor: tx.pajak?.statusSetor || 'Belum Disetor',
      ntpn: tx.pajak?.ntpn || '',
    });
    setIsModalOpen(true);
  };

  // Preset Handler
  const applyPreset = (preset: 'bahan' | 'upah' | 'alat' | 'konstruksi' | 'non_pajak') => {
    if (preset === 'bahan') {
      setFormData((prev) => ({
        ...prev,
        jenisBiaya: 'Pengeluaran Bahan',
        hasPPN: true,
        hasPPh22: true,
        hasPPh23: false,
        hasPPh4Ayat2: false,
        hasPPh21: false,
      }));
    } else if (preset === 'upah') {
      setFormData((prev) => ({
        ...prev,
        jenisBiaya: 'Pengeluaran Upah',
        hasPPN: false,
        hasPPh22: false,
        hasPPh23: false,
        hasPPh4Ayat2: false,
        hasPPh21: true,
      }));
    } else if (preset === 'alat') {
      setFormData((prev) => ({
        ...prev,
        jenisBiaya: 'Pengeluaran Alat',
        hasPPN: false,
        hasPPh22: false,
        hasPPh23: true,
        hasPPh4Ayat2: false,
        hasPPh21: false,
      }));
    } else if (preset === 'konstruksi') {
      setFormData((prev) => ({
        ...prev,
        jenisBiaya: 'Pengeluaran Bahan',
        hasPPN: true,
        hasPPh22: false,
        hasPPh23: false,
        hasPPh4Ayat2: true,
        hasPPh21: false,
      }));
    } else if (preset === 'non_pajak') {
      setFormData((prev) => ({
        ...prev,
        hasPPN: false,
        hasPPh22: false,
        hasPPh23: false,
        hasPPh4Ayat2: false,
        hasPPh21: false,
      }));
    }
  };

  // Real-time tax preview for modal
  const computedTax = calculateTaxDetail({
    jumlah: formData.jumlah,
    hasPPN: formData.hasPPN,
    hasPPh22: formData.hasPPh22,
    hasPPh23: formData.hasPPh23,
    hasPPh4Ayat2: formData.hasPPh4Ayat2,
    hasPPh21: formData.hasPPh21,
    customDPP: formData.useCustomDPP ? formData.customDPP : undefined,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const taxDetail = formData.jenisTransaksi === 'pengeluaran'
      ? {
          ...computedTax,
          statusSetor: formData.statusSetor,
          ntpn: formData.ntpn,
        }
      : calculateTaxDetail({
          jumlah: 0,
          hasPPN: false,
          hasPPh22: false,
          hasPPh23: false,
          hasPPh4Ayat2: false,
          hasPPh21: false,
        });

    if (editingTx) {
      onUpdateTransaction({
        ...editingTx,
        tanggal: formData.tanggal,
        jenisTransaksi: formData.jenisTransaksi,
        uraian: formData.uraian,
        noBukti: formData.noBukti,
        jenisBiaya: formData.jenisTransaksi === 'pengeluaran' ? formData.jenisBiaya : undefined,
        jumlah: formData.jumlah,
        metode: formData.metode,
        penerimaNama: formData.penerimaNama,
        penerimaAlamat: formData.penerimaAlamat,
        pajak: taxDetail,
      });
    } else {
      const newTx: BKUTransaction = {
        id: `bku-${Date.now()}`,
        tanggal: formData.tanggal,
        jenisTransaksi: formData.jenisTransaksi,
        uraian: formData.uraian,
        noBukti: formData.noBukti,
        jenisBiaya: formData.jenisTransaksi === 'pengeluaran' ? formData.jenisBiaya : undefined,
        jumlah: formData.jumlah,
        metode: formData.metode,
        penerimaNama: formData.penerimaNama,
        penerimaAlamat: formData.penerimaAlamat,
        pajak: taxDetail,
        createdAt: Date.now(),
      };
      const willDeductFromBank = formData.jenisTransaksi === 'penerimaan' && formData.deductFromBank;
      onAddTransaction(newTx, willDeductFromBank);
      if (willDeductFromBank) {
        setToastMessage(`Penerimaan BKU dicatat dan saldo Buku Kas Bank otomatis berkurang ${formatRupiah(formData.jumlah)}.`);
        setTimeout(() => setToastMessage(null), 5000);
      }
    }

    setIsModalOpen(false);
  };

  // Calculate Running Balance across chronologically ordered transactions
  const enrichedBKU = useMemo(() => {
    const sortedBKU = [...bkuData].sort((a, b) => {
      const dateComp = a.tanggal.localeCompare(b.tanggal);
      if (dateComp !== 0) return dateComp;
      return (a.createdAt || 0) - (b.createdAt || 0);
    });

    let running = 0;
    const result: BKUTableDisplayRow[] = [];

    sortedBKU.forEach((item) => {
      const penerimaan = item.jenisTransaksi === 'penerimaan' ? item.jumlah : 0;
      const pengeluaran = item.jenisTransaksi === 'pengeluaran' ? item.jumlah : 0;
      running += penerimaan - pengeluaran;

      result.push({
        id: item.id,
        originalTxId: item.id,
        isTaxRow: false,
        tanggal: item.tanggal,
        uraian: item.uraian,
        noBukti: item.noBukti,
        jenisTransaksi: item.jenisTransaksi,
        jenisBiaya: item.jenisBiaya,
        metode: item.metode,
        penerimaan,
        pengeluaran,
        saldoRunning: running,
        penerimaNama: item.penerimaNama,
        penerimaAlamat: item.penerimaAlamat,
        pajak: item.pajak,
        originalTx: item,
      });

      // If transaction has taxes: terima dulu semua pajak, baru setor semua pajak
      if (item.jenisTransaksi === 'pengeluaran' && item.pajak && item.pajak.totalPajak > 0) {
        const taxItems = extractTaxItems(item.pajak);

        // 1. Terima dulu semua pajak
        taxItems.forEach((tax) => {
          running += tax.amount;
          result.push({
            id: `${item.id}-tax-terima-${tax.key}`,
            originalTxId: item.id,
            isTaxRow: true,
            taxRole: 'terima',
            taxLabel: tax.label,
            tanggal: item.tanggal,
            uraian: `Terima ${tax.label} ${item.uraian}`,
            noBukti: '',
            jenisTransaksi: 'penerimaan',
            metode: 'tunai',
            penerimaan: tax.amount,
            pengeluaran: 0,
            saldoRunning: running,
            originalTx: item,
          });
        });

        // 2. Baru setor semua pajak
        taxItems.forEach((tax) => {
          running -= tax.amount;
          result.push({
            id: `${item.id}-tax-setor-${tax.key}`,
            originalTxId: item.id,
            isTaxRow: true,
            taxRole: 'setor',
            taxLabel: tax.label,
            tanggal: item.tanggal,
            uraian: `Setor ${tax.label} ${item.uraian}`,
            noBukti: item.pajak?.ntpn ? `NTPN: ${item.pajak.ntpn}` : '',
            jenisTransaksi: 'pengeluaran',
            metode: 'tunai',
            penerimaan: 0,
            pengeluaran: tax.amount,
            saldoRunning: running,
            originalTx: item,
          });
        });
      }
    });

    return result;
  }, [bkuData]);

  // Filtered rows
  const filteredRows = enrichedBKU.filter((item) => {
    const matchSearch =
      item.uraian.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.noBukti.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.penerimaNama && item.penerimaNama.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchJenis =
      filterJenis === 'all' || item.jenisTransaksi === filterJenis;

    const matchBiaya =
      filterBiaya === 'all' || (item.jenisBiaya && item.jenisBiaya === filterBiaya) || (item.isTaxRow && filterBiaya === 'all');

    const matchBulan =
      filterBulan === 'all' || item.tanggal.startsWith(filterBulan);

    return matchSearch && matchJenis && matchBiaya && matchBulan;
  });

  // Active closing month data (if filterBulan is active, use it; otherwise use selectedClosingMonth)
  const activeMonthToClose = filterBulan !== 'all' ? filterBulan : selectedClosingMonth;
  const activeMonthTransactions = useMemo(() => {
    return enrichedBKU.filter((tx) => tx.tanggal.startsWith(activeMonthToClose));
  }, [enrichedBKU, activeMonthToClose]);

  const activeMonthIn = useMemo(() => {
    return activeMonthTransactions
      .reduce((acc, c) => acc + c.penerimaan, 0);
  }, [activeMonthTransactions]);

  const activeMonthOut = useMemo(() => {
    return activeMonthTransactions
      .reduce((acc, c) => acc + c.pengeluaran, 0);
  }, [activeMonthTransactions]);

  const activeMonthSaldo = activeMonthIn - activeMonthOut;

  // Prior balance before active month
  const priorTransactions = useMemo(() => {
    return enrichedBKU.filter((tx) => tx.tanggal < `${activeMonthToClose}-01`);
  }, [enrichedBKU, activeMonthToClose]);

  const priorMonthSaldo = useMemo(() => {
    return priorTransactions.reduce(
      (acc, c) => acc + (c.penerimaan - c.pengeluaran),
      0
    );
  }, [priorTransactions]);

  // Actual cumulative ending balance at close of active month (Kas Tunai)
  const activeMonthEndingSaldo = useMemo(() => {
    if (activeMonthTransactions.length > 0) {
      return activeMonthTransactions[activeMonthTransactions.length - 1].saldoRunning;
    }
    return priorMonthSaldo;
  }, [activeMonthTransactions, priorMonthSaldo]);

  // Closing date of active month
  const activeClosingDate = useMemo(() => {
    if (activeMonthTransactions.length > 0) {
      return activeMonthTransactions[activeMonthTransactions.length - 1].tanggal;
    }
    const [y, m] = activeMonthToClose.split('-').map(Number);
    if (!isNaN(y) && !isNaN(m)) {
      const lastDay = new Date(y, m, 0).getDate();
      return `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    }
    return '2025-07-31';
  }, [activeMonthTransactions, activeMonthToClose]);

  // Bank balance at active month closing (sisa dana rekening bank setelah ditarik ke kas tunai)
  const activeMonthBankBalance = useMemo(() => {
    if (!bukuBankData || bukuBankData.length === 0) return 0;
    if (activeMonthToClose === 'all') {
      return bukuBankData.reduce((acc, row) => acc + (row.penerimaan - row.pengeluaran), 0);
    }
    const endOfMonth = `${activeMonthToClose}-31`;
    const cutoffDate = activeClosingDate > endOfMonth ? activeClosingDate : endOfMonth;
    const txsUpToMonth = bukuBankData.filter((row) => row.tanggal <= cutoffDate);
    return txsUpToMonth.reduce((acc, row) => acc + (row.penerimaan - row.pengeluaran), 0);
  }, [bukuBankData, activeMonthToClose, activeClosingDate]);

  // Total semua dana yang ada (Saldo Kas Tunai + Saldo Bank)
  const totalSemuaDanaActiveMonth = activeMonthEndingSaldo + activeMonthBankBalance;

  // Totals
  const totalIn = filteredRows.reduce((acc, c) => acc + c.penerimaan, 0);
  const totalOut = filteredRows.reduce((acc, c) => acc + c.pengeluaran, 0);
  const saldoAkhir = totalIn - totalOut;

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      'No',
      'Tanggal',
      'No Bukti',
      'Uraian Transaksi',
      'Jenis Biaya',
      'Metode',
      'Penerimaan (Rp)',
      'Pengeluaran (Rp)',
      'Saldo (Rp)',
      'DPP (Rp)',
      'PPN 11% (Rp)',
      'PPh 22 (Rp)',
      'PPh 23 (Rp)',
      'PPh 4(2) (Rp)',
      'PPh 21 (Rp)',
      'Total Pajak (Rp)',
      'Jumlah Netto (Rp)',
    ];

    const rows = enrichedBKU.map((item, idx) => [
      idx + 1,
      item.tanggal,
      item.noBukti,
      item.uraian,
      item.jenisBiaya || '-',
      item.metode,
      item.penerimaan,
      item.pengeluaran,
      item.saldoRunning,
      item.pajak?.dpp || 0,
      item.pajak?.ppn || 0,
      item.pajak?.pph22 || 0,
      item.pajak?.pph23 || 0,
      item.pajak?.pph4_2 || 0,
      item.pajak?.pph21 || 0,
      item.pajak?.totalPajak || 0,
      item.pajak?.jumlahNetto || (item.penerimaan > 0 ? item.penerimaan : item.pengeluaran),
    ]);

    exportToCSV(`BKU_Revitalisasi_${schoolProfile.tahunAnggaran}`, headers, rows);
  };

  const [isExportingExcel, setIsExportingExcel] = useState(false);

  const handleDirectExportExcel = async () => {
    try {
      setIsExportingExcel(true);
      const isAll = filterBulan === 'all';
      const monthLabel = isAll 
        ? `TAHUN ANGGARAN ${schoolProfile.tahunAnggaran || '2025'}`
        : formatBulanTahunKapital(activeClosingDate);

      const exportRows = isAll ? enrichedBKU : activeMonthTransactions;
      const priorSaldo = isAll ? 0 : priorMonthSaldo;
      const totalOutAmt = exportRows.reduce((acc, c) => acc + c.pengeluaran, 0);
      const sisaBKUAmt = (priorSaldo + exportRows.reduce((acc, c) => acc + c.penerimaan, 0)) - totalOutAmt;
      const bankBal = isAll 
        ? (bukuBankData ? bukuBankData.reduce((acc, r) => acc + (r.penerimaan - r.pengeluaran), 0) : 0)
        : activeMonthBankBalance;
      const totalSemua = sisaBKUAmt + bankBal;

      await exportBKUToExcel({
        rows: exportRows.map((r) => ({
          id: r.id,
          isTaxRow: r.isTaxRow,
          taxRole: r.taxRole,
          tanggal: r.tanggal,
          uraian: r.uraian,
          noBukti: r.noBukti,
          penerimaan: r.penerimaan,
          pengeluaran: r.pengeluaran,
          sisaFinal: r.saldoRunning,
        })),
        saldoAwalBulan: priorSaldo,
        selectedMonth: filterBulan,
        isAllMonths: isAll,
        currentMonthLabel: monthLabel,
        closingDateIso: activeClosingDate,
        schoolProfile,
        totalPengeluaran: totalOutAmt,
        totalSemuaDana: totalSemua,
        displayKasTunai: sisaBKUAmt,
        displayBank: bankBal,
        selisih: 0,
        desa: schoolProfile.desa || 'GAPUK',
        kecamatan: schoolProfile.kecamatan || 'SURALAGA',
        kabupaten: schoolProfile.kabupatenKota || 'LOMBOK TIMUR',
        provinsi: schoolProfile.provinsi || 'NTB',
        singkatan: schoolProfile.singkatanTim || 'P2SP',
      });

      setToastMessage('Dokumen Excel BKU (.xlsx) resmi berhasil diunduh.');
      setTimeout(() => setToastMessage(null), 5000);
    } catch (err) {
      console.error('Gagal mengekspor Excel BKU:', err);
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
            <BookOpen className="w-6 h-6 text-emerald-700" />
            <span>Buku Kas Umum (BKU)</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Pencatatan seluruh transaksi pembelanjaan, penerimaan, dan format cetak penutupan kas resmi.
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
            <span>Input & Kelola Data</span>
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

      {/* SUB-TAB 2: PRATINJAU & CETAK RESMI BKU */}
      {subTab === 'preview' && (
        <OfficialBKUSheet
          bkuData={bkuData}
          schoolProfile={schoolProfile}
          bukuBankData={bukuBankData}
          onBackToInput={() => setSubTab('input')}
          initialMonth={filterBulan !== 'all' ? filterBulan : selectedClosingMonth}
        />
      )}

      {/* SUB-TAB 1: KELOLA & INPUT DATA */}
      {subTab === 'input' && (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                Daftar Pembukuan Transaksi BKU
              </h2>
              <p className="text-xs text-slate-500">
                Pilih transaksi untuk diedit, dicetak kwitansinya, atau klik Tambah Transaksi di samping.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDirectExportExcel}
                disabled={isExportingExcel}
                title="Ekspor format Excel (.xlsx) dengan susunan persis pratinjau resmi"
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
                onClick={() => setIsNumberingModalOpen(true)}
                title="Atur pola format otomatis Nomor Bukti / Kwitansi BKU"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors cursor-pointer shadow-2xs"
              >
                <Hash className="w-3.5 h-3.5 text-emerald-700" />
                <span>Format Penomoran</span>
              </button>

              <button
                type="button"
                onClick={() => setSubTab('preview')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-900 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors cursor-pointer shadow-2xs"
              >
                <Printer className="w-3.5 h-3.5 text-emerald-700" />
                <span>Pratinjau Cetak BKU</span>
              </button>

              <button
                type="button"
                onClick={openAddModal}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-700 rounded-md hover:bg-emerald-800 transition-colors shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Transaksi</span>
              </button>
            </div>
          </div>

      {/* Quick Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <span className="text-xs font-medium text-slate-500 uppercase">Total Penerimaan BKU</span>
          <div className="text-lg sm:text-xl font-bold font-mono text-emerald-800 mt-1 tabular-nums">
            {formatRupiah(totalIn)}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <span className="text-xs font-medium text-slate-500 uppercase">Total Pengeluaran Belanja</span>
          <div className="text-lg sm:text-xl font-bold font-mono text-slate-900 mt-1 tabular-nums">
            {formatRupiah(totalOut)}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <span className="text-xs font-medium text-slate-500 uppercase">Sisa Saldo Kas BKU</span>
          <div className="text-lg sm:text-xl font-bold font-mono text-emerald-900 mt-1 tabular-nums">
            {formatRupiah(saldoAkhir)}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Cari uraian, nomor bukti, rekanan..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs sm:text-sm border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600"
          />
        </div>

        {/* Filter Tabs & Dropdowns */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Segmented Filter */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg text-xs font-medium">
            <button
              onClick={() => setFilterJenis('all')}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                filterJenis === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semua
            </button>
            <button
              onClick={() => setFilterJenis('penerimaan')}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                filterJenis === 'penerimaan' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Penerimaan
            </button>
            <button
              onClick={() => setFilterJenis('pengeluaran')}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                filterJenis === 'pengeluaran' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Pengeluaran
            </button>
          </div>

          {/* Filter Jenis Biaya */}
          <select
            value={filterBiaya}
            onChange={(e) => setFilterBiaya(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 cursor-pointer"
          >
            <option value="all">Semua Jenis Biaya</option>
            <option value="Pengeluaran Bahan">Pengeluaran Bahan</option>
            <option value="Pengeluaran Upah">Pengeluaran Upah</option>
            <option value="Pengeluaran Alat">Pengeluaran Alat</option>
            <option value="Biaya Tim Teknis">Biaya Tim Teknis</option>
            <option value="Pengeluaran Operasional">Pengeluaran Operasional</option>
          </select>

          {/* Filter Bulan Transaksi */}
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1 shadow-2xs">
            <Calendar className="w-3.5 h-3.5 text-emerald-700" />
            <select
              value={filterBulan}
              onChange={(e) => {
                setFilterBulan(e.target.value);
                if (e.target.value !== 'all') {
                  setSelectedClosingMonth(e.target.value);
                }
              }}
              className="text-xs bg-transparent text-slate-800 font-semibold focus:outline-none cursor-pointer"
            >
              <option value="all">Semua Bulan</option>
              {availableMonths.map(([ym, label]) => (
                <option key={ym} value={ym}>
                  Bulan {label}
                </option>
              ))}
            </select>
          </div>
        </div>

      </div>

      {/* Main Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-3 text-center w-12">No</th>
                <th className="py-3 px-3 w-24">Tanggal</th>
                <th className="py-3 px-3 w-36">No. Bukti</th>
                <th className="py-3 px-4 min-w-[220px]">Uraian Transaksi</th>
                <th className="py-3 px-3 w-32">Jenis Biaya</th>
                <th className="py-3 px-3 text-right w-28">Penerimaan</th>
                <th className="py-3 px-3 text-right w-28">Pengeluaran</th>
                <th className="py-3 px-3 text-right w-28">Saldo Kas</th>
                <th className="py-3 px-3 text-right w-28">Pajak</th>
                <th className="py-3 px-3 text-center w-28">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-10 text-center text-slate-400">
                    Tidak ada transaksi yang cocok dengan pencarian / filter.
                  </td>
                </tr>
              ) : (
                (() => {
                  let mainIndex = 1;
                  return filteredRows.map((tx) => {
                    const isPengeluaran = tx.jenisTransaksi === 'pengeluaran';
                    const isTaxRow = tx.isTaxRow;

                    if (isTaxRow) {
                      return (
                        <tr
                          key={tx.id}
                          className="bg-slate-50/70 hover:bg-slate-100/70 transition-colors border-b border-dotted border-slate-200"
                        >
                          <td className="py-2.5 px-3 text-center text-slate-300 font-mono text-[11px]" />
                          <td className="py-2.5 px-3 font-mono text-slate-400 text-[11px] whitespace-nowrap" />
                          <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                            {tx.noBukti}
                          </td>
                          <td className="py-2.5 px-4 text-slate-800">
                            <div className="flex items-center gap-2 pl-3">
                              <span
                                className={`inline-block w-1.5 h-1.5 rounded-full ${
                                  tx.taxRole === 'terima' ? 'bg-emerald-500' : 'bg-amber-500'
                                }`}
                              />
                              <span className="font-medium text-slate-900">{tx.uraian}</span>
                              <span
                                className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                                  tx.taxRole === 'terima'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {tx.taxRole === 'terima' ? 'Pungut Pajak' : 'Setor Pajak'}
                              </span>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap text-slate-400">-</td>
                          <td className="py-2.5 px-3 text-right font-mono tabular-nums text-emerald-700 font-semibold">
                            {tx.penerimaan > 0 ? formatRupiah(tx.penerimaan) : '0'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-900 font-semibold">
                            {tx.pengeluaran > 0 ? formatRupiah(tx.pengeluaran) : '0'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono tabular-nums font-semibold text-slate-800">
                            {formatRupiah(tx.saldoRunning)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-400">-</td>
                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            <span className="text-[10px] text-slate-400 italic">Otomatis</span>
                          </td>
                        </tr>
                      );
                    }

                    const currentIdx = mainIndex++;
                    return (
                      <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3 text-center text-slate-500 font-medium">{currentIdx}</td>
                        <td className="py-3 px-3 font-mono text-slate-700 whitespace-nowrap">
                          {formatTanggalShort(tx.tanggal)}
                        </td>
                        <td className="py-3 px-3 font-mono text-[11px] font-medium text-slate-800 whitespace-nowrap">
                          {tx.noBukti}
                        </td>
                        <td className="py-3 px-4 text-slate-900">
                          <div className="font-medium">{tx.uraian}</div>
                          {tx.penerimaNama && (
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              Penerima: <span className="font-semibold text-slate-700">{tx.penerimaNama}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1.5 mt-1 text-[10px] text-slate-400">
                            {tx.metode === 'tunai' ? (
                              <span className="inline-flex items-center gap-0.5 text-emerald-700">
                                <Wallet className="w-3 h-3" /> Kas Tunai (BKT)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-0.5 text-blue-700">
                                <Landmark className="w-3 h-3" /> Transfer Bank
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          {tx.jenisBiaya ? (
                            <span className="text-xs text-slate-700 font-medium">
                              {tx.jenisBiaya}
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right font-mono tabular-nums text-emerald-700 font-medium">
                          {tx.penerimaan > 0 ? formatRupiah(tx.penerimaan) : '0'}
                        </td>
                        <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-900 font-medium">
                          {tx.pengeluaran > 0 ? formatRupiah(tx.pengeluaran) : '0'}
                        </td>
                        <td className="py-3 px-3 text-right font-mono tabular-nums font-semibold text-slate-800">
                          {formatRupiah(tx.saldoRunning)}
                        </td>
                        <td className="py-3 px-3 text-right">
                          {tx.pajak && tx.pajak.totalPajak > 0 ? (
                            <div className="space-y-0.5 font-mono">
                              <span className="font-semibold text-red-700 tabular-nums">
                                {formatRupiah(tx.pajak.totalPajak)}
                              </span>
                              <div className="text-[10px] text-slate-400 flex flex-wrap justify-end gap-1">
                                {tx.pajak.hasPPN && <span>PPN</span>}
                                {tx.pajak.hasPPh22 && <span>PPh22</span>}
                                {tx.pajak.hasPPh23 && <span>PPh23</span>}
                                {tx.pajak.hasPPh4Ayat2 && <span>PPh4(2)</span>}
                                {tx.pajak.hasPPh21 && <span>PPh21</span>}
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-400 font-mono">-</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1">
                            {isPengeluaran && (
                              <button
                                onClick={() => onSelectKwitansi(tx.originalTx || (tx as any))}
                                title="Cetak Kwitansi"
                                className="p-1.5 text-emerald-700 hover:bg-emerald-50 rounded transition-colors cursor-pointer"
                              >
                                <Receipt className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => openEditModal(tx.originalTx || (tx as any))}
                              title="Edit Transaksi Belanja"
                              className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                            >
                              <Edit3 className="w-4 h-4 pointer-events-none" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeletingTx(tx.originalTx || (tx as any));
                              }}
                              title="Hapus Transaksi Belanja"
                              className="p-1.5 text-slate-400 hover:text-red-700 hover:bg-red-50 rounded transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4 pointer-events-none" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  });
                })()
              )}
            </tbody>
            {filteredRows.length > 0 && (
              <tfoot>
                <tr className="bg-slate-100 font-bold border-t-2 border-slate-300 text-slate-900">
                  <td colSpan={5} className="py-3 px-4 text-center">
                    TOTAL KAS {filterBulan !== 'all' ? `(BULAN ${formatBulanTahunKapital(activeClosingDate)})` : ''}
                  </td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums text-emerald-800">
                    {formatRupiah(totalIn)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-900">
                    {formatRupiah(totalOut)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums text-emerald-900">
                    {formatRupiah(saldoAkhir)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums text-red-700">
                    {formatRupiah(
                      filteredRows.reduce((acc, c) => acc + (c.pajak?.totalPajak || 0), 0)
                    )}
                  </td>
                  <td />
                </tr>

                {/* 3 Baris Penutupan Buku Kas Umum Bulanan (Sesuai Gambar Lampiran Pengguna) */}
                {filterBulan !== 'all' && (
                  <>
                    <tr className="bg-slate-50 font-semibold border-t-2 border-b border-dotted border-slate-300 text-slate-900">
                      <td className="py-2.5 px-3 text-center" />
                      <td className="py-2.5 px-3 font-mono text-xs whitespace-nowrap text-slate-800">
                        {formatTanggalSlash(activeClosingDate)}
                      </td>
                      <td colSpan={3} className="py-2.5 px-4 text-slate-900 font-semibold">
                        Jumlah Pengeluaran
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono" />
                      <td className="py-2.5 px-3 text-right font-mono" />
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums font-bold text-slate-900">
                        {formatAngkaSen(totalOut)}
                      </td>
                      <td className="py-2.5 px-3" />
                      <td className="py-2.5 px-3" />
                    </tr>

                    <tr className="bg-slate-50 font-semibold border-b border-dotted border-slate-300 text-slate-900">
                      <td className="py-2.5 px-3 text-center" />
                      <td className="py-2.5 px-3 font-mono text-xs whitespace-nowrap" />
                      <td colSpan={3} className="py-2.5 px-4 text-slate-900 font-semibold">
                        Saldo Kas Umum
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono" />
                      <td className="py-2.5 px-3 text-right font-mono" />
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums font-bold text-emerald-900">
                        {formatAngkaSen(totalSemuaDanaActiveMonth)}
                      </td>
                      <td className="py-2.5 px-3" />
                      <td className="py-2.5 px-3" />
                    </tr>

                    <tr className="bg-emerald-50/60 font-bold border-b-4 border-double border-slate-900 text-slate-900">
                      <td className="py-2.5 px-3 text-center" />
                      <td className="py-2.5 px-3 font-mono text-xs whitespace-nowrap" />
                      <td colSpan={3} className="py-2.5 px-4 text-slate-900 font-bold">
                        Jumlah Total
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono" />
                      <td className="py-2.5 px-3 text-right font-mono" />
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums font-bold text-slate-950 border-t border-slate-400">
                        {formatAngkaSen(totalOut + totalSemuaDanaActiveMonth)}
                      </td>
                      <td className="py-2.5 px-3" />
                      <td className="py-2.5 px-3" />
                    </tr>
                  </>
                )}
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* --- BERITA ACARA & PERHITUNGAN PENUTUPAN BKU BULANAN (SESUAI GAMBAR) --- */}
      <div className="bg-white border-2 border-slate-300 rounded-xl shadow-xs p-6 space-y-5">
        
        {/* Card Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Berita Acara Penutupan Buku Kas Umum Bulanan
              </h2>
              <p className="text-xs text-slate-500">
                Perhitungan penutupan kas per akhir bulan sesuai standar format LPJ resmi.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-600">Pilih Bulan Ditutup:</span>
            <select
              value={selectedClosingMonth}
              onChange={(e) => setSelectedClosingMonth(e.target.value)}
              className="text-xs font-bold text-emerald-900 border border-slate-300 rounded-lg px-3 py-1.5 bg-slate-50 cursor-pointer shadow-2xs"
            >
              {availableMonths.map(([ym, label]) => (
                <option key={ym} value={ym}>
                  {label}
                </option>
              ))}
            </select>
            
            <button
              onClick={onOpenPrintBKU || onOpenPrintReport}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 transition-colors shadow-2xs cursor-pointer ml-2"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak Format Resmi</span>
            </button>
          </div>
        </div>

        {/* Legal Closure Statement (Terbilang Indonesian Date) */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-xs sm:text-sm text-slate-800 leading-relaxed font-sans">
          <p className="font-medium text-justify">
            {kalimatPenutupanKas(activeClosingDate)}
          </p>
        </div>

        {/* Calculation Table Matching the User's Image */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 font-sans">
          <div className="max-w-xl space-y-1.5 text-xs sm:text-[13px] text-slate-900">
            
            {/* 1. Sisa Buku Kas Umum (Semua Dana yang Ada) */}
            <div className="flex items-center">
              <span className="w-56 sm:w-64 font-medium">Sisa Buku Kas Umum</span>
              <span className="w-12 text-center text-slate-600">Rp.</span>
              <span className="w-40 text-right tabular-nums font-mono font-bold text-slate-900">
                {formatAngkaSen(totalSemuaDanaActiveMonth)}
              </span>
            </div>

            {/* 2. Terdiri dari */}
            <div className="font-semibold text-slate-700 pt-1">
              Terdiri dari:
            </div>

            {/* 3. Saldo Kas Tunai */}
            <div className="flex items-center pl-4">
              <span className="w-52 sm:w-60 text-slate-800">- Saldo Kas Tunai</span>
              <span className="w-12 text-center text-slate-600">Rp.</span>
              <span className="w-40 text-right tabular-nums font-mono font-medium">
                {formatAngkaSen(activeMonthEndingSaldo)}
              </span>
            </div>

            {/* 4. Saldo Bank */}
            <div className="flex items-center pl-4">
              <span className="w-52 sm:w-60 text-slate-800">- Saldo Bank</span>
              <span className="w-12 text-center text-slate-600">Rp.</span>
              <span className="w-40 text-right tabular-nums font-mono font-medium">
                {activeMonthBankBalance > 0 ? formatAngkaSen(activeMonthBankBalance) : (activeMonthBankBalance === 0 ? '0,00' : formatAngkaSen(activeMonthBankBalance))}
              </span>
            </div>

            {/* 5. Jumlah */}
            <div className="flex items-center pt-2">
              <span className="w-56 sm:w-64 text-right pr-8 font-semibold text-slate-700">Jumlah</span>
              <span className="w-12 text-center text-slate-600">Rp.</span>
              <span className="w-40 text-right tabular-nums font-mono font-bold text-slate-900">
                {formatAngkaSen(totalSemuaDanaActiveMonth)}
              </span>
            </div>

            {/* 6. Perbedaan dengan Double Underline */}
            <div className="flex items-center pt-1.5">
              <span className="w-56 sm:w-64 text-right pr-8 font-bold text-slate-900">Perbedaan</span>
              <span className="w-12" />
              <div className="w-40 text-center border-b-4 border-double border-slate-900 pb-0.5 font-bold tracking-widest text-emerald-800 uppercase">
                NIHIL
              </div>
            </div>

          </div>
        </div>

        {/* Signatures Preview */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-200 text-xs text-center text-slate-700">
          <div className="space-y-12">
            <div>
              <p>Mengetahui,</p>
              <p className="font-semibold">Kepala {schoolProfile.namaSekolah}</p>
            </div>
            <div>
              <p className="font-bold underline uppercase text-slate-900">{schoolProfile.namaKepalaSekolah}</p>
              {schoolProfile.nipKepalaSekolah && <p className="text-[11px] text-slate-500">NIP. {schoolProfile.nipKepalaSekolah}</p>}
            </div>
          </div>

          <div className="space-y-12">
            <div>
              <p>Disetujui oleh:</p>
              <p className="font-semibold">Ketua {schoolProfile.singkatanTim || 'P2SP'}</p>
            </div>
            <div>
              <p className="font-bold underline uppercase text-slate-900">{schoolProfile.namaKetuaTim}</p>
              {schoolProfile.nipKetuaTim && <p className="text-[11px] text-slate-500">NIP. {schoolProfile.nipKetuaTim}</p>}
            </div>
          </div>

          <div className="space-y-12">
            <div>
              <p>{schoolProfile.desa || 'Gapuk'}, {formatTanggalIndo(activeClosingDate)}</p>
              <p className="font-semibold">Bendahara {schoolProfile.singkatanTim || 'P2SP'}</p>
            </div>
            <div>
              <p className="font-bold underline uppercase text-slate-900">{schoolProfile.namaBendahara}</p>
              {schoolProfile.nipBendahara && <p className="text-[11px] text-slate-500">NIP. {schoolProfile.nipBendahara}</p>}
            </div>
          </div>
        </div>

      </div>

      {/* Modal Popup Form Input/Edit Transaksi BKU */}
      {isModalOpen && (
        <div 
          className="fixed inset-0 z-[100] overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200"
          onClick={() => setIsModalOpen(false)}
        >
          <div 
            id="bku-form-container" 
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl my-auto p-5 sm:p-7 space-y-4 max-h-[92vh] overflow-y-auto animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
                <span>{editingTx ? 'Ubah Transaksi BKU' : 'Tambah Transaksi Baru BKU'}</span>
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

          <form onSubmit={handleSubmit} className="space-y-5 text-sm">
              
              {/* Type Switcher: Penerimaan vs Pengeluaran */}
              <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-lg max-w-xs">
                <button
                  type="button"
                  onClick={() => {
                    const nextNo = getNextBKUBelanjaNoBukti(bkuData, formData.tanggal, schoolProfile.bkuNumbering, schoolProfile);
                    setFormData({
                      ...formData,
                      jenisTransaksi: 'pengeluaran',
                      noBukti: !formData.noBukti || formData.noBukti.startsWith('TRK-') || formData.noBukti.includes('/TRK/')
                        ? nextNo
                        : formData.noBukti,
                    });
                  }}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                    formData.jenisTransaksi === 'pengeluaran'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Pengeluaran Belanja
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const targetYear = formData.tanggal ? formData.tanggal.substring(0, 4) : '2026';
                    const nextNo = `TRK-${String(bkuData.length + 1).padStart(3, '0')}/${targetYear}`;
                    setFormData({
                      ...formData,
                      jenisTransaksi: 'penerimaan',
                      uraian: formData.uraian || 'Penarikan Tunai dari Rekening Bank untuk Kas Panitia',
                      noBukti: !formData.noBukti || formData.noBukti.startsWith('BKU-')
                        ? nextNo
                        : formData.noBukti,
                      deductFromBank: true,
                    });
                  }}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                    formData.jenisTransaksi === 'penerimaan'
                      ? 'bg-white text-emerald-800 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Penerimaan Dana
                </button>
              </div>

              {/* Basic Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-medium text-slate-700">
                      Tanggal Transaksi
                    </label>
                    {!editingTx && (
                      <span className="text-[10px] text-emerald-700 font-medium bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                        Otomatis tanggal belanja terakhir
                      </span>
                    )}
                  </div>
                  <input
                    type="date"
                    required
                    value={formData.tanggal}
                    onChange={(e) => {
                      const newDate = e.target.value;
                      let updatedNoBukti = formData.noBukti;
                      if (!editingTx && formData.jenisTransaksi === 'pengeluaran') {
                        updatedNoBukti = getNextBKUBelanjaNoBukti(
                          bkuData, 
                          newDate, 
                          schoolProfile.bkuNumbering, 
                          schoolProfile
                        );
                      }
                      setFormData({ ...formData, tanggal: newDate, noBukti: updatedNoBukti });
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-1 focus:ring-emerald-600 text-slate-800"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-medium text-slate-700">
                      Nomor Bukti / Kwitansi
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsNumberingModalOpen(true)}
                      className="text-[10px] text-emerald-700 hover:text-emerald-900 font-medium bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200 transition-colors cursor-pointer flex items-center gap-1"
                      title="Ubah pola format penomoran nomor bukti BKU"
                    >
                      <Settings className="w-3 h-3" />
                      <span>Atur Format</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: BKU-001/2026 atau 001/K/2026"
                    value={formData.noBukti}
                    onChange={(e) => setFormData({ ...formData, noBukti: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-1 focus:ring-emerald-600 text-slate-800 font-mono"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Uraian Pembayaran / Transaksi
                  </label>
                  <textarea
                    rows={2}
                    required
                    placeholder="Contoh: Pembelian Semen Gresik 100 Sak & Pasir Cor untuk Pengecoran Balok Lantai 2"
                    value={formData.uraian}
                    onChange={(e) => setFormData({ ...formData, uraian: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-1 focus:ring-emerald-600 text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Jumlah Nominal (Rp)
                  </label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={formData.jumlah || ''}
                    onChange={(e) => setFormData({ ...formData, jumlah: Number(e.target.value) })}
                    placeholder="0"
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-1 focus:ring-emerald-600 text-slate-900 font-mono font-semibold"
                  />
                  <span className="text-[11px] text-slate-400 mt-0.5 block font-mono">
                    {formatRupiah(formData.jumlah)}
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Metode Pembayaran
                  </label>
                  <select
                    value={formData.metode}
                    onChange={(e) => setFormData({ ...formData, metode: e.target.value as 'tunai' | 'bank' })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-1 focus:ring-emerald-600 text-slate-800"
                  >
                    <option value="tunai">Kas Tunai (Masuk ke BKT Otomatis)</option>
                    <option value="bank">Transfer Bank</option>
                  </select>
                </div>
              </div>

              {/* Penerimaan Specifics (Integrasi Pengurangan Saldo Kas Bank) */}
              {formData.jenisTransaksi === 'penerimaan' && (
                <div className="bg-emerald-50/90 border border-emerald-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                      <Landmark className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                          <span>Integrasi Penarikan Dana Buku Kas Bank</span>
                          <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
                            Otomatis Sinkron
                          </span>
                        </h4>
                      </div>
                      <p className="text-xs text-emerald-700 mt-1">
                        Penerimaan kas tunai di BKU bersumber dari penarikan tunai dana rekening bank panitia.
                      </p>
                    </div>
                  </div>

                  <div className="bg-white p-3 rounded-lg border border-emerald-200 text-xs space-y-2.5">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600 font-medium">Saldo Rekening Bank Saat Ini:</span>
                      <span className="font-mono font-bold text-slate-800 text-sm">
                        {formatRupiah(currentBankBalance)}
                      </span>
                    </div>

                    <label className="flex items-center gap-2.5 pt-2 border-t border-slate-100 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.deductFromBank}
                        onChange={(e) => setFormData({ ...formData, deductFromBank: e.target.checked })}
                        className="w-4 h-4 rounded text-emerald-700 focus:ring-emerald-600 cursor-pointer"
                      />
                      <span className="font-semibold text-slate-900">
                        Otomatis kurangi saldo Buku Kas Bank (catat sebagai pengeluaran penarikan tunai)
                      </span>
                    </label>

                    {formData.deductFromBank && (
                      <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-[11px]">
                        <span className="text-slate-600">Sisa saldo bank setelah penarikan ini:</span>
                        <span className={`font-mono font-bold ${currentBankBalance - formData.jumlah < 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                          {formatRupiah(Math.max(0, currentBankBalance - formData.jumlah))}
                          {currentBankBalance - formData.jumlah < 0 && ' (Peringatan: Melebihi saldo bank)'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Pengeluaran Specifics (Jenis Biaya & Penerima) */}
              {formData.jenisTransaksi === 'pengeluaran' && (
                <div className="space-y-4 pt-3 border-t border-slate-100">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Jenis Biaya Belanja
                      </label>
                      <select
                        value={formData.jenisBiaya}
                        onChange={(e) => setFormData({ ...formData, jenisBiaya: e.target.value as JenisBiaya })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-1 focus:ring-emerald-600 text-slate-800"
                      >
                        <option value="Pengeluaran Bahan">Pengeluaran Bahan</option>
                        <option value="Pengeluaran Upah">Pengeluaran Upah</option>
                        <option value="Pengeluaran Alat">Pengeluaran Alat</option>
                        <option value="Biaya Tim Teknis">Biaya Tim Teknis</option>
                        <option value="Pengeluaran Operasional">Pengeluaran Operasional</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Nama Penerima / Toko / Pekerja
                      </label>
                      <input
                        type="text"
                        placeholder="Contoh: Toko Bangunan Berkah"
                        value={formData.penerimaNama}
                        onChange={(e) => setFormData({ ...formData, penerimaNama: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-1 focus:ring-emerald-600 text-slate-800"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Alamat / Lokasi Rekanan
                      </label>
                      <input
                        type="text"
                        placeholder="Contoh: Jl. Raya Cisarua No. 12"
                        value={formData.penerimaAlamat}
                        onChange={(e) => setFormData({ ...formData, penerimaAlamat: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-1 focus:ring-emerald-600 text-slate-800"
                      />
                    </div>
                  </div>

                  {/* Section Pajak Terintegrasi */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2">
                      <div className="flex items-center gap-1.5">
                        <Percent className="w-4 h-4 text-emerald-700" />
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                          Pengenaan Pajak Belanja
                        </h3>
                      </div>

                      {/* Quick Presets */}
                      <div className="flex flex-wrap items-center gap-1 text-[11px]">
                        <span className="text-slate-400 mr-1 flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-amber-500" /> Preset:
                        </span>
                        <button
                          type="button"
                          onClick={() => applyPreset('bahan')}
                          className="px-2 py-0.5 bg-white border border-slate-200 rounded text-slate-700 hover:bg-slate-100"
                        >
                          Bahan (PPN 11% + PPh 22)
                        </button>
                        <button
                          type="button"
                          onClick={() => applyPreset('upah')}
                          className="px-2 py-0.5 bg-white border border-slate-200 rounded text-slate-700 hover:bg-slate-100"
                        >
                          Upah Tukang (PPh 21 5%)
                        </button>
                        <button
                          type="button"
                          onClick={() => applyPreset('alat')}
                          className="px-2 py-0.5 bg-white border border-slate-200 rounded text-slate-700 hover:bg-slate-100"
                        >
                          Sewa Alat (PPh 23 2%)
                        </button>
                        <button
                          type="button"
                          onClick={() => applyPreset('konstruksi')}
                          className="px-2 py-0.5 bg-white border border-slate-200 rounded text-slate-700 hover:bg-slate-100"
                        >
                          Konstruksi (PPh 4(2) 4%)
                        </button>
                        <button
                          type="button"
                          onClick={() => applyPreset('non_pajak')}
                          className="px-2 py-0.5 bg-white border border-slate-200 rounded text-slate-700 hover:bg-slate-100"
                        >
                          Non-Pajak
                        </button>
                      </div>
                    </div>

                    {/* Tax Checkboxes */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                      
                      {/* PPN 11% */}
                      <label className="flex items-start gap-2 p-2 rounded-lg bg-white border border-slate-200 cursor-pointer hover:border-slate-300">
                        <input
                          type="checkbox"
                          checked={formData.hasPPN}
                          onChange={(e) => setFormData({ ...formData, hasPPN: e.target.checked })}
                          className="mt-0.5 rounded text-emerald-700 focus:ring-emerald-600"
                        />
                        <div>
                          <div className="font-semibold text-slate-800">PPN 11%</div>
                          <div className="text-[11px] text-slate-500">DPP = 100/111 × Nilai Belanja</div>
                          {formData.hasPPN && (
                            <div className="font-mono text-emerald-800 font-semibold mt-1">
                              {formatRupiah(computedTax.ppn)}
                            </div>
                          )}
                        </div>
                      </label>

                      {/* PPh 22 (1.5%) */}
                      <label className="flex items-start gap-2 p-2 rounded-lg bg-white border border-slate-200 cursor-pointer hover:border-slate-300">
                        <input
                          type="checkbox"
                          checked={formData.hasPPh22}
                          onChange={(e) => setFormData({ ...formData, hasPPh22: e.target.checked })}
                          className="mt-0.5 rounded text-emerald-700 focus:ring-emerald-600"
                        />
                        <div>
                          <div className="font-semibold text-slate-800">PPh Pasal 22 (1,5%)</div>
                          <div className="text-[11px] text-slate-500">Pengadaan Bahan / Material</div>
                          {formData.hasPPh22 && (
                            <div className="font-mono text-emerald-800 font-semibold mt-1">
                              {formatRupiah(computedTax.pph22)}
                            </div>
                          )}
                        </div>
                      </label>

                      {/* PPh 23 (2%) */}
                      <label className="flex items-start gap-2 p-2 rounded-lg bg-white border border-slate-200 cursor-pointer hover:border-slate-300">
                        <input
                          type="checkbox"
                          checked={formData.hasPPh23}
                          onChange={(e) => setFormData({ ...formData, hasPPh23: e.target.checked })}
                          className="mt-0.5 rounded text-emerald-700 focus:ring-emerald-600"
                        />
                        <div>
                          <div className="font-semibold text-slate-800">PPh Pasal 23 (2%)</div>
                          <div className="text-[11px] text-slate-500">Sewa Alat / Jasa Teknik</div>
                          {formData.hasPPh23 && (
                            <div className="font-mono text-emerald-800 font-semibold mt-1">
                              {formatRupiah(computedTax.pph23)}
                            </div>
                          )}
                        </div>
                      </label>

                      {/* PPh 4 ayat 2 (4%) */}
                      <label className="flex items-start gap-2 p-2 rounded-lg bg-white border border-slate-200 cursor-pointer hover:border-slate-300">
                        <input
                          type="checkbox"
                          checked={formData.hasPPh4Ayat2}
                          onChange={(e) => setFormData({ ...formData, hasPPh4Ayat2: e.target.checked })}
                          className="mt-0.5 rounded text-emerald-700 focus:ring-emerald-600"
                        />
                        <div>
                          <div className="font-semibold text-slate-800">PPh Final Ps 4(2) (4%)</div>
                          <div className="text-[11px] text-slate-500">Pelaksana Jasa Konstruksi</div>
                          {formData.hasPPh4Ayat2 && (
                            <div className="font-mono text-emerald-800 font-semibold mt-1">
                              {formatRupiah(computedTax.pph4_2)}
                            </div>
                          )}
                        </div>
                      </label>

                      {/* PPh 21 (5%) */}
                      <label className="flex items-start gap-2 p-2 rounded-lg bg-white border border-slate-200 cursor-pointer hover:border-slate-300">
                        <input
                          type="checkbox"
                          checked={formData.hasPPh21}
                          onChange={(e) => setFormData({ ...formData, hasPPh21: e.target.checked })}
                          className="mt-0.5 rounded text-emerald-700 focus:ring-emerald-600"
                        />
                        <div>
                          <div className="font-semibold text-slate-800">PPh Pasal 21 (5%)</div>
                          <div className="text-[11px] text-slate-500">Upah Tukang / Honor Tim</div>
                          {formData.hasPPh21 && (
                            <div className="font-mono text-emerald-800 font-semibold mt-1">
                              {formatRupiah(computedTax.pph21)}
                            </div>
                          )}
                        </div>
                      </label>

                    </div>

                    {/* Tax Calculation Live Preview */}
                    <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-2 text-xs">
                      <div className="flex justify-between text-slate-600">
                        <span>Dasar Pengenaan Pajak (DPP):</span>
                        <span className="font-mono font-semibold text-slate-900">
                          {formatRupiah(computedTax.dpp)}
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Total Potongan Pajak:</span>
                        <span className="font-mono font-bold text-red-700">
                          - {formatRupiah(computedTax.totalPajak)}
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-900 font-semibold pt-1 border-t border-slate-100">
                        <span>Jumlah Netto Diterima Rekanan:</span>
                        <span className="font-mono text-emerald-800">
                          {formatRupiah(computedTax.jumlahNetto)}
                        </span>
                      </div>
                    </div>

                    {/* Status Setor Pajak & NTPN */}
                    {computedTax.totalPajak > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                        <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1">
                            Status Penyetoran Pajak
                          </label>
                          <select
                            value={formData.statusSetor}
                            onChange={(e) => setFormData({ ...formData, statusSetor: e.target.value as any })}
                            className="w-full px-3 py-1.5 border border-slate-300 rounded-md focus:ring-1 focus:ring-emerald-600 text-xs text-slate-800"
                          >
                            <option value="Belum Disetor">Belum Disetor</option>
                            <option value="Sudah Disetor">Sudah Disetor</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1">
                            Kode Billing / NTPN Setor (Jika ada)
                          </label>
                          <input
                            type="text"
                            placeholder="Contoh: 98C4E7812A45F01"
                            value={formData.ntpn}
                            onChange={(e) => setFormData({ ...formData, ntpn: e.target.value })}
                            className="w-full px-3 py-1.5 border border-slate-300 rounded-md focus:ring-1 focus:ring-emerald-600 text-xs font-mono text-slate-800"
                          />
                        </div>
                      </div>
                    )}

                  </div>
                </div>
              )}

              {/* Submit Buttons */}
              <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-100">
                {editingTx && (
                  <button
                    type="button"
                    onClick={() => {
                      setDeletingTx(editingTx);
                      setIsModalOpen(false);
                    }}
                    className="mr-auto inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-md transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Hapus Belanja Ini</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-700 rounded-md hover:bg-emerald-800 shadow-xs cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingTx ? 'Perbarui Transaksi' : 'Simpan ke BKU'}</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}


      {/* Modal Popup Konfirmasi Hapus Transaksi Belanja BKU */}
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
                  Hapus Transaksi BKU?
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Transaksi belanja ini akan dihapus secara permanen dari Buku Kas Umum.
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
                <span className="block text-slate-500 font-medium mb-1">Uraian Transaksi:</span>
                <div className="text-slate-800 font-medium leading-relaxed bg-white p-2.5 rounded-lg border border-slate-200">
                  {deletingTx.uraian}
                </div>
              </div>
              <div className="flex justify-between items-center text-slate-600 pt-2 border-t border-slate-200">
                <span className="font-bold text-slate-700">Jumlah Transaksi:</span>
                <span className="font-mono font-bold text-base text-red-600">
                  {formatRupiah(deletingTx.jumlah)}
                </span>
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
                  setToastMessage(`Transaksi "${deletingTx.noBukti}" berhasil dihapus dari BKU.`);
                  setDeletingTx(null);
                  setTimeout(() => setToastMessage(null), 5000);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-red-600 rounded-xl hover:bg-red-700 transition-colors shadow-xs cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Ya, Hapus Transaksi</span>
              </button>
            </div>
          </div>
        </div>
      )}
        </>
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

      {/* Modal Pengaturan Format Penomoran BKU */}
      <BKUNumberingSettingsModal
        isOpen={isNumberingModalOpen}
        onClose={() => setIsNumberingModalOpen(false)}
        currentConfig={schoolProfile.bkuNumbering}
        schoolProfile={schoolProfile}
        bkuData={bkuData}
        onSaveConfig={(newConfig) => {
          if (onUpdateProfile) {
            onUpdateProfile({
              ...schoolProfile,
              bkuNumbering: newConfig,
            });
          }
          // Jika form tambah transaksi sedang terbuka, perbarui noBukti yang sedang tampil
          if (isModalOpen && !editingTx && formData.jenisTransaksi === 'pengeluaran') {
            const nextNo = getNextBKUBelanjaNoBukti(bkuData, formData.tanggal, newConfig, schoolProfile);
            setFormData((prev) => ({ ...prev, noBukti: nextNo }));
          }
          setToastMessage('Format penomoran BKU berhasil diperbarui.');
          setTimeout(() => setToastMessage(null), 4000);
        }}
        onApplyToExistingTransactions={onBulkUpdateBKU ? (updatedList) => {
          onBulkUpdateBKU(updatedList);
          setToastMessage(`Berhasil menomori ulang ${updatedList.filter(t => t.jenisTransaksi === 'pengeluaran').length} transaksi belanja BKU.`);
          setTimeout(() => setToastMessage(null), 5000);
        } : undefined}
      />

    </div>
  );
};
