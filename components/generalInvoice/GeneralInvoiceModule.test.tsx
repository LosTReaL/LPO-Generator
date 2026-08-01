import React from 'react';
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
    
    // Toast should show error
    await waitFor(() => {
      expect(screen.getByText('Failed to parse JSON file.')).toBeInTheDocument();
    });
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
});
