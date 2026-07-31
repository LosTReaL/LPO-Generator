import React, { useState, useEffect } from 'react';
import { Download, Upload, RefreshCw, FileText, ArrowLeft } from 'lucide-react';
import { HotelInvoiceData, INITIAL_HOTEL_INVOICE } from '../../types/generalInvoice';
import { HotelInvoiceForm } from './HotelInvoiceForm';
import { generateHotelInvoicePDF } from '../../services/hotelInvoicePdfService';

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

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed: StorageData = JSON.parse(saved);
        const ageInDays = (Date.now() - parsed.timestamp) / (1000 * 60 * 60 * 24);
        if (ageInDays < EXPIRY_DAYS) {
          setData(parsed.data);
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
    const storageData: StorageData = {
      data,
      timestamp: Date.now()
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(storageData));
  }, [data]);

  const handleUpdate = (updates: Partial<HotelInvoiceData>) => {
    setData(prev => ({ ...prev, ...updates }));
  };

  const handleReset = () => {
    if (window.confirm('Are you sure you want to reset all form data? This cannot be undone.')) {
      setData(INITIAL_HOTEL_INVOICE);
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
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const result = event.target?.result as string;
        const importedData = JSON.parse(result);
        
        // Basic validation
        if (typeof importedData !== 'object' || importedData === null) {
          throw new Error("Invalid format");
        }
        
        setData({ ...INITIAL_HOTEL_INVOICE, ...importedData });
        
        // Reset file input
        if (e.target) e.target.value = '';
      } catch (error) {
        alert('Invalid JSON file. Could not import data.');
        console.error(error);
      }
    };
    reader.readAsText(file);
  };

  const handleGeneratePDF = () => {
    // Validation
    if (!data.hotelName.trim()) {
      alert("Hotel Name is required.");
      return;
    }
    if (!data.primaryGuest.name.trim()) {
      alert("Primary Guest Name is required.");
      return;
    }
    if (data.lineItems.length === 0) {
      alert("At least one charge line item is required.");
      return;
    }

    generateHotelInvoicePDF(data);
  };

  return (
    <div className="app-shell">
      <div className="module-wrapper">
        <div className="module-header-bar">
          <button className="module-back-btn" onClick={onNavigateHome}>
            <ArrowLeft size={16} /> Home
          </button>
          <span className="module-breadcrumb-sep">/</span>
          <span className="module-breadcrumb-current">Hotel Invoice</span>
        </div>
        <header className="app-header">
        <div className="app-header-inner">
          <div className="header-title-group">
            <h1 className="header-title">Hotel Invoice Generator</h1>
          </div>
          
          <div className="header-actions">
            <div>
              <label htmlFor="import-json" className="btn-ghost" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Upload size={16} /> Import
              </label>
              <input 
                id="import-json" 
                type="file" 
                accept=".json" 
                onChange={handleImportJSON} 
                style={{ display: 'none' }} 
              />
            </div>
            
            <button className="btn-ghost" onClick={handleExportJSON}>
              <Download size={16} /> Export
            </button>
            
            <div className="header-divider"></div>
            
            <button className="btn-danger-ghost" onClick={handleReset}>
              <RefreshCw size={16} /> Reset
            </button>
            
            <button className="btn-primary" onClick={handleGeneratePDF}>
              <FileText size={16} /> Generate PDF
            </button>
          </div>
        </div>
      </header>

      <main className="main-content">
        <div className="content-card">
          <div className="content-card-body">
            <HotelInvoiceForm data={data} onChange={handleUpdate} />
          </div>
        </div>
      </main>

      <button className="fab" onClick={handleGeneratePDF} title="Generate PDF">
        <FileText size={24} />
      </button>
      </div>
    </div>
  );
};
