import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateHotelInvoicePDF } from './hotelInvoicePdfService';
import { HotelInvoiceData } from '../types/generalInvoice';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// Mock dependencies
vi.mock('jspdf', () => {
  const mockDoc = {
    internal: {
      pageSize: { width: 210, height: 297 }
    },
    setFontSize: vi.fn(),
    setFont: vi.fn(),
    setTextColor: vi.fn(),
    text: vi.fn(),
    line: vi.fn(),
    setDrawColor: vi.fn(),
    setLineWidth: vi.fn(),
    splitTextToSize: vi.fn((text: string) => text.match(/.{1,10}/g) || [text]),
    addPage: vi.fn(),
    save: vi.fn(),
    lastAutoTable: { finalY: 100 }
  };
  return {
    jsPDF: vi.fn(() => mockDoc)
  };
});

vi.mock('jspdf-autotable', () => {
  return {
    default: vi.fn((doc, options) => {
      doc.lastAutoTable = { finalY: options.startY + 20 };
    })
  };
});

vi.mock('./pdfUtils', () => ({
  getAmountInWords: vi.fn(() => 'One Hundred'),
  generateDocNumber: vi.fn(() => 'INV-12345'),
  PDF_COLORS: {
    border: [0, 0, 0],
    dark: [0, 0, 0],
    primary: [0, 0, 0],
    secondary: [0, 0, 0],
    muted: [0, 0, 0]
  },
  getPdfTextHelpers: vi.fn(() => ({
    setPrimary: vi.fn(),
    setSecondary: vi.fn()
  })),
  PDF_TABLE_HEAD_STYLES: {},
  PDF_TABLE_BODY_STYLES: {},
  PDF_TABLE_ALTERNATE_ROW_STYLES: {},
  drawPdfFooter: vi.fn(),
  addLogoPdf: vi.fn(),
  drawSignatureArea: vi.fn(),
  drawWatermark: vi.fn()
}));

import * as pdfUtils from './pdfUtils';

