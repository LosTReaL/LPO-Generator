import React, { useState, useEffect } from 'react';
import { Download, RotateCcw, Upload, FileText, CheckCircle, ArrowLeft } from 'lucide-react';
import { GeneralInvoiceForm } from './GeneralInvoiceForm';
import { generateGeneralInvoicePDF } from '../../services/generalInvoicePdfService';
import { GeneralInvoiceData, INITIAL_GENERAL_INVOICE } from '../../types/hotelInvoice';

const STORAGE_KEY = 'ordris_general_invoice_v1';
const EXPIRY_DAYS = 7;

interface Props {
  onNavigateHome: () => void;
}

export default function GeneralInvoiceModule({ onNavigateHome }: Props) {
  const [data, setData] = useState<GeneralInvoiceData>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.timestamp) {
          const age = Date.now() - parsed.timestamp;
          if (age < EXPIRY_DAYS * 24 * 60 * 60 * 1000) {
            return parsed.data as GeneralInvoiceData;
          }
        }
      }
    } catch (e) {
      console.error('Failed to load general invoice data from storage:', e);
    }
    return INITIAL_GENERAL_INVOICE;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      timestamp: Date.now(),
      data
    }));
  }, [data]);

  const handleReset = () => {
    if (window.confirm('Are you sure you want to reset the invoice? All unsaved data will be lost.')) {
      setData(INITIAL_GENERAL_INVOICE);
    }
  };

  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `general_invoice_${data.invoiceNumber || 'draft'}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedData = JSON.parse(event.target?.result as string);
        setData({ ...INITIAL_GENERAL_INVOICE, ...importedData });
      } catch (err) {
        alert('Failed to parse JSON file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleGeneratePDF = () => {
    if (!data.companyName) {
      alert('Company Name is required.');
      return;
    }
    if (!data.customer.name) {
      alert('Customer Name is required.');
      return;
    }
    if (data.items.length === 0) {
      alert('At least one item is required.');
      return;
    }

    generateGeneralInvoicePDF(data);
  };

  return (
    <div className="app-shell">
      <div className="module-container">
        <div className="module-header-bar">
          <button className="module-back-btn" onClick={onNavigateHome}>
            <ArrowLeft size={16} /> Home
          </button>
          <span className="module-breadcrumb-sep">/</span>
          <span className="module-breadcrumb-current">General Invoice</span>
        </div>
        <header className="app-header">
        <div className="app-header-inner">
          <div className="header-left">
            <h1 className="header-title">
              <FileText size={24} className="text-primary-600" />
              General Invoice
            </h1>
            <p className="header-subtitle">Create and manage professional general invoices</p>
          </div>
          <div className="header-actions">
            <label className="btn btn-ghost" style={{ cursor: 'pointer' }}>
              <Upload size={16} />
              Import
              <input type="file" accept=".json" onChange={handleImportJSON} style={{ display: 'none' }} />
            </label>
            <button onClick={handleExportJSON} className="btn btn-ghost">
              <Download size={16} />
              Export
            </button>
            <button onClick={handleReset} className="btn btn-danger-ghost">
              <RotateCcw size={16} />
              Reset
            </button>
            <div className="header-divider"></div>
            <button onClick={handleGeneratePDF} className="btn btn-primary">
              <CheckCircle size={16} />
              Generate PDF
            </button>
          </div>
        </div>
      </header>

      <main className="main-content">
        <GeneralInvoiceForm data={data} setData={setData} />
      </main>
      
      <button className="fab d-md-none" onClick={handleGeneratePDF} title="Generate PDF">
        <CheckCircle size={24} />
      </button>
      </div>
    </div>
  );
};
