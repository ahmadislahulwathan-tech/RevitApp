import React, { useState } from 'react';
import { SchoolProfile } from '../types';
import { executePrint, downloadPrintableDocument } from '../utils/printHelper';
import { 
  Building2, 
  Save, 
  RotateCcw, 
  Printer, 
  Download, 
  Edit3, 
  FileText, 
  CheckCircle2, 
  ShieldCheck,
  Hash,
  Sparkles,
  Check
} from 'lucide-react';
import { 
  DEFAULT_BKU_NUMBERING, 
  NUMBERING_PRESETS, 
  generateBKUNoBukti 
} from '../utils/bkuNumbering';
import { BKUNumberingPattern } from '../types';

interface SchoolSettingsViewProps {
  profile: SchoolProfile;
  onSave: (profile: SchoolProfile) => void;
  onResetData: () => void;
}

export const SchoolSettingsView: React.FC<SchoolSettingsViewProps> = ({
  profile,
  onSave,
  onResetData,
}) => {
  const [subTab, setSubTab] = useState<'input' | 'preview'>('input');
  const [formData, setFormData] = useState<SchoolProfile>({ ...profile });
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [showConfirmReset, setShowConfirmReset] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    setSaveNotice('Data profil sekolah dan SK panitia berhasil disimpan!');
    setTimeout(() => setSaveNotice(null), 4000);
  };

  const handlePrint = () => {
    executePrint('settings-printable-area', `Profil_Panitia_${formData.namaSekolah.replace(/\s+/g, '_')}`, 'SK dan Profil Panitia Revitalisasi');
  };

  const handleDownload = () => {
    downloadPrintableDocument('settings-printable-area', `Profil_Panitia_${formData.namaSekolah.replace(/\s+/g, '_')}`, 'SK dan Profil Panitia Revitalisasi');
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header & Sub-tab Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Building2 className="w-6 h-6 text-emerald-700" />
            <span>Profil Sekolah & SK Panitia</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Kelola legalitas SK, data panitia pelaksana (P2SP), rekening bank, dan pratinjau dokumen resmi.
          </p>
        </div>

        {/* 2 Sub-menus: Input/Edit vs Preview */}
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
            <span>Ubah Data & SK</span>
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
            <span>Pratinjau & Cetak SK</span>
          </button>
        </div>
      </div>

      {/* Save Notification Banner */}
      {saveNotice && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl text-xs flex items-center gap-2 font-medium">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{saveNotice}</span>
        </div>
      )}

      {/* SUB-TAB 1: INPUT & EDIT DATA FORM */}
      {subTab === 'input' && (
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Card 1: Data Identitas Sekolah & Program */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
              Informasi Sekolah & Program Revitalisasi
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Sekolah
                </label>
                <input
                  type="text"
                  required
                  value={formData.namaSekolah}
                  onChange={(e) => setFormData({ ...formData, namaSekolah: e.target.value })}
                  className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  NPSN Sekolah
                </label>
                <input
                  type="text"
                  value={formData.npsn}
                  onChange={(e) => setFormData({ ...formData, npsn: e.target.value })}
                  className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-600 font-mono"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Program / Kegiatan
                </label>
                <input
                  type="text"
                  value={formData.namaProgram}
                  onChange={(e) => setFormData({ ...formData, namaProgram: e.target.value })}
                  className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tahun Anggaran
                </label>
                <input
                  type="text"
                  value={formData.tahunAnggaran}
                  onChange={(e) => setFormData({ ...formData, tahunAnggaran: e.target.value })}
                  className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-600 font-mono"
                />
              </div>

              <div className="sm:col-span-2 md:col-span-3">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nomor SK Tim Pelaksana Revitalisasi
                </label>
                <input
                  type="text"
                  value={formData.nomorSK}
                  onChange={(e) => setFormData({ ...formData, nomorSK: e.target.value })}
                  className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-600 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Card 2: Lokasi Administrasi */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
              Wilayah & Lokasi Administrasi (Untuk Kop Dokumen Resmi)
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Desa / Kelurahan
                </label>
                <input
                  type="text"
                  value={formData.desa || ''}
                  onChange={(e) => setFormData({ ...formData, desa: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-600 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Kecamatan
                </label>
                <input
                  type="text"
                  value={formData.kecamatan || ''}
                  onChange={(e) => setFormData({ ...formData, kecamatan: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-600 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Kabupaten / Kota
                </label>
                <input
                  type="text"
                  value={formData.kabupatenKota}
                  onChange={(e) => setFormData({ ...formData, kabupatenKota: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-600 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Provinsi
                </label>
                <input
                  type="text"
                  value={formData.provinsi}
                  onChange={(e) => setFormData({ ...formData, provinsi: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-600 font-medium"
                />
              </div>

              <div className="sm:col-span-2 md:col-span-4">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Alamat Lengkap Sekolah
                </label>
                <input
                  type="text"
                  value={formData.alamatSekolah}
                  onChange={(e) => setFormData({ ...formData, alamatSekolah: e.target.value })}
                  className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-600"
                />
              </div>
            </div>
          </div>

          {/* Card 3: Struktur Pejabat & Panitia */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
              Struktur Penandatangan Dokumen (Kepala Sekolah, Ketua Tim, Bendahara)
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Kepala Sekolah */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                  1. Kepala Sekolah
                </span>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Nama Lengkap & Gelar</label>
                  <input
                    type="text"
                    value={formData.namaKepalaSekolah}
                    onChange={(e) => setFormData({ ...formData, namaKepalaSekolah: e.target.value })}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">NIP Kepala Sekolah</label>
                  <input
                    type="text"
                    value={formData.nipKepalaSekolah}
                    onChange={(e) => setFormData({ ...formData, nipKepalaSekolah: e.target.value })}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg bg-white font-mono"
                  />
                </div>
              </div>

              {/* Bendahara */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                  2. Bendahara Tim / Kegiatan
                </span>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Nama Lengkap & Gelar</label>
                  <input
                    type="text"
                    value={formData.namaBendahara}
                    onChange={(e) => setFormData({ ...formData, namaBendahara: e.target.value })}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">NIP Bendahara</label>
                  <input
                    type="text"
                    value={formData.nipBendahara}
                    onChange={(e) => setFormData({ ...formData, nipBendahara: e.target.value })}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg bg-white font-mono"
                  />
                </div>
              </div>

              {/* Ketua Tim Pelaksana */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                  3. Ketua Tim Pelaksana Revitalisasi
                </span>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Nama Lengkap</label>
                  <input
                    type="text"
                    value={formData.namaKetuaTim}
                    onChange={(e) => setFormData({ ...formData, namaKetuaTim: e.target.value })}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg bg-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">NIP (Opsional)</label>
                    <input
                      type="text"
                      value={formData.nipKetuaTim}
                      onChange={(e) => setFormData({ ...formData, nipKetuaTim: e.target.value })}
                      className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg bg-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Singkatan Tim</label>
                    <input
                      type="text"
                      value={formData.singkatanTim || 'P2SP'}
                      onChange={(e) => setFormData({ ...formData, singkatanTim: e.target.value })}
                      placeholder="P2SP"
                      className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg bg-white font-mono font-bold text-emerald-800"
                    />
                  </div>
                </div>
              </div>

              {/* Rekening Bank */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                  4. Rekening Bank Penampung Dana
                </span>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Nama Bank</label>
                  <input
                    type="text"
                    value={formData.namaBank}
                    onChange={(e) => setFormData({ ...formData, namaBank: e.target.value })}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Nomor Rekening</label>
                  <input
                    type="text"
                    value={formData.noRekening}
                    onChange={(e) => setFormData({ ...formData, noRekening: e.target.value })}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Nama Atas Nama Rekening</label>
                  <input
                    type="text"
                    value={formData.namaRekening}
                    onChange={(e) => setFormData({ ...formData, namaRekening: e.target.value })}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg bg-white"
                  />
                </div>
              </div>

            </div>
          </div>

          {/* Card 4: Format Penomoran Buku Kas Umum (BKU) */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Hash className="w-4 h-4 text-emerald-700" />
                <span>Format Penomoran Buku Kas Umum (BKU)</span>
              </h2>
              <span className="text-[11px] font-medium text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                Otomatis pada Transaksi Belanja
              </span>
            </div>

            {/* Real-time Preview */}
            {(() => {
              const numCfg = formData.bkuNumbering || DEFAULT_BKU_NUMBERING;
              const sampleYear = formData.tahunAnggaran || '2025';
              const p1 = generateBKUNoBukti(numCfg.startNumber || 1, `${sampleYear}-08-15`, numCfg, formData);
              const p2 = generateBKUNoBukti((numCfg.startNumber || 1) + 1, `${sampleYear}-08-15`, numCfg, formData);
              const p3 = generateBKUNoBukti((numCfg.startNumber || 1) + 2, `${sampleYear}-08-15`, numCfg, formData);

              return (
                <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5 uppercase tracking-wider">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
                      Pratinjau Hasil Nomor Bukti Otomatis
                    </span>
                    <span className="text-[10px] bg-emerald-200/80 text-emerald-900 font-semibold px-2 py-0.5 rounded">
                      Live Preview
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="bg-white p-2 rounded-lg border border-emerald-200 text-center">
                      <div className="text-[10px] text-slate-400 font-medium">Nomor Ke-1</div>
                      <div className="font-mono font-bold text-emerald-800 text-xs sm:text-sm mt-0.5">{p1}</div>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-emerald-200 text-center">
                      <div className="text-[10px] text-slate-400 font-medium">Nomor Ke-2</div>
                      <div className="font-mono font-bold text-emerald-800 text-xs sm:text-sm mt-0.5">{p2}</div>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-emerald-200 text-center">
                      <div className="text-[10px] text-slate-400 font-medium">Nomor Ke-3</div>
                      <div className="font-mono font-bold text-emerald-800 text-xs sm:text-sm mt-0.5">{p3}</div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Presets Grid */}
            <div className="space-y-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-800">
                Pilih Pola Format Penomoran
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {NUMBERING_PRESETS.map((preset) => {
                  const currentCfg = formData.bkuNumbering || DEFAULT_BKU_NUMBERING;
                  const isSelected = currentCfg.pola === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => {
                        setFormData({
                          ...formData,
                          bkuNumbering: {
                            ...currentCfg,
                            pola: preset.id,
                            customTemplate: preset.template,
                          },
                        });
                      }}
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
                          <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </span>
                        ) : (
                          <span className="w-4 h-4 rounded-full border border-slate-300 shrink-0" />
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
              {(() => {
                const currentCfg = formData.bkuNumbering || DEFAULT_BKU_NUMBERING;
                if (currentCfg.pola !== 'custom') return null;

                return (
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2 mt-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-800 text-xs">Template Format Kustom:</span>
                      <span className="text-[10px] text-slate-500">Klik tag di bawah untuk menambahkan</span>
                    </div>
                    <input
                      type="text"
                      value={currentCfg.customTemplate || ''}
                      onChange={(e) => {
                        setFormData({
                          ...formData,
                          bkuNumbering: {
                            ...currentCfg,
                            customTemplate: e.target.value,
                          },
                        });
                      }}
                      placeholder="Contoh: {nomor}/K/{bulan_romawi}/{tahun}"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-xs focus:ring-1 focus:ring-emerald-600 bg-white font-bold text-slate-900"
                    />
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
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
                          onClick={() => {
                            setFormData({
                              ...formData,
                              bkuNumbering: {
                                ...currentCfg,
                                customTemplate: (currentCfg.customTemplate || '') + v.tag,
                              },
                            });
                          }}
                          className="px-2 py-0.5 bg-white border border-slate-300 rounded text-[10px] font-mono text-emerald-800 hover:bg-emerald-50 cursor-pointer"
                        >
                          + {v.tag}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Digit Padding, Nomor Awal & Siklus Reset */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-slate-100">
              {/* Digit Padding */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Jumlah Digit Nomor
                </label>
                <div className="grid grid-cols-4 gap-1">
                  {[1, 2, 3, 4].map((d) => {
                    const currentCfg = formData.bkuNumbering || DEFAULT_BKU_NUMBERING;
                    const isSel = currentCfg.digitPadding === d;
                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() => {
                          setFormData({
                            ...formData,
                            bkuNumbering: { ...currentCfg, digitPadding: d },
                          });
                        }}
                        className={`py-1.5 text-center rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                          isSel ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-bold' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {d} Digit
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Nomor Awal */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Nomor Awal / Mulai Dari
                </label>
                <input
                  type="number"
                  min="1"
                  max="9999"
                  value={(formData.bkuNumbering || DEFAULT_BKU_NUMBERING).startNumber || 1}
                  onChange={(e) => {
                    const currentCfg = formData.bkuNumbering || DEFAULT_BKU_NUMBERING;
                    setFormData({
                      ...formData,
                      bkuNumbering: {
                        ...currentCfg,
                        startNumber: Math.max(1, parseInt(e.target.value, 10) || 1),
                      },
                    });
                  }}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900"
                />
              </div>

              {/* Siklus Reset */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Siklus Reset Penomoran
                </label>
                <select
                  value={(formData.bkuNumbering || DEFAULT_BKU_NUMBERING).resetCycle || 'tahunan'}
                  onChange={(e) => {
                    const currentCfg = formData.bkuNumbering || DEFAULT_BKU_NUMBERING;
                    setFormData({
                      ...formData,
                      bkuNumbering: {
                        ...currentCfg,
                        resetCycle: e.target.value as any,
                      },
                    });
                  }}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 bg-white"
                >
                  <option value="tahunan">Urut Sepanjang Tahun (Standar)</option>
                  <option value="bulanan">Reset ke Nomor 1 Setiap Bulan</option>
                </select>
              </div>
            </div>

          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-2">
            <div>
              {!showConfirmReset ? (
                <button
                  type="button"
                  onClick={() => setShowConfirmReset(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-500 hover:text-red-700 bg-white border border-slate-200 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Kembalikan ke Data Sampel</span>
                </button>
              ) : (
                <div className="flex items-center gap-2 bg-red-50 p-2 rounded-lg border border-red-200">
                  <span className="text-xs text-red-800 font-medium">Yakin reset ke sampel awal?</span>
                  <button
                    type="button"
                    onClick={() => {
                      onResetData();
                      setShowConfirmReset(false);
                      setSaveNotice('Data berhasil dikembalikan ke sampel awal!');
                    }}
                    className="px-2 py-1 bg-red-600 text-white rounded text-xs font-bold hover:bg-red-700 cursor-pointer"
                  >
                    Ya, Reset
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowConfirmReset(false)}
                    className="px-2 py-1 bg-white text-slate-700 rounded text-xs border border-slate-300 hover:bg-slate-100 cursor-pointer"
                  >
                    Batal
                  </button>
                </div>
              )}
            </div>

            <button
              type="submit"
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-semibold text-white bg-emerald-700 rounded-xl hover:bg-emerald-800 transition-colors shadow-sm cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Simpan Perubahan Profil</span>
            </button>
          </div>

        </form>
      )}

      {/* SUB-TAB 2: PRATINJAU DOKUMEN RESMI SK & PANITIA */}
      {subTab === 'preview' && (
        <div className="space-y-4">
          
          {/* Controls Bar */}
          <div className="bg-slate-100 border border-slate-200 p-4 rounded-xl flex items-center justify-between flex-wrap gap-3 print:hidden">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-700" />
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                  Lembar Legalitas SK Tim Pelaksana Revitalisasi
                </h3>
                <p className="text-[11px] text-slate-500">
                  Dokumen siap cetak untuk lampiran laporan pertanggungjawaban dinas pendidikan.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 transition-colors shadow-xs cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak Dokumen</span>
              </button>
              <button
                type="button"
                onClick={handleDownload}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
              >
                <Download className="w-4 h-4 text-emerald-700" />
                <span>Unduh Siap Cetak</span>
              </button>
            </div>
          </div>

          {/* Printable Document Sheet Container */}
          <div className="bg-slate-200/60 p-4 sm:p-8 rounded-xl overflow-x-auto flex justify-center print:bg-white print:p-0">
            <div
              id="settings-printable-area"
              className="bg-white p-8 sm:p-12 w-full max-w-3xl shadow-md text-black font-sans leading-relaxed text-xs sm:text-sm print:border-none print:shadow-none print:max-w-none print:w-full print:p-0"
            >

              {/* Kop Surat */}
              <div className="border-b-2 border-black pb-4 mb-6 text-center space-y-1">
                <h1 className="text-base sm:text-lg font-bold uppercase tracking-wider text-black">
                  SUSUNAN TIM PELAKSANA REVITALISASI ({formData.singkatanTim || 'P2SP'})
                </h1>
                <h2 className="text-sm font-bold uppercase text-black">
                  {formData.namaSekolah}
                </h2>
                <p className="text-xs text-black">
                  {formData.alamatSekolah}, Desa {formData.desa || 'Gapuk'}, Kec. {formData.kecamatan || 'Suralaga'}, Kab. {formData.kabupatenKota}, Prov. {formData.provinsi}
                </p>
                <p className="text-xs font-mono font-semibold pt-1 text-black">
                  SK PENETAPAN NOMOR: {formData.nomorSK} · TAHUN ANGGARAN {formData.tahunAnggaran}
                </p>
              </div>

              {/* Table Data Panitia */}
              <div className="space-y-4 mb-8">
                <table className="w-full border-collapse border border-black text-xs text-black">
                  <thead>
                    <tr className="bg-slate-100 border-b border-black font-bold text-center">
                      <th className="border-r border-black p-2 w-12">No</th>
                      <th className="border-r border-black p-2 w-48">Jabatan dalam Tim</th>
                      <th className="border-r border-black p-2">Nama Pejabat / Pelaksana</th>
                      <th className="p-2 w-48">NIP / Identitas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black">
                    <tr>
                      <td className="border-r border-black p-2 text-center font-bold">1</td>
                      <td className="border-r border-black p-2 font-semibold">Penanggung Jawab / Kepala Sekolah</td>
                      <td className="border-r border-black p-2 font-bold">{formData.namaKepalaSekolah}</td>
                      <td className="p-2 font-mono">{formData.nipKepalaSekolah || '-'}</td>
                    </tr>
                    <tr>
                      <td className="border-r border-black p-2 text-center font-bold">2</td>
                      <td className="border-r border-black p-2 font-semibold">Ketua Tim Pelaksana ({formData.singkatanTim || 'P2SP'})</td>
                      <td className="border-r border-black p-2 font-bold">{formData.namaKetuaTim}</td>
                      <td className="p-2 font-mono">{formData.nipKetuaTim || '-'}</td>
                    </tr>
                    <tr>
                      <td className="border-r border-black p-2 text-center font-bold">3</td>
                      <td className="border-r border-black p-2 font-semibold">Bendahara Tim Pelaksana</td>
                      <td className="border-r border-black p-2 font-bold">{formData.namaBendahara}</td>
                      <td className="p-2 font-mono">{formData.nipBendahara || '-'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Data Rekening Bank */}
              <div className="border border-black p-4 mb-8 bg-slate-50/50 space-y-1.5 text-xs text-black">
                <div className="font-bold uppercase tracking-wide border-b border-black pb-1 mb-2">
                  Rekening Resmi Bantuan Pemerintah Revitalisasi
                </div>
                <div className="grid grid-cols-12 gap-2">
                  <span className="col-span-4 font-semibold">Nama Bank Penampung</span>
                  <span className="col-span-1 text-center">:</span>
                  <span className="col-span-7 font-bold">{formData.namaBank}</span>
                </div>
                <div className="grid grid-cols-12 gap-2">
                  <span className="col-span-4 font-semibold">Nomor Rekening</span>
                  <span className="col-span-1 text-center">:</span>
                  <span className="col-span-7 font-mono font-bold">{formData.noRekening}</span>
                </div>
                <div className="grid grid-cols-12 gap-2">
                  <span className="col-span-4 font-semibold">Atas Nama Rekening</span>
                  <span className="col-span-1 text-center">:</span>
                  <span className="col-span-7 font-bold">{formData.namaRekening}</span>
                </div>
              </div>

              {/* Tanda Tangan */}
              <div className="grid grid-cols-2 gap-8 text-center pt-4 text-xs text-black">
                <div>
                  <p className="font-medium">Mengetahui,</p>
                  <p className="font-bold">Ketua Tim Pelaksana</p>
                  <div className="h-20"></div>
                  <p className="font-bold underline uppercase">{formData.namaKetuaTim}</p>
                  {formData.nipKetuaTim && <p className="font-mono text-[11px]">NIP. {formData.nipKetuaTim}</p>}
                </div>
                <div>
                  <p className="font-medium">Ditetapkan di {formData.desa || 'Gapuk'}</p>
                  <p className="font-bold">Kepala Sekolah {formData.namaSekolah}</p>
                  <div className="h-20"></div>
                  <p className="font-bold underline uppercase">{formData.namaKepalaSekolah}</p>
                  {formData.nipKepalaSekolah && <p className="font-mono text-[11px]">NIP. {formData.nipKepalaSekolah}</p>}
                </div>
              </div>

            </div>
          </div>

        </div>
      )}

    </div>
  );
};