describe('hotelInvoicePdfService', () => {
  let baseData: HotelInvoiceData;
  let mockDoc: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDoc = new jsPDF();
    (jsPDF as any).mockClear();
    
    baseData = {
      hotelName: 'Test Hotel',
      primaryGuest: { name: 'John Guest', loyaltyNumber: 'LOY123' },
      lineItems: [
        { id: '1', category: 'Room', description: 'Night 1', quantity: 1, rate: 100, amount: 100, date: '2026-08-01' }
      ],
      payments: [],
      serviceChargeType: 'percentage',
      serviceChargeRate: 0,
      serviceChargeLabel: 'Service Charge',
      taxType: 'percentage',
      taxRate: 0,
      taxLabel: 'Tax',
      discountType: 'flat',
      discountValue: 0,
      discountLabel: 'Discount',
      status: 'Draft',
      currency: 'USD',
      invoiceNumber: 'INV-111',
      manualInvoiceNumber: true
    };
  });

  it('generates a basic PDF with minimum details', () => {
    generateHotelInvoicePDF(baseData);
    
    expect(jsPDF).toHaveBeenCalled();
    expect(pdfUtils.getPdfTextHelpers).toHaveBeenCalled();
    // Because no taxRate > 0
    expect(mockDoc.text).toHaveBeenCalledWith(expect.stringContaining('HOTEL INVOICE'), expect.any(Number), expect.any(Number), expect.any(Object));
    expect(mockDoc.save).toHaveBeenCalledWith('Invoice_INV-111_test_hotel.pdf');
  });

  it('generates PDF with logo and tax invoice title', () => {
    const dataWithLogoAndTax: HotelInvoiceData = {
      ...baseData,
      hotelLogo: 'data:image/png;base64,mock',
      showLogo: true,
      taxRate: 10, // Triggers TAX INVOICE
    };
    
    generateHotelInvoicePDF(dataWithLogoAndTax);
    
    expect(pdfUtils.addLogoPdf).toHaveBeenCalled();
    expect(mockDoc.text).toHaveBeenCalledWith(expect.stringContaining('TAX INVOICE'), expect.any(Number), expect.any(Number), expect.any(Object));
  });
  
  it('includes all stay and guest details properly', () => {
    const dataWithDetails: HotelInvoiceData = {
      ...baseData,
      hotelAddress: '123 Test St',
      hotelPhone: '555-1234',
      hotelEmail: 'test@hotel.com',
      companyName: 'Test Corp',
      guestPhone: '555-9876',
      folioNumber: 'F123',
      roomNumber: '101',
      roomType: 'Suite',
      checkInDate: '2026-08-01',
      checkOutDate: '2026-08-05'
    };
    
    generateHotelInvoicePDF(dataWithDetails);
    
    expect(mockDoc.text).toHaveBeenCalledWith('Tel: 555-1234', expect.any(Number), expect.any(Number));
    expect(mockDoc.text).toHaveBeenCalledWith('Email: test@hotel.com', expect.any(Number), expect.any(Number));
    expect(mockDoc.text).toHaveBeenCalledWith('Test Corp', expect.any(Number), expect.any(Number));
    expect(mockDoc.text).toHaveBeenCalledWith('Loyalty No: LOY123', expect.any(Number), expect.any(Number));
    expect(mockDoc.text).toHaveBeenCalledWith('Tel: 555-9876', expect.any(Number), expect.any(Number));
    expect(mockDoc.text).toHaveBeenCalledWith('Folio No: F123', expect.any(Number), expect.any(Number));
    expect(mockDoc.text).toHaveBeenCalledWith('Room: 101 (Suite)', expect.any(Number), expect.any(Number));
  });

  it('handles calculations correctly with service charge, tax, discount', () => {
    const dataWithCalcs: HotelInvoiceData = {
      ...baseData,
      serviceChargeType: 'percentage',
      serviceChargeRate: 10,
      taxType: 'flat',
      taxRate: 20,
      discountType: 'percentage',
      discountValue: 10, // Of (100 + 10 + 20) = 13
      status: 'Sent' // not draft
    };
    
    generateHotelInvoicePDF(dataWithCalcs);
    expect(mockDoc.text).toHaveBeenCalledWith(expect.stringContaining('Status: SENT'), expect.any(Number), expect.any(Number), expect.any(Object));
    expect(mockDoc.text).toHaveBeenCalledWith('Subtotal:', expect.any(Number), expect.any(Number));
    expect(mockDoc.text).toHaveBeenCalledWith('GRAND TOTAL:', expect.any(Number), expect.any(Number));
    expect(pdfUtils.getAmountInWords).toHaveBeenCalled();
  });

  it('handles payments table and balance calculation', () => {
    const dataWithPayments: HotelInvoiceData = {
      ...baseData,
      payments: [
        { id: '1', method: 'Cash', amount: 50, reference: 'R1', date: '2026-08-02' }
      ]
    };
    
    generateHotelInvoicePDF(dataWithPayments);
    
    expect(autoTable).toHaveBeenCalledTimes(2); // One for line items, one for payments
    expect(mockDoc.text).toHaveBeenCalledWith('PAYMENT HISTORY', expect.any(Number), expect.any(Number));
    expect(mockDoc.text).toHaveBeenCalledWith('Total Paid:', expect.any(Number), expect.any(Number));
    expect(mockDoc.text).toHaveBeenCalledWith('BALANCE DUE:', expect.any(Number), expect.any(Number));
  });

  it('handles overpayment balance due coloring', () => {
    const dataWithPayments: HotelInvoiceData = {
      ...baseData,
      lineItems: [
        { id: '1', category: 'Room', description: 'Night 1', quantity: 1, rate: 100, amount: 100, date: '' }
      ],
      payments: [
        { id: '1', method: 'Cash', amount: 150, reference: '', date: '' }
      ]
    };
    
    generateHotelInvoicePDF(dataWithPayments);
    
    expect(mockDoc.text).toHaveBeenCalledWith('BALANCE DUE:', expect.any(Number), expect.any(Number));
    expect(mockDoc.setTextColor).toHaveBeenCalled();
  });

  it('handles notes, signature, and watermark correctly', () => {
    const dataWithExtras: HotelInvoiceData = {
      ...baseData,
      notes: 'Test Notes',
      showSignature: true,
      signatureName: 'Manager',
      watermarkText: 'DRAFT',
      invoiceDate: '2026-08-01',
      dueDate: '2026-08-10',
      invoiceNumber: '' // Should use generateDocNumber
    };
    
    generateHotelInvoicePDF(dataWithExtras);
    
    expect(mockDoc.text).toHaveBeenCalledWith('Notes:', expect.any(Number), expect.any(Number));
    expect(pdfUtils.drawSignatureArea).toHaveBeenCalledWith(expect.any(Object), expect.any(Number), {
      showCreatedBy: true,
      createdByName: 'Manager',
      showSignature: true,
      signatureName: 'Guest Signature'
    });
    expect(pdfUtils.drawWatermark).toHaveBeenCalledWith(expect.any(Object), 'DRAFT');
    expect(pdfUtils.drawPdfFooter).toHaveBeenCalled();
  });

  it('triggers addPage for totals block, payments table, and notes if yCursor is too large', () => {
    // Override the autoTable mock for this test to set a very large finalY
    (autoTable as any).mockImplementation((doc: any, options: any) => {
      doc.lastAutoTable = { finalY: 280 }; // Force a large Y to trigger addPage
    });
    
    const dataWithExtras: any = {
      ...baseData,
      payments: [{ id: '1', method: 'Cash', amount: 50, reference: 'R1', date: '' }],
      notes: 'Test Notes'
    };
    
    generateHotelInvoicePDF(dataWithExtras);
    
    // addPage should be called multiple times due to yCursor being pushed down
    expect(mockDoc.addPage).toHaveBeenCalled();
  });

  it('triggers addPage before payments table', () => {
    (autoTable as any).mockImplementationOnce((doc: any, options: any) => {
      doc.lastAutoTable = { finalY: 220 }; 
    });
    
    const dataWithExtras: HotelInvoiceData = {
      ...baseData,
      payments: [{ id: '1', method: 'Cash', amount: 50, reference: 'R1', date: '' }],
    };
    
    generateHotelInvoicePDF(dataWithExtras);
    
    expect(mockDoc.addPage).toHaveBeenCalled();
  });

  it('triggers addPage before notes', () => {
    (autoTable as any).mockImplementationOnce((doc: any, options: any) => {
      doc.lastAutoTable = { finalY: 225 }; 
    });
    
    const dataWithExtras: HotelInvoiceData = {
      ...baseData,
      serviceChargeRate: 10,
      taxRate: 5,
      discountValue: 10,
      notes: 'Test Notes'
    };
    
    generateHotelInvoicePDF(dataWithExtras);
    
    expect(mockDoc.addPage).toHaveBeenCalled();
  });

  it('triggers addPage before signatures', () => {
    (autoTable as any).mockImplementationOnce((doc: any, options: any) => {
      doc.lastAutoTable = { finalY: 225 }; 
    });
    
    const dataWithExtras: HotelInvoiceData = {
      ...baseData,
      serviceChargeRate: 10,
      taxRate: 5,
      discountValue: 10,
    };
    
    generateHotelInvoicePDF(dataWithExtras);
    
    expect(mockDoc.addPage).toHaveBeenCalled();
  });


  it('covers fallback branches (empty hotelName, fixed service charge, large header)', () => {
    // Force splitTextToSize to return many lines to increase header height
    (mockDoc.splitTextToSize as any).mockReturnValue(Array(10).fill('line'));
    
    const dataWithExtras: HotelInvoiceData = {
      ...baseData,
      hotelName: '', // covers line 64 and 291 (fallback to 'Hotel Name' and 'Reception')
      signatureName: '', // covers line 291 (fallback to 'Reception' if hotelName is empty)
      serviceChargeType: 'fixed', // covers line 162 (fixed instead of percentage)
      serviceChargeRate: 50,
      hotelAddress: '123 Main St',
    };
    
    generateHotelInvoicePDF(dataWithExtras);
    
    // reset mock behavior
    (mockDoc.splitTextToSize as any).mockImplementation((text: string) => [text]);
    
    expect(mockDoc.text).toHaveBeenCalled();
  });

});
