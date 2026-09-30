import ExcelJS from 'exceljs';
import { SchoolProfile } from '../types';
import { 
  formatTanggalDinas, 
  formatTanggalSlash, 
  formatTanggalDash,
  formatTanggalIndo 
} from './format';
import { kalimatPenutupanKas } from './terbilang';

export interface ExcelBKURow {
  id: string;
  isTaxRow: boolean;
  taxRole?: 'terima' | 'setor';
  tanggal: string;
  uraian: string;
  noBukti: string;
  penerimaan: number;
  pengeluaran: number;
  sisaFinal: number;
}

export interface ExportBKUExcelParams {
  rows: ExcelBKURow[];
  saldoAwalBulan: number;
  selectedMonth: string;
  isAllMonths: boolean;
  currentMonthLabel: string;
  closingDateIso: string;
  schoolProfile: SchoolProfile;
  totalPengeluaran: number;
  totalSemuaDana: number;
  displayKasTunai: number;
  displayBank: number;
  selisih: number;
  desa: string;
  kecamatan: string;
  kabupaten: string;
  provinsi: string;
  singkatan: string;
}

export async function exportBKUToExcel(params: ExportBKUExcelParams): Promise<void> {
  const {
    rows,
    saldoAwalBulan,
    selectedMonth,
    isAllMonths,
    currentMonthLabel,
    closingDateIso,
    schoolProfile,
    totalPengeluaran,
    totalSemuaDana,
    displayKasTunai,
    displayBank,
    selisih,
    desa,
    kecamatan,
    kabupaten,
    provinsi,
    singkatan,
  } = params;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Sistem BKU P2SP';
  workbook.created = new Date();

  const sheetName = selectedMonth === 'all' 
    ? 'BKU Tahunan' 
    : `BKU ${currentMonthLabel.substring(0, 25)}`;
  const ws = workbook.addWorksheet(sheetName, {
    pageSetup: {
      paperSize: 9, // A4
      orientation: 'portrait',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: {
        left: 0.5,
        right: 0.5,
        top: 0.6,
        bottom: 0.6,
        header: 0.3,
        footer: 0.3,
      },
    },
    views: [{ showGridLines: true }],
  });

  // Column settings
  ws.columns = [
    { key: 'colA', width: 6 },   // No.
    { key: 'colB', width: 14 },  // Tanggal
    { key: 'colC', width: 44 },  // Uraian
    { key: 'colD', width: 15 },  // No. Bukti
    { key: 'colE', width: 18 },  // Penerimaan Rp.
    { key: 'colF', width: 18 },  // Pengeluaran Rp.
    { key: 'colG', width: 20 },  // Sisa Rp.
  ];

  const currencyFormat = '#,##0.00;(#,##0.00);"-"';
  const borderThinBlack: Partial<ExcelJS.Borders> = {
    top: { style: 'thin', color: { argb: 'FF000000' } },
    left: { style: 'thin', color: { argb: 'FF000000' } },
    bottom: { style: 'thin', color: { argb: 'FF000000' } },
    right: { style: 'thin', color: { argb: 'FF000000' } },
  };

  let currentRow = 1;

  // Title: BUKU KAS UMUM
  ws.mergeCells(`A${currentRow}:G${currentRow}`);
  const title1 = ws.getCell(`A${currentRow}`);
  title1.value = 'BUKU KAS UMUM';
  title1.font = { name: 'Arial', size: 14, bold: true };
  title1.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(currentRow).height = 22;
  currentRow++;

  // Subtitle: Bulan
  ws.mergeCells(`A${currentRow}:G${currentRow}`);
  const title2 = ws.getCell(`A${currentRow}`);
  title2.value = selectedMonth === 'all' ? currentMonthLabel : `Bulan: ${currentMonthLabel}`;
  title2.font = { name: 'Arial', size: 11, bold: true };
  title2.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(currentRow).height = 18;
  currentRow += 2; // Blank row

  // Metadata Header (2 Columns: Left A-D, Right E-G)
  const metaStart = currentRow;

  // Left side metadata
  const setMetaRow = (rowNum: number, leftLabel: string, leftVal: string, rightLabel?: string, rightVal?: string) => {
    // Left
    ws.getCell(`A${rowNum}`).value = leftLabel;
    ws.getCell(`A${rowNum}`).font = { name: 'Arial', size: 9, bold: true };
    ws.getCell(`B${rowNum}`).value = ':';
    ws.getCell(`B${rowNum}`).font = { name: 'Arial', size: 9, bold: true };
    ws.getCell(`B${rowNum}`).alignment = { horizontal: 'center' };
    ws.mergeCells(`C${rowNum}:D${rowNum}`);
    ws.getCell(`C${rowNum}`).value = leftVal;
    ws.getCell(`C${rowNum}`).font = { name: 'Arial', size: 9, bold: true };

    // Right
    if (rightLabel) {
      ws.getCell(`E${rowNum}`).value = rightLabel;
      ws.getCell(`E${rowNum}`).font = { name: 'Arial', size: 9, bold: true };
      ws.getCell(`F${rowNum}`).value = ':';
      ws.getCell(`F${rowNum}`).font = { name: 'Arial', size: 9, bold: true };
      ws.getCell(`F${rowNum}`).alignment = { horizontal: 'center' };
      ws.getCell(`G${rowNum}`).value = rightVal || '';
      ws.getCell(`G${rowNum}`).font = { name: 'Arial', size: 9, bold: true };
    }
  };

  setMetaRow(currentRow, 'NAMA SEKOLAH', schoolProfile.namaSekolah, 'KABUPATEN', kabupaten);
  currentRow++;
  setMetaRow(currentRow, 'DESA', desa, 'PROVINSI', provinsi);
  currentRow++;
  setMetaRow(currentRow, 'KECAMATAN', kecamatan);
  currentRow += 2; // Blank row before table

  // Table Header
  const headerRow = currentRow;
  ws.getRow(headerRow).height = 24;
  
  const headers = [
    { col: 'A', text: 'No.' },
    { col: 'B', text: 'Tanggal' },
    { col: 'C', text: 'Uraian' },
    { col: 'D', text: 'No. Bukti' },
    { col: 'E', text: 'Penerimaan\n(Rp.)' },
    { col: 'F', text: 'Pengeluaran\n(Rp.)' },
    { col: 'G', text: 'Sisa\n(Rp.)' },
  ];

  headers.forEach(({ col, text }) => {
    const cell = ws.getCell(`${col}${headerRow}`);
    cell.value = text;
    cell.font = { name: 'Arial', size: 9, bold: true };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF2F2F2' },
    };
    cell.border = {
      top: { style: 'medium', color: { argb: 'FF000000' } },
      bottom: { style: 'medium', color: { argb: 'FF000000' } },
      left: { style: 'thin', color: { argb: 'FF000000' } },
      right: { style: 'thin', color: { argb: 'FF000000' } },
    };
  });
  currentRow++;

  // Optional: Saldo Kas Bulan Lalu row
  if (saldoAwalBulan > 0 && !isAllMonths) {
    const r = ws.getRow(currentRow);
    r.height = 19;
    
    ws.getCell(`A${currentRow}`).value = '-';
    ws.getCell(`A${currentRow}`).alignment = { horizontal: 'center' };
    ws.getCell(`B${currentRow}`).value = formatTanggalDinas(`${selectedMonth}-01`);
    ws.getCell(`B${currentRow}`).alignment = { horizontal: 'center' };
    ws.getCell(`C${currentRow}`).value = 'Saldo Kas Bulan Lalu (Bulan Sebelumnya)';
    ws.getCell(`C${currentRow}`).font = { italic: true, bold: true };
    ws.getCell(`D${currentRow}`).value = '-';
    ws.getCell(`D${currentRow}`).alignment = { horizontal: 'center' };
    ws.getCell(`E${currentRow}`).value = saldoAwalBulan;
    ws.getCell(`E${currentRow}`).numFmt = currencyFormat;
    ws.getCell(`F${currentRow}`).value = null;
    ws.getCell(`F${currentRow}`).numFmt = currencyFormat;
    ws.getCell(`G${currentRow}`).value = saldoAwalBulan;
    ws.getCell(`G${currentRow}`).numFmt = currencyFormat;

    ['A', 'B', 'C', 'D', 'E', 'F', 'G'].forEach((col) => {
      const c = ws.getCell(`${col}${currentRow}`);
      c.border = {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'dotted', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } },
      };
    });
    currentRow++;
  }

  // Transaction & Tax Rows
  let mainIndex = 1;
  rows.forEach((row) => {
    const r = ws.getRow(currentRow);
    r.height = 18;

    const cellA = ws.getCell(`A${currentRow}`);
    const cellB = ws.getCell(`B${currentRow}`);
    const cellC = ws.getCell(`C${currentRow}`);
    const cellD = ws.getCell(`D${currentRow}`);
    const cellE = ws.getCell(`E${currentRow}`);
    const cellF = ws.getCell(`F${currentRow}`);
    const cellG = ws.getCell(`G${currentRow}`);

    if (row.isTaxRow) {
      cellA.value = '';
      cellB.value = '';
      cellC.value = `   ${row.uraian}`; // slight indentation
      cellC.font = { name: 'Arial', size: 9 };
      cellC.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
      cellD.value = row.noBukti || '';
      cellD.alignment = { horizontal: 'center', vertical: 'middle' };
    } else {
      cellA.value = `${mainIndex++}.`;
      cellA.alignment = { horizontal: 'center', vertical: 'middle' };
      cellB.value = formatTanggalDinas(row.tanggal);
      cellB.alignment = { horizontal: 'center', vertical: 'middle' };
      cellC.value = row.uraian;
      cellC.font = { name: 'Arial', size: 9 };
      cellC.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
      cellD.value = row.noBukti;
      cellD.alignment = { horizontal: 'center', vertical: 'middle' };
    }

    cellE.value = row.penerimaan > 0 ? row.penerimaan : null;
    cellE.numFmt = currencyFormat;
    cellE.alignment = { horizontal: 'right', vertical: 'middle' };

    cellF.value = row.pengeluaran > 0 ? row.pengeluaran : null;
    cellF.numFmt = currencyFormat;
    cellF.alignment = { horizontal: 'right', vertical: 'middle' };

    cellG.value = row.sisaFinal;
    cellG.numFmt = currencyFormat;
    cellG.alignment = { horizontal: 'right', vertical: 'middle' };

    ['A', 'B', 'C', 'D', 'E', 'F', 'G'].forEach((col) => {
      const c = ws.getCell(`${col}${currentRow}`);
      c.font = { name: 'Arial', size: 9 };
      c.border = {
        left: { style: 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } },
        top: { style: 'dotted', color: { argb: 'FFAAAAAA' } },
        bottom: { style: 'dotted', color: { argb: 'FFAAAAAA' } },
      };
    });

    currentRow++;
  });

  // 3 Baris Penutupan Buku Kas Umum Bulanan (Persis seperti di preview)
  // Row 1: Jumlah Pengeluaran
  const rowPengeluaran = currentRow;
  ws.getRow(rowPengeluaran).height = 19;
  ws.getCell(`B${rowPengeluaran}`).value = formatTanggalSlash(closingDateIso);
  ws.getCell(`B${rowPengeluaran}`).alignment = { horizontal: 'center' };
  ws.getCell(`B${rowPengeluaran}`).font = { name: 'Arial', size: 9, bold: true };
  ws.getCell(`C${rowPengeluaran}`).value = 'Jumlah Pengeluaran';
  ws.getCell(`C${rowPengeluaran}`).font = { name: 'Arial', size: 9, bold: true };
  ws.getCell(`G${rowPengeluaran}`).value = totalPengeluaran;
  ws.getCell(`G${rowPengeluaran}`).numFmt = currencyFormat;
  ws.getCell(`G${rowPengeluaran}`).font = { name: 'Arial', size: 9, bold: true };

  ['A', 'B', 'C', 'D', 'E', 'F', 'G'].forEach((col) => {
    ws.getCell(`${col}${rowPengeluaran}`).border = {
      top: { style: 'medium', color: { argb: 'FF000000' } },
      bottom: { style: 'dotted', color: { argb: 'FF000000' } },
      left: { style: 'thin', color: { argb: 'FF000000' } },
      right: { style: 'thin', color: { argb: 'FF000000' } },
    };
  });
  currentRow++;

  // Row 2: Saldo Kas Umum
  const rowSaldo = currentRow;
  ws.getRow(rowSaldo).height = 19;
  ws.getCell(`C${rowSaldo}`).value = 'Saldo Kas Umum';
  ws.getCell(`C${rowSaldo}`).font = { name: 'Arial', size: 9, bold: true };
  ws.getCell(`G${rowSaldo}`).value = totalSemuaDana;
  ws.getCell(`G${rowSaldo}`).numFmt = currencyFormat;
  ws.getCell(`G${rowSaldo}`).font = { name: 'Arial', size: 9, bold: true };

  ['A', 'B', 'C', 'D', 'E', 'F', 'G'].forEach((col) => {
    ws.getCell(`${col}${rowSaldo}`).border = {
      top: { style: 'dotted', color: { argb: 'FF000000' } },
      bottom: { style: 'dotted', color: { argb: 'FF000000' } },
      left: { style: 'thin', color: { argb: 'FF000000' } },
      right: { style: 'thin', color: { argb: 'FF000000' } },
    };
  });
  currentRow++;

  // Row 3: Jumlah Total (double bottom border)
  const rowTotal = currentRow;
  ws.getRow(rowTotal).height = 20;
  ws.getCell(`C${rowTotal}`).value = 'Jumlah Total';
  ws.getCell(`C${rowTotal}`).font = { name: 'Arial', size: 9, bold: true };
  ws.getCell(`G${rowTotal}`).value = totalPengeluaran + totalSemuaDana;
  ws.getCell(`G${rowTotal}`).numFmt = currencyFormat;
  ws.getCell(`G${rowTotal}`).font = { name: 'Arial', size: 9, bold: true };

  ['A', 'B', 'C', 'D', 'E', 'F', 'G'].forEach((col) => {
    ws.getCell(`${col}${rowTotal}`).border = {
      top: { style: 'thin', color: { argb: 'FF000000' } },
      bottom: { style: 'double', color: { argb: 'FF000000' } },
      left: { style: 'thin', color: { argb: 'FF000000' } },
      right: { style: 'thin', color: { argb: 'FF000000' } },
    };
  });
  currentRow += 2; // Blank row

  // Kalimat Penutupan Kas (Merged A to G)
  ws.mergeCells(`A${currentRow}:G${currentRow}`);
  const legalTextCell = ws.getCell(`A${currentRow}`);
  legalTextCell.value = kalimatPenutupanKas(closingDateIso);
  legalTextCell.font = { name: 'Arial', size: 9, italic: false };
  legalTextCell.alignment = { vertical: 'middle', wrapText: true };
  ws.getRow(currentRow).height = 28;
  currentRow += 2;

  // Cash Breakdown Box (Tabel Perhitungan Penutupan Kas Sesuai Format Resmi)
  // Outer frame over columns A-D
  const boxStart = currentRow;

  // Box Row 1: Sisa Buku Kas Umum
  ws.mergeCells(`A${currentRow}:B${currentRow}`);
  ws.getCell(`A${currentRow}`).value = 'Sisa Buku Kas Umum';
  ws.getCell(`A${currentRow}`).font = { name: 'Arial', size: 9, bold: true };
  ws.getCell(`C${currentRow}`).value = 'Rp.';
  ws.getCell(`C${currentRow}`).alignment = { horizontal: 'center' };
  ws.getCell(`D${currentRow}`).value = totalSemuaDana;
  ws.getCell(`D${currentRow}`).numFmt = currencyFormat;
  ws.getCell(`D${currentRow}`).font = { name: 'Arial', size: 9, bold: true };
  currentRow++;

  // Box Row 2: Terdiri dari:
  ws.mergeCells(`A${currentRow}:B${currentRow}`);
  ws.getCell(`A${currentRow}`).value = 'Terdiri dari :';
  ws.getCell(`A${currentRow}`).font = { name: 'Arial', size: 9, bold: true };
  currentRow++;

  // Box Row 3: - Saldo Kas Tunai
  ws.mergeCells(`A${currentRow}:B${currentRow}`);
  ws.getCell(`A${currentRow}`).value = '  - Saldo Kas Tunai';
  ws.getCell(`A${currentRow}`).font = { name: 'Arial', size: 9 };
  ws.getCell(`C${currentRow}`).value = 'Rp.';
  ws.getCell(`C${currentRow}`).alignment = { horizontal: 'center' };
  ws.getCell(`D${currentRow}`).value = displayKasTunai;
  ws.getCell(`D${currentRow}`).numFmt = currencyFormat;
  currentRow++;

  // Box Row 4: - Saldo Bank
  ws.mergeCells(`A${currentRow}:B${currentRow}`);
  ws.getCell(`A${currentRow}`).value = '  - Saldo Bank';
  ws.getCell(`A${currentRow}`).font = { name: 'Arial', size: 9 };
  ws.getCell(`C${currentRow}`).value = 'Rp.';
  ws.getCell(`C${currentRow}`).alignment = { horizontal: 'center' };
  ws.getCell(`D${currentRow}`).value = displayBank;
  ws.getCell(`D${currentRow}`).numFmt = currencyFormat;
  currentRow++;

  // Box Row 5: Jumlah
  ws.mergeCells(`A${currentRow}:B${currentRow}`);
  ws.getCell(`A${currentRow}`).value = 'Jumlah';
  ws.getCell(`A${currentRow}`).font = { name: 'Arial', size: 9, bold: true };
  ws.getCell(`A${currentRow}`).alignment = { horizontal: 'right' };
  ws.getCell(`C${currentRow}`).value = 'Rp.';
  ws.getCell(`C${currentRow}`).alignment = { horizontal: 'center' };
  ws.getCell(`C${currentRow}`).border = { top: { style: 'thin', color: { argb: 'FF000000' } } };
  ws.getCell(`D${currentRow}`).value = totalSemuaDana;
  ws.getCell(`D${currentRow}`).numFmt = currencyFormat;
  ws.getCell(`D${currentRow}`).font = { name: 'Arial', size: 9, bold: true };
  ws.getCell(`D${currentRow}`).border = { top: { style: 'thin', color: { argb: 'FF000000' } } };
  currentRow++;

  // Box Row 6: Perbedaan (NIHIL)
  ws.mergeCells(`A${currentRow}:B${currentRow}`);
  ws.getCell(`A${currentRow}`).value = 'Perbedaan';
  ws.getCell(`A${currentRow}`).font = { name: 'Arial', size: 9, bold: true };
  ws.getCell(`A${currentRow}`).alignment = { horizontal: 'right' };
  ws.getCell(`C${currentRow}`).value = '';
  ws.getCell(`D${currentRow}`).value = selisih === 0 ? 'NIHIL' : selisih;
  if (selisih !== 0) {
    ws.getCell(`D${currentRow}`).numFmt = currencyFormat;
  }
  ws.getCell(`D${currentRow}`).font = { name: 'Arial', size: 9, bold: true };
  ws.getCell(`D${currentRow}`).alignment = { horizontal: 'center' };
  ws.getCell(`D${currentRow}`).border = { bottom: { style: 'double', color: { argb: 'FF000000' } } };

  // Set borders for breakdown box (columns A to D)
  for (let r = boxStart; r <= currentRow; r++) {
    ['A', 'B', 'C', 'D'].forEach((col) => {
      const c = ws.getCell(`${col}${r}`);
      c.border = {
        ...c.border,
        left: col === 'A' ? { style: 'thin', color: { argb: 'FF000000' } } : undefined,
        right: col === 'D' ? { style: 'thin', color: { argb: 'FF000000' } } : undefined,
        top: r === boxStart ? { style: 'thin', color: { argb: 'FF000000' } } : c.border?.top,
        bottom: r === currentRow ? { style: 'thin', color: { argb: 'FF000000' } } : c.border?.bottom,
      };
    });
  }

  currentRow += 3; // Space before signatures

  // Signatures Section (3 columns: Left Cols A-B, Middle Cols C-E, Right Cols F-G)
  const sigRow1 = currentRow;
  // Col 1 (A-B): Kepala Sekolah
  ws.mergeCells(`A${sigRow1}:B${sigRow1}`);
  ws.getCell(`A${sigRow1}`).value = 'Mengetahui,';
  ws.getCell(`A${sigRow1}`).alignment = { horizontal: 'center' };
  ws.getCell(`A${sigRow1}`).font = { name: 'Arial', size: 9 };

  // Col 2 (C-E): Ketua Tim
  ws.mergeCells(`C${sigRow1}:E${sigRow1}`);
  ws.getCell(`C${sigRow1}`).value = 'Disetujui oleh:';
  ws.getCell(`C${sigRow1}`).alignment = { horizontal: 'center' };
  ws.getCell(`C${sigRow1}`).font = { name: 'Arial', size: 9 };

  // Col 3 (F-G): Bendahara
  ws.mergeCells(`F${sigRow1}:G${sigRow1}`);
  ws.getCell(`F${sigRow1}`).value = `${desa}, ${formatTanggalIndo(closingDateIso)}`;
  ws.getCell(`F${sigRow1}`).alignment = { horizontal: 'center' };
  ws.getCell(`F${sigRow1}`).font = { name: 'Arial', size: 9 };
  currentRow++;

  const sigRow2 = currentRow;
  ws.mergeCells(`A${sigRow2}:B${sigRow2}`);
  ws.getCell(`A${sigRow2}`).value = `Kepala Sekolah ${schoolProfile.namaSekolah}`;
  ws.getCell(`A${sigRow2}`).alignment = { horizontal: 'center' };
  ws.getCell(`A${sigRow2}`).font = { name: 'Arial', size: 9, bold: true };

  ws.mergeCells(`C${sigRow2}:E${sigRow2}`);
  ws.getCell(`C${sigRow2}`).value = `Ketua ${singkatan}`;
  ws.getCell(`C${sigRow2}`).alignment = { horizontal: 'center' };
  ws.getCell(`C${sigRow2}`).font = { name: 'Arial', size: 9, bold: true };

  ws.mergeCells(`F${sigRow2}:G${sigRow2}`);
  ws.getCell(`F${sigRow2}`).value = `Bendahara ${singkatan}`;
  ws.getCell(`F${sigRow2}`).alignment = { horizontal: 'center' };
  ws.getCell(`F${sigRow2}`).font = { name: 'Arial', size: 9, bold: true };

  // 4 rows empty for physical signature
  currentRow += 4;

  const sigRowName = currentRow;
  ws.mergeCells(`A${sigRowName}:B${sigRowName}`);
  ws.getCell(`A${sigRowName}`).value = schoolProfile.namaKepalaSekolah;
  ws.getCell(`A${sigRowName}`).alignment = { horizontal: 'center' };
  ws.getCell(`A${sigRowName}`).font = { name: 'Arial', size: 9, bold: true, underline: true };

  ws.mergeCells(`C${sigRowName}:E${sigRowName}`);
  ws.getCell(`C${sigRowName}`).value = schoolProfile.namaKetuaTim;
  ws.getCell(`C${sigRowName}`).alignment = { horizontal: 'center' };
  ws.getCell(`C${sigRowName}`).font = { name: 'Arial', size: 9, bold: true, underline: true };

  ws.mergeCells(`F${sigRowName}:G${sigRowName}`);
  ws.getCell(`F${sigRowName}`).value = schoolProfile.namaBendahara;
  ws.getCell(`F${sigRowName}`).alignment = { horizontal: 'center' };
  ws.getCell(`F${sigRowName}`).font = { name: 'Arial', size: 9, bold: true, underline: true };
  currentRow++;

  if (schoolProfile.nipKepalaSekolah || schoolProfile.nipKetuaTim || schoolProfile.nipBendahara) {
    const sigRowNip = currentRow;
    ws.mergeCells(`A${sigRowNip}:B${sigRowNip}`);
    ws.getCell(`A${sigRowNip}`).value = schoolProfile.nipKepalaSekolah ? `NIP. ${schoolProfile.nipKepalaSekolah}` : '';
    ws.getCell(`A${sigRowNip}`).alignment = { horizontal: 'center' };
    ws.getCell(`A${sigRowNip}`).font = { name: 'Arial', size: 8 };

    ws.mergeCells(`C${sigRowNip}:E${sigRowNip}`);
    ws.getCell(`C${sigRowNip}`).value = schoolProfile.nipKetuaTim ? `NIP. ${schoolProfile.nipKetuaTim}` : '';
    ws.getCell(`C${sigRowNip}`).alignment = { horizontal: 'center' };
    ws.getCell(`C${sigRowNip}`).font = { name: 'Arial', size: 8 };

    ws.mergeCells(`F${sigRowNip}:G${sigRowNip}`);
    ws.getCell(`F${sigRowNip}`).value = schoolProfile.nipBendahara ? `NIP. ${schoolProfile.nipBendahara}` : '';
    ws.getCell(`F${sigRowNip}`).alignment = { horizontal: 'center' };
    ws.getCell(`F${sigRowNip}`).font = { name: 'Arial', size: 8 };
  }

  // Generate buffer and trigger browser download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const fileNameClean = `BKU_${currentMonthLabel.replace(/[^a-zA-Z0-9]/g, '_')}_${schoolProfile.namaSekolah.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`;
  a.download = fileNameClean;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

