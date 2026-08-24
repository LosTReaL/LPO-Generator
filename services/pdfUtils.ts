// ============================================================
// Shared PDF Utilities
// Extracted from pdfService.ts for reuse across all modules
// ============================================================

import { jsPDF } from 'jspdf';
import { format } from 'date-fns';

// -- Number to Words --
const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

export const numToWords = (n: number): string => {
  if (!Number.isFinite(n)) return '';
  if (n < 0) return 'Minus ' + numToWords(-n);
  if (n === 0) return '';
  if (n < 20) return units[n];
  if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? '-' + units[n % 10] : '');
  if (n < 1000) return units[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' ' + numToWords(n % 100) : '');
  if (n < 1000000) return numToWords(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 !== 0 ? ' ' + numToWords(n % 1000) : '');
  if (n < 1000000000) return numToWords(Math.floor(n / 1000000)) + ' Million' + (n % 1000000 !== 0 ? ' ' + numToWords(n % 1000000) : '');
  if (n < 1000000000000) return numToWords(Math.floor(n / 1000000000)) + ' Billion' + (n % 1000000000 !== 0 ? ' ' + numToWords(n % 1000000000) : '');
  return '';
};

// Currency unit definitions
const currencyUnits: Record<string, { major: string, majorPlural: string, minor: string, minorPlural: string }> = {
  AED: { major: 'Dirham', majorPlural: 'Dirhams', minor: 'Fils', minorPlural: 'Fils' },
  USD: { major: 'Dollar', majorPlural: 'Dollars', minor: 'Cent', minorPlural: 'Cents' },
  EUR: { major: 'Euro', majorPlural: 'Euros', minor: 'Cent', minorPlural: 'Cents' },
  GBP: { major: 'Pound', majorPlural: 'Pounds', minor: 'Penny', minorPlural: 'Pence' },
  SAR: { major: 'Riyal', majorPlural: 'Riyals', minor: 'Halala', minorPlural: 'Halalas' },
  INR: { major: 'Rupee', majorPlural: 'Rupees', minor: 'Paisa', minorPlural: 'Paise' },
  CNY: { major: 'Yuan', majorPlural: 'Yuan', minor: 'Fen', minorPlural: 'Fen' },
  JPY: { major: 'Yen', majorPlural: 'Yen', minor: 'Sen', minorPlural: 'Sen' },
  KWD: { major: 'Dinar', majorPlural: 'Dinars', minor: 'Fils', minorPlural: 'Fils' },
  BHD: { major: 'Dinar', majorPlural: 'Dinars', minor: 'Fils', minorPlural: 'Fils' },
  OMR: { major: 'Rial', majorPlural: 'Rials', minor: 'Baisa', minorPlural: 'Baisa' },
  QAR: { major: 'Riyal', majorPlural: 'Riyals', minor: 'Dirham', minorPlural: 'Dirhams' },
  EGP: { major: 'Pound', majorPlural: 'Pounds', minor: 'Piastre', minorPlural: 'Piastres' },
  TRY: { major: 'Lira', majorPlural: 'Liras', minor: 'Kurus', minorPlural: 'Kurus' },
  ZAR: { major: 'Rand', majorPlural: 'Rand', minor: 'Cent', minorPlural: 'Cents' },
  AUD: { major: 'Dollar', majorPlural: 'Dollars', minor: 'Cent', minorPlural: 'Cents' },
  CAD: { major: 'Dollar', majorPlural: 'Dollars', minor: 'Cent', minorPlural: 'Cents' },
  CHF: { major: 'Franc', majorPlural: 'Francs', minor: 'Rappen', minorPlural: 'Rappen' },
  SGD: { major: 'Dollar', majorPlural: 'Dollars', minor: 'Cent', minorPlural: 'Cents' },
};

export const getAmountInWords = (amount: number, currency: string): string => {
  const config = currencyUnits[currency] || { major: currency, majorPlural: currency, minor: 'Subunit', minorPlural: 'Subunits' };

  amount = Math.round(amount * 100) / 100;

  // Split on the absolute value: Math.floor would otherwise shift the
  // integer part down by one for negatives (e.g. -50.50 -> "-51 and 50").
  const sign = amount < 0 ? 'Minus ' : '';
  const absAmount = Math.abs(amount);
  const integerPart = Math.floor(absAmount);
  const decimalPart = Math.round((absAmount - integerPart) * 100);

  let text = '';

  if (integerPart === 0) {
    text = 'Zero ' + config.majorPlural;
  } else {
    // numToWords returns '' beyond the trillions — fall back to digits so
    // extreme amounts never render as an empty words section.
    const integerWords = numToWords(integerPart);
    text = integerWords
      ? `${integerWords} ${integerPart === 1 ? config.major : config.majorPlural}`
      : `${integerPart.toLocaleString('en-US')} ${config.majorPlural}`;
  }

  if (decimalPart > 0) {
    text += ' and ' + numToWords(decimalPart) + ' ' + (decimalPart === 1 ? config.minor : config.minorPlural);
  }

  return sign + text + ' Only';
};

