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

/**
 * Prove from the PRODUCED BYTES that no text was rendered below the page.
 *
 * jspdf v4 writes uncompressed content streams using "<x> <y> Td" text
 * positioning, with the PDF origin at the BOTTOM-left of the page and
 * coordinates in points (A4 height = 297mm = 841.89pt). Content drawn at
 * jsPDF mm-coordinates past the page bottom therefore shows up here as a
 * NEGATIVE Td Y — exactly the signature of the fixed-offset overflow bug
 * this suite guards against.
 */
const assertNoTextBelowPageBottom = (file: SavedFile): void => {
  const raw = Buffer.from(file.bytes).toString('latin1');
  const ys: number[] = [];
  const re = /-?\d+(?:\.\d+)?\s+(-?\d+(?:\.\d+)?)\s+Td/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw)) !== null) ys.push(parseFloat(m[1]));

  expect(ys.length).toBeGreaterThan(0);
  const below = ys.filter((y) => y < -0.5);
  expect(below, `text drawn off-page at PDF Y=${below.slice(0, 5).join(', ')}`).toEqual([]);
};

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
    assertNoTextBelowPageBottom(file);
  });

  it('general invoice keeps totals/notes on-page for a document that fills many pages (regression)', () => {
    const data = JSON.parse(JSON.stringify(INITIAL_GENERAL_INVOICE));
    data.companyName = 'Bulk Seller GmbH';
    data.customer = { name: 'Bulk Buyer Ltd' };
    data.invoiceNumber = 'INV-BULK-1';
    data.items = Array.from({ length: 120 }, (_, i) => ({
      id: `i${i}`,
      description: `Consulting block ${i + 1}`,
      quantity: 2,
      unitPrice: 100,
      taxRate: 7,
      discount: 5,
      total: 209,
    }));
    data.bankDetails = 'Testbank, IBAN DE00 0000 0000 0000 0000 00, SWIFT TESTTEST — '.repeat(4);
    data.termsAndConditions = 'Payment within 14 days. Late payments incur interest. '.repeat(6);
    data.notes = 'Delivered in partial shipments across the period. '.repeat(6);
    data.showSignature = true;
    data.signatureName = 'Signed Person';

    expect(() => generateGeneralInvoicePDF(data)).not.toThrow();
    const file = lastFile();
    expect(file.pages).toBeGreaterThan(1);
    // The old code drew the Grand Total / bank details at fixed offsets from
    // the table end — off the page once the table filled it.
    assertNoTextBelowPageBottom(file);
  });

  it('general LPO keeps summary and notes on-page for long item lists (regression)', () => {
    const data = JSON.parse(JSON.stringify(INITIAL_GENERAL_LPO));
    data.companyInfo!.name = 'Acme Corp';
    data.supplierInfo!.name = 'Supplier';
    data.items = Array.from({ length: 90 }, (_, i) => ({
      id: `i${i}`,
      description: `Bulk order line ${i + 1}`,
      quantity: 1,
      unit: 'pcs',
      unitPrice: 10,
      total: 10,
    }));
    data.notes = 'Ship in three partial deliveries. ';
    data.termsAndConditions = 'Standard terms apply.';
    data.includeSignature = true;
    data.signatureName = 'Approver';

    expect(() => generateGeneralLPOPDF(data)).not.toThrow();
    const file = lastFile();
    expect(file.pages).toBeGreaterThan(1);
    assertNoTextBelowPageBottom(file);
  });
});
