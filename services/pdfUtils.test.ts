import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  numToWords, 
  getAmountInWords, 
  generateDocNumber,
  getTimeZoneAbbr,
  getPdfTextHelpers,
  drawPdfFooter,
  addLogoPdf,
  drawSignatureArea,
  drawWatermark,
  PDF_COLORS
} from './pdfUtils';
import { jsPDF } from 'jspdf';

vi.mock('jspdf');

describe('pdfUtils', () => {
  let doc: any;

  beforeEach(() => {
    doc = new jsPDF();
    doc.internal = { pageSize: { width: 210, height: 297 } };
    doc.getNumberOfPages = vi.fn().mockReturnValue(2);
    doc.setPage = vi.fn();
    doc.setFontSize = vi.fn();
    doc.setTextColor = vi.fn();
    doc.text = vi.fn();
    doc.splitTextToSize = vi.fn().mockImplementation((text) => [text]);
    doc.addImage = vi.fn();
    doc.setDrawColor = vi.fn();
    doc.setLineWidth = vi.fn();
    doc.line = vi.fn();
    doc.setFont = vi.fn();
    doc.saveGraphicsState = vi.fn();
    doc.restoreGraphicsState = vi.fn();
    doc.setGState = vi.fn();
    doc.GState = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('numToWords', () => {
    it('converts single digit numbers correctly', () => {
      expect(numToWords(0)).toBe('');
      expect(numToWords(5)).toBe('Five');
    });

    it('converts double digit numbers correctly', () => {
      expect(numToWords(15)).toBe('Fifteen');
      expect(numToWords(20)).toBe('Twenty');
      expect(numToWords(42)).toBe('Forty-Two');
    });

    it('converts hundreds and thousands correctly', () => {
      expect(numToWords(100)).toBe('One Hundred');
      expect(numToWords(1000)).toBe('One Thousand');
      expect(numToWords(1001)).toBe('One Thousand One');
      expect(numToWords(1250)).toBe('One Thousand Two Hundred Fifty');
    });

    it('converts millions correctly', () => {
      expect(numToWords(1000000)).toBe('One Million');
      expect(numToWords(1000001)).toBe('One Million One');
      expect(numToWords(1250000)).toBe('One Million Two Hundred Fifty Thousand');
    });

    it('converts billions correctly (regression: used to return empty string)', () => {
      expect(numToWords(1000000000)).toBe('One Billion');
      expect(numToWords(1500000000)).toBe('One Billion Five Hundred Million');
    });

    it('handles negative and non-finite inputs', () => {
      expect(numToWords(-42)).toBe('Minus Forty-Two');
      expect(numToWords(Infinity)).toBe('');
      expect(numToWords(NaN)).toBe('');
    });
  });

  describe('getAmountInWords', () => {
    it('formats AED currency correctly', () => {
      expect(getAmountInWords(100, 'AED')).toBe('One Hundred Dirhams Only');
      expect(getAmountInWords(50.25, 'AED')).toBe('Fifty Dirhams and Twenty-Five Fils Only');
    });

    it('formats USD currency correctly', () => {
      expect(getAmountInWords(1, 'USD')).toBe('One Dollar Only');
      expect(getAmountInWords(1.01, 'USD')).toBe('One Dollar and One Cent Only');
      expect(getAmountInWords(500, 'USD')).toBe('Five Hundred Dollars Only');
    });

    it('formats zero correctly', () => {
      expect(getAmountInWords(0, 'USD')).toBe('Zero Dollars Only');
      expect(getAmountInWords(0.01, 'USD')).toBe('Zero Dollars and One Cent Only');
    });

    it('formats unknown currency with fallback', () => {
      expect(getAmountInWords(1, 'UNKNOWN')).toBe('One UNKNOWN Only');
      expect(getAmountInWords(50, 'UNKNOWN')).toBe('Fifty UNKNOWN Only');
      expect(getAmountInWords(50.25, 'UNKNOWN')).toBe('Fifty UNKNOWN and Twenty-Five Subunits Only');
      expect(getAmountInWords(50.01, 'UNKNOWN')).toBe('Fifty UNKNOWN and One Subunit Only');
    });
  });

  describe('generateDocNumber', () => {
    it('generates a formatted document number with default prefix', () => {
      const docNum = generateDocNumber();
      expect(docNum).toMatch(/^PO-\d{8}-[A-Z0-9]{6}$/);
    });

    it('generates a formatted document number with custom prefix', () => {
      const docNum = generateDocNumber('INV');
      expect(docNum).toMatch(/^INV-\d{8}-[A-Z0-9]{6}$/);
    });

    it('is collision-resistant across bursts (regression: weak Math.random suffix)', () => {
      const numbers = new Set(Array.from({ length: 2000 }, () => generateDocNumber('X')));
      // 2000 draws from 36^4=1.68M space must not collide when crypto-backed
      expect(numbers.size).toBe(2000);
    });
  });

  describe('getTimeZoneAbbr', () => {
    it('extracts timezone from date string', () => {
      const originalToString = Date.prototype.toString;
      Date.prototype.toString = () => 'Sun Oct 10 2021 10:00:00 GMT+0000 (UTC)';
      expect(getTimeZoneAbbr()).toBe('UTC');
      Date.prototype.toString = originalToString;
    });

    it('falls back to date-fns format if no parentheses', () => {
      const originalToString = Date.prototype.toString;
      Date.prototype.toString = () => 'Sun Oct 10 2021 10:00:00 GMT+0000';
      const result = getTimeZoneAbbr();
      expect(typeof result).toBe('string');
      Date.prototype.toString = originalToString;
    });

    it('returns empty string on error', () => {
      const originalToString = Date.prototype.toString;
      Date.prototype.toString = () => { throw new Error('test'); };
      expect(getTimeZoneAbbr()).toBe('');
      Date.prototype.toString = originalToString;
    });
  });

  describe('getPdfTextHelpers', () => {
    it('sets correct colors', () => {
      const helpers = getPdfTextHelpers(doc);
      
      helpers.setPrimary();
      expect(doc.setTextColor).toHaveBeenCalledWith(PDF_COLORS.dark[0], PDF_COLORS.dark[1], PDF_COLORS.dark[2]);
      
      helpers.setSecondary();
      expect(doc.setTextColor).toHaveBeenCalledWith(PDF_COLORS.muted[0], PDF_COLORS.muted[1], PDF_COLORS.muted[2]);
      
      helpers.setAccent();
      expect(doc.setTextColor).toHaveBeenCalledWith(PDF_COLORS.accent[0], PDF_COLORS.accent[1], PDF_COLORS.accent[2]);
      
      helpers.setFooter();
      expect(doc.setTextColor).toHaveBeenCalledWith(PDF_COLORS.footer[0], PDF_COLORS.footer[1], PDF_COLORS.footer[2]);
    });
  });

  describe('drawPdfFooter', () => {
    it('draws footer on all pages', () => {
      drawPdfFooter(doc, 'REF-123', 'Disclaimer text', 15);
      
      expect(doc.getNumberOfPages).toHaveBeenCalled();
      expect(doc.setPage).toHaveBeenCalledWith(1);
      expect(doc.setPage).toHaveBeenCalledWith(2);
      expect(doc.text).toHaveBeenCalledWith('Ref: REF-123', expect.any(Number), expect.any(Number), { align: 'right' });
    });
  });

  describe('addLogoPdf', () => {
    it('adds image with correct format', () => {
      addLogoPdf(doc, 'data:image/png;base64,123', 10, 10);
      expect(doc.addImage).toHaveBeenCalledWith('data:image/png;base64,123', 'PNG', 10, 10, 40, 20, undefined, 'FAST');
    });

    it('falls back to JPEG if format not parsed', () => {
      addLogoPdf(doc, 'data:something', 10, 10);
      expect(doc.addImage).toHaveBeenCalledWith('data:something', 'JPEG', 10, 10, 40, 20, undefined, 'FAST');
    });

    it('catches and suppresses errors', () => {
      doc.addImage.mockImplementation(() => { throw new Error('Test'); });
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      expect(() => addLogoPdf(doc, 'data:image/png;base64,123', 10, 10)).not.toThrow();
      expect(consoleWarnSpy).toHaveBeenCalled();
    });
  });

  describe('drawSignatureArea', () => {
    it('draws created by and signature area', () => {
      drawSignatureArea(doc, 100, { 
        showCreatedBy: true, 
        createdByName: 'Alice', 
        showSignature: true, 
        signatureName: 'Bob' 
      });
      
      expect(doc.text).toHaveBeenCalledWith('PREPARED BY', expect.any(Number), 114);
      expect(doc.text).toHaveBeenCalledWith('Alice', expect.any(Number), 106);
      
      expect(doc.text).toHaveBeenCalledWith('AUTHORIZED SIGNATURE', expect.any(Number), 114);
      expect(doc.text).toHaveBeenCalledWith('Bob', expect.any(Number), 106);
    });

    it('uses fallback text when names are not provided', () => {
      drawSignatureArea(doc, 100, { showCreatedBy: true, showSignature: true });
      expect(doc.text).toHaveBeenCalledWith('__________________', expect.any(Number), 106); // fallback createdBy
      expect(doc.text).not.toHaveBeenCalledWith('Bob', expect.any(Number), 106); // signature name should not be printed if missing
    });

    it('does not draw if flags are false', () => {
      drawSignatureArea(doc, 100, { showCreatedBy: false, showSignature: false });
      expect(doc.text).not.toHaveBeenCalledWith('PREPARED BY', expect.any(Number), expect.any(Number));
      expect(doc.text).not.toHaveBeenCalledWith('AUTHORIZED SIGNATURE', expect.any(Number), expect.any(Number));
    });
  });

  describe('drawWatermark', () => {
    it('does nothing if text is empty', () => {
      drawWatermark(doc, '');
      expect(doc.saveGraphicsState).not.toHaveBeenCalled();
      drawWatermark(doc, '   ');
      expect(doc.saveGraphicsState).not.toHaveBeenCalled();
    });

    it('draws watermark on all pages', () => {
      drawWatermark(doc, 'CONFIDENTIAL');
      expect(doc.setPage).toHaveBeenCalledWith(1);
      expect(doc.setPage).toHaveBeenCalledWith(2);
      expect(doc.saveGraphicsState).toHaveBeenCalledTimes(2);
      expect(doc.text).toHaveBeenCalledWith('CONFIDENTIAL', expect.any(Number), expect.any(Number), {
        align: 'center',
        angle: expect.any(Number)
      });
      expect(doc.restoreGraphicsState).toHaveBeenCalledTimes(2);
    });
  });
});
