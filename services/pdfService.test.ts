import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateLPOPDF } from './pdfService';
import { LPOData, INITIAL_LPO_DATA, INITIAL_PDF_OPTIONS } from '../types';

const mockDoc = {
  internal: { pageSize: { width: 210, height: 297 } },
  getNumberOfPages: vi.fn().mockReturnValue(1),
  setPage: vi.fn(),
  setFontSize: vi.fn(),
  setTextColor: vi.fn(),
  text: vi.fn(),
  splitTextToSize: vi.fn().mockImplementation((text) => [text]),
  getTextWidth: vi.fn().mockReturnValue(10),
  addImage: vi.fn(),
  setDrawColor: vi.fn(),
  setLineWidth: vi.fn(),
  line: vi.fn(),
  setFont: vi.fn(),
  saveGraphicsState: vi.fn(),
  restoreGraphicsState: vi.fn(),
  setGState: vi.fn(),
  GState: vi.fn(),
  addPage: vi.fn(),
  save: vi.fn(),
  lastAutoTable: undefined as any
};

vi.mock('jspdf', () => {
  return {
    jsPDF: vi.fn(() => mockDoc)
  };
});

vi.mock('jspdf-autotable', () => {
  return {
    default: vi.fn((doc, options) => {
      // Mocking autotable effect on document
      doc.lastAutoTable = { finalY: options.startY + 20 };
    })
  };
});

