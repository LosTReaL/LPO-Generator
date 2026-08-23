import React, { useState, useEffect, useRef } from 'react';
import { Download, Upload, RefreshCw, FileText } from 'lucide-react';
import { HotelInvoiceData, INITIAL_HOTEL_INVOICE } from '../../types/hotelInvoice';
import { HotelInvoiceForm } from './HotelInvoiceForm';
import { generateHotelInvoicePDF } from '../../services/hotelInvoicePdfService';
import { normalizeHotelInvoiceData, parseImportPayload } from '../../services/dataUtils';
import { ModuleHeader } from '../shared/SharedUI';
import { useToast } from '../shared/ToastContext';

const STORAGE_KEY = 'ordris_hotel_invoice_v1';
const EXPIRY_DAYS = 7;

interface StorageData {
  data: HotelInvoiceData;
  timestamp: number;
}

interface Props {
  onNavigateHome: () => void;
}

export default function HotelInvoiceModule({ onNavigateHome }: Props) {
  const [data, setData] = useState<HotelInvoiceData>(INITIAL_HOTEL_INVOICE);
  const [isGenerating, setIsGenerating] = useState(false);
  const { addToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed: StorageData = JSON.parse(saved);
        const ageInDays = (Date.now() - parsed.timestamp) / (1000 * 60 * 60 * 24);
        if (ageInDays < EXPIRY_DAYS) {
          setData(normalizeHotelInvoiceData(parsed.data ?? {}));
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
      } catch (e) {
        console.error("Error loading hotel invoice data:", e);
      }
    }
  }, []);

  // Save to localStorage on change
  useEffect(() => {
    try {
      const storageData: StorageData = {
        data,
        timestamp: Date.now()
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(storageData));
    } catch (e) {
      console.error('Failed to save hotel invoice data:', e);
      addToast('Changes could not be saved locally (storage full or unavailable).', 'warning');
    }
  }, [data, addToast]);

  const handleUpdate = (updates: Partial<HotelInvoiceData>) => {
    setData(prev => ({ ...prev, ...updates }));
  };

  const handleReset = () => {
    if (window.confirm('Are you sure you want to reset all form data? This cannot be undone.')) {
      setData(INITIAL_HOTEL_INVOICE);
      addToast('Form has been reset.', 'info');
    }
  };

  const handleExportJSON = () => {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hotel_invoice_${data.invoiceNumber || 'draft'}.json`;
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
        addToast(result.error ?? 'Invalid JSON file. Could not import data.', 'error');
        console.error(result.error ?? 'Invalid import payload');
      } else {
        setData(normalizeHotelInvoiceData(result.data));
        addToast('Data imported successfully.', 'success');
      }
      if (e.target) e.target.value = '';
    };
    reader.onerror = () => {
      addToast('Invalid JSON file. Could not import data.', 'error');
      if (e.target) e.target.value = '';
    };
    reader.readAsText(file);
  };

  const handleGeneratePDF = () => {
    if (isGenerating) return;
    // Validation
    if (!data.hotelName.trim()) {
      addToast("Hotel Name is required.", "error");
      return;
    }
    if (!data.primaryGuest.name.trim()) {
      addToast("Primary Guest Name is required.", "error");
      return;
    }
    if (data.lineItems.length === 0) {
      addToast("At least one charge line item is required.", "error");
      return;
    }

    setIsGenerating(true);
    try {
      generateHotelInvoicePDF(data);
      addToast("PDF generated successfully.", "success");
    } catch (e) {
      addToast("An error occurred while generating PDF.", "error");
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="app-shell">
      <div className="module-wrapper">
      <ModuleHeader title="Hotel Invoice" onNavigateHome={onNavigateHome}>
        <input 
          id="import-json"
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
          <RefreshCw size={18} />
          <span className="btn-label">Reset</span>
        </button>
        <button onClick={handleGeneratePDF} className="btn btn-primary" title="Generate PDF" disabled={isGenerating}>
          <FileText size={18} />
          <span className="btn-label">{isGenerating ? 'Generating…' : 'Generate PDF'}</span>
        </button>
      </ModuleHeader>

      <main className="main-content">
        <div className="content-card">
          <div className="content-card-body">
            <HotelInvoiceForm data={data} onChange={handleUpdate} />
          </div>
        </div>
      </main>

      <button className="fab" onClick={handleGeneratePDF} title="Generate PDF" aria-label="Generate PDF" disabled={isGenerating}>
        <FileText size={24} />
      </button>
      </div>
    </div>
  );
};
