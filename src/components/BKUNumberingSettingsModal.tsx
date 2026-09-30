import React, { useState, useMemo } from 'react';
import { BKUNumberingConfig, BKUNumberingPattern, BKUTransaction, SchoolProfile } from '../types';
import { 
  DEFAULT_BKU_NUMBERING, 
  NUMBERING_PRESETS, 
  generateBKUNoBukti,
  renumberAllBKUTransactions
} from '../utils/bkuNumbering';
import { 
  Hash, 
  Settings, 
  Check, 
  Sparkles, 
  RotateCw, 
  AlertCircle, 
  CheckCircle2, 
  X, 
  Calendar,
  Layers
} from 'lucide-react';

interface BKUNumberingSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentConfig?: BKUNumberingConfig;
  schoolProfile: SchoolProfile;
  bkuData: BKUTransaction[];
  onSaveConfig: (newConfig: BKUNumberingConfig) => void;
  onApplyToExistingTransactions?: (updatedBKUList: BKUTransaction[]) => void;
}

export const BKUNumberingSettingsModal: React.FC<BKUNumberingSettingsModalProps> = ({
  isOpen,
  onClose,
  currentConfig,
  schoolProfile,
  bkuData,
  onSaveConfig,
  onApplyToExistingTransactions,
}) => {
  const initialConfig = useMemo(() => {
    return currentConfig || schoolProfile.bkuNumbering || DEFAULT_BKU_NUMBERING;
  }, [currentConfig, schoolProfile.bkuNumbering]);

  const [config, setConfig] = useState<BKUNumberingConfig>({ ...initialConfig });
  const [showApplyConfirm, setShowApplyConfirm] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Sync state if modal reopens
  React.useEffect(() => {
    if (isOpen) {
      setConfig({ ...(currentConfig || schoolProfile.bkuNumbering || DEFAULT_BKU_NUMBERING) });
      setShowApplyConfirm(false);
    }
  }, [isOpen, currentConfig, schoolProfile.bkuNumbering]);

  if (!isOpen) return null;

  // Generate live sample numbers for preview
  const sampleYear = schoolProfile.tahunAnggaran || '2025';
  const sampleDate = `${sampleYear}-08-15`;
  const preview1 = generateBKUNoBukti(config.startNumber || 1, sampleDate, config, schoolProfile, 'Pengeluaran Bahan');
  const preview2 = generateBKUNoBukti((config.startNumber || 1) + 1, sampleDate, config, schoolProfile, 'Pengeluaran Alat');
  const preview3 = generateBKUNoBukti((config.startNumber || 1) + 2, sampleDate, config, schoolProfile, 'Pengeluaran Upah');

  const expenditureCount = bkuData.filter((tx) => tx.jenisTransaksi === 'pengeluaran').length;

  const handleSelectPreset = (patternId: BKUNumberingPattern) => {
    const preset = NUMBERING_PRESETS.find((p) => p.id === patternId);
    if (preset) {
      setConfig((prev) => ({
        ...prev,
        pola: patternId,
        customTemplate: preset.template,
      }));
    }
  };

  const handleInsertTag = (tag: string) => {
    setConfig((prev) => {
      const cur = prev.customTemplate || '';
      return {
        ...prev,
        customTemplate: cur + tag,
      };
    });
  };

  const handleSave = () => {
    onSaveConfig(config);
    setSuccessToast('Pengaturan format penomoran BKU berhasil disimpan!');
    setTimeout(() => {
      setSuccessToast(null);
      onClose();
    }, 1200);
  };

  const handleRenumberAll = () => {
    if (!onApplyToExistingTransactions) return;
    const updated = renumberAllBKUTransactions(bkuData, config, schoolProfile);
    onApplyToExistingTransactions(updated);
    onSaveConfig(config);
    setShowApplyConfirm(false);
    setSuccessToast(`Berhasil menerapkan format baru ke ${expenditureCount} transaksi belanja BKU!`);
    setTimeout(() => {
      setSuccessToast(null);
      onClose();
    }, 1800);
  };

  return (
    <div className="fixed inset-0 z-[120] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl my-8 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        {/* Header Modal */}
        <div className="bg-gradient-to-r from-emerald-800 to-teal-800 text-white p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center font-bold text-white shadow-inner">
              <Hash className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold">
                Pengaturan Format Penomoran BKU
              </h2>
              <p className="text-xs text-emerald-200">
                Sesuaikan pola nomor bukti / kwitansi belanja otomatis pada Buku Kas Umum
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body Scrollable */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 text-xs text-slate-700">
          
          {/* Real-time Preview Banner */}
          <div className="bg-emerald-50/80 border-2 border-emerald-200 rounded-xl p-4 shadow-2xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-700" />
                Pratinjau Hasil Nomor Bukti Otomatis
              </span>
              <span className="text-[10px] bg-emerald-200/80 text-emerald-900 font-semibold px-2 py-0.5 rounded-full">
                Real-time
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2">
              <div className="bg-white p-2.5 rounded-lg border border-emerald-200 text-center shadow-2xs">
                <div className="text-[10px] text-slate-400 font-medium">Transaksi ke-1</div>
                <div className="font-mono font-bold text-emerald-800 text-sm mt-0.5">{preview1}</div>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-emerald-200 text-center shadow-2xs">
                <div className="text-[10px] text-slate-400 font-medium">Transaksi ke-2</div>
                <div className="font-mono font-bold text-emerald-800 text-sm mt-0.5">{preview2}</div>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-emerald-200 text-center shadow-2xs">
                <div className="text-[10px] text-slate-400 font-medium">Transaksi ke-3</div>
                <div className="font-mono font-bold text-emerald-800 text-sm mt-0.5">{preview3}</div>
              </div>
            </div>
          </div>

          {/* Section 1: Pilihan Pola / Format Penomoran */}
          <div className="space-y-3">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-800">
              1. Pilih Pola / Format Penomoran
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {NUMBERING_PRESETS.map((preset) => {
                const isSelected = config.pola === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectPreset(preset.id)}
                    className={`text-left p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-600/20 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-bold text-slate-900 text-xs">
                        {preset.name}
                      </span>
                      {isSelected ? (
                        <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </span>
                      ) : (
                        <span className="w-5 h-5 rounded-full border border-slate-300 shrink-0" />
                      )}
                    </div>
                    <div className="mt-1 font-mono text-[11px] font-semibold text-emerald-700 bg-slate-100/80 px-2 py-0.5 rounded w-fit">
                      {preset.example}
                    </div>
                    <p className="mt-1 text-[11px] text-slate-500 leading-tight">
                      {preset.description}
                    </p>
                  </button>
                );
              })}
            </div>

            {/* Custom Template Editor */}
            {config.pola === 'custom' && (
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5 mt-3 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-800 text-xs">
                    Template Format Kustom:
                  </span>
                  <span className="text-[10px] text-slate-500">
                    Klik tag di bawah untuk menambahkan
                  </span>
                </div>
                <input
                  type="text"
                  value={config.customTemplate || ''}
                  onChange={(e) => setConfig({ ...config, customTemplate: e.target.value })}
                  placeholder="Contoh: {nomor}/K/{bulan_romawi}/{tahun}"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-xs focus:ring-1 focus:ring-emerald-600 bg-white text-slate-900 font-bold"
                />

                {/* Helper Variable Chips */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {[
                    { tag: '{nomor}', desc: 'Nomor Urut' },
                    { tag: '{tahun}', desc: 'Tahun 4 Digit' },
                    { tag: '{tahun_pendek}', desc: 'Tahun 2 Digit' },
                    { tag: '{bulan_angka}', desc: 'Bulan (01-12)' },
                    { tag: '{bulan_romawi}', desc: 'Romawi (I-XII)' },
                    { tag: '{singkatan}', desc: 'Singkatan Tim' },
                    { tag: '{kode_biaya}', desc: 'Kode Belanja' },
                  ].map((v) => (
                    <button
                      key={v.tag}
                      type="button"
                      onClick={() => handleInsertTag(v.tag)}
                      title={`Sisipkan tag: ${v.desc}`}
                      className="px-2 py-1 bg-white border border-slate-300 rounded-md text-[10px] font-mono text-emerald-800 hover:bg-emerald-50 hover:border-emerald-400 transition-colors cursor-pointer"
                    >
                      + {v.tag}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Format Digit & Nomor Awal */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-200">
            {/* Jumlah Digit Nomor (Padding) */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-800 mb-2">
                2. Format Digit Angka (Nol di Depan)
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { pad: 1, label: '1 Digit', sample: '1, 2' },
                  { pad: 2, label: '2 Digit', sample: '01, 02' },
                  { pad: 3, label: '3 Digit', sample: '001, 002' },
                  { pad: 4, label: '4 Digit', sample: '0001' },
                ].map((item) => (
                  <button
                    key={item.pad}
                    type="button"
                    onClick={() => setConfig({ ...config, digitPadding: item.pad })}
                    className={`py-2 px-1 text-center rounded-lg border text-xs transition-all cursor-pointer ${
                      config.digitPadding === item.pad
                        ? 'border-emerald-600 bg-emerald-50 font-bold text-emerald-900 shadow-2xs'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <div className="font-semibold">{item.label}</div>
                    <div className="font-mono text-[10px] text-slate-500">{item.sample}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Nomor Awal & Siklus Reset */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-800 mb-2">
                3. Nomor Awal / Mulai Dari
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="9999"
                  value={config.startNumber || 1}
                  onChange={(e) => setConfig({ ...config, startNumber: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                  className="w-24 px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-mono font-bold focus:ring-1 focus:ring-emerald-600 text-slate-800"
                />
                <span className="text-[11px] text-slate-500">
                  (Default: 1. Ubah jika melanjutkan penomoran sebelumnya)
                </span>
              </div>
            </div>
          </div>

          {/* Section 3: Siklus Reset Nomor */}
          <div className="pt-2 border-t border-slate-200">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-800 mb-2">
              4. Siklus Reset Penomoran
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {[
                {
                  id: 'tahunan',
                  title: 'Urut Sepanjang Tahun Anggaran (Standar)',
                  desc: 'Nomor terus berlanjut (misal BKU-001 s.d BKU-150) sepanjang 1 tahun buku tanpa reset tiap bulan.',
                },
                {
                  id: 'bulanan',
                  title: 'Reset Kembali ke Nomor 1 Setiap Bulan',
                  desc: 'Penomoran dimulai lagi dari nomor 1 pada awal setiap bulan kalender baru.',
                },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setConfig({ ...config, resetCycle: opt.id as any })}
                  className={`p-3 text-left rounded-xl border transition-all cursor-pointer ${
                    config.resetCycle === opt.id
                      ? 'border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-600/20 shadow-xs'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="font-bold text-slate-900 text-xs flex items-center justify-between">
                    <span>{opt.title}</span>
                    {config.resetCycle === opt.id && (
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    )}
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500 leading-tight">
                    {opt.desc}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Section 4: Terapkan ke Seluruh Transaksi yang Ada (Opsional) */}
          {onApplyToExistingTransactions && expenditureCount > 0 && (
            <div className="pt-3 border-t border-slate-200">
              <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="font-bold text-amber-900 text-xs flex items-center gap-1.5">
                    <RotateCw className="w-3.5 h-3.5 text-amber-700" />
                    <span>Perbarui Nomor Transaksi yang Sudah Ada?</span>
                  </div>
                  <p className="text-[11px] text-amber-800">
                    Terdapat <strong className="font-bold">{expenditureCount} transaksi belanja</strong> di BKU saat ini. Anda dapat menomori ulang seluruh transaksi tersebut secara berurutan sesuai tanggal.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowApplyConfirm(true)}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold text-xs transition-colors shrink-0 shadow-xs cursor-pointer"
                >
                  Terapkan ke {expenditureCount} Transaksi
                </button>
              </div>

              {/* Confirmation Dialog Box */}
              {showApplyConfirm && (
                <div className="mt-3 p-4 bg-red-50 border border-red-200 rounded-xl space-y-3 animate-in fade-in duration-150">
                  <div className="flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-red-900 text-xs">
                        Konfirmasi Penomoran Ulang Transaksi BKU
                      </div>
                      <p className="text-[11px] text-red-700 mt-0.5 leading-relaxed">
                        Tindakan ini akan mengganti seluruh Nomor Bukti pada {expenditureCount} transaksi belanja yang ada secara kronologis dari tanggal terlama ke terbaru dengan format baru. Nomor transaksi penerimaan (drop kas/pajak) tidak akan diubah.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowApplyConfirm(false)}
                      className="px-3 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={handleRenumberAll}
                      className="px-3 py-1 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors shadow-xs cursor-pointer"
                    >
                      Ya, Terapkan Sekarang
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-slate-500">
            Format ini akan otomatis dipakai untuk transaksi berikutnya.
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl transition-colors shadow-sm cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Simpan Pengaturan</span>
            </button>
          </div>
        </div>

        {/* Success Toast */}
        {successToast && (
          <div className="absolute bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 text-xs border border-slate-700">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successToast}</span>
          </div>
        )}

      </div>
    </div>
  );
};