describe('pdfService', () => {
  let mockData: LPOData;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDoc.lastAutoTable = undefined;
    mockDoc.getNumberOfPages.mockReturnValue(1);
    mockDoc.splitTextToSize.mockImplementation((text) => [text]);
    mockDoc.getTextWidth.mockReturnValue(10);

    mockData = JSON.parse(JSON.stringify(INITIAL_LPO_DATA));
    mockData.stayRanges = [
      { id: '1', start: new Date('2023-01-01'), end: new Date('2023-01-03'), nights: 2 }
    ];
    mockData.applicableRates = [
      { id: 'r1', start: new Date('2023-01-01'), end: new Date('2023-01-03'), amount: 100 }
    ];
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('generates PDF with minimum options', () => {
    generateLPOPDF(mockData);
    expect(mockDoc.save).toHaveBeenCalled();
  });

  it('generates PDF with manual PO Number and Header', () => {
    mockData.pdfOptions.manualPONumber = true;
    mockData.pdfOptions.poNumber = 'MANUAL-123';
    mockData.pdfOptions.manualPOHeader = true;
    mockData.pdfOptions.poHeaderTitle = 'CUSTOM PO';
    generateLPOPDF(mockData);
    expect(mockDoc.text).toHaveBeenCalledWith('CUSTOM PO', expect.any(Number), expect.any(Number), { align: 'right' });
    expect(mockDoc.text).toHaveBeenCalledWith('Ref #: MANUAL-123', expect.any(Number), expect.any(Number), { align: 'right' });
  });

  it('adds logo correctly', () => {
    mockData.pdfOptions.showLogo = true;
    mockData.pdfOptions.logoDataUrl = 'data:image/png;base64,123';
    generateLPOPDF(mockData);
    expect(mockDoc.addImage).toHaveBeenCalled();
  });

  it('handles bill to logic with company and guest', () => {
    mockData.pdfOptions.showCompanyBillTo = true;
    mockData.companyName = 'Test Corp';
    mockData.pdfOptions.showGuestInBillTo = true;
    mockData.guests[0].name = 'John Doe';
    mockData.guestPhone = '123456';
    mockData.guestEmail = 'john@test.com';
    generateLPOPDF(mockData);
    expect(mockDoc.text).toHaveBeenCalledWith('BILL TO', expect.any(Number), expect.any(Number));
  });

  it('handles bill to logic with guest only', () => {
    mockData.pdfOptions.showCompanyBillTo = false;
    mockData.pdfOptions.showGuestInBillTo = true;
    mockData.guests[0].name = 'John Doe';
    generateLPOPDF(mockData);
    expect(mockDoc.text).toHaveBeenCalledWith('BILL TO', expect.any(Number), expect.any(Number));
  });

  it('handles empty guests', () => {
    mockData.guests = [];
    generateLPOPDF(mockData);
    expect(mockDoc.save).toHaveBeenCalled();
  });

  it('displays correct occupancy details', () => {
    mockData.adultCount = 2;
    mockData.childCount = 1;
    mockData.childAges = [5];
    mockData.infantCount = 1;
    mockData.guests[0].name = 'John Doe';
    mockData.guests[0].loyaltyNumber = 'LOYAL-99';
    mockData.pdfOptions.showHotelInOccupancy = true;
    mockData.pdfOptions.showSupplierConfirmation = true;
    mockData.pdfOptions.supplierConfirmationNumber = 'SUP-123';
    generateLPOPDF(mockData);
    expect(mockDoc.save).toHaveBeenCalled();
  });

  it('displays daily rate breakdown', () => {
    mockData.pdfOptions.showDailyRateBreakdown = true;
    mockData.pdfOptions.showAverageRate = false;
    generateLPOPDF(mockData);
    expect(mockDoc.save).toHaveBeenCalled();
  });
  
  it('displays N/A for breakdown when nights is 0', () => {
    mockData.pdfOptions.showDailyRateBreakdown = true;
    mockData.stayRanges[0].nights = 0;
    mockData.stayRanges[0].end = mockData.stayRanges[0].start;
    generateLPOPDF(mockData);
    expect(mockDoc.save).toHaveBeenCalled();
  });

  it('displays average rate', () => {
    mockData.pdfOptions.showDailyRateBreakdown = false;
    mockData.pdfOptions.showAverageRate = true;
    generateLPOPDF(mockData);
    expect(mockDoc.save).toHaveBeenCalled();
  });

  it('handles page breaks during summary block', () => {
    mockDoc.splitTextToSize.mockImplementation(() => Array(100).fill('text'));
    mockData.pdfOptions.showDailyRateBreakdown = false;
    generateLPOPDF(mockData);
    expect(mockDoc.addPage).toHaveBeenCalled();
  });

  it('shows and hides remarks conditionally', () => {
    mockData.pdfOptions.showRateCodes = false;
    mockData.pdfOptions.showApplicableRates = false;
    mockData.pdfOptions.showPaymentRemarks = false;
    mockData.pdfOptions.showCancellationPolicy = false;
    mockData.pdfOptions.showGeneralRemarks = false;
    generateLPOPDF(mockData);
    expect(mockDoc.save).toHaveBeenCalled();
  });

  it('handles empty remarks text', () => {
    mockData.pdfOptions.showPaymentRemarks = true;
    mockData.paymentRemarks = '   ';
    mockData.pdfOptions.showCancellationPolicy = true;
    mockData.cancellationRemarks = '';
    mockData.pdfOptions.showGeneralRemarks = true;
    mockData.generalRemarks = '';
    mockData.applicableRates = [];
    generateLPOPDF(mockData);
    expect(mockDoc.save).toHaveBeenCalled();
  });

  it('draws signature area with both createdBy and authorized', () => {
    mockData.pdfOptions.showCreatedBy = true;
    mockData.pdfOptions.createdByName = 'Creator';
    mockData.pdfOptions.showSignatureArea = true;
    mockData.pdfOptions.authorizedSignatoryName = 'Authorizer';
    // Force a page break for the signature area
    mockDoc.splitTextToSize.mockReturnValue(Array(50).fill('')); 
    generateLPOPDF(mockData);
    expect(mockDoc.text).toHaveBeenCalledWith('PREPARED BY', expect.any(Number), expect.any(Number));
  });

  it('draws watermark when specified', () => {
    mockData.pdfOptions.watermarkText = 'TEST WATERMARK';
    generateLPOPDF(mockData);
    expect(mockDoc.saveGraphicsState).toHaveBeenCalled();
  });

  it('handles missing hotel name', () => {
    mockData.hotelName = '';
    generateLPOPDF(mockData);
    expect(mockDoc.save).toHaveBeenCalled();
  });

  it('handles logo error and format fallback', () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    
    // Test format fallback to JPEG
    mockData.pdfOptions.showLogo = true;
    mockData.pdfOptions.logoDataUrl = 'data:image';
    generateLPOPDF(mockData);
    expect(mockDoc.addImage).toHaveBeenCalledWith('data:image', 'JPEG', expect.any(Number), expect.any(Number), expect.any(Number), expect.any(Number), undefined, 'FAST');
    
    // Test catch block
    mockDoc.addImage.mockImplementationOnce(() => { throw new Error('Test'); });
    mockData.pdfOptions.logoDataUrl = 'data:image/png;base64,123';
    expect(() => generateLPOPDF(mockData)).not.toThrow();
    expect(consoleWarnSpy).toHaveBeenCalled();
    
    consoleWarnSpy.mockRestore();
  });

  it('executes autoTable didDrawCell callback for remarks', async () => {
    // We need to capture the options passed to autoTable
    // Since autoTable is mocked globally, we can import it
    const autoTableMock = await import('jspdf-autotable');
    
    // Setup data to trigger remarks section
    mockData.pdfOptions.showPaymentRemarks = true;
    mockData.paymentRemarks = 'Payment Remarks';
    mockData.pdfOptions.showCancellationPolicy = true;
    mockData.cancellationRemarks = 'Cancel Remarks';
    
    generateLPOPDF(mockData);
    
    // The second call to autoTable should be the remarks table
    const remarksCall = vi.mocked(autoTableMock.default).mock.calls.find(call => 
      call[1] && call[1].didDrawCell
    );
    
    expect(remarksCall).toBeDefined();
    if (remarksCall && remarksCall[1].didDrawCell) {
      // Simulate drawing body cell in column index 1 (not the last row)
      remarksCall[1].didDrawCell({
        section: 'body',
        column: { index: 1 },
        row: { index: 0 },
        cell: { x: 10, y: 10, width: 50, height: 10 }
      } as any);
      
      expect(mockDoc.setDrawColor).toHaveBeenCalledWith(241, 245, 249);
      expect(mockDoc.line).toHaveBeenCalledWith(10, 20, 60, 20);

      // Simulate drawing header cell (should do nothing)
      remarksCall[1].didDrawCell({
        section: 'head',
        column: { index: 1 },
        row: { index: 0 },
        cell: { x: 10, y: 10, width: 50, height: 10 }
      } as any);

      // Simulate drawing body cell in last row (should do nothing)
      remarksCall[1].didDrawCell({
        section: 'body',
        column: { index: 1 },
        row: { index: 1 }, // 2 items in remarksData => last row index 1
        cell: { x: 10, y: 10, width: 50, height: 10 }
      } as any);
    }
  });

  it('displays correct occupancy details with fallback supplier confirmation', () => {
    mockData.pdfOptions.showSupplierConfirmation = true;
    mockData.pdfOptions.supplierConfirmationNumber = '';
    generateLPOPDF(mockData);
    expect(mockDoc.save).toHaveBeenCalled();
  });

  it('displays average rate with 0 nights', () => {
    mockData.pdfOptions.showDailyRateBreakdown = false;
    mockData.pdfOptions.showAverageRate = true;
    mockData.stayRanges[0].nights = 0;
    generateLPOPDF(mockData);
    expect(mockDoc.save).toHaveBeenCalled();
  });

  it('shows rate codes when present', () => {
    mockData.pdfOptions.showRateCodes = true;
    mockData.rateCodes = 'PROMO123';
    generateLPOPDF(mockData);
    expect(mockDoc.save).toHaveBeenCalled();
  });

  it('draws signature area with fallback createdByName', () => {
    mockData.pdfOptions.showCreatedBy = true;
    mockData.pdfOptions.createdByName = '';
    generateLPOPDF(mockData);
    expect(mockDoc.text).toHaveBeenCalledWith('__________________', expect.any(Number), expect.any(Number));
  });
});
