import React, { useState, useEffect, useRef } from 'react';
import { GeneralLPOForm } from './GeneralLPOForm';
import { GeneralLPOData } from '../../types/generalLpo';
import { generateGeneralLPOPDF } from '../../services/generalLpoPdfService';
import { Upload, Download, RefreshCw, FileCheck, ArrowLeft } from 'lucide-react';

const STORAGE_KEY = 'ordris_general_lpo_v1';
const STORAGE_EXPIRY_DAYS = 7;

const initialData: GeneralLPOData = {
  companyInfo: {
    name: '',
    email: '',
    phone: '',
    address: ''
  },
  supplierInfo: {
    name: '',
    contactPerson: '',
    email: '',
    phone: '',
    taxId: '',
    address: ''
  },
  items: [],
  currency: 'USD',
  discountType: 'flat',
  discountValue: 0,
  taxType: 'percentage',
  taxRate: 0,
  taxLabel: 'VAT',
  shippingCharges: 0,
  status: 'Draft',
  includeSignature: true
};

interface Props {
  onNavigateHome: () => void;
}

export default function GeneralLPOModule({ onNavigateHome }: Props) {
  const [data, setData] = useState<GeneralLPOData>(initialData);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        const savedTime = parsed._timestamp;
        const now = new Date().getTime();
        const expiryMs = STORAGE_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
        
        if (savedTime && now - savedTime < expiryMs) {
          setData(parsed.data);
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    } catch (e) {
      console.error('Failed to load LPO data from localStorage', e);
    }
  }, []);

  // Save to localStorage
  useEffect(() => {
    const timeout = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          data,
          _timestamp: new Date().getTime()
        }));
      } catch (e) {
        console.error('Failed to save LPO data to localStorage', e);
      }
    }, 1000);
    return () => clearTimeout(timeout);
  }, [data]);

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        if (parsed && typeof parsed === 'object') {
          setData({ ...initialData, ...parsed });
          alert('Data imported successfully!');
        }
      } catch (err) {
        alert('Invalid JSON file.');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(data, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `General_LPO_Data_${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    if (window.confirm('Are you sure you want to reset all form data? This cannot be undone.')) {
      setData(initialData);
    }
  };

  const handleGeneratePDF = () => {
    if (!data.companyInfo?.name?.trim()) {
      alert('Company Name is required.');
      return;
    }
    if (!data.items || data.items.length === 0) {
      alert('At least one line item is required.');
      return;
    }
    generateGeneralLPOPDF(data);
  };

  return (
    <div className="app-shell">
      <div className="module-wrapper">
        <div className="module-header-bar">
          <button className="module-back-btn" onClick={onNavigateHome}>
            <ArrowLeft size={16} /> Home
          </button>
          <span className="module-breadcrumb-sep">/</span>
          <span className="module-breadcrumb-current">General LPO</span>
        </div>
        <header className="app-header">
        <div className="app-header-inner">
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 600 }}>General LPO Generator</h1>
          <div className="header-actions">
            <input 
              type="file" 
              accept=".json" 
              ref={fileInputRef} 
              style={{ display: 'none' }} 
              onChange={handleImport} 
            />
            <button className="btn-ghost" onClick={() => fileInputRef.current?.click()} title="Import JSON">
              <Upload size={18} /> Import
            </button>
            <button className="btn-ghost" onClick={handleExport} title="Export JSON">
              <Download size={18} /> Export
            </button>
            <div className="header-divider" />
            <button className="btn-danger-ghost" onClick={handleReset} title="Reset Form">
              <RefreshCw size={18} /> Reset
            </button>
            <button className="btn-primary" onClick={handleGeneratePDF}>
              <FileCheck size={18} style={{ marginRight: '0.5rem' }} /> Generate PDF
            </button>
          </div>
        </div>
      </header>
      
      <main className="main-content">
        <div className="content-card">
          <div className="content-card-body">
            <GeneralLPOForm data={data} onChange={setData} />
          </div>
        </div>
      </main>

      <button className="fab btn-primary" onClick={handleGeneratePDF} title="Generate PDF" style={{ position: 'fixed', bottom: '2rem', right: '2rem', borderRadius: '50%', width: '3.5rem', height: '3.5rem', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 0, zIndex: 100 }}>
        <FileCheck size={24} />
      </button>
      </div>
    </div>
  );
};
