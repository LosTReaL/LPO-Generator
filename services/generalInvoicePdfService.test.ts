import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateGeneralInvoicePDF } from './generalInvoicePdfService';
import { GeneralInvoiceData } from '../types/generalInvoice';

vi.mock('jspdf', () => {
  const jsPDF = vi.fn().mockImplementation(() => ({
    setFontSize: vi.fn(),
    setTextColor: vi.fn(),
    text: vi.fn(),
    setFont: vi.fn(),
    splitTextToSize: vi.fn().mockReturnValue(['line1', 'line2']),
    line: vi.fn(),
    save: vi.fn(),
    lastAutoTable: { finalY: 100 },
  }));
  return { default: jsPDF };
});

vi.mock('jspdf-autotable', () => {
  return { default: vi.fn() };
});

vi.mock('./pdfUtils', () => ({
  getAmountInWords: vi.fn().mockReturnValue('One Hundred Only'),
  drawPdfFooter: vi.fn(),
  drawWatermark: vi.fn(),
  PDF_TABLE_HEAD_STYLES: {},
  PDF_TABLE_BODY_STYLES: {},
  PDF_TABLE_ALTERNATE_ROW_STYLES: {},
}));

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as pdfUtils from './pdfUtils';

describe('generalInvoicePdfService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const getBaseData = (): GeneralInvoiceData => ({
    companyName: 'Test Company',
    companyTaxId: 'T123',
    companyAddress: '123 Test St',
    companyEmail: 'test@test.com',
    companyPhone: '123456789',
    bankDetails: 'Bank of Test, Acc 123',
    customer: {
      name: 'Test Customer',
      taxId: 'C123',
      address: '456 Cust St',
      email: 'cust@test.com',
      phone: '987654321',
    },
    items: [
      { id: '1', description: 'Item 1', quantity: 2, unitPrice: 50, taxRate: 10, discount: 5, total: 105 },
    ],
    payments: [
      { id: '1', method: 'Cash', amount: 50, date: '2023-01-01', reference: 'REF123' },
    ],
    creditNotes: [
      { id: '1', amount: 10, reason: 'Return', date: '2023-01-02' },
    ],
    recurring: { enabled: false },
    manualInvoiceNumber: true,
    invoiceNumber: 'INV-123',
    invoiceDate: '2023-01-01',
    dueDate: '2023-01-15',
    status: 'Sent',
    showSignature: true,
    signatureName: 'John Doe',
    notes: 'Thank you',
    termsAndConditions: 'Net 15',
    currency: 'USD',
    shippingCharges: 10,
    usePerItemTax: true,
    globalTaxType: 'percentage',
    globalTaxRate: 0,
    globalTaxLabel: 'Tax',
    discountType: 'percentage',
    discountValue: 0,
    watermarkText: 'DRAFT'
  });

  it('generates PDF with all optional fields and per-item tax', () => {
    const data = getBaseData();
    generateGeneralInvoicePDF(data);
    
    expect(jsPDF).toHaveBeenCalled();
    expect(autoTable).toHaveBeenCalledTimes(2); // Items table and Payments table
    expect(pdfUtils.drawPdfFooter).toHaveBeenCalled();
    expect(pdfUtils.drawWatermark).toHaveBeenCalledWith(expect.anything(), 'DRAFT');
  });

  it('generates PDF with minimal data (no optional fields, global flat tax, flat discount)', () => {
    const data: GeneralInvoiceData = {
      ...getBaseData(),
      companyTaxId: undefined,
      companyAddress: undefined,
      companyEmail: undefined,
      companyPhone: undefined,
      bankDetails: undefined,
      customer: { name: 'Customer Only' }, // no other customer details
      payments: [],
      creditNotes: [],
      invoiceDate: undefined,
      dueDate: undefined,
      showSignature: false,
      notes: undefined,
      termsAndConditions: undefined,
      watermarkText: undefined,
      usePerItemTax: false,
      discountType: 'flat',
      discountValue: 15,
      globalTaxType: 'flat',
      globalTaxRate: 5,
    };

    generateGeneralInvoicePDF(data);
    expect(autoTable).toHaveBeenCalledTimes(1); // Only items table
    expect(pdfUtils.drawWatermark).not.toHaveBeenCalled();
  });

  it('generates PDF with global percentage tax and percentage discount', () => {
    const data: GeneralInvoiceData = {
      ...getBaseData(),
      usePerItemTax: false,
      discountType: 'percentage',
      discountValue: 10,
      globalTaxType: 'percentage',
      globalTaxRate: 10,
    };

    generateGeneralInvoicePDF(data);
    expect(autoTable).toHaveBeenCalled();
  });

  it('falls back to default texts if empty', () => {
    const data: GeneralInvoiceData = {
      ...getBaseData(),
      invoiceNumber: '',
      companyName: '',
      watermarkText: '   ' // empty after trim
    };
    generateGeneralInvoicePDF(data);
    expect(pdfUtils.drawWatermark).not.toHaveBeenCalled();
  });

  /** The mocked jsPDF constructor (vi.fn) — typed loosely for call assertions. */
  const docMock = (): any => jsPDF as unknown as any;

  it('applies bold styling before drawing the Grand Total row (regression)', () => {
    const data = getBaseData();
    generateGeneralInvoicePDF(data);

    const doc = docMock().mock.results[0].value;
    const fontCalls = doc.setFont.mock.calls.map((c: any[]) => c.join('|'));
    const textCalls = doc.text.mock.calls.map((c: any[]) => String(c[0]));
    const grandTotalTextIdx = textCalls.indexOf('Grand Total:');
    expect(grandTotalTextIdx).toBeGreaterThan(-1);

    // The setFont('helvetica','bold') that styles the final row must happen
    // BEFORE the Grand Total label is drawn, never after.
    const boldBeforeIdx = fontCalls.findIndex((f: string) => f === 'helvetica|bold');
    expect(boldBeforeIdx).toBeGreaterThan(-1);
    const boldCallNumber = doc.setFont.mock.invocationCallOrder[boldBeforeIdx];
    const grandTextCallNumber = doc.text.mock.invocationCallOrder[grandTotalTextIdx];
    expect(grandTextCallNumber).toBeGreaterThan(boldCallNumber);
  });

  it('renders per-item totals from the ACTIVE tax mode, ignoring stale stored totals', () => {
    const data = getBaseData(); // usePerItemTax: true, qty 2 × 50, tax 10%, discount 5
    generateGeneralInvoicePDF(data);

    const doc = docMock().mock.results[0].value;
    // gross 100 + 10% tax - 5 discount = 105 -> "USD 105.00"
    expect(
      doc.text.mock.calls.some((c: any[]) => String(c[0]) === 'USD 105.00')
    ).toBe(true);
  });

  it('excludes per-item tax from displayed totals when global tax mode is on', () => {
    const data = { ...getBaseData(), usePerItemTax: false }; // qty 2 × 50 - 5 discount
    generateGeneralInvoicePDF(data);

    const doc = docMock().mock.results[0].value;
    expect(
      doc.text.mock.calls.some((c: any[]) => String(c[0]) === 'USD 95.00')
    ).toBe(true);
    expect(
      doc.text.mock.calls.some((c: any[]) => String(c[0]) === 'USD 105.00')
    ).toBe(false);
  });
});
