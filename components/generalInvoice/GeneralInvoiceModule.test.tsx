import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { expect, test, describe, vi, beforeEach, afterEach } from 'vitest';
import GeneralInvoiceModule from './GeneralInvoiceModule';
import * as pdfService from '../../services/generalInvoicePdfService';
import { ToastProvider } from '../shared/ToastContext';

vi.mock('../../services/generalInvoicePdfService', () => ({
  generateGeneralInvoicePDF: vi.fn(),
}));

const Wrapper = () => (
  <ToastProvider>
    <GeneralInvoiceModule onNavigateHome={vi.fn()} />
  </ToastProvider>
);

describe('GeneralInvoiceModule', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });
  
  afterEach(() => {
    document.body.innerHTML = '';
  });

  test('renders and uses initial state', () => {
    render(<Wrapper />);
    expect(screen.getByText('General Invoice')).toBeInTheDocument();
  });

  test('loads from localStorage if fresh', () => {
    const freshData = {
      timestamp: Date.now(),
      data: {
        companyName: 'Saved Company',
        customer: { name: 'Saved Customer' },
        items: [], payments: [], creditNotes: [], recurring: {}
      }
    };
    localStorage.setItem('ordris_general_invoice_v1', JSON.stringify(freshData));
    
    render(<Wrapper />);
    expect(screen.getByDisplayValue('Saved Company')).toBeInTheDocument();
  });

  test('ignores localStorage if expired', () => {
    const oldData = {
      timestamp: Date.now() - 10 * 24 * 60 * 60 * 1000, // 10 days ago
      data: {
        companyName: 'Old Company',
        customer: { name: '' },
        items: [], payments: [], creditNotes: [], recurring: {}
      }
    };
    localStorage.setItem('ordris_general_invoice_v1', JSON.stringify(oldData));
    
    render(<Wrapper />);
    expect(screen.queryByDisplayValue('Old Company')).not.toBeInTheDocument();
  });

  test('ignores localStorage if missing timestamp', () => {
    const dataWithoutTimestamp = {
      data: {
        companyName: 'No Timestamp Company',
        customer: { name: '' },
        items: [], payments: [], creditNotes: [], recurring: {}
      }
    };
    localStorage.setItem('ordris_general_invoice_v1', JSON.stringify(dataWithoutTimestamp));
    
    render(<Wrapper />);
    expect(screen.queryByDisplayValue('No Timestamp Company')).not.toBeInTheDocument();
  });

  test('handles malformed localStorage gracefully', () => {
    localStorage.setItem('ordris_general_invoice_v1', 'invalid json');
    render(<Wrapper />);
    expect(screen.getByText('General Invoice')).toBeInTheDocument();
  });

  test('resets form', () => {
    render(<Wrapper />);
    const company = screen.getByPlaceholderText('e.g. Acme Corp');
    fireEvent.change(company, { target: { value: 'To Be Reset' } });
    
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const resetBtn = screen.getByText('Reset');
    fireEvent.click(resetBtn);
    
    expect(company).toHaveValue('');
  });

  test('cancels reset form', () => {
    render(<Wrapper />);
    const company = screen.getByPlaceholderText('e.g. Acme Corp');
    fireEvent.change(company, { target: { value: 'To Be Reset' } });
    
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    const resetBtn = screen.getByText('Reset');
    fireEvent.click(resetBtn);
    
    expect(company).toHaveValue('To Be Reset');
  });

  test('exports JSON', () => {
    render(<Wrapper />);
    
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    const exportBtn = screen.getByText('Export');
    fireEvent.click(exportBtn);

    expect(clickSpy).toHaveBeenCalled();
    clickSpy.mockRestore();
  });

  test('imports JSON', async () => {
    render(<Wrapper />);
    
    const file = new File([JSON.stringify({ companyName: 'Imported Company' })], 'test.json', { type: 'application/json' });
    const importInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    
    fireEvent.change(importInput, { target: { files: [file] } });
    
    await waitFor(() => {
      expect(screen.getByDisplayValue('Imported Company')).toBeInTheDocument();
    });
  });

  test('handles invalid JSON import', async () => {
    render(<Wrapper />);

    const file = new File(['invalid json'], 'test.json', { type: 'application/json' });
    const importInput = document.querySelector('input[type="file"]') as HTMLInputElement;

    fireEvent.change(importInput, { target: { files: [file] } });

    // Toast should show the standardized error message (services/dataUtils)
    await waitFor(() => {
      expect(screen.getByText('Invalid JSON file.')).toBeInTheDocument();
    });
  });

  test('rejects structurally invalid imports (non-object payloads)', async () => {
    render(<Wrapper />);

    const file = new File(['"just a string"'], 'test.json', { type: 'application/json' });
    const importInput = document.querySelector('input[type="file"]') as HTMLInputElement;

    fireEvent.change(importInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText('Invalid data file format.')).toBeInTheDocument();
    });
  });

  test('repairs malformed item data during import instead of crashing', async () => {
    render(<Wrapper />);

    const corruptPayload = {
      companyName: 'Acme',
      customer: { name: 'Cust' },
      items: [
        { description: 'Broken', quantity: 'not-a-number', unitPrice: null, taxRate: 'abc' },
        'junk-entry',
        { description: 'Valid', quantity: 2, unitPrice: 10, taxRate: 5, discount: 0 },
      ],
      payments: 'not-an-array',
      creditNotes: [{ amount: -5, reason: 'x' }],
    };
    const file = new File([JSON.stringify(corruptPayload)], 'corrupt.json', { type: 'application/json' });
    const importInput = document.querySelector('input[type="file"]') as HTMLInputElement;

    fireEvent.change(importInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText(/Data imported successfully/i)).toBeInTheDocument();
    });
    // The two salvageable items survive; totals render without crashing
    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Valid')).toBeInTheDocument();
  });

  test('ignores empty file selection', () => {
    render(<Wrapper />);
    const importInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(importInput, { target: { files: [] } });
    expect(screen.getByText('General Invoice')).toBeInTheDocument();
  });

  test('validates before generating PDF', () => {
    render(<Wrapper />);
    const generateBtn = screen.getAllByRole('button').find(b => b.textContent?.includes('Generate PDF') && !b.className.includes('fab'));
    
    // Missing company name
    fireEvent.click(generateBtn!);
    expect(screen.getByText('Company Name is required.')).toBeInTheDocument();

    const company = screen.getByPlaceholderText('e.g. Acme Corp');
    fireEvent.change(company, { target: { value: 'Valid Company' } });

    // Missing customer name
    fireEvent.click(generateBtn!);
    expect(screen.getByText('Customer Name is required.')).toBeInTheDocument();

    const customer = screen.getByPlaceholderText('John Doe or Company Ltd');
    fireEvent.change(customer, { target: { value: 'Valid Customer' } });

    // Missing item
    fireEvent.click(generateBtn!);
    expect(screen.getByText('At least one item is required.')).toBeInTheDocument();

    // Add item
    fireEvent.click(screen.getByText('Add Item'));

    // Should succeed
    fireEvent.click(generateBtn!);
    expect(pdfService.generateGeneralInvoicePDF).toHaveBeenCalled();
  });

  test('generates PDF from FAB button', () => {
    render(<Wrapper />);
    
    const company = screen.getByPlaceholderText('e.g. Acme Corp');
    fireEvent.change(company, { target: { value: 'Valid Company' } });
    const customer = screen.getByPlaceholderText('John Doe or Company Ltd');
    fireEvent.change(customer, { target: { value: 'Valid Customer' } });
    fireEvent.click(screen.getByText('Add Item'));

    const fabBtn = document.querySelector('.fab') as HTMLButtonElement;
    fireEvent.click(fabBtn);
    expect(pdfService.generateGeneralInvoicePDF).toHaveBeenCalled();
  });

  test('handles PDF generation error', () => {
    vi.spyOn(pdfService, 'generateGeneralInvoicePDF').mockImplementation(() => {
      throw new Error('PDF generation failed');
    });

    render(<Wrapper />);

    const company = screen.getByPlaceholderText('e.g. Acme Corp');
    fireEvent.change(company, { target: { value: 'Valid Company' } });
    const customer = screen.getByPlaceholderText('John Doe or Company Ltd');
    fireEvent.change(customer, { target: { value: 'Valid Customer' } });
    fireEvent.click(screen.getByText('Add Item'));

    const generateBtn = screen.getAllByRole('button').find(b => b.textContent?.includes('Generate PDF') && !b.className.includes('fab'));
    fireEvent.click(generateBtn!);

    expect(screen.getByText('An error occurred while generating PDF.')).toBeInTheDocument();
  });

  test('shows a warning toast when localStorage quota is exceeded (regression)', async () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(<Wrapper />);

    const company = screen.getByPlaceholderText('e.g. Acme Corp');
    fireEvent.change(company, { target: { value: 'Unsaved Co' } });

    await waitFor(() => {
      expect(screen.getAllByText(/Changes could not be saved locally/i).length).toBeGreaterThan(0);
    });

    setItemSpy.mockRestore();
    consoleSpy.mockRestore();
  });

  test('persists data across simulated reload (persistence round-trip)', () => {
    const first = render(<Wrapper />);
    fireEvent.change(screen.getByPlaceholderText('e.g. Acme Corp'), { target: { value: 'RoundTrip Co' } });
    first.unmount();

    // Simulate remount reading from storage
    render(<Wrapper />);
    expect(screen.getByDisplayValue('RoundTrip Co')).toBeInTheDocument();
  });
});
