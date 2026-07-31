import React from 'react';
import { Building, FileText, ShoppingCart, Receipt } from 'lucide-react';

interface ModeSelectorPageProps {
  onSelectMode: (mode: string) => void;
}

const modes = [
  {
    id: 'hotel-lpo',
    icon: Building,
    title: 'Hotel LPO',
    description: 'Generate professional purchase orders for hotel accommodations with multi-stay support and rate management.',
    colorClass: 'mode-card-icon-wrap--indigo',
  },
  {
    id: 'general-lpo',
    icon: ShoppingCart,
    title: 'General LPO',
    description: 'Create purchase orders for any business — supplier management, line items, approval workflows, and delivery tracking.',
    colorClass: 'mode-card-icon-wrap--emerald',
  },
  {
    id: 'hotel-invoice',
    icon: Receipt,
    title: 'Hotel Invoice',
    description: 'Generate guest invoices with categorized charges — room, F&B, spa, transport, events — with payment tracking.',
    colorClass: 'mode-card-icon-wrap--violet',
  },
  {
    id: 'general-invoice',
    icon: FileText,
    title: 'General Invoice',
    description: 'Professional invoicing for any business — itemized billing, taxes, credit notes, recurring invoices, and more.',
    colorClass: 'mode-card-icon-wrap--amber',
  },
];

const ModeSelectorPage: React.FC<ModeSelectorPageProps> = ({ onSelectMode }) => {
  return (
    <div className="mode-selector">
      <div className="mode-selector-content">
        <h1 className="mode-selector-brand">Ordris</h1>
        <p className="mode-selector-subtitle">Professional Business Document Generator</p>

        <div className="mode-cards-grid">
          {modes.map((mode) => (
            <div
              key={mode.id}
              className="mode-card"
              onClick={() => onSelectMode(mode.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelectMode(mode.id); }}
            >
              <div className={`mode-card-icon-wrap ${mode.colorClass}`}>
                <mode.icon size={28} color="white" strokeWidth={1.5} />
              </div>
              <h2 className="mode-card-title">{mode.title}</h2>
              <p className="mode-card-desc">{mode.description}</p>
            </div>
          ))}
        </div>

        <div className="mode-selector-footer">
          <span>Made with ❤️ using Gemini AI. Let's </span>
          <a
            href="https://www.linkedin.com/in/mismailyilmaz"
            target="_blank"
            rel="noopener noreferrer"
          >
            connect
          </a>
          <span>!</span>
        </div>
      </div>
    </div>
  );
};

export default ModeSelectorPage;