export const generateDocNumber = (prefix: string = 'PO'): string => {
  const dateStr = format(new Date(), 'yyyyMMdd');
  // Crypto-backed suffix with Math.random fallback: business documents
  // must stay collision-resistant even when generated in bursts.
  let randomStr = '';
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
      const bytes = new Uint8Array(6);
      crypto.getRandomValues(bytes);
      randomStr = Array.from(bytes, (b) => (b % 36).toString(36)).join('').toUpperCase();
    }
  } catch {
    /* fall through */
  }
  if (!randomStr || randomStr.length < 6) {
    randomStr = (
      Math.random().toString(36).substring(2, 8) + Date.now().toString(36).slice(-4)
    ).slice(-6).toUpperCase();
  }
  return `${prefix}-${dateStr}-${randomStr}`;
};

export const getTimeZoneAbbr = (): string => {
  try {
    const match = new Date().toString().match(/\((.+)\)/);
    if (match) return match[1];
    return format(new Date(), 'xxx');
  } catch (e) {
    return "";
  }
};

// -- Shared Color Palette for PDF generation --
export const PDF_COLORS = {
  dark: [30, 41, 59] as [number, number, number],        // Slate 800
  muted: [71, 85, 105] as [number, number, number],      // Slate 600
  accent: [51, 65, 85] as [number, number, number],      // Slate 700
  headerFill: [224, 242, 254] as [number, number, number], // Sky 100
  headerText: [15, 23, 42] as [number, number, number],   // Slate 900
  stripe: [248, 250, 252] as [number, number, number],    // Slate 50
  border: [203, 213, 225] as [number, number, number],    // Slate 300
  footer: [148, 163, 184] as [number, number, number],    // Slate 400
};

export const getPdfTextHelpers = (doc: jsPDF) => ({
  setPrimary: () => doc.setTextColor(PDF_COLORS.dark[0], PDF_COLORS.dark[1], PDF_COLORS.dark[2]),
  setSecondary: () => doc.setTextColor(PDF_COLORS.muted[0], PDF_COLORS.muted[1], PDF_COLORS.muted[2]),
  setAccent: () => doc.setTextColor(PDF_COLORS.accent[0], PDF_COLORS.accent[1], PDF_COLORS.accent[2]),
  setFooter: () => doc.setTextColor(PDF_COLORS.footer[0], PDF_COLORS.footer[1], PDF_COLORS.footer[2]),
});

export const PDF_TABLE_HEAD_STYLES = {
  fillColor: PDF_COLORS.headerFill,
  textColor: PDF_COLORS.headerText,
  fontStyle: 'bold' as const,
  fontSize: 8,
  cellPadding: { top: 4, bottom: 4, left: 3, right: 3 },
  halign: 'left' as const,
  lineWidth: 0,
};

export const PDF_TABLE_ALTERNATE_ROW_STYLES = {
  fillColor: PDF_COLORS.stripe,
};

export const PDF_TABLE_BODY_STYLES = {
  fontSize: 9,
  cellPadding: { top: 4, bottom: 4, left: 3, right: 3 },
  textColor: PDF_COLORS.dark,
  lineColor: PDF_COLORS.border,
  lineWidth: 0.1,
};

// Draw standard footer on all pages
export const drawPdfFooter = (doc: jsPDF, refNumber: string, footerText: string, marginX: number = 15) => {
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const footerY = pageHeight - 12;
  const pageCount = doc.getNumberOfPages();

  doc.setFontSize(7);
  doc.setTextColor(PDF_COLORS.footer[0], PDF_COLORS.footer[1], PDF_COLORS.footer[2]);

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const rightX = pageWidth - marginX;
    doc.text(`Ref: ${refNumber}`, rightX, footerY, { align: 'right' });
    doc.text(`Page ${i} of ${pageCount}`, rightX, footerY + 3.5, { align: 'right' });

    const maxDisclaimerWidth = pageWidth - (marginX * 2) - 50;
    const disclaimerLines = doc.splitTextToSize(footerText, maxDisclaimerWidth);
    doc.text(disclaimerLines, marginX, footerY);
  }
};

// -- Page-break helpers -------------------------------------------------
//
// Sections rendered after autoTable (totals, notes, signatures…) must
// never be drawn below the bottom of the page: jsPDF happily renders at
// out-of-range Y coordinates and the content is silently lost on the
// printed/exported document.