export interface ExcelBankRow {
  id: string;
  tanggal: string;
  uraian: string;
  noBukti: string;
  penerimaan: number;
  pengeluaran: number;
  saldo: number;
}

export interface ExportBankExcelParams {
  rows: ExcelBankRow[];
  currentMonthLabel: string;
  closingDateIso: string;
  schoolProfile: SchoolProfile;
  totalPenerimaan: number;
  totalPengeluaran: number;
  sisaBank: number;
  desa: string;
  kecamatan: string;
  kabupaten: string;
  provinsi: string;
  singkatan: string;
}

export async function exportBukuBankToExcel(params: ExportBankExcelParams): Promise<void> {
  const {
    rows,
    currentMonthLabel,
    closingDateIso,
    schoolProfile,
    totalPenerimaan,
    totalPengeluaran,
    sisaBank,
    desa,
    kecamatan,
    kabupaten,
    provinsi,
    singkatan,
  } = params;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Sistem Buku Kas Bank';
  workbook.created = new Date();

  const ws = workbook.addWorksheet(`Buku Bank ${currentMonthLabel.substring(0, 20)}`, {
    pageSetup: {
      paperSize: 9, // A4
      orientation: 'portrait',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: {
        left: 0.5,
        right: 0.5,
        top: 0.6,
        bottom: 0.6,
        header: 0.3,
        footer: 0.3,
      },
    },
    views: [{ showGridLines: true }],
  });

  // Column settings
  ws.columns = [
    { key: 'colA', width: 6 },   // No.
    { key: 'colB', width: 14 },  // Tanggal
    { key: 'colC', width: 44 },  // Uraian
    { key: 'colD', width: 15 },  // No. Bukti
    { key: 'colE', width: 18 },  // Penerimaan Rp.
    { key: 'colF', width: 18 },  // Pengeluaran Rp.
    { key: 'colG', width: 20 },  // Sisa Rp.
  ];

  const currencyFormat = '#,##0.00;(#,##0.00);"-"';

  let currentRow = 1;

  // Title: BUKU KAS BANK
  ws.mergeCells(`A${currentRow}:G${currentRow}`);
  const title1 = ws.getCell(`A${currentRow}`);
  title1.value = 'BUKU KAS BANK';
  title1.font = { name: 'Arial', size: 14, bold: true };
  title1.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(currentRow).height = 22;
  currentRow++;

  // Subtitle: Bulan: AGUSTUS 2025
  ws.mergeCells(`A${currentRow}:G${currentRow}`);
  const title2 = ws.getCell(`A${currentRow}`);
  title2.value = `Bulan: ${currentMonthLabel}`;
  title2.font = { name: 'Arial', size: 11, bold: true };
  title2.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(currentRow).height = 18;
  currentRow += 2; // Blank row

  // Metadata Header (2 Columns: Left A-D, Right E-G)
  const setMetaRow = (rowNum: number, leftLabel: string, leftVal: string, rightLabel?: string, rightVal?: string) => {
    // Left
    ws.getCell(`A${rowNum}`).value = leftLabel;
    ws.getCell(`A${rowNum}`).font = { name: 'Arial', size: 9, bold: true };
    ws.getCell(`B${rowNum}`).value = ':';
    ws.getCell(`B${rowNum}`).font = { name: 'Arial', size: 9, bold: true };
    ws.getCell(`B${rowNum}`).alignment = { horizontal: 'center' };
    ws.mergeCells(`C${rowNum}:D${rowNum}`);
    ws.getCell(`C${rowNum}`).value = leftVal;
    ws.getCell(`C${rowNum}`).font = { name: 'Arial', size: 9, bold: true };

    // Right
    if (rightLabel) {
      ws.getCell(`E${rowNum}`).value = rightLabel;
      ws.getCell(`E${rowNum}`).font = { name: 'Arial', size: 9, bold: true };
      ws.getCell(`F${rowNum}`).value = ':';
      ws.getCell(`F${rowNum}`).font = { name: 'Arial', size: 9, bold: true };
      ws.getCell(`F${rowNum}`).alignment = { horizontal: 'center' };
      ws.getCell(`G${rowNum}`).value = rightVal || '';
      ws.getCell(`G${rowNum}`).font = { name: 'Arial', size: 9, bold: true };
    }
  };

  setMetaRow(currentRow, 'NAMA SEKOLAH', schoolProfile.namaSekolah, 'KABUPATEN', kabupaten);
  currentRow++;
  setMetaRow(currentRow, 'DESA', desa, 'PROVINSI', provinsi);
  currentRow++;
  setMetaRow(currentRow, 'KECAMATAN', kecamatan);
  currentRow += 2; // Blank row before table

  // Table Header
  const headerRow = currentRow;
  ws.getRow(headerRow).height = 24;

  const headers = [
    { col: 'A', text: 'No.' },
    { col: 'B', text: 'Tanggal' },
    { col: 'C', text: 'Uraian' },
    { col: 'D', text: 'No. Bukti' },
    { col: 'E', text: 'Penerimaan\nRp.' },
    { col: 'F', text: 'Pengeluaran\nRp.' },
    { col: 'G', text: 'Sisa\nRp.' },
  ];

  headers.forEach(({ col, text }) => {
    const cell = ws.getCell(`${col}${headerRow}`);
    cell.value = text;
    cell.font = { name: 'Arial', size: 9, bold: true };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = {
      top: { style: 'medium', color: { argb: 'FF000000' } },
      bottom: { style: 'medium', color: { argb: 'FF000000' } },
      left: { style: 'thin', color: { argb: 'FF000000' } },
      right: { style: 'thin', color: { argb: 'FF000000' } },
    };
  });
  currentRow++;

  // Transaction Rows
  rows.forEach((row, idx) => {
    const r = ws.getRow(currentRow);
    r.height = 22;

    const cellA = ws.getCell(`A${currentRow}`);
    const cellB = ws.getCell(`B${currentRow}`);
    const cellC = ws.getCell(`C${currentRow}`);
    const cellD = ws.getCell(`D${currentRow}`);
    const cellE = ws.getCell(`E${currentRow}`);
    const cellF = ws.getCell(`F${currentRow}`);
    const cellG = ws.getCell(`G${currentRow}`);

    cellA.value = idx + 1;
    cellA.alignment = { horizontal: 'center', vertical: 'middle' };

    cellB.value = formatTanggalDash(row.tanggal);
    cellB.alignment = { horizontal: 'center', vertical: 'middle' };

    cellC.value = row.uraian;
    cellC.font = { name: 'Arial', size: 9 };
    cellC.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };

    cellD.value = row.noBukti;
    cellD.alignment = { horizontal: 'center', vertical: 'middle' };

    cellE.value = row.penerimaan > 0 ? row.penerimaan : null;
    cellE.numFmt = currencyFormat;
    cellE.alignment = { horizontal: 'right', vertical: 'middle' };

    cellF.value = row.pengeluaran > 0 ? row.pengeluaran : null;
    cellF.numFmt = currencyFormat;
    cellF.alignment = { horizontal: 'right', vertical: 'middle' };

    cellG.value = row.saldo;
    cellG.numFmt = currencyFormat;
    cellG.alignment = { horizontal: 'right', vertical: 'middle' };

    ['A', 'B', 'C', 'D', 'E', 'F', 'G'].forEach((col) => {
      const c = ws.getCell(`${col}${currentRow}`);
      c.font = { name: 'Arial', size: 9 };
      c.border = {
        left: { style: 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } },
        top: { style: 'dotted', color: { argb: 'FF000000' } },
        bottom: { style: 'dotted', color: { argb: 'FF000000' } },
      };
    });

    currentRow++;
  });

  // Empty placeholder rows (if rows < 4) to replicate the exact official ledger appearance
  const emptyRowsNeeded = Math.max(0, 4 - rows.length);
  for (let i = 0; i < emptyRowsNeeded; i++) {
    const r = ws.getRow(currentRow);
    r.height = 18;
    ['A', 'B', 'C', 'D', 'E', 'F', 'G'].forEach((col) => {
      const c = ws.getCell(`${col}${currentRow}`);
      c.border = {
        left: { style: 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } },
        top: { style: 'dotted', color: { argb: 'FF000000' } },
        bottom: { style: 'dotted', color: { argb: 'FF000000' } },
      };
    });
    currentRow++;
  }

  // Footer: Jumlah (Merged A to D)
  const jumlahRow = currentRow;
  ws.getRow(jumlahRow).height = 20;

  ws.mergeCells(`A${jumlahRow}:D${jumlahRow}`);
  const cellJumlah = ws.getCell(`A${jumlahRow}`);
  cellJumlah.value = 'Jumlah';
  cellJumlah.font = { name: 'Arial', size: 9, bold: true };
  cellJumlah.alignment = { horizontal: 'center', vertical: 'middle' };

  const cellTotalIn = ws.getCell(`E${jumlahRow}`);
  cellTotalIn.value = totalPenerimaan;
  cellTotalIn.numFmt = currencyFormat;
  cellTotalIn.font = { name: 'Arial', size: 9, bold: true };
  cellTotalIn.alignment = { horizontal: 'right', vertical: 'middle' };

  const cellTotalOut = ws.getCell(`F${jumlahRow}`);
  cellTotalOut.value = totalPengeluaran;
  cellTotalOut.numFmt = currencyFormat;
  cellTotalOut.font = { name: 'Arial', size: 9, bold: true };
  cellTotalOut.alignment = { horizontal: 'right', vertical: 'middle' };

  const cellSisa = ws.getCell(`G${jumlahRow}`);
  cellSisa.value = sisaBank;
  cellSisa.numFmt = currencyFormat;
  cellSisa.font = { name: 'Arial', size: 9, bold: true };
  cellSisa.alignment = { horizontal: 'right', vertical: 'middle' };

  ['A', 'B', 'C', 'D', 'E', 'F', 'G'].forEach((col) => {
    ws.getCell(`${col}${jumlahRow}`).border = {
      top: { style: 'medium', color: { argb: 'FF000000' } },
      bottom: { style: 'double', color: { argb: 'FF000000' } },
      left: { style: 'thin', color: { argb: 'FF000000' } },
      right: { style: 'thin', color: { argb: 'FF000000' } },
    };
  });
  currentRow += 3; // Space before signatures

  // Signatures Section (3 columns: Left Cols A-B, Middle Cols C-E, Right Cols F-G)
  const sigRow1 = currentRow;
  // Col 1 (A-B): Mengetahui,
  ws.mergeCells(`A${sigRow1}:B${sigRow1}`);
  ws.getCell(`A${sigRow1}`).value = 'Mengetahui,';
  ws.getCell(`A${sigRow1}`).alignment = { horizontal: 'center' };
  ws.getCell(`A${sigRow1}`).font = { name: 'Arial', size: 9 };

  // Col 2 (C-E): Disetujui oleh:
  ws.mergeCells(`C${sigRow1}:E${sigRow1}`);
  ws.getCell(`C${sigRow1}`).value = 'Disetujui oleh:';
  ws.getCell(`C${sigRow1}`).alignment = { horizontal: 'center' };
  ws.getCell(`C${sigRow1}`).font = { name: 'Arial', size: 9 };

  // Col 3 (F-G): Gapuk, 31 Agustus 2025
  ws.mergeCells(`F${sigRow1}:G${sigRow1}`);
  ws.getCell(`F${sigRow1}`).value = `${desa}, ${formatTanggalIndo(closingDateIso)}`;
  ws.getCell(`F${sigRow1}`).alignment = { horizontal: 'center' };
  ws.getCell(`F${sigRow1}`).font = { name: 'Arial', size: 9 };
  currentRow++;

  const sigRow2 = currentRow;
  ws.mergeCells(`A${sigRow2}:B${sigRow2}`);
  ws.getCell(`A${sigRow2}`).value = `Kepala ${schoolProfile.namaSekolah}`;
  ws.getCell(`A${sigRow2}`).alignment = { horizontal: 'center' };
  ws.getCell(`A${sigRow2}`).font = { name: 'Arial', size: 9, bold: true };

  ws.mergeCells(`C${sigRow2}:E${sigRow2}`);
  ws.getCell(`C${sigRow2}`).value = `Ketua ${singkatan}`;
  ws.getCell(`C${sigRow2}`).alignment = { horizontal: 'center' };
  ws.getCell(`C${sigRow2}`).font = { name: 'Arial', size: 9, bold: true };

  ws.mergeCells(`F${sigRow2}:G${sigRow2}`);
  ws.getCell(`F${sigRow2}`).value = `Disusun Oleh :`;
  ws.getCell(`F${sigRow2}`).alignment = { horizontal: 'center' };
  ws.getCell(`F${sigRow2}`).font = { name: 'Arial', size: 9 };
  currentRow++;

  const sigRow3 = currentRow;
  ws.mergeCells(`F${sigRow3}:G${sigRow3}`);
  ws.getCell(`F${sigRow3}`).value = `Bendahara ${singkatan}`;
  ws.getCell(`F${sigRow3}`).alignment = { horizontal: 'center' };
  ws.getCell(`F${sigRow3}`).font = { name: 'Arial', size: 9, bold: true };

  // 4 rows empty for physical signature
  currentRow += 4;

  const sigRowName = currentRow;
  ws.mergeCells(`A${sigRowName}:B${sigRowName}`);
  ws.getCell(`A${sigRowName}`).value = schoolProfile.namaKepalaSekolah;
  ws.getCell(`A${sigRowName}`).alignment = { horizontal: 'center' };
  ws.getCell(`A${sigRowName}`).font = { name: 'Arial', size: 9, bold: true, underline: true };

  ws.mergeCells(`C${sigRowName}:E${sigRowName}`);
  ws.getCell(`C${sigRowName}`).value = schoolProfile.namaKetuaTim;
  ws.getCell(`C${sigRowName}`).alignment = { horizontal: 'center' };
  ws.getCell(`C${sigRowName}`).font = { name: 'Arial', size: 9, bold: true, underline: true };

  ws.mergeCells(`F${sigRowName}:G${sigRowName}`);
  ws.getCell(`F${sigRowName}`).value = schoolProfile.namaBendahara;
  ws.getCell(`F${sigRowName}`).alignment = { horizontal: 'center' };
  ws.getCell(`F${sigRowName}`).font = { name: 'Arial', size: 9, bold: true, underline: true };
  currentRow++;

  if (schoolProfile.nipKepalaSekolah || schoolProfile.nipKetuaTim || schoolProfile.nipBendahara) {
    const sigRowNip = currentRow;
    ws.mergeCells(`A${sigRowNip}:B${sigRowNip}`);
    ws.getCell(`A${sigRowNip}`).value = schoolProfile.nipKepalaSekolah ? `NIP. ${schoolProfile.nipKepalaSekolah}` : '';
    ws.getCell(`A${sigRowNip}`).alignment = { horizontal: 'center' };
    ws.getCell(`A${sigRowNip}`).font = { name: 'Arial', size: 8 };

    ws.mergeCells(`C${sigRowNip}:E${sigRowNip}`);
    ws.getCell(`C${sigRowNip}`).value = schoolProfile.nipKetuaTim ? `NIP. ${schoolProfile.nipKetuaTim}` : '';
    ws.getCell(`C${sigRowNip}`).alignment = { horizontal: 'center' };
    ws.getCell(`C${sigRowNip}`).font = { name: 'Arial', size: 8 };

    ws.mergeCells(`F${sigRowNip}:G${sigRowNip}`);
    ws.getCell(`F${sigRowNip}`).value = schoolProfile.nipBendahara ? `NIP. ${schoolProfile.nipBendahara}` : '';
    ws.getCell(`F${sigRowNip}`).alignment = { horizontal: 'center' };
    ws.getCell(`F${sigRowNip}`).font = { name: 'Arial', size: 8 };
  }

  // Generate buffer and trigger browser download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const fileNameClean = `Buku_Kas_Bank_${currentMonthLabel.replace(/[^a-zA-Z0-9]/g, '_')}_${schoolProfile.namaSekolah.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`;
  a.download = fileNameClean;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}
