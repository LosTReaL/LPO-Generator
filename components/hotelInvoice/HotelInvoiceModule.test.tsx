import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import HotelInvoiceModule from './HotelInvoiceModule';
import { INITIAL_HOTEL_INVOICE } from '../../types/generalInvoice';
import { ToastProvider } from '../shared/ToastContext';
import * as pdfService from '../../services/hotelInvoicePdfService';

// Mock dependencies
vi.mock('../../services/hotelInvoicePdfService', () => ({
  generateHotelInvoicePDF: vi.fn(),
}));

describe('HotelInvoiceModule', () => {
  const mockOnNavigateHome = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    // Mock global confirm
    window.confirm = vi.fn();
    // Mock URL.createObjectURL and URL.revokeObjectURL
    window.URL.createObjectURL = vi.fn(() => 'blob:test-url');
    window.URL.revokeObjectURL = vi.fn();
  });

  const renderModule = () => {
    return render(
      <ToastProvider>
        <HotelInvoiceModule onNavigateHome={mockOnNavigateHome} />
      </ToastProvider>
    );
  };

  it('loads valid data from localStorage on mount', () => {
    const validData = {
      ...INITIAL_HOTEL_INVOICE,
      hotelName: 'Stored Hotel'
    };
    localStorage.setItem('ordris_hotel_invoice_v1', JSON.stringify({
      data: validData,
      timestamp: Date.now()
    }));

    renderModule();
    expect(screen.getByDisplayValue('Stored Hotel')).toBeInTheDocument();
  });

  it('ignores expired data from localStorage', () => {
    const expiredData = {
      ...INITIAL_HOTEL_INVOICE,
      hotelName: 'Expired Hotel'
    };
    const eightDaysAgo = Date.now() - 8 * 24 * 60 * 60 * 1000;
    localStorage.setItem('ordris_hotel_invoice_v1', JSON.stringify({
      data: expiredData,
      timestamp: eightDaysAgo
    }));

    renderModule();
    expect(screen.queryByDisplayValue('Expired Hotel')).not.toBeInTheDocument();
    expect(localStorage.getItem('ordris_hotel_invoice_v1')).toContain('""');
  });

  it('handles invalid JSON in localStorage gracefully', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    localStorage.setItem('ordris_hotel_invoice_v1', 'invalid-json');

    renderModule();
    // Should render with INITIAL_HOTEL_INVOICE without crashing
    expect(screen.getByText('Hotel Information')).toBeInTheDocument();
    
    consoleSpy.mockRestore();
  });

  it('saves to localStorage on change', async () => {
    renderModule();
    
    const hotelNameInput = screen.getByPlaceholderText(/e.g. The Grand Continental/i);
    fireEvent.change(hotelNameInput, { target: { value: 'New Hotel Name' } });
    
    await waitFor(() => {
      const stored = localStorage.getItem('ordris_hotel_invoice_v1');
      expect(stored).not.toBeNull();
      const parsed = JSON.parse(stored!);
      expect(parsed.data.hotelName).toBe('New Hotel Name');
    });
  });

  it('handles reset functionality with user confirmation', () => {
    vi.mocked(window.confirm).mockReturnValue(true);
    renderModule();

    // Change something
    const hotelNameInput = screen.getByPlaceholderText(/e.g. The Grand Continental/i);
    fireEvent.change(hotelNameInput, { target: { value: 'Changed Hotel Name' } });

    // Reset
    const resetBtn = screen.getByRole('button', { name: /Reset/i });
    fireEvent.click(resetBtn);

    expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to reset all form data? This cannot be undone.');
    // Should be back to initial (empty)
    expect(screen.queryByDisplayValue('Changed Hotel Name')).not.toBeInTheDocument();
  });

  it('handles reset cancellation', () => {
    vi.mocked(window.confirm).mockReturnValue(false);
    renderModule();

    const hotelNameInput = screen.getByPlaceholderText(/e.g. The Grand Continental/i);
    fireEvent.change(hotelNameInput, { target: { value: 'Kept Hotel Name' } });

    const resetBtn = screen.getByRole('button', { name: /Reset/i });
    fireEvent.click(resetBtn);

    expect(screen.getByDisplayValue('Kept Hotel Name')).toBeInTheDocument();
  });

  it('handles JSON export', () => {
    renderModule();
    
    // Fill something to have non-default export name
    const clickSpy = vi.spyOn(window.HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    const exportBtn = screen.getByRole('button', { name: /Export/i });
    fireEvent.click(exportBtn);

    expect(window.URL.createObjectURL).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
    expect(window.URL.revokeObjectURL).toHaveBeenCalled();

    clickSpy.mockRestore();
  });

  it('handles JSON export with invoice number', () => {
    const data = { ...INITIAL_HOTEL_INVOICE, invoiceNumber: 'INV-123' };
    localStorage.setItem('ordris_hotel_invoice_v1', JSON.stringify({ data, timestamp: Date.now() }));
    
    renderModule();
    
    const clickSpy = vi.spyOn(window.HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const exportBtn = screen.getByRole('button', { name: /Export/i });
    fireEvent.click(exportBtn);

    expect(window.URL.createObjectURL).toHaveBeenCalled();
    clickSpy.mockRestore();
  });

  it('handles JSON import successfully', async () => {
    renderModule();
    
    const validData = { ...INITIAL_HOTEL_INVOICE, hotelName: 'Imported Hotel' };
    const file = new File([JSON.stringify(validData)], 'invoice.json', { type: 'application/json' });
    
    // We can't easily mock FileReader asynchronously in a simple way, let's mock it fully
    const mockFileReader = {
      readAsText: vi.fn(),
      onload: null as any
    };
    window.FileReader = vi.fn(() => mockFileReader) as any;

    const importInput = document.querySelector('input#import-json') as HTMLInputElement;
    fireEvent.change(importInput, { target: { files: [file] } });

    expect(mockFileReader.readAsText).toHaveBeenCalledWith(file);
    
    // Trigger onload
    if (mockFileReader.onload) {
      mockFileReader.onload({ target: { result: JSON.stringify(validData) } } as any);
    }
    
    await waitFor(() => {
      expect(screen.getByDisplayValue('Imported Hotel')).toBeInTheDocument();
    });
  });

  it('handles invalid JSON import gracefully (not an object)', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    renderModule();
    
    const file = new File(['"just a string"'], 'invalid.json', { type: 'application/json' });
    
    const mockFileReader = {
      readAsText: vi.fn(),
      onload: null as any
    };
    window.FileReader = vi.fn(() => mockFileReader) as any;

    const importInput = document.querySelector('input#import-json') as HTMLInputElement;
    fireEvent.change(importInput, { target: { files: [file] } });

    if (mockFileReader.onload) {
      mockFileReader.onload({ target: { result: '"just a string"' } } as any);
    }

    // It should log an error and toast
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
  
  it('handles invalid JSON import gracefully (parse error)', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    renderModule();
    
    const file = new File(['bad json {'], 'invalid.json', { type: 'application/json' });
    
    const mockFileReader = {
      readAsText: vi.fn(),
      onload: null as any
    };
    window.FileReader = vi.fn(() => mockFileReader) as any;

    const importInput = document.querySelector('input#import-json') as HTMLInputElement;
    fireEvent.change(importInput, { target: { files: [file] } });

    if (mockFileReader.onload) {
      mockFileReader.onload({ target: { result: 'bad json {' } } as any);
    }

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
  
  it('handles import without file gracefully', async () => {
    renderModule();
    const importInput = document.querySelector('input#import-json') as HTMLInputElement;
    fireEvent.change(importInput, { target: { files: [] } }); // No file
    // Nothing should crash
  });

  it('validates before generating PDF (missing hotel name)', () => {
    renderModule();
    
    const generateBtn = screen.getAllByTitle('Generate PDF')[0] || screen.getAllByRole('button', { name: /Generate PDF/i })[0];
    fireEvent.click(generateBtn);

    // Toast error should occur, generatePDF should not be called
    expect(pdfService.generateHotelInvoicePDF).not.toHaveBeenCalled();
  });

  it('validates before generating PDF (missing guest name)', () => {
    renderModule();
    
    const hotelNameInput = screen.getByPlaceholderText(/e.g. The Grand Continental/i);
    fireEvent.change(hotelNameInput, { target: { value: 'Test Hotel' } });
    
    const generateBtn = screen.getAllByRole('button', { name: /Generate PDF/i })[0];
    fireEvent.click(generateBtn);

    expect(pdfService.generateHotelInvoicePDF).not.toHaveBeenCalled();
  });

  it('validates before generating PDF (missing line items)', () => {
    renderModule();
    
    const hotelNameInput = screen.getByPlaceholderText(/e.g. The Grand Continental/i);
    fireEvent.change(hotelNameInput, { target: { value: 'Test Hotel' } });

    const guestNameInput = screen.getByPlaceholderText(/John Doe/i);
    fireEvent.change(guestNameInput, { target: { value: 'John Guest' } });

    const generateBtn = screen.getAllByRole('button', { name: /Generate PDF/i })[0];
    fireEvent.click(generateBtn);

    expect(pdfService.generateHotelInvoicePDF).not.toHaveBeenCalled();
  });

  it('successfully generates PDF', () => {
    renderModule();
    
    const hotelNameInput = screen.getByPlaceholderText(/e.g. The Grand Continental/i);
    fireEvent.change(hotelNameInput, { target: { value: 'Test Hotel' } });

    const guestNameInput = screen.getByPlaceholderText(/John Doe/i);
    fireEvent.change(guestNameInput, { target: { value: 'John Guest' } });

    const addChargeBtn = screen.getByText(/Add Charge/i);
    fireEvent.click(addChargeBtn);

    const generateBtn = screen.getAllByRole('button', { name: /Generate PDF/i })[0];
    fireEvent.click(generateBtn);

    expect(pdfService.generateHotelInvoicePDF).toHaveBeenCalled();
  });

  it('handles PDF generation error gracefully', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(pdfService.generateHotelInvoicePDF).mockImplementationOnce(() => {
      throw new Error('PDF Error');
    });

    renderModule();
    
    const hotelNameInput = screen.getByPlaceholderText(/e.g. The Grand Continental/i);
    fireEvent.change(hotelNameInput, { target: { value: 'Test Hotel' } });

    const guestNameInput = screen.getByPlaceholderText(/John Doe/i);
    fireEvent.change(guestNameInput, { target: { value: 'John Guest' } });

    const addChargeBtn = screen.getByText(/Add Charge/i);
    fireEvent.click(addChargeBtn);

    const generateBtn = screen.getAllByRole('button', { name: /Generate PDF/i })[0];
    fireEvent.click(generateBtn);

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
