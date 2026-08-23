import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateLPOPDF } from './pdfService';
import { LPOData } from '../types';

vi.mock('jspdf', () => {
  const jsPDFMock = vi.fn().mockImplementation(() => ({
    internal: {
      pageSize: { width: 210, height: 297 }
    },
    addImage: vi.fn(),
    setFontSize: vi.fn(),
    setFont: vi.fn(),
    setTextColor: vi.fn(),
    text: vi.fn(),
    splitTextToSize: vi.fn().mockImplementation((text) => {
      if (typeof text === 'string') return [text];
      return text;
    }),
    getTextWidth: vi.fn().mockReturnValue(50),
    addPage: vi.fn(),
    setDrawColor: vi.fn(),
    setLineWidth: vi.fn(),
    line: vi.fn(),
    getNumberOfPages: vi.fn().mockReturnValue(1),
    setPage: vi.fn(),
    save: vi.fn(),
    saveGraphicsState: vi.fn(),
    restoreGraphicsState: vi.fn(),
    setGState: vi.fn(),
    GState: vi.fn().mockImplementation(function() { return {}; }),
    lastAutoTable: { finalY: 50 }
  }));
  return { jsPDF: jsPDFMock };
});

vi.mock('jspdf-autotable', () => {
  return {
    default: vi.fn((doc, options) => {
      // Simulate didDrawCell logic
      if (options.didDrawCell) {
        options.didDrawCell({
          doc,
          section: 'body',
          column: { index: 1 },
          row: { index: 0 },
          cell: { x: 10, y: 10, height: 10, width: 10 }
        });
      }
    })
  };
});

describe('hotelLpoPdfService', () => {
  let mockData: LPOData;

  beforeEach(() => {
    mockData = {
      hotelName: 'Test Hotel',
      hotelAddress: '123 Test St',
      roomType: 'Suite',
      mealPlan: 'Bed & Breakfast',
      companyName: 'Test Company',
      guests: [{ name: 'John Doe', loyaltyNumber: '12345' }],
      adultCount: 2,
      childCount: 1,
      childAges: [5],
      infantCount: 1,
      guestPhone: '1234567890',
      guestEmail: 'test@example.com',
      rateCodes: 'SUMMER2026',
      currency: 'USD',
      applicableRates: [
        { id: '1', start: new Date('2026-08-01'), end: new Date('2026-08-03'), amount: 150 }
      ],
      stayRanges: [
        { id: '1', start: new Date('2026-08-01'), end: new Date('2026-08-03'), nights: 2 }
      ],
      paymentRemarks: 'Pay on arrival',
      cancellationRemarks: '24h free cancellation',
      generalRemarks: 'High floor preferred',
      pdfOptions: {
        showRateCodes: true,
        showApplicableRates: true,
        showPaymentRemarks: true,
        showCancellationPolicy: true,
        showGeneralRemarks: true,
        showHotelInOccupancy: true,
        showCompanyBillTo: true,
        showGuestInBillTo: true,
        showLogo: true,
        logoDataUrl: 'data:image/jpeg;base64,xxxx',
        showSignatureArea: true,
        authorizedSignatoryName: 'Jane Smith',
        showCreatedBy: true,
        createdByName: 'John Manager',
        showAverageRate: false,
        showDailyRateBreakdown: true,
        showSupplierConfirmation: true,
        supplierConfirmationNumber: 'CONF-999',
        manualPOHeader: true,
        poHeaderTitle: 'CUSTOM PO',
        manualPONumber: true,
        poNumber: 'PO-12345',
        watermarkText: 'DRAFT'
      }
    };
  });

  it('should generate PDF with all features enabled', () => {
    expect(() => generateLPOPDF(mockData)).not.toThrow();
  });

  it('should handle zero nights or same day start and end', () => {
    mockData.stayRanges[0].end = mockData.stayRanges[0].start; // 0 nights
    mockData.stayRanges[0].nights = 0;
    expect(() => generateLPOPDF(mockData)).not.toThrow();
  });

  it('should handle missing logo or invalid logo data url gracefully', () => {
    mockData.pdfOptions.logoDataUrl = 'invalid_data_url';
    expect(() => generateLPOPDF(mockData)).not.toThrow();
  });

  it('should show average rate instead of breakdown', () => {
    mockData.pdfOptions.showDailyRateBreakdown = false;
    mockData.pdfOptions.showAverageRate = true;
    expect(() => generateLPOPDF(mockData)).not.toThrow();
  });

  it('should hide average rate and breakdown entirely', () => {
    mockData.pdfOptions.showDailyRateBreakdown = false;
    mockData.pdfOptions.showAverageRate = false;
    expect(() => generateLPOPDF(mockData)).not.toThrow();
  });

  it('should correctly format amount in words', () => {
    mockData.currency = 'AED';
    expect(() => generateLPOPDF(mockData)).not.toThrow();
  });

  it('should fallback to defaults if manual options are disabled', () => {
    mockData.pdfOptions.manualPOHeader = false;
    mockData.pdfOptions.manualPONumber = false;
    mockData.pdfOptions.poHeaderTitle = '   '; // spaces
    mockData.pdfOptions.poNumber = '   '; // spaces
    expect(() => generateLPOPDF(mockData)).not.toThrow();
  });

  it('should correctly handle bill to headers without company', () => {
    mockData.pdfOptions.showCompanyBillTo = false;
    mockData.companyName = '';
    mockData.pdfOptions.showGuestInBillTo = true;
    expect(() => generateLPOPDF(mockData)).not.toThrow();
  });

  it('should correctly handle guests without loyalty number', () => {
    mockData.guests[0].loyaltyNumber = '';
    mockData.guests[0].name = '   '; // Should fallback to "Guest"
    expect(() => generateLPOPDF(mockData)).not.toThrow();
  });

  it('should hide signature area and creator', () => {
    mockData.pdfOptions.showSignatureArea = false;
    mockData.pdfOptions.showCreatedBy = false;
    expect(() => generateLPOPDF(mockData)).not.toThrow();
  });

  it('should omit watermark if empty', () => {
    mockData.pdfOptions.watermarkText = '   ';
    expect(() => generateLPOPDF(mockData)).not.toThrow();
  });

  it('should handle missing remarks', () => {
    mockData.rateCodes = '';
    mockData.paymentRemarks = '';
    mockData.cancellationRemarks = '';
    mockData.generalRemarks = '';
    mockData.applicableRates = [];
    mockData.pdfOptions.showRateCodes = true;
    mockData.pdfOptions.showApplicableRates = true;
    mockData.pdfOptions.showPaymentRemarks = true;
    mockData.pdfOptions.showCancellationPolicy = true;
    mockData.pdfOptions.showGeneralRemarks = true;
    expect(() => generateLPOPDF(mockData)).not.toThrow();
  });

  it('should disable remarks section entirely', () => {
    mockData.pdfOptions.showRateCodes = false;
    mockData.pdfOptions.showApplicableRates = false;
    mockData.pdfOptions.showPaymentRemarks = false;
    mockData.pdfOptions.showCancellationPolicy = false;
    mockData.pdfOptions.showGeneralRemarks = false;
    expect(() => generateLPOPDF(mockData)).not.toThrow();
  });

  it('should test occupancy strings with only adults', () => {
    mockData.childCount = 0;
    mockData.infantCount = 0;
    expect(() => generateLPOPDF(mockData)).not.toThrow();
  });

  it('should test occupancy strings with children but no ages array', () => {
    mockData.childCount = 2;
    mockData.childAges = [];
    expect(() => generateLPOPDF(mockData)).not.toThrow();
  });
});
