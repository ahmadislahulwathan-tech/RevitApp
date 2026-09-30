import React, { useState, useMemo } from 'react';
import { BKUTransaction, SchoolProfile } from '../types';
import { formatRupiah, formatTanggalIndo } from '../utils/format';
import { terbilangRupiah } from '../utils/terbilang';
import { downloadPrintableDocument, executePrint } from '../utils/printHelper';
import { Printer, Download, Receipt, ChevronDown, FileText } from 'lucide-react';

interface OfficialKwitansiSheetProps {
  bkuData: BKUTransaction[];
  schoolProfile: SchoolProfile;
  activeTxId?: string;
  onBackToInput?: () => void;
}

export const OfficialKwitansiSheet: React.FC<OfficialKwitansiSheetProps> = ({
  bkuData,
  schoolProfile,
  activeTxId,
  onBackToInput,
}) => {
  const expenditures = useMemo(() => {
    return bkuData
      .filter((t) => t.jenisTransaksi === 'pengeluaran')
      .sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());
  }, [bkuData]);

  const [selectedId, setSelectedId] = useState<string>(() => {
    if (activeTxId && expenditures.some((t) => t.id === activeTxId)) {
      return activeTxId;
    }
    return expenditures.length > 0 ? expenditures[0].id : '';
  });

  const [printNotice, setPrintNotice] = useState<string | null>(null);

  const transaction = expenditures.find((t) => t.id === selectedId) || expenditures[0];

  const handlePrint = () => {
    if (!transaction) return;
    const filename = `Kwitansi_${transaction.noBukti.replace(/[\/\s]/g, '_')}`;
    executePrint('kwitansi-printable-area', filename, `Kwitansi ${transaction.noBukti}`, 'portrait');
  };

  const handleDownload = () => {
    if (!transaction) return;
    const filename = `Kwitansi_${transaction.noBukti.replace(/[\/\s]/g, '_')}`;
    downloadPrintableDocument('kwitansi-printable-area', filename, `Kwitansi ${transaction.noBukti}`, 'portrait');
    setPrintNotice('File kwitansi siap cetak (A4 Portrait) berhasil diunduh.');
    setTimeout(() => setPrintNotice(null), 6000);
  };

  if (!transaction) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-500">
        Belum ada data transaksi belanja yang dapat dicetak kwitansinya.
      </div>
    );
  }

  const isHighValue = transaction.jumlah >= 5000000;
  const penerima = transaction.penerimaNama || 'Penyedia Barang / Jasa';

  return (
    <div className="space-y-4">
      {/* Controls Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
            <Receipt className="w-4 h-4 text-emerald-700" />
            Pilih Kwitansi Belanja:
          </span>

          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="text-xs py-1.5 px-3 bg-white border border-slate-300 rounded-lg font-bold text-emerald-900 cursor-pointer shadow-2xs focus:ring-1 focus:ring-emerald-600 max-w-xs sm:max-w-md truncate"
          >
            {expenditures.map((tx) => (
              <option key={tx.id} value={tx.id}>
                {tx.noBukti} - {tx.uraian.substring(0, 45)}... ({formatRupiah(tx.jumlah)})
              </option>
            ))}
          </select>

          {/* Badge Format Kertas A4 Portrait */}
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-sky-50 border border-sky-200 rounded-lg text-xs font-semibold text-sky-800">
            <FileText className="w-3.5 h-3.5 text-sky-700" />
            <span>Kertas A4 Portrait (210 × 297 mm)</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onBackToInput && (
            <button
              type="button"
              onClick={onBackToInput}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              Kembali ke Daftar Kwitansi
            </button>
          )}
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 transition-colors shadow-xs cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak Kwitansi (Portrait)</span>
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-emerald-700" />
            <span>Unduh Siap Cetak</span>
          </button>
        </div>
      </div>

      {/* Print Notice Banner */}
      {printNotice && (
        <div className="bg-emerald-50 border border-emerald-200 px-4 py-2.5 rounded-xl text-xs text-emerald-800 flex items-center justify-between print:hidden">
          <span>{printNotice}</span>
          <button onClick={() => setPrintNotice(null)} className="text-emerald-600 hover:text-emerald-900 font-bold ml-2">×</button>
        </div>
      )}

      {/* Printable Sheet Canvas - Format A4 Portrait */}
      <div className="bg-slate-200/60 p-4 sm:p-8 rounded-xl overflow-x-auto flex justify-center print:bg-white print:p-0">
        <div
          id="kwitansi-printable-area"
          className="print-portrait bg-white p-8 sm:p-12 w-full max-w-[210mm] shadow-md text-black font-sans leading-relaxed text-xs sm:text-[13px] print:border-none print:shadow-none print:max-w-none print:w-full print:p-0 relative"
        >
          {/* Header Badge di Layar (Disembunyikan saat dicetak) */}
          <div className="absolute top-2 right-4 text-[10px] font-mono text-slate-500 print:hidden flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-600"></span>
            <span>A4 Portrait (Siap Cetak)</span>
          </div>

          {/* Header Kop Kwitansi */}
          <div className="border-b-2 border-black pb-4 mb-6 text-center">
            <h3 className="text-xs uppercase tracking-widest text-black font-semibold mb-0.5">
              TIM PELAKSANA REVITALISASI ({schoolProfile.singkatanTim || 'P2SP'})
            </h3>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-black uppercase">
              KWITANSI / BUKTI PEMBAYARAN
            </h1>
            <p className="text-xs text-black font-medium mt-0.5">
              {schoolProfile.namaSekolah} · Tahun Anggaran {schoolProfile.tahunAnggaran}
            </p>
          </div>

          {/* Meta Info Bar (No Bukti & Mata Anggaran) */}
          <div className="flex justify-between items-center text-xs pb-3 mb-4 border-b border-black">
            <div>
              <span className="font-semibold">Tahun Anggaran: </span>
              <span className="font-mono">{schoolProfile.tahunAnggaran}</span>
            </div>
            <div>
              <span className="font-semibold">Mata Anggaran: </span>
              <span className="font-mono">{transaction.jenisBiaya || 'Pengeluaran Bahan'}</span>
            </div>
            <div>
              <span className="font-semibold">Nomor Bukti: </span>
              <span className="font-mono font-bold">{transaction.noBukti}</span>
            </div>
          </div>

          {/* Core Body Fields */}
          <div className="space-y-3.5 my-6 text-xs sm:text-[13px]">
            <div className="grid grid-cols-12 gap-2">
              <span className="col-span-4 font-semibold">Sudah Terima Dari</span>
              <span className="col-span-1 text-center">:</span>
              <span className="col-span-7 font-bold">
                Bendahara Tim Pelaksana Revitalisasi {schoolProfile.namaSekolah}
              </span>
            </div>

            <div className="grid grid-cols-12 gap-2">
              <span className="col-span-4 font-semibold">Uang Sejumlah</span>
              <span className="col-span-1 text-center">:</span>
              <div className="col-span-7 bg-slate-50 p-2.5 border border-black italic font-medium">
                "{terbilangRupiah(transaction.jumlah)}"
              </div>
            </div>

            <div className="grid grid-cols-12 gap-2">
              <span className="col-span-4 font-semibold">Untuk Pembayaran</span>
              <span className="col-span-1 text-center">:</span>
              <span className="col-span-7 leading-relaxed font-medium">
                {transaction.uraian}
              </span>
            </div>

            {transaction.penerimaNama && (
              <div className="grid grid-cols-12 gap-2">
                <span className="col-span-4 font-semibold">Penyedia / Penerima</span>
                <span className="col-span-1 text-center">:</span>
                <span className="col-span-7 font-semibold">
                  {transaction.penerimaNama} {transaction.penerimaAlamat ? `(${transaction.penerimaAlamat})` : ''}
                </span>
              </div>
            )}

            <div className="grid grid-cols-12 gap-2 pt-2 items-center">
              <span className="col-span-4 font-bold text-sm">Terbilang Nominal</span>
              <span className="col-span-1 text-center font-bold">:</span>
              <div className="col-span-7 font-mono font-bold text-base border-2 border-black px-3 py-1.5 inline-block w-fit bg-slate-50">
                {formatRupiah(transaction.jumlah)}
              </div>
            </div>
          </div>

          {/* Tax Deductions Summary */}
          {transaction.pajak && transaction.pajak.totalPajak > 0 && (
            <div className="my-6 border border-black p-3.5 bg-white text-xs">
              <div className="font-bold border-b border-black pb-1 mb-2">
                Rincian Perhitungan Pemotongan Pajak:
              </div>
              <div className="space-y-1 font-mono">
                <div className="flex justify-between">
                  <span>Jumlah Bruto Belanja</span>
                  <span className="font-semibold">{formatRupiah(transaction.jumlah)}</span>
                </div>
                {transaction.pajak.ppn > 0 && (
                  <div className="flex justify-between">
                    <span>- PPN (11%)</span>
                    <span>- {formatRupiah(transaction.pajak.ppn)}</span>
                  </div>
                )}
                {transaction.pajak.pph22 > 0 && (
                  <div className="flex justify-between">
                    <span>- PPh Pasal 22 (1.5%)</span>
                    <span>- {formatRupiah(transaction.pajak.pph22)}</span>
                  </div>
                )}
                {transaction.pajak.pph23 > 0 && (
                  <div className="flex justify-between">
                    <span>- PPh Pasal 23 (2%)</span>
                    <span>- {formatRupiah(transaction.pajak.pph23)}</span>
                  </div>
                )}
                {transaction.pajak.pph4_2 > 0 && (
                  <div className="flex justify-between">
                    <span>- PPh Final Pasal 4 ayat 2</span>
                    <span>- {formatRupiah(transaction.pajak.pph4_2)}</span>
                  </div>
                )}
                {transaction.pajak.pph21 > 0 && (
                  <div className="flex justify-between">
                    <span>- PPh Pasal 21 (Upah/Honor)</span>
                    <span>- {formatRupiah(transaction.pajak.pph21)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold border-t border-black pt-1">
                  <span>Jumlah Netto Diterima Rekanan</span>
                  <span>{formatRupiah(transaction.pajak.jumlahNetto)}</span>
                </div>
              </div>
            </div>
          )}

          {/* 3-Column Formal Signatures */}
          <div className="pt-6 border-t-2 border-black grid grid-cols-3 gap-4 text-center text-xs">
            <div>
              <p>Setuju dibayar:</p>
              <p className="font-bold">Kepala Sekolah {schoolProfile.namaSekolah}</p>
              <div className="h-20"></div>
              <p className="font-bold underline uppercase">{schoolProfile.namaKepalaSekolah}</p>
              {schoolProfile.nipKepalaSekolah && <p className="text-[10px]">NIP. {schoolProfile.nipKepalaSekolah}</p>}
            </div>

            <div>
              <p>Lunas dibayar tgl {formatTanggalIndo(transaction.tanggal)}</p>
              <p className="font-bold">Bendahara {schoolProfile.singkatanTim || 'P2SP'}</p>
              <div className="h-20"></div>
              <p className="font-bold underline uppercase">{schoolProfile.namaBendahara}</p>
              {schoolProfile.nipBendahara && <p className="text-[10px]">NIP. {schoolProfile.nipBendahara}</p>}
            </div>

            <div className="relative">
              <p>{schoolProfile.desa || 'Gapuk'}, {formatTanggalIndo(transaction.tanggal)}</p>
              <p className="font-bold">Yang Menerima,</p>
              
              {isHighValue && (
                <div className="my-1 py-0.5 border border-dashed border-black text-[10px] uppercase font-bold text-center w-28 mx-auto">
                  Materai Rp 10.000
                </div>
              )}
              
              <div className={isHighValue ? "h-14" : "h-20"}></div>
              <p className="font-bold underline uppercase">{penerima}</p>
              <p className="text-[10px] text-slate-600">Penyedia / Rekanan</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