const DEFAULT_BOTTOM_MARGIN = 20;

/** Start a new page when `requiredSpace` no longer fits; returns the Y to draw at. */
export const ensurePdfSpace = (
  doc: jsPDF,
  yCursor: number,
  requiredSpace: number,
  topMargin: number = 20,
): number => {
  const pageHeight = doc.internal.pageSize.height;
  if (yCursor + requiredSpace > pageHeight - DEFAULT_BOTTOM_MARGIN) {
    doc.addPage();
    return topMargin;
  }
  return yCursor;
};

/**
 * Render pre-wrapped text lines one by one, breaking onto a fresh page
 * whenever the next line would fall past the bottom margin.
 * Returns the Y cursor after the last drawn line.
 */
export const drawWrappedLines = (
  doc: jsPDF,
  lines: string[],
  x: number,
  yCursor: number,
  lineHeight: number = 5,
  topMargin: number = 20,
): number => {
  const pageHeight = doc.internal.pageSize.height;
  let y = yCursor;
  for (const line of lines) {
    if (y > pageHeight - DEFAULT_BOTTOM_MARGIN) {
      doc.addPage();
      y = topMargin;
    }
    doc.text(line, x, y);
    y += lineHeight;
  }
  return y;
};

// Add logo to PDF
export const addLogoPdf = (doc: jsPDF, logoDataUrl: string, x: number, y: number, w: number = 40, h: number = 20) => {
  try {
    const imgFormat = logoDataUrl.split(';')[0].split('/')[1]?.toUpperCase() || 'JPEG';
    doc.addImage(logoDataUrl, imgFormat, x, y, w, h, undefined, 'FAST');
  } catch (e) {
    console.warn("Could not add logo to PDF", e);
  }
};

// Draw signature area
export const drawSignatureArea = (doc: jsPDF, yCursor: number, opts: {
  showCreatedBy?: boolean;
  createdByName?: string;
  showSignature?: boolean;
  signatureName?: string;
  marginX?: number;
}) => {
  const pageWidth = doc.internal.pageSize.width;
  const marginX = opts.marginX || 15;
  const sigWidth = 60;
  const helpers = getPdfTextHelpers(doc);

  if (opts.showCreatedBy) {
    const createX = marginX;
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.5);
    doc.line(createX, yCursor + 10, createX + sigWidth, yCursor + 10);

    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    helpers.setSecondary();
    doc.text("PREPARED BY", createX, yCursor + 14);

    doc.setFont("helvetica", "normal");
    helpers.setPrimary();
    doc.text(opts.createdByName || "__________________", createX, yCursor + 6);
    doc.text(`Date: ${format(new Date(), 'dd MMM yyyy')}`, createX, yCursor + 18);
  }

  if (opts.showSignature) {
    const sigX = pageWidth - marginX - sigWidth;
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.5);
    doc.line(sigX, yCursor + 10, sigX + sigWidth, yCursor + 10);

    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    helpers.setSecondary();
    doc.text("AUTHORIZED SIGNATURE", sigX, yCursor + 14);

    if (opts.signatureName) {
      doc.setFont("helvetica", "normal");
      helpers.setPrimary();
      doc.text(opts.signatureName, sigX, yCursor + 6);
    }

    doc.setFont("helvetica", "normal");
    helpers.setPrimary();
    doc.text("Date:", sigX, yCursor + 18);
  }
};

// Draw optional diagonal watermark
export const drawWatermark = (doc: jsPDF, text: string) => {
  if (!text || !text.trim()) return;
  
  const pageCount = doc.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;

  // Shrink long watermarks so they stay inside the page instead of
  // bleeding off both edges at the fixed display size.
  const maxFontSize = 60;
  let fontSize = maxFontSize;
  doc.setFontSize(maxFontSize);
  if (typeof doc.getTextWidth === 'function') {
    const maxWidth = pageWidth - 20;
    const measured = doc.getTextWidth(text.toUpperCase());
    if (measured > maxWidth) {
      fontSize = Math.max(12, Math.floor((maxWidth / measured) * maxFontSize));
      doc.setFontSize(fontSize);
    }
  }
  
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.saveGraphicsState();
    doc.setGState(new (doc.GState as any)({ opacity: 0.1 }));
    doc.setTextColor(150, 150, 150);
    doc.setFont("helvetica", "bold");

    // Write text diagonally in the center of the page
    doc.text(text.toUpperCase(), pageWidth / 2, pageHeight / 2, {
      align: 'center',
      angle: 45
    });
    
    doc.restoreGraphicsState();
  }
};
