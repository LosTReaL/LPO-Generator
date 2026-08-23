import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { expect, test, describe, vi, beforeEach, afterEach } from 'vitest';
import HotelLPOModule from './HotelLPOModule';
import { ToastProvider } from './shared/ToastContext';
import { INITIAL_PDF_OPTIONS } from '../types';

// Mock dependencies
vi.mock('../services/pdfService', () => ({
  generateLPOPDF: vi.fn()
}));

const renderWithToast = (ui: React.ReactElement) => {
  return render(<ToastProvider>{ui}</ToastProvider>);
};

describe('HotelLPOModule', () => {
  let mockConfirm: any;
  let mockAlert: any;

  beforeEach(() => {
    localStorage.clear();
    mockConfirm = vi.spyOn(window, 'confirm').mockImplementation(() => true);
    mockAlert = vi.spyOn(window, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    mockConfirm.mockRestore();
    mockAlert.mockRestore();
  });

  test('loads initial data when local storage is empty', async () => {
    renderWithToast(<HotelLPOModule onNavigateHome={vi.fn()} />);
    await waitFor(() => {
      expect(screen.getByText('Hotel LPO')).toBeInTheDocument();
    });
  });

  test('loads valid data from local storage', async () => {
    const validData = {
      timestamp: Date.now(),
      data: {
        hotelName: 'Stored Hotel',
        guests: [{ name: 'Stored Guest', loyaltyNumber: '' }],
        stayRanges: [],
        applicableRates: [],
        pdfOptions: { ...INITIAL_PDF_OPTIONS }
      }
    };
    localStorage.setItem('lpo_generator_data_v1', JSON.stringify(validData));

    renderWithToast(<HotelLPOModule onNavigateHome={vi.fn()} />);
    
    await waitFor(() => {
      const input = screen.getByPlaceholderText('e.g. Atlantis') as HTMLInputElement;
      expect(input.value).toBe('Stored Hotel');
    });
  });

  test('handles expired data in local storage', async () => {
    const expiredData = {
      timestamp: Date.now() - (8 * 24 * 60 * 60 * 1000), // 8 days old
      data: {
        hotelName: 'Expired Hotel',
        guests: [{ name: 'Expired Guest', loyaltyNumber: '' }],
        stayRanges: [],
        applicableRates: [],
        pdfOptions: { ...INITIAL_PDF_OPTIONS }
      }
    };
    localStorage.setItem('lpo_generator_data_v1', JSON.stringify(expiredData));

    renderWithToast(<HotelLPOModule onNavigateHome={vi.fn()} />);
    
    await waitFor(() => {
      const input = screen.getByPlaceholderText('e.g. Atlantis') as HTMLInputElement;
      expect(input.value).not.toBe('Expired Hotel'); 
    });
  });

  test('handles malformed JSON in local storage', async () => {
    localStorage.setItem('lpo_generator_data_v1', 'invalid json');
    renderWithToast(<HotelLPOModule onNavigateHome={vi.fn()} />);
    await waitFor(() => {
      expect(screen.getByText('Hotel LPO')).toBeInTheDocument();
    });
  });

  test('handles legacy hydration format', async () => {
    const legacyData = {
      timestamp: Date.now(),
      data: {
        hotelName: 'Legacy Hotel',
        childCount: 2,
        childAges: [5], // Should be padded to [5, 0]
        showCompanyBillTo: true, // Legacy flat option
        stayRanges: [{ start: '2026-08-01', end: '2026-08-03' }],
        guests: ['Legacy Guest'] // Legacy string guest
      }
    };
    localStorage.setItem('lpo_generator_data_v1', JSON.stringify(legacyData));

    renderWithToast(<HotelLPOModule onNavigateHome={vi.fn()} />);
    await waitFor(() => {
      const input = screen.getByPlaceholderText('e.g. Atlantis') as HTMLInputElement;
      expect(input.value).toBe('Legacy Hotel');
    });
  });

  test('handles reset functionality', async () => {
    renderWithToast(<HotelLPOModule onNavigateHome={vi.fn()} />);
    
    let hotelInput: HTMLInputElement;
    await waitFor(() => {
      hotelInput = screen.getByPlaceholderText('e.g. Atlantis') as HTMLInputElement;
      expect(hotelInput).toBeInTheDocument();
    });
    
    fireEvent.change(hotelInput!, { target: { value: 'Test Hotel Reset' } });
    
    const resetBtn = screen.getByTitle('Reset Form');
    fireEvent.click(resetBtn);
    
    expect(mockConfirm).toHaveBeenCalled();
    await waitFor(() => {
      const inputAfter = screen.getByPlaceholderText('e.g. Atlantis') as HTMLInputElement;
      expect(inputAfter.value).toBe('');
    });
  });

  test('validates required fields before generating PDF', async () => {
    renderWithToast(<HotelLPOModule onNavigateHome={vi.fn()} />);
    
    let genBtns: HTMLElement[];
    await waitFor(() => {
      genBtns = screen.getAllByTitle(/Generate PDF/i);
      expect(genBtns.length).toBeGreaterThan(0);
    });
    
    fireEvent.click(genBtns![0]);
    
    await waitFor(() => {
      const toast = screen.getByText(/Validation failed/i);
      expect(toast).toBeInTheDocument();
    });
  });

  test('generates PDF when validation passes', async () => {
    const validData = {
      timestamp: Date.now(),
      data: {
        hotelName: 'Valid Hotel',
        guests: [{ name: 'Valid Guest' }],
        stayRanges: [{ start: '2026-08-01', end: '2026-08-03', nights: 2 }],
        applicableRates: [
          { start: '2026-08-01', end: '2026-08-03', amount: 100 }
        ],
        pdfOptions: { ...INITIAL_PDF_OPTIONS }
      }
    };
    localStorage.setItem('lpo_generator_data_v1', JSON.stringify(validData));

    renderWithToast(<HotelLPOModule onNavigateHome={vi.fn()} />);
    
    let genBtns: HTMLElement[];
    await waitFor(() => {
      genBtns = screen.getAllByTitle(/Generate PDF/i);
      expect(genBtns.length).toBeGreaterThan(0);
    });
    
    fireEvent.click(genBtns![0]);
    
    await waitFor(async () => {
      const { generateLPOPDF } = await import('../services/pdfService');
      expect(generateLPOPDF).toHaveBeenCalled();
    });
  });

  test('generates PDF with warnings', async () => {
    const validData = {
      timestamp: Date.now(),
      data: {
        hotelName: 'Valid Hotel',
        guests: [{ name: 'Valid Guest' }],
        stayRanges: [{ start: '2026-08-01', end: '2026-08-03', nights: 2 }],
        applicableRates: [], 
        pdfOptions: { ...INITIAL_PDF_OPTIONS }
      }
    };
    localStorage.setItem('lpo_generator_data_v1', JSON.stringify(validData));

    renderWithToast(<HotelLPOModule onNavigateHome={vi.fn()} />);
    
    let genBtns: HTMLElement[];
    await waitFor(() => {
      genBtns = screen.getAllByTitle(/Generate PDF/i);
      expect(genBtns.length).toBeGreaterThan(0);
    });
    
    fireEvent.click(genBtns![0]);
    
    await waitFor(async () => {
      expect(mockConfirm).toHaveBeenCalled();
      const { generateLPOPDF } = await import('../services/pdfService');
      expect(generateLPOPDF).toHaveBeenCalled();
    });
  });

  test('validates rate overlap', async () => {
    const overlappingData = {
      timestamp: Date.now(),
      data: {
        hotelName: 'Valid Hotel',
        guests: [{ name: 'Valid Guest' }],
        stayRanges: [{ start: '2026-08-01', end: '2026-08-03', nights: 2 }],
        applicableRates: [
          { start: '2026-08-01', end: '2026-08-05', amount: 100 },
          { start: '2026-08-04', end: '2026-08-10', amount: 200 }
        ],
        pdfOptions: { ...INITIAL_PDF_OPTIONS }
      }
    };
    localStorage.setItem('lpo_generator_data_v1', JSON.stringify(overlappingData));

    renderWithToast(<HotelLPOModule onNavigateHome={vi.fn()} />);
    
    let genBtns: HTMLElement[];
    await waitFor(() => {
      genBtns = screen.getAllByTitle(/Generate PDF/i);
      expect(genBtns.length).toBeGreaterThan(0);
    });
    
    fireEvent.click(genBtns![0]);
    
    await waitFor(() => {
      const toast = screen.getByText(/Validation failed/i);
      expect(toast).toBeInTheDocument();
    });
  });

  test('handles Export Data', async () => {
    const createObjectUrlMock = vi.fn(() => 'blob:test-url');
    const revokeObjectUrlMock = vi.fn();
    window.URL.createObjectURL = createObjectUrlMock;
    window.URL.revokeObjectURL = revokeObjectUrlMock;

    renderWithToast(<HotelLPOModule onNavigateHome={vi.fn()} />);
    
    let exportBtn: HTMLElement;
    await waitFor(() => {
      exportBtn = screen.getByTitle('Export Data');
      expect(exportBtn).toBeInTheDocument();
    });
    
    fireEvent.click(exportBtn!);
    
    expect(createObjectUrlMock).toHaveBeenCalled();
  });

  test('handles Import Data', async () => {
    renderWithToast(<HotelLPOModule onNavigateHome={vi.fn()} />);
    
    let importBtn: HTMLElement;
    await waitFor(() => {
      importBtn = screen.getByTitle('Import Data');
      expect(importBtn).toBeInTheDocument();
    });
    
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.click(importBtn!);
    
    const validJson = JSON.stringify({
      hotelName: 'Imported Hotel',
      guests: [{ name: 'Imported Guest' }]
    });
    
    const file = new File([validJson], 'data.json', { type: 'application/json' });
    fireEvent.change(fileInput, { target: { files: [file] } });
    
    await waitFor(() => {
      const input = screen.getByPlaceholderText('e.g. Atlantis') as HTMLInputElement;
      expect(input.value).toBe('Imported Hotel');
    });
  });

  test('handles Invalid Import Data', async () => {
    renderWithToast(<HotelLPOModule onNavigateHome={vi.fn()} />);

    let fileInput: HTMLInputElement;
    await waitFor(() => {
      fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      expect(fileInput).toBeInTheDocument();
    });

    const file = new File(['invalid json'], 'data.json', { type: 'application/json' });
    fireEvent.change(fileInput!, { target: { files: [file] } });

    await waitFor(() => {
      // Standardized error message shared by all modules (services/dataUtils)
      const errorText = screen.getByText('Invalid JSON file.');
      expect(errorText).toBeInTheDocument();
    });
  });

  test('rejects oversized import files', async () => {
    renderWithToast(<HotelLPOModule onNavigateHome={vi.fn()} />);

    let fileInput: HTMLInputElement;
    await waitFor(() => {
      fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      expect(fileInput).toBeInTheDocument();
    });

    const bigFile = new File(['"x"'], 'big.json', { type: 'application/json' });
    Object.defineProperty(bigFile, 'size', { value: 3 * 1024 * 1024 });
    fireEvent.change(fileInput!, { target: { files: [bigFile] } });

    await waitFor(() => {
      expect(screen.getByText(/File is too large to import/i)).toBeInTheDocument();
    });
  });
});
