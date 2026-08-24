import React, { useState, useEffect, useRef } from 'react';
import { Download, RotateCcw, Upload, CheckCircle } from 'lucide-react';
import { GeneralInvoiceForm } from './GeneralInvoiceForm';
import { generateGeneralInvoicePDF } from '../../services/generalInvoicePdfService';
import { GeneralInvoiceData, INITIAL_GENERAL_INVOICE } from '../../types/generalInvoice';
import { normalizeGeneralInvoiceData, parseImportPayload } from '../../services/dataUtils';
import { ModuleHeader } from '../shared/SharedUI';
import { useToast } from '../shared/ToastContext';

const STORAGE_KEY = 'ordris_general_invoice_v1';
const EXPIRY_DAYS = 7;

// Factory instead of sharing the INITIAL_* constant by reference: a stray
// in-place mutation would otherwise poison every future reset.
const getInitialData = (): GeneralInvoiceData =>
  JSON.parse(JSON.stringify(INITIAL_GENERAL_INVOICE)) as GeneralInvoiceData;

interface Props {
  onNavigateHome: () => void;
}

export default function GeneralInvoiceModule({ onNavigateHome }: Props) {
  const { addToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [data, setData] = useState<GeneralInvoiceData>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.timestamp) {
          const age = Date.now() - parsed.timestamp;
          if (age < EXPIRY_DAYS * 24 * 60 * 60 * 1000) {
            return normalizeGeneralInvoiceData(parsed.data ?? {});
          }
        }
      }
    } catch (e) {
      console.error('Failed to load general invoice data from storage:', e);
    }
    return getInitialData();
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        timestamp: Date.now(),
        data
      }));
    } catch (e) {
      console.error('Failed to save general invoice data to storage:', e);
      addToast('Changes could not be saved locally (storage full or unavailable).', 'warning');
    }
  }, [data, addToast]);

  const handleReset = () => {
    if (window.confirm('Are you sure you want to reset the invoice? All unsaved data will be lost.')) {
      setData(getInitialData());
      addToast('Form has been reset.', 'info');
    }
  };

  const handleExportJSON = () => {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `general_invoice_${data.invoiceNumber || 'draft'}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    addToast('Data exported successfully.', 'success');
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = parseImportPayload(String(event.target?.result ?? ''));
      if (!result.ok || !result.data) {
        addToast(result.error ?? 'Failed to parse JSON file.', 'error');
      } else {
        setData(normalizeGeneralInvoiceData(result.data));
        addToast('Data imported successfully.', 'success');
      }
    };
    reader.onerror = () => addToast('Failed to parse JSON file.', 'error');
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleGeneratePDF = () => {
    if (isGenerating) return;
    if (!data.companyName.trim()) {
      addToast('Company Name is required.', 'error');
      return;
    }
    if (!data.customer.name.trim()) {
      addToast('Customer Name is required.', 'error');
      return;
    }
    if (data.items.length === 0) {
      addToast('At least one item is required.', 'error');
      return;
    }

    setIsGenerating(true);
    try {
      generateGeneralInvoicePDF(data);
      addToast('PDF generated successfully.', 'success');
    } catch (e) {
      addToast('An error occurred while generating PDF.', 'error');
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="app-shell">
      <div className="module-container">
      <ModuleHeader title="General Invoice" onNavigateHome={onNavigateHome}>
        <input 
          type="file" 
          accept=".json" 
          ref={fileInputRef} 
          style={{ display: 'none' }} 
          onChange={handleImportJSON} 
        />
        <button className="btn btn-ghost" onClick={() => fileInputRef.current?.click()} title="Import JSON">
          <Upload size={18} />
          <span className="btn-label">Import</span>
        </button>
        <button className="btn btn-ghost" onClick={handleExportJSON} title="Export JSON">
          <Download size={18} />
          <span className="btn-label">Export</span>
        </button>
        <div className="header-divider"></div>
        <button onClick={handleReset} className="btn btn-danger-ghost" title="Reset Form">
          <RotateCcw size={18} />
          <span className="btn-label">Reset</span>
        </button>
        <button onClick={handleGeneratePDF} className="btn btn-primary" title="Generate PDF" disabled={isGenerating}>
          <CheckCircle size={18} />
          <span className="btn-label">{isGenerating ? 'Generating…' : 'Generate PDF'}</span>
        </button>
      </ModuleHeader>

      <main className="main-content">
        <GeneralInvoiceForm data={data} setData={setData} />
      </main>
      
      <button className="fab" onClick={handleGeneratePDF} title="Generate PDF" aria-label="Generate PDF" disabled={isGenerating}>
        <CheckCircle size={24} />
      </button>
      </div>
    </div>
  );
};
