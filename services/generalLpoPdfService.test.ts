import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateGeneralLPOPDF } from './generalLpoPdfService';
import { GeneralLPOData } from '../types/generalLpo';

// Mock jsPDF
const mockSave = vi.fn();
const mockText = vi.fn();
const mockAddPage = vi.fn();
const mockSetFontSize = vi.fn();
const mockSetFont = vi.fn();
const mockSetTextColor = vi.fn();
const mockSplitTextToSize = vi.fn().mockImplementation((text) => [text]);
const mockSetDrawColor = vi.fn();
const mockLine = vi.fn();
const mockSetLineWidth = vi.fn();

vi.mock('jspdf', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      save: mockSave,
      text: mockText,
      addPage: mockAddPage,
      setFontSize: mockSetFontSize,
      setFont: mockSetFont,
      setTextColor: mockSetTextColor,
      splitTextToSize: mockSplitTextToSize,
      setDrawColor: mockSetDrawColor,
      line: mockLine,
      setLineWidth: mockSetLineWidth,
      internal: {
        pageSize: {
          width: 210,
          height: 297,
        },
      },
      lastAutoTable: {
        finalY: 100,
      }
    })),
  };
});

// Mock autoTable
vi.mock('jspdf-autotable', () => {
  return {
    default: vi.fn(),
  };
});

// Mock dependencies of pdfUtils (as these functions might be called and we just want to ensure service doesn't crash)
vi.mock('./pdfUtils', async () => {
  const actual = await vi.importActual('./pdfUtils') as any;
  return {
    ...actual,
    generateDocNumber: vi.fn().mockReturnValue('PO-123'),
    getAmountInWords: vi.fn().mockReturnValue('One Hundred Dollars'),
    getTimeZoneAbbr: vi.fn().mockReturnValue('EST'),
    addLogoPdf: vi.fn(),
    drawPdfFooter: vi.fn(),
    drawSignatureArea: vi.fn(),
    drawWatermark: vi.fn(),
  };
});

import { addLogoPdf, drawSignatureArea, drawWatermark } from './pdfUtils';

describe('generalLpoPdfService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('generates PDF with all fields filled', () => {
    const data: GeneralLPOData = {
      lpoNumberOverride: 'OVERRIDE-123',
      currency: 'USD',
      logoUpload: 'http://example.com/logo.png',
      status: 'Approved',
      approvalDate: '2026-08-01',
      companyInfo: {
        name: 'Company A',
        address: '123 Main St',
        phone: '123456789',
        email: 'info@company.com'
      },
      supplierInfo: {
        name: 'Supplier B',
        address: '456 Supplier Ave',
        contactPerson: 'Mr. Supplier',
        phone: '987654321',
        email: 'sales@supplier.com',
        taxId: 'TAX-999'
      },
      items: [
        { id: '1', description: 'Item 1', quantity: 2, unit: 'pcs', unitPrice: 50, total: 100 }
      ],
      discountType: 'percentage',
      discountValue: 10,
      taxType: 'flat',
      taxRate: 5,
      shippingCharges: 15,
      notes: 'Some notes',
      deliveryNotes: 'Deliver ASAP',
      termsAndConditions: 'T&C apply',
      includeSignature: true,
      signatureName: 'John Doe',
      watermarkText: 'CONFIDENTIAL'
    };

    expect(() => generateGeneralLPOPDF(data)).not.toThrow();
    
    expect(addLogoPdf).toHaveBeenCalled();
    expect(drawSignatureArea).toHaveBeenCalled();
    expect(drawWatermark).toHaveBeenCalled();
    expect(mockSave).toHaveBeenCalledWith('LPO_OVERRIDE-123_supplier_b.pdf');
  });

  it('generates PDF with minimal data (defaults and fallbacks)', () => {
    const data: GeneralLPOData = {
      // Empty data
    };

    expect(() => generateGeneralLPOPDF(data)).not.toThrow();
    expect(mockSave).toHaveBeenCalled();
  });

  it('generates PDF handling flat discount and percentage tax', () => {
    const data: GeneralLPOData = {
      items: [
        { id: '1', description: 'Item 1', quantity: 2, unit: 'pcs', unitPrice: 50, total: 100 }
      ],
      discountType: 'flat',
      discountValue: 10,
      taxType: 'percentage',
      taxRate: 5,
      shippingCharges: 0,
    };

    expect(() => generateGeneralLPOPDF(data)).not.toThrow();
    expect(mockSave).toHaveBeenCalled();
  });

  it('handles addLogoPdf throwing an error gracefully', () => {
    vi.mocked(addLogoPdf).mockImplementationOnce(() => {
      throw new Error('Logo fetch error');
    });

    const data: GeneralLPOData = {
      logoUpload: 'invalid-url',
    };

    expect(() => generateGeneralLPOPDF(data)).not.toThrow();
    // It should log a warning internally and continue
  });

  it('handles undefined item properties', () => {
    const data: GeneralLPOData = {
      items: [
        { id: '1' } as any
      ]
    };
    expect(() => generateGeneralLPOPDF(data)).not.toThrow();
    expect(mockSave).toHaveBeenCalled();
  });
  
  it('handles missing items array', () => {
    const data: GeneralLPOData = {
      items: undefined
    } as any;
    expect(() => generateGeneralLPOPDF(data)).not.toThrow();
    expect(mockSave).toHaveBeenCalled();
  });

  it('handles pagination for signature area if notesY is too high', () => {
    // We can simulate this by mocking splitTextToSize to return a very large array of lines
    mockSplitTextToSize.mockReturnValue(new Array(100).fill('line'));
    
    const data: GeneralLPOData = {
      termsAndConditions: 'Very long T&C',
      includeSignature: true,
    };

    expect(() => generateGeneralLPOPDF(data)).not.toThrow();
    expect(mockAddPage).toHaveBeenCalled();
  });

  it('handles missing lastAutoTable.finalY', () => {
    import('jspdf').then((jsPDF) => {
      vi.mocked(jsPDF.default).mockImplementationOnce(() => ({
        save: mockSave,
        text: mockText,
        addPage: mockAddPage,
        setFontSize: mockSetFontSize,
        setFont: mockSetFont,
        setTextColor: mockSetTextColor,
        splitTextToSize: mockSplitTextToSize,
        setDrawColor: mockSetDrawColor,
        line: mockLine,
        setLineWidth: mockSetLineWidth,
        internal: { pageSize: { width: 210, height: 297 } },
        lastAutoTable: {} // No finalY
      } as any));
      const data: GeneralLPOData = {};
      expect(() => generateGeneralLPOPDF(data)).not.toThrow();
    });
  });
});
