import React, { useRef, useLayoutEffect } from 'react';
import { ChevronDown, Check, ArrowLeft } from 'lucide-react';

// ============================================================
// Shared UI Components
// Extracted from LPOForm.tsx for reuse across all modules.
// Uses vanilla CSS classes from index.css.
// ============================================================

// --- Section Card ---
export const Section = ({ icon: Icon, title, children, className = "" }: {
  icon: any;
  title: string;
  children: React.ReactNode;
  className?: string;
}) => (
  <div className={`section-card ${className}`}>
    <div className="section-card-header">
      <div className="section-card-icon">
        <Icon size={20} strokeWidth={2} />
      </div>
      <h3 className="section-card-title">{title}</h3>
    </div>
    <div className="section-card-body">
      {children}
    </div>
  </div>
);

// --- Sub Section ---
export const SubSection = ({ title, icon: Icon, children }: {
  title: string;
  icon?: any;
  children: React.ReactNode;
}) => (
  <div className="sub-section">
    <h4 className="sub-section-title">
      {Icon && <Icon size={14} className="form-label-icon" />}
      {title}
    </h4>
    {children}
  </div>
);

// --- Form Label ---
export const Label = ({ children, icon: Icon }: {
  children: React.ReactNode;
  icon?: any;
}) => (
  <span className="form-label">
    {Icon && <Icon size={12} className="form-label-icon" />}
    {children}
  </span>
);

// --- Input Field ---
export const Input = ({
  value,
  onChange,
  placeholder,
  type = "text",
  icon: Icon,
  className = "",
  min,
  max,
  disabled
}: {
  value: string | number;
  onChange: (val: string | number) => void;
  placeholder?: string;
  type?: string;
  icon?: any;
  className?: string;
  min?: number;
  max?: number;
  disabled?: boolean;
}) => (
  <div className="input-group">
    {Icon && (
      <div className="input-icon">
        <Icon size={18} />
      </div>
    )}
    <input
      type={type}
      value={value}
      min={min}
      max={max}
      disabled={disabled}
      onChange={(e) => onChange(type === 'number' ? Number(e.target.value) : e.target.value)}
      onKeyDown={(e) => {
        if (type === 'number' && min !== undefined && min >= 0) {
          if (e.key === '-' || e.key === 'e') e.preventDefault();
        }
      }}
      className={`input-field ${Icon ? 'input-field--with-icon' : ''} ${className}`}
      placeholder={placeholder}
    />
  </div>
);

// --- Select Field ---
export const Select = ({
  value,
  onChange,
  options,
  icon: Icon
}: {
  value: string;
  onChange: (val: string) => void;
  options: string[];
  icon?: any;
}) => (
  <div className="select-group">
    {Icon && (
      <div className="input-icon">
        <Icon size={18} />
      </div>
    )}
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`select-field ${Icon ? 'select-field--with-icon' : ''}`}
    >
      {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
    </select>
    <ChevronDown className="select-chevron" size={16} />
  </div>
);

// --- TextArea ---
export const TextArea = ({
  value,
  onChange,
  rows = 3,
  placeholder
}: {
  value: string;
  onChange: (val: string) => void;
  rows?: number;
  placeholder?: string;
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight + 2}px`;
    }
  }, [value]);

  return (
    <textarea
      ref={textareaRef}
      rows={rows}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="textarea-field"
      placeholder={placeholder}
    />
  );
};

// --- Custom Checkbox ---
export const Checkbox = ({
  label,
  checked,
  onChange,
  children
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  children?: React.ReactNode;
}) => (
  <div className="checkbox-group">
    <label className="checkbox-label-row">
      <div className="checkbox-visual">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only"
        />
        <div className={`checkbox-box ${checked ? 'checkbox-box--checked' : ''}`}>
          <Check
            size={12}
            className={`checkbox-check-icon ${checked ? 'checkbox-check-icon--visible' : 'checkbox-check-icon--hidden'}`}
            strokeWidth={3}
          />
        </div>
      </div>
      <span className={`checkbox-text ${checked ? 'checkbox-text--checked' : ''}`}>
        {label}
      </span>
    </label>
    {checked && children && (
      <div className="checkbox-children">
        {children}
      </div>
    )}
  </div>
);

// --- Status Badge ---
export const StatusBadge = ({ status }: { status: string }) => {
  const statusClassMap: Record<string, string> = {
    'Draft': 'status-badge--draft',
    'Pending Approval': 'status-badge--pending',
    'Approved': 'status-badge--approved',
    'Sent': 'status-badge--sent',
    'Paid': 'status-badge--paid',
    'Partially Paid': 'status-badge--partial',
    'Partially Delivered': 'status-badge--partial',
    'Overdue': 'status-badge--overdue',
    'Cancelled': 'status-badge--cancelled',
    'Ordered': 'status-badge--ordered',
    'Delivered': 'status-badge--delivered',
  };

  return (
    <span className={`status-badge ${statusClassMap[status] || 'status-badge--draft'}`}>
      {status}
    </span>
  );
};

// --- Module Header ---
export const ModuleHeader = ({
  title,
  onNavigateHome,
  children
}: {
  title: string;
  onNavigateHome: () => void;
  children?: React.ReactNode;
}) => (
  <>
    <div className="module-header-bar" style={{ padding: '0.5rem 1.5rem', background: 'var(--slate-800)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <button onClick={onNavigateHome} className="module-back-btn btn-ghost" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--slate-300)' }}>
        <ArrowLeft size={16} /> Home
      </button>
      <span className="module-breadcrumb-sep" style={{ color: 'var(--slate-500)' }}>/</span>
      <span className="module-breadcrumb-current" style={{ color: 'var(--slate-300)', fontSize: '0.875rem' }}>{title}</span>
    </div>
    <header className="app-header">
      <div className="app-header-inner">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 600 }}>{title} Generator</h1>
          <div className="header-credit" style={{ fontSize: '0.75rem', color: 'var(--slate-400)' }}>
            AI-Orchestrated with ❤️
          </div>
        </div>
        <div className="header-actions">
          {children}
        </div>
      </div>
    </header>
  </>
);
