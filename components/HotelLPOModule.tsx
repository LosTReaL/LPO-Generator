import React, { useState, useEffect, useRef } from 'react';
import { LPOData, INITIAL_LPO_DATA } from '../types';
import LPOForm from './LPOForm';
import { generateLPOPDF } from '../services/pdfService';
import { normalizeHotelLpoData, parseImportPayload } from '../services/dataUtils';
import { FileDown, RotateCcw, Upload, Download } from 'lucide-react';
import { format, startOfDay, eachDayOfInterval, subDays } from 'date-fns';
import { ModuleHeader } from './shared/SharedUI';
import { useToast } from './shared/ToastContext';

const STORAGE_KEY = 'lpo_generator_data_v1';
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

const getInitialData = (): LPOData => JSON.parse(JSON.stringify(INITIAL_LPO_DATA));

// hydrateData keeps its name for legacy-format migration; the heavy
// lifting (type coercion, date parsing, option merging) now lives in
// services/dataUtils so imports and storage loads share one code path.
const hydrateData = (data: any): LPOData => normalizeHotelLpoData(data ?? {});

interface HotelLPOModuleProps {
  onNavigateHome: () => void;
}

const HotelLPOModule: React.FC<HotelLPOModuleProps> = ({ onNavigateHome }) => {
  const [lpoData, setLpoData] = useState<LPOData>(getInitialData());
  const [isLoaded, setIsLoaded] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addToast } = useToast();

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        const { timestamp, data } = parsed;
        
        if (Date.now() - timestamp < SEVEN_DAYS_MS) {
          const rehydratedData = hydrateData(data);
          setLpoData(rehydratedData);
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    } catch (error) {
      console.error('Failed to load saved data', error);
      localStorage.removeItem(STORAGE_KEY);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (isLoaded) {
      const serializeData = (data: LPOData) => ({
        ...data,
        stayRanges: data.stayRanges.map(r => ({
          ...r,
          start: format(r.start, 'yyyy-MM-dd'),
          end: format(r.end, 'yyyy-MM-dd')
        })),
        applicableRates: data.applicableRates.map(r => ({
          ...r,
          start: format(r.start, 'yyyy-MM-dd'),
          end: format(r.end, 'yyyy-MM-dd')
        }))
      });

      const storagePayload = {
        timestamp: Date.now(),
        data: serializeData(lpoData)
      };
      
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(storagePayload));
      } catch (e) {
        console.error('Failed to save data', e);
        addToast('Changes could not be saved locally (storage full or unavailable).', 'warning');
      }
    }
  }, [lpoData, isLoaded, addToast]);

  const handleReset = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm('Are you sure you want to clear all fields? This cannot be undone.')) {
      const freshData = getInitialData();
      setLpoData(freshData);
      setFormKey(prev => prev + 1);
      localStorage.removeItem(STORAGE_KEY);
      addToast('Form has been reset.', 'info');
    }
  };

  const validateData = (): { errors: string[], warnings: string[] } => {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!lpoData.hotelName.trim()) errors.push('Hotel Name is required.');
    if (lpoData.guests.length === 0 || lpoData.guests.every(g => !g.name.trim())) {
      errors.push('At least one Guest Name is required.');
    }
    if (lpoData.stayRanges.length === 0) {
      errors.push('At least one Stay Date Range is required.');
    }

    const sortedRates = [...lpoData.applicableRates].sort((a, b) => a.start.getTime() - b.start.getTime());
    for (let i = 0; i < sortedRates.length - 1; i++) {
      if (sortedRates[i + 1].start <= sortedRates[i].end) {
        errors.push(
          `Rate overlap detected: Rate ending ${format(sortedRates[i].end, 'MMM d')} overlaps with rate starting ${format(sortedRates[i + 1].start, 'MMM d')}.`
        );
      }
    }

    const { stayRanges, applicableRates } = lpoData;
    const missingRateDates: string[] = [];

    for (const stay of stayRanges) {
      if (stay.start >= stay.end) continue;
      
      try {
        const nights = eachDayOfInterval({ start: stay.start, end: subDays(stay.end, 1) });
        
        for (const nightDate of nights) {
          const hasRate = applicableRates.some(rate => {
            const rStart = startOfDay(rate.start);
            const rEnd = startOfDay(rate.end);
            const nDate = startOfDay(nightDate);
            return nDate >= rStart && nDate <= rEnd;
          });

          if (!hasRate) {
            missingRateDates.push(format(nightDate, 'dd MMM yyyy'));
          }
        }
      } catch (e) {
        console.error('Error validating dates', e);
      }
    }

    if (missingRateDates.length > 0) {
      const uniqueDates = Array.from(new Set(missingRateDates)).sort((a,b) => new Date(a).getTime() - new Date(b).getTime());
      const displayDates = uniqueDates.slice(0, 5);
      const remaining = uniqueDates.length - 5;
      warnings.push(
        `Missing rates for: ${displayDates.join(", ")}${remaining > 0 ? ` ...and ${remaining} more` : ''}.`
      );
    }

    return { errors, warnings };
  };

  const handleDownloadPDF = () => {
    if (isGenerating) return;

    const { errors, warnings } = validateData();

    if (errors.length > 0) {
      addToast(`Validation failed: ${errors[0]}${errors.length > 1 ? ` (+${errors.length - 1} more)` : ''}`, 'error');
      return;
    }

    if (warnings.length > 0) {
      const proceed = window.confirm(
        `Please review the following warnings:\n\n• ${warnings.join("\n• ")}\n\nDo you want to generate the PDF anyway?`
      );
      if (!proceed) return;
    }

    setIsGenerating(true);
    try {
      generateLPOPDF(lpoData);
      addToast('PDF generated successfully.', 'success');
    } catch (e) {
      addToast('An error occurred while generating PDF.', 'error');
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExportData = () => {
    const dataStr = JSON.stringify(lpoData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `lpo_backup_${format(new Date(), 'yyyyMMdd_HHmm')}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    addToast('Data exported successfully.', 'success');
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      addToast('File is too large to import (max 2 MB).', 'error');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = parseImportPayload(String(event.target?.result ?? ''));
      if (!result.ok || !result.data) {
        addToast(result.error ?? 'Failed to read file.', 'error');
      } else {
        setLpoData(hydrateData(result.data));
        setFormKey(prev => prev + 1);
        addToast('Data imported successfully.', 'success');
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.onerror = () => {
      addToast('Failed to read file.', 'error');
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  if (!isLoaded) return null;

  return (
    <div className="app-shell">
      <ModuleHeader title="Hotel LPO" onNavigateHome={onNavigateHome}>
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleImportFile} 
          accept=".json" 
          className="hidden" 
        />
        <button 
          type="button"
          onClick={handleImportClick}
          className="btn btn-ghost"
          title="Import Data"
        >
          <Upload size={18} />
          <span className="btn-label">Import</span>
        </button>
        <button 
          type="button"
          onClick={handleExportData}
          className="btn btn-ghost"
          title="Export Data"
        >
          <Download size={18} />
          <span className="btn-label">Export</span>
        </button>
        <div className="header-divider"></div>
        <button 
          type="button"
          onClick={handleReset}
          className="btn btn-danger-ghost"
          title="Reset Form"
        >
          <RotateCcw size={18} />
          <span className="btn-label">Reset</span>
        </button>
        <button
          type="button"
          onClick={handleDownloadPDF}
          className="btn btn-primary"
          title="Generate PDF"
          disabled={isGenerating}
        >
          <FileDown size={18} />
          <span className="btn-label">{isGenerating ? 'Generating…' : 'Generate PDF'}</span>
        </button>
      </ModuleHeader>

      {/* Main Content */}
      <main className="main-content">
        <div className="content-card">
          <div className="content-card-body">
            <LPOForm key={formKey} data={lpoData} onChange={setLpoData} />
          </div>
        </div>
      </main>

      {/* Mobile Floating Action Button */}
      <button
        type="button"
        onClick={handleDownloadPDF}
        className="fab"
        title="Generate PDF"
        aria-label="Generate PDF"
        disabled={isGenerating}
      >
        <FileDown size={28} />
      </button>
    </div>
  );
};

export default HotelLPOModule;
