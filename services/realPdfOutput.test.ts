/**
 * Real-output PDF tests.
 *
 * jsPDF / jspdf-autotable are mocked per-file in the other service tests so
 * unit suites can assert on call shapes cheaply. THIS file exercises the
 * REAL libraries end-to-end, verifying that each service produces an
 * actual, valid, non-trivial PDF binary — catching integration breakages
 * (bad option names, runtime exceptions deep inside autotable, pagination
 * bugs) that call-level mocks hide.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { jsPDF } from 'jspdf';

import { generateLPOPDF } from './pdfService';
import { generateGeneralLPOPDF } from './generalLpoPdfService';
import { generateHotelInvoicePDF } from './hotelInvoicePdfService';
import { generateGeneralInvoicePDF } from './generalInvoicePdfService';
import { INITIAL_LPO_DATA } from '../types';
import { INITIAL_GENERAL_LPO } from '../types/generalLpo';
import { INITIAL_HOTEL_INVOICE } from '../types/hotelInvoice';
import { INITIAL_GENERAL_INVOICE } from '../types/generalInvoice';

interface SavedFile {
  name: string;
  bytes: Uint8Array;
  pages: number;
}

const savedFiles: SavedFile[] = [];

beforeAll(() => {
  // jspdf v4 copies methods from jsPDF.API onto each new instance, so
  // patching API.save intercepts every document the services create.
  // Capture what each service would have downloaded: snapshot the real
  // output buffer + page count instead of triggering a browser download.
  (jsPDF as unknown as { API: Record<string, unknown> }).API.save = function (
    this: jsPDF,
    filename: string,
  ) {
    savedFiles.push({
      name: filename,
      bytes: new Uint8Array(this.output('arraybuffer')),
      pages: this.getNumberOfPages(),
    });
  };
});

const lastFile = (): SavedFile => {
  const file = savedFiles.at(-1);
  expect(file, 'expected a service to have produced a PDF').toBeTruthy();
  return file!;
};

const pdfHeader = (bytes: Uint8Array) =>
  String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3], bytes[4]);

describe('real PDF output (unmocked jsPDF)', () => {
  it('hotel LPO service emits a valid multi-section PDF and sanitizes unicode filenames', () => {
    const data = JSON.parse(JSON.stringify(INITIAL_LPO_DATA));
    data.hotelName = 'Hôtel Ñoño Ω 测试';
    data.guests = [{ name: 'John Smith', loyaltyNumber: 'L1' }];
    data.stayRanges = [
      { id: 'r1', start: new Date(2026, 0, 10), end: new Date(2026, 0, 15), nights: 5 },
    ];
    data.applicableRates = [
      { id: 'a1', start: new Date(2026, 0, 10), end: new Date(2026, 0, 14), amount: 500 },
    ];
    data.pdfOptions.showSignatureArea = true;
    data.pdfOptions.authorizedSignatoryName = 'Jane Doe';
    data.pdfOptions.watermarkText = 'DRAFT';
    data.pdfOptions.showDailyRateBreakdown = true;

    expect(() => generateLPOPDF(data)).not.toThrow();

    const file = lastFile();
    expect(file.name).toMatch(/^LPO_PO-\d{8}-[A-Z0-9]{6}_/);
    expect(file.name).not.toMatch(/[^\w.-]/); // unicode stripped/sanitized
    expect(pdfHeader(file.bytes)).toBe('%PDF-');
    expect(file.bytes.length).toBeGreaterThan(3_000);
  });

  it('general LPO service emits a valid PDF with item table and totals', () => {
    const data = JSON.parse(JSON.stringify(INITIAL_GENERAL_LPO));
    data.companyInfo!.name = 'Acme Corp';
    data.items = [
      { id: 'i1', description: 'Steel bolts', quantity: 100, unit: 'pcs', unitPrice: 2.5, total: 250 },
      { id: 'i2', description: 'Concrete', quantity: 10, unit: 'kg', unitPrice: 30, total: 300 },
    ];
    data.taxRate = 5;

    expect(() => generateGeneralLPOPDF(data)).not.toThrow();

    const file = lastFile();
    expect(pdfHeader(file.bytes)).toBe('%PDF-');
    expect(file.bytes.length).toBeGreaterThan(2_000);
    expect(Buffer.from(file.bytes).toString('latin1')).toContain('/Type /Catalog');
  });

  it('hotel invoice paginates many charges into multiple real pages', () => {
    const data = JSON.parse(JSON.stringify(INITIAL_HOTEL_INVOICE));
    data.hotelName = 'Test Hotel';
    data.primaryGuest = { name: 'Guest' };
    data.invoiceNumber = 'INV-111';
    data.lineItems = Array.from({ length: 120 }, (_, i) => ({
      id: `c${i}`,
      category: 'Room',
      description: `Night ${i + 1}`,
      quantity: 1,
      rate: 100,
      amount: 100,
      date: '2026-01-01',
    }));

    expect(() => generateHotelInvoicePDF(data)).not.toThrow();

    const file = lastFile();
    expect(file.name).toBe('Invoice_INV-111_test_hotel.pdf');
    expect(pdfHeader(file.bytes)).toBe('%PDF-');
    expect(file.pages).toBeGreaterThan(1);
  });

  it('general invoice service emits a valid PDF end-to-end', () => {
    const data = JSON.parse(JSON.stringify(INITIAL_GENERAL_INVOICE));
    data.companyName = 'Seller GmbH';
    data.customer = { name: 'Buyer Ltd' };
    data.items = [{ id: 'x', description: 'Widget', quantity: 3, unitPrice: 19.99, taxRate: 0, discount: 0, total: 59.97 }];

    expect(() => generateGeneralInvoicePDF(data)).not.toThrow();

    const file = lastFile();
    expect(pdfHeader(file.bytes)).toBe('%PDF-');
    expect(file.bytes.length).toBeGreaterThan(2_000);
    expect(Buffer.from(file.bytes).toString('latin1')).toContain('/Type /Catalog');
  });
});
