import { describe, it, expect } from 'vitest';
import { numToWords, getAmountInWords, generateDocNumber } from './pdfUtils';

describe('pdfUtils', () => {
  describe('numToWords', () => {
    it('converts single digit numbers correctly', () => {
      expect(numToWords(0)).toBe('');
      expect(numToWords(5)).toBe('Five');
    });

    it('converts double digit numbers correctly', () => {
      expect(numToWords(15)).toBe('Fifteen');
      expect(numToWords(42)).toBe('Forty-Two');
    });

    it('converts hundreds and thousands correctly', () => {
      expect(numToWords(100)).toBe('One Hundred');
      expect(numToWords(1250)).toBe('One Thousand Two Hundred Fifty');
    });
  });

  describe('getAmountInWords', () => {
    it('formats AED currency correctly', () => {
      expect(getAmountInWords(100, 'AED')).toBe('One Hundred Dirhams Only');
      expect(getAmountInWords(50.25, 'AED')).toBe('Fifty Dirhams and Twenty-Five Fils Only');
    });

    it('formats USD currency correctly', () => {
      expect(getAmountInWords(1.01, 'USD')).toBe('One Dollar and One Cent Only');
      expect(getAmountInWords(500, 'USD')).toBe('Five Hundred Dollars Only');
    });
  });

  describe('generateDocNumber', () => {
    it('generates a formatted document number with default prefix', () => {
      const docNum = generateDocNumber();
      expect(docNum).toMatch(/^PO-\d{8}-[A-Z0-9]{4}$/);
    });

    it('generates a formatted document number with custom prefix', () => {
      const docNum = generateDocNumber('INV');
      expect(docNum).toMatch(/^INV-\d{8}-[A-Z0-9]{4}$/);
    });
  });
});
