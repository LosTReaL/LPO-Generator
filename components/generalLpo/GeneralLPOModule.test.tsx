import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import GeneralLPOModule from './GeneralLPOModule';
import { generateGeneralLPOPDF } from '../../services/generalLpoPdfService';

vi.mock('../../services/generalLpoPdfService', () => ({
  generateGeneralLPOPDF: vi.fn(),
}));

// Mock ToastContext
const mockAddToast = vi.fn();
vi.mock('../shared/ToastContext', () => ({
  useToast: () => ({ addToast: mockAddToast })
}));

describe('GeneralLPOModule', () => {
  const mockNavigateHome = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders and initializes with default data', () => {
    render(<GeneralLPOModule onNavigateHome={mockNavigateHome} />);
    expect(screen.getByText('General LPO')).toBeInTheDocument();
  });

  it('loads valid data from localStorage', () => {
    const validData = {
      companyInfo: { name: 'Saved Company' }
    };
    localStorage.setItem('ordris_general_lpo_v1', JSON.stringify({
      data: validData,
      _timestamp: new Date().getTime()
    }));
    
    render(<GeneralLPOModule onNavigateHome={mockNavigateHome} />);
    expect(screen.getByDisplayValue('Saved Company')).toBeInTheDocument();
  });

  it('ignores expired data from localStorage', () => {
    const expiredData = {
      companyInfo: { name: 'Expired Company' }
    };
    localStorage.setItem('ordris_general_lpo_v1', JSON.stringify({
      data: expiredData,
      _timestamp: new Date().getTime() - (8 * 24 * 60 * 60 * 1000) // 8 days ago
    }));
    
    render(<GeneralLPOModule onNavigateHome={mockNavigateHome} />);
    expect(screen.queryByDisplayValue('Expired Company')).not.toBeInTheDocument();
    expect(localStorage.getItem('ordris_general_lpo_v1')).toBeNull();
  });

  it('handles invalid json in localStorage gracefully', () => {
    localStorage.setItem('ordris_general_lpo_v1', 'invalid json');
    render(<GeneralLPOModule onNavigateHome={mockNavigateHome} />);
  });

  it('saves to localStorage on data change (debounced)', async () => {
    vi.useFakeTimers();
    render(<GeneralLPOModule onNavigateHome={mockNavigateHome} />);
    
    const companyInput = screen.getByPlaceholderText('Enter company name');
    fireEvent.change(companyInput, { target: { value: 'New Company' } });
    
    act(() => {
      vi.advanceTimersByTime(1100);
    });
    
    const stored = JSON.parse(localStorage.getItem('ordris_general_lpo_v1') || '{}');
    expect(stored.data.companyInfo.name).toBe('New Company');
    
    vi.useRealTimers();
  });

  it('handles error when saving to localStorage', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Storage error');
    });
    vi.useFakeTimers();
    render(<GeneralLPOModule onNavigateHome={mockNavigateHome} />);
    
    const companyInput = screen.getByPlaceholderText('Enter company name');
    fireEvent.change(companyInput, { target: { value: 'Company Error Test' } });
    
    act(() => {
      vi.advanceTimersByTime(1100);
    });
    
    expect(consoleSpy).toHaveBeenCalledWith('Failed to save LPO data to localStorage', expect.any(Error));
    
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('handles Import valid JSON', () => {
    render(<GeneralLPOModule onNavigateHome={mockNavigateHome} />);
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['{"companyInfo":{"name":"Imported Company"}}'], 'data.json', { type: 'application/json' });
    
    const readAsTextMock = vi.fn(function(this: any) {
      if (this.onload) {
        this.onload({ target: { result: '{"companyInfo":{"name":"Imported Company"}}' } });
      }
    });
    vi.spyOn(window, 'FileReader').mockImplementation(() => ({
      readAsText: readAsTextMock,
      onload: null,
      onerror: null,
      abort: vi.fn(),
      readyState: 1,
      result: null,
      error: null,
      DONE: 2,
      EMPTY: 0,
      LOADING: 1,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    } as unknown as FileReader));

    fireEvent.change(fileInput, { target: { files: [file] } });
    expect(mockAddToast).toHaveBeenCalledWith('Data imported successfully.', 'success');
  });

  it('handles Import invalid JSON structure (not an object)', () => {
    render(<GeneralLPOModule onNavigateHome={mockNavigateHome} />);
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['"just a string"'], 'data.json', { type: 'application/json' });
    
    const readAsTextMock = vi.fn(function(this: any) {
      if (this.onload) {
        this.onload({ target: { result: '"just a string"' } });
      }
    });
    vi.spyOn(window, 'FileReader').mockImplementation(() => ({
      readAsText: readAsTextMock,
      onload: null,
    } as unknown as FileReader));

    fireEvent.change(fileInput, { target: { files: [file] } });
    expect(mockAddToast).toHaveBeenCalledWith('Invalid data file format.', 'error');
  });

  it('handles Import malformed JSON', () => {
    render(<GeneralLPOModule onNavigateHome={mockNavigateHome} />);
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['{ malformed'], 'data.json', { type: 'application/json' });
    
    const readAsTextMock = vi.fn(function(this: any) {
      if (this.onload) {
        this.onload({ target: { result: '{ malformed' } });
      }
    });
    vi.spyOn(window, 'FileReader').mockImplementation(() => ({
      readAsText: readAsTextMock,
      onload: null,
    } as unknown as FileReader));

    fireEvent.change(fileInput, { target: { files: [file] } });
    expect(mockAddToast).toHaveBeenCalledWith('Invalid JSON file.', 'error');
  });

  it('handles Import empty file selection', () => {
    render(<GeneralLPOModule onNavigateHome={mockNavigateHome} />);
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [] } });
    // Shouldn't do anything
    expect(mockAddToast).not.toHaveBeenCalled();
  });

  it('handles Reset form data', () => {
    render(<GeneralLPOModule onNavigateHome={mockNavigateHome} />);
    
    window.confirm = vi.fn().mockReturnValue(true);
    
    const companyInput = screen.getByPlaceholderText('Enter company name');
    fireEvent.change(companyInput, { target: { value: 'Temp Company' } });
    
    const resetButton = screen.getByTitle('Reset Form');
    fireEvent.click(resetButton);
    
    expect(window.confirm).toHaveBeenCalled();
    expect(companyInput).toHaveValue(''); // Reset back to empty
    expect(mockAddToast).toHaveBeenCalledWith('Form has been reset.', 'info');
  });
  
  it('handles Reset form data cancellation', () => {
    render(<GeneralLPOModule onNavigateHome={mockNavigateHome} />);
    
    window.confirm = vi.fn().mockReturnValue(false);
    
    const companyInput = screen.getByPlaceholderText('Enter company name');
    fireEvent.change(companyInput, { target: { value: 'Temp Company' } });
    
    const resetButton = screen.getByTitle('Reset Form');
    fireEvent.click(resetButton);
    
    expect(companyInput).toHaveValue('Temp Company'); // Not reset
  });

  it('handles Export data', () => {
    render(<GeneralLPOModule onNavigateHome={mockNavigateHome} />);
    
    const createObjURL = vi.fn();
    const revokeObjURL = vi.fn();
    URL.createObjectURL = createObjURL;
    URL.revokeObjectURL = revokeObjURL;
    
    const exportButton = screen.getByTitle('Export JSON');
    fireEvent.click(exportButton);
    
    expect(createObjURL).toHaveBeenCalled();
    expect(mockAddToast).toHaveBeenCalledWith('Data exported successfully.', 'success');
  });

  it('validates Generate PDF (missing company name)', () => {
    render(<GeneralLPOModule onNavigateHome={mockNavigateHome} />);
    
    const genButton = screen.getAllByTitle('Generate PDF')[0] || screen.getByText(/Generate PDF/);
    fireEvent.click(genButton);
    
    expect(mockAddToast).toHaveBeenCalledWith('Company Name is required.', 'error');
  });
  
  it('validates Generate PDF (missing items)', () => {
    render(<GeneralLPOModule onNavigateHome={mockNavigateHome} />);
    
    const companyInput = screen.getByPlaceholderText('Enter company name');
    fireEvent.change(companyInput, { target: { value: 'Test Company' } });
    
    const genButton = screen.getAllByText(/Generate PDF/)[0];
    fireEvent.click(genButton);
    
    expect(mockAddToast).toHaveBeenCalledWith('At least one line item is required.', 'error');
  });

  it('calls generate PDF successfully', () => {
    render(<GeneralLPOModule onNavigateHome={mockNavigateHome} />);
    
    const companyInput = screen.getByPlaceholderText('Enter company name');
    fireEvent.change(companyInput, { target: { value: 'Test Company' } });
    
    const addButton = screen.getByText('Add Item');
    fireEvent.click(addButton);
    
    const genButton = screen.getAllByText(/Generate PDF/)[0];
    fireEvent.click(genButton);
    
    expect(generateGeneralLPOPDF).toHaveBeenCalled();
    expect(mockAddToast).toHaveBeenCalledWith('PDF generated successfully.', 'success');
  });

  it('handles error in generate PDF', () => {
    vi.mocked(generateGeneralLPOPDF).mockImplementationOnce(() => {
      throw new Error('PDF Error');
    });
    
    render(<GeneralLPOModule onNavigateHome={mockNavigateHome} />);
    
    const companyInput = screen.getByPlaceholderText('Enter company name');
    fireEvent.change(companyInput, { target: { value: 'Test Company' } });
    
    const addButton = screen.getByText('Add Item');
    fireEvent.click(addButton);
    
    const genButton = screen.getAllByText(/Generate PDF/)[0];
    fireEvent.click(genButton);
    
    expect(mockAddToast).toHaveBeenCalledWith('An error occurred while generating PDF.', 'error');
  });

  it('unmounts and cleans up timeout', () => {
    const { unmount } = render(<GeneralLPOModule onNavigateHome={mockNavigateHome} />);
    unmount();
  });
});
