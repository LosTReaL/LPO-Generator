import React, { useState, useEffect, useRef } from 'react';
import { GeneralLPOForm } from './GeneralLPOForm';
import { GeneralLPOData, INITIAL_GENERAL_LPO } from '../../types/generalLpo';
import { generateGeneralLPOPDF } from '../../services/generalLpoPdfService';
import { normalizeGeneralLpoData, parseImportPayload } from '../../services/dataUtils';
import { Upload, Download, RefreshCw, FileCheck } from 'lucide-react';
import { ModuleHeader } from '../shared/SharedUI';
import { useToast } from '../shared/ToastContext';

const STORAGE_KEY = 'ordris_general_lpo_v1';
const STORAGE_EXPIRY_DAYS = 7;
const MAX_IMPORT_BYTES = 2 * 1024 * 1024;

// Factory instead of sharing the INITIAL_* constant by reference: a stray
// in-place mutation would otherwise poison every future reset.
const getInitialData = (): GeneralLPOData =>
  JSON.parse(JSON.stringify(INITIAL_GENERAL_LPO)) as GeneralLPOData;

interface Props {
  onNavigateHome: () => void;
}

export default function GeneralLPOModule({ onNavigateHome }: Props) {
  const [data, setData] = useState<GeneralLPOData>(getInitialData);
  const [isGenerating, setIsGenerating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addToast } = useToast();

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
          setData(normalizeGeneralLpoData(parsed.data ?? {}));
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    } catch (e) {
      console.error('Failed to load LPO data from localStorage', e);
    }
  }, []);

  // Save to localStorage (debounced)
  useEffect(() => {
    const timeout = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          data,
          _timestamp: new Date().getTime()
        }));
      } catch (e) {
        console.error('Failed to save LPO data to localStorage', e);
        addToast('Changes could not be saved locally (storage full or unavailable).', 'warning');
      }
    }, 1000);
    return () => clearTimeout(timeout);
  }, [data, addToast]);

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_IMPORT_BYTES) {
      addToast('File is too large to import (max 2 MB).', 'error');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = parseImportPayload(String(event.target?.result ?? ''));
      if (!result.ok || !result.data) {
        addToast(result.error ?? 'Invalid JSON file.', 'error');
      } else {
        setData(normalizeGeneralLpoData(result.data));
        addToast('Data imported successfully.', 'success');
      }
    };
    reader.onerror = () => addToast('Invalid JSON file.', 'error');
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
    addToast('Data exported successfully.', 'success');
  };

  const handleReset = () => {
    if (window.confirm('Are you sure you want to reset all form data? This cannot be undone.')) {
      setData(getInitialData());
      localStorage.removeItem(STORAGE_KEY);
      addToast('Form has been reset.', 'info');
    }
  };

  const handleGeneratePDF = () => {
    if (isGenerating) return;
    if (!data.companyInfo?.name?.trim()) {
      addToast('Company Name is required.', 'error');
      return;
    }
    if (!data.items || data.items.length === 0) {
      addToast('At least one line item is required.', 'error');
      return;
    }
    setIsGenerating(true);
    try {
      generateGeneralLPOPDF(data);
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
      <div className="module-wrapper">
      <ModuleHeader title="General LPO" onNavigateHome={onNavigateHome}>
        <input
          type="file"
          accept=".json"
          ref={fileInputRef}
          style={{ display: 'none' }}
          onChange={handleImport}
        />
        <button className="btn btn-ghost" onClick={() => fileInputRef.current?.click()} title="Import JSON">
          <Upload size={18} />
          <span className="btn-label">Import</span>
        </button>
        <button className="btn btn-ghost" onClick={handleExport} title="Export JSON">
          <Download size={18} />
          <span className="btn-label">Export</span>
        </button>
        <div className="header-divider" />
        <button onClick={handleReset} className="btn btn-danger-ghost" title="Reset Form">
          <RefreshCw size={18} />
          <span className="btn-label">Reset</span>
        </button>
        <button onClick={handleGeneratePDF} className="btn btn-primary" title="Generate PDF" disabled={isGenerating}>
          <FileCheck size={18} />
          <span className="btn-label">{isGenerating ? 'Generating…' : 'Generate PDF'}</span>
        </button>
      </ModuleHeader>

      <main className="main-content">
        <div className="content-card">
          <div className="content-card-body">
            <GeneralLPOForm data={data} onChange={setData} />
          </div>
        </div>
      </main>

      <button
        className="fab"
        onClick={handleGeneratePDF}
        title="Generate PDF"
        aria-label="Generate PDF"
        disabled={isGenerating}
      >
        <FileCheck size={24} />
      </button>
      </div>
    </div>
  );
};
