import React, { useState, useRef } from 'react';
import { LPOData, DateRange, ApplicableRate, PdfOptions, GuestInfo } from '../types';
import { GLOBAL_CURRENCIES } from '../types/currencies';
import DateManager from './DateManager';
import { Section, SubSection, Label, Input, Select, TextArea, Checkbox } from './shared/SharedUI';
import { useToast } from './shared/ToastContext';
import { 
  Plus, X, User, Building, CreditCard, FileText, Trash2, 
  Calendar, Settings, AlignJustify, Calculator, EyeOff, 
  Image as ImageIcon, PenTool, Type, Hash,
  MapPin, Briefcase, Phone, Mail, Star, FileSpreadsheet, FileCheck
} from 'lucide-react';
import { format, differenceInCalendarDays, areIntervalsOverlapping, startOfDay } from 'date-fns';

interface LPOFormProps {
  data: LPOData;
  onChange: (data: LPOData) => void;
}

const LPOForm: React.FC<LPOFormProps> = ({ data, onChange }) => {
  const [newRateAmount, setNewRateAmount] = useState<string>('');
  const logoInputRef = useRef<HTMLInputElement>(null);
  const { addToast } = useToast();
  
  const updateField = (field: keyof LPOData, value: any) => {
    onChange({ ...data, [field]: value });
  };

  const updatePdfOption = (field: keyof PdfOptions, value: any) => {
    onChange({ 
      ...data, 
      pdfOptions: {
        ...data.pdfOptions,
        [field]: value
      }
    });
  };

  const handleGuestChange = (index: number, field: keyof GuestInfo, val: string) => {
    const newGuests = [...data.guests];
    newGuests[index] = { ...newGuests[index], [field]: val };
    updateField('guests', newGuests);
  };

  const addGuest = () => updateField('guests', [...data.guests, { name: '', loyaltyNumber: '' }]);
  const removeGuest = (index: number) => {
    if (data.guests.length > 1) {
      updateField('guests', data.guests.filter((_, i) => i !== index));
    }
  };

  const handleRangesChange = (newRanges: DateRange[]) => {
    updateField('stayRanges', newRanges);
  };

  const handleAddRateRange = (start: Date, end: Date) => {
    const numericRate = parseFloat(newRateAmount);
    if (!newRateAmount.trim() || isNaN(numericRate) || numericRate <= 0) {
      // Silent returns here used to look like a dead button — always explain.
      addToast('Enter a rate amount greater than zero first.', 'warning');
      return;
    }

    const newStart = startOfDay(start);
    const newEnd = startOfDay(end);

    const hasOverlap = data.applicableRates.some(rate => {
      const existingStart = startOfDay(rate.start);
      const existingEnd = startOfDay(rate.end);
      
      return areIntervalsOverlapping(
        { start: newStart, end: newEnd },
        { start: existingStart, end: existingEnd },
        { inclusive: true }
      );
    });

    if (hasOverlap) {
      addToast('Cannot add overlapping rate. Please check existing rates.', 'error');
      return;
    }

    const newRate: ApplicableRate = {
      id: Math.random().toString(36).substring(2, 9),
      start,
      end,
      amount: numericRate
    };
    updateField('applicableRates', [...data.applicableRates, newRate]);
    setNewRateAmount(''); 
  };

  const removeApplicableRate = (id: string) => {
    updateField('applicableRates', data.applicableRates.filter(r => r.id !== id));
  };

  const handleAdultCountChange = (val: string | number) => {
    const count = Number(val);
    if (isNaN(count) || count < 0) return;
    updateField('adultCount', count);
  };

  const handleInfantCountChange = (val: string | number) => {
    const count = Number(val);
    if (isNaN(count) || count < 0) return;
    updateField('infantCount', count);
  };

  const handleChildCountChange = (val: string | number) => {
    const count = Number(val);
    if (isNaN(count) || count < 0) return;

    let newAges = [...(data.childAges || [])];
    if (count > newAges.length) {
      const added = new Array(count - newAges.length).fill(0);
      newAges = [...newAges, ...added];
    } else {
      newAges = newAges.slice(0, count);
    }

    onChange({ 
      ...data, 
      childCount: count,
      childAges: newAges
    });
  };

  const handleChildAgeChange = (index: number, val: string) => {
    const newAges = [...data.childAges];
    newAges[index] = Number(val);
    onChange({ ...data, childAges: newAges });
  };

  const setRateDisplayMode = (mode: 'none' | 'average' | 'breakdown') => {
    onChange({
      ...data,
      pdfOptions: {
        ...data.pdfOptions,
        showAverageRate: mode === 'average',
        showDailyRateBreakdown: mode === 'breakdown'
      }
    });
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        addToast('Please select an image file.', 'error');
        return;
      }
      if (file.size > 500 * 1024) {
        addToast('File size too large. Please select an image under 500KB.', 'error');
        if (logoInputRef.current) logoInputRef.current.value = '';
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        updatePdfOption('logoDataUrl', reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeLogo = () => {
    updatePdfOption('logoDataUrl', '');
    if (logoInputRef.current) logoInputRef.current.value = '';
  };

  const currentRateDisplayMode = data.pdfOptions.showDailyRateBreakdown 
    ? 'breakdown' 
    : data.pdfOptions.showAverageRate 
      ? 'average' 
      : 'none';

  const rateRanges: DateRange[] = data.applicableRates.map(r => ({
    id: r.id,
    start: r.start,
    end: r.end,
    nights: differenceInCalendarDays(r.end, r.start)
  }));

  const mealPlans = [
    'Room Only', 'Bed & Breakfast', 'Room + Lunch', 'Room + Dinner', 
    'Half Board', 'Half Board+', 'Full Board', 'Full Board+', 
    'Brunch', 'Dine Around', 'All Inclusive', 'Soft All Inclusive', 
    'Ultra All Inclusive', 'Self-Catering'
  ];

  return (
    <div className="two-col-layout">
      
      {/* --- Left Column --- */}
      <div className="stack stack-8">
        
        {/* Hotel Info Section */}
        <Section icon={Building} title="Hotel Information">
          <div className="stack stack-5">
            <div>
              <Label>Hotel Name</Label>
              <Input 
                value={data.hotelName} 
                onChange={(v) => updateField('hotelName', v)} 
                placeholder="e.g. Atlantis"
                icon={Building}
              />
            </div>
            <div>
              <Label>Hotel Address</Label>
              <Input 
                value={data.hotelAddress} 
                onChange={(v) => updateField('hotelAddress', v)} 
                placeholder="e.g. The Palm Jumeirah, Dubai, UAE" 
                icon={MapPin}
              />
            </div>
            <div className="grid-2col">
               <div>
                <Label>Room Type</Label>
                <Input 
                  value={data.roomType} 
                  onChange={(v) => updateField('roomType', v)} 
                  placeholder="e.g. Atlantis Suite" 
                />
               </div>
               <div>
                <Label>Meal Plan</Label>
                <Select 
                  value={data.mealPlan}
                  onChange={(e) => updateField('mealPlan', e)}
                  options={mealPlans}
                />
               </div>
            </div>
          </div>
        </Section>

        {/* Guest Details Section */}
        <Section icon={User} title="Guest Details">
          <div className="stack stack-6">
            <div>
              <Label icon={Briefcase}>Company Name (Bill To)</Label>
              <Input 
                value={data.companyName} 
                onChange={(v) => updateField('companyName', v)} 
                placeholder="e.g. Corporate Inc." 
              />
            </div>

            <div>
              <Label icon={User}>Guest Names & Loyalty</Label>
              <div className="stack stack-3">
                {data.guests.map((guest, idx) => (
                  <div key={idx} className="guest-row">
                    <div className="guest-inputs">
                      <Input
                        value={guest.name}
                        onChange={(val) => handleGuestChange(idx, 'name', String(val))}
                        placeholder={`Guest ${idx + 1} Full Name`}
                      />
                      <Input
                        value={guest.loyaltyNumber}
                        onChange={(val) => handleGuestChange(idx, 'loyaltyNumber', String(val))}
                        placeholder={`Loyalty Number (Optional)`}
                      />
                    </div>
                    {data.guests.length > 1 && (
                      <button onClick={() => removeGuest(idx)} className="btn-icon-delete" aria-label={`Remove guest ${idx + 1}`}>
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                ))}
                <button onClick={addGuest} className="btn-add">
                  <Plus size={14} /> ADD ANOTHER GUEST
                </button>
              </div>
            </div>

            <div className="occupancy-panel">
              <div>
                <Label>Adults</Label>
                <Input 
                  value={data.adultCount} 
                  onChange={handleAdultCountChange} 
                  type="number" 
                  min={0}
                />
              </div>
              <div>
                <Label>Children</Label>
                <Input 
                  value={data.childCount} 
                  onChange={handleChildCountChange} 
                  type="number" 
                  min={0}
                />
              </div>
              <div>
                <Label>Infants</Label>
                <Input 
                  value={data.infantCount} 
                  onChange={handleInfantCountChange} 
                  type="number" 
                  min={0}
                />
              </div>
            </div>

            {/* Dynamic Child Ages */}
            {data.childCount > 0 && (
              <div className="child-ages-panel">
                <Label icon={User}>Child Ages</Label>
                <div className="child-ages-grid">
                  {data.childAges.map((age, i) => (
                    <div key={i}>
                      <span className="child-age-label">Child {i+1}</span>
                      <input 
                        type="number"
                        min="0"
                        max="17"
                        value={age}
                        onChange={(e) => handleChildAgeChange(i, e.target.value)}
                        className="child-age-input"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="grid-2col">
              <div>
                 <Label icon={Phone}>Phone Number</Label>
                 <Input value={data.guestPhone} onChange={(v) => updateField('guestPhone', v)} placeholder="+971 50 000 0000" />
              </div>
              <div>
                 <Label icon={Mail}>Email Address</Label>
                 <Input value={data.guestEmail} onChange={(v) => updateField('guestEmail', v)} placeholder="guest@example.com" />
              </div>
            </div>
          </div>
        </Section>

        {/* Pricing Section */}
        <Section icon={CreditCard} title="Pricing & Codes">
          <div className="stack stack-6">
            <div className="grid-2col">
              <div>
                <Label icon={Hash}>Rate Code(s)</Label>
                <Input value={data.rateCodes} onChange={(v) => updateField('rateCodes', v)} placeholder="e.g. SUMMER SALE" />
              </div>
              <div>
                 <Label>Currency</Label>
                 <Select 
                   value={data.currency}
                   onChange={(e) => updateField('currency', e)}
                   options={GLOBAL_CURRENCIES}
                 />
              </div>
            </div>

            <div className="rate-config-wrap">
              <div className="rate-config-header">
                 <Label icon={Calendar}>Rate Configuration</Label>
                 {data.applicableRates.length > 0 && (
                   <span className="rate-badge">
                     {data.applicableRates.length} Active Rates
                   </span>
                 )}
              </div>
              
              <div className="rate-calendar-border">
                <DateManager 
                  ranges={rateRanges} 
                  onAdd={handleAddRateRange}
                  hideList={true}
                  addButtonLabel="Add Rate"
                  disableAdd={!newRateAmount}
                  disableNightsCalculation={true}
                  actionContent={
                    <input 
                      type="number" 
                      value={newRateAmount} 
                      onChange={e => setNewRateAmount(e.target.value)}
                      placeholder={`Rate (${data.currency})`}
                      className="rate-inline-input" 
                    />
                  }
                />
              </div>

              {data.applicableRates.length > 0 && (
                <div className="stack stack-2" style={{marginTop: '1.25rem'}}>
                  {[...data.applicableRates].sort((a,b) => a.start.getTime() - b.start.getTime()).map((rate) => (
                    <div key={rate.id} className="rate-item">
                      <div className="stack">
                        <span className="rate-item-dates">
                          {format(rate.start, 'd MMM')} – {format(rate.end, 'd MMM yyyy')}
                        </span>
                        <span className="rate-item-subtitle">Inclusive Rate</span>
                      </div>
                      <div className="flex-row gap-4">
                         <span className="rate-item-amount">
                           {data.currency} {rate.amount}
                         </span>
                          <button onClick={() => removeApplicableRate(rate.id)} className="btn-icon-delete" aria-label={`Remove rate for ${format(rate.start, 'd MMM')}`}>
                           <Trash2 size={16} />
                         </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Section>
      </div>

      {/* --- Right Column --- */}
      <div className="stack stack-8">
        
        {/* Stay Duration Section */}
        <Section icon={Calendar} title="Stay Duration">
          <div className="sub-section">
             <DateManager ranges={data.stayRanges} onRangesChange={handleRangesChange} />
          </div>
        </Section>

        {/* Remarks Section */}
        <Section icon={FileText} title="Remarks & Policies">
          <div className="stack stack-6">
            <div>
              <Label>Payment Remarks</Label>
              <TextArea value={data.paymentRemarks} onChange={(v) => updateField('paymentRemarks', v)} />
            </div>
            <div>
              <Label>Cancellation & No-Show Policy</Label>
              <TextArea value={data.cancellationRemarks} onChange={(v) => updateField('cancellationRemarks', v)} />
            </div>
            <div>
              <Label icon={Star}>General Remarks / Special Requests</Label>
              <TextArea value={data.generalRemarks} onChange={(v) => updateField('generalRemarks', v)} rows={4} />
            </div>
          </div>
        </Section>

        {/* PDF Output Settings Section */}
        <Section icon={Settings} title="PDF Output Configuration">
          
          <div className="stack stack-6">
            
            {/* 1. Content Visibility */}
            <SubSection title="Content Visibility" icon={FileCheck}>
              <div className="checkbox-grid">
                  <Checkbox label="Include Rate Codes" checked={data.pdfOptions.showRateCodes} onChange={(val) => updatePdfOption('showRateCodes', val)} />
                  <Checkbox label="Include Daily Rate Table" checked={data.pdfOptions.showApplicableRates} onChange={(val) => updatePdfOption('showApplicableRates', val)} />
                  <Checkbox label="Include Payment Instructions" checked={data.pdfOptions.showPaymentRemarks} onChange={(val) => updatePdfOption('showPaymentRemarks', val)} />
                  <Checkbox label="Include Cancellation Policy" checked={data.pdfOptions.showCancellationPolicy} onChange={(val) => updatePdfOption('showCancellationPolicy', val)} />
                  <Checkbox label="Include Special Requests" checked={data.pdfOptions.showGeneralRemarks} onChange={(val) => updatePdfOption('showGeneralRemarks', val)} />
                  <Checkbox label="Display Hotel Name in Guest Table" checked={data.pdfOptions.showHotelInOccupancy} onChange={(val) => updatePdfOption('showHotelInOccupancy', val)} />
              </div>
            </SubSection>

            {/* 2. Branding & Billing (Stacked Vertically) */}
            <div className="stack stack-6">
              <SubSection title="Billing Address" icon={Briefcase}>
                 <div className="stack stack-4">
                    <Checkbox label="Include Company Name (Bill To)" checked={data.pdfOptions.showCompanyBillTo} onChange={(val) => updatePdfOption('showCompanyBillTo', val)} />
                    <Checkbox label="Include Guest Name (Bill To)" checked={data.pdfOptions.showGuestInBillTo} onChange={(val) => updatePdfOption('showGuestInBillTo', val)} />
                 </div>
              </SubSection>

              <SubSection title="Branding (Logo)" icon={ImageIcon}>
                <Checkbox 
                  label="Display Logo on PDF" 
                  checked={data.pdfOptions.showLogo}
                  onChange={(val) => updatePdfOption('showLogo', val)}
                >
                  <div className="logo-upload-area mt-2">
                    <label className="logo-upload-btn">
                      <ImageIcon size={16} />
                      <span>Upload</span>
                      <input 
                        type="file" 
                        accept="image/*"
                        ref={logoInputRef}
                        onChange={handleLogoUpload}
                        className="hidden"
                      />
                    </label>
                    {data.pdfOptions.logoDataUrl ? (
                      <div className="logo-preview-wrap">
                        <img src={data.pdfOptions.logoDataUrl} alt="Logo Preview" className="logo-preview-img" />
                        <button 
                          onClick={removeLogo}
                          className="logo-remove-btn"
                        >
                          <X size={10} strokeWidth={3} />
                        </button>
                      </div>
                    ) : (
                      <span className="logo-no-file">No file selected</span>
                    )}
                  </div>
                </Checkbox>
              </SubSection>
            </div>

            {/* 3. Document Metadata & Layout */}
            <SubSection title="Document Layout & Metadata" icon={AlignJustify}>
               <div className="grid-2col">
                 
                 {/* Column 1: Signatures & Creator */}
                 <div className="stack stack-4">
                    <Checkbox 
                      label="Enable Authorized Signature Area" 
                      checked={data.pdfOptions.showSignatureArea}
                      onChange={(val) => updatePdfOption('showSignatureArea', val)}
                    >
                      <Input 
                        value={data.pdfOptions.authorizedSignatoryName || ''} 
                        onChange={(v) => updatePdfOption('authorizedSignatoryName', v)} 
                        placeholder="Signatory Name"
                        icon={PenTool}
                      />
                    </Checkbox>

                    <Checkbox 
                      label="Show 'Prepared By' Section" 
                      checked={data.pdfOptions.showCreatedBy}
                      onChange={(val) => updatePdfOption('showCreatedBy', val)}
                    >
                      <Input 
                        value={data.pdfOptions.createdByName} 
                        onChange={(v) => updatePdfOption('createdByName', v)} 
                        placeholder="Enter Name"
                        icon={User}
                      />
                    </Checkbox>
                 </div>

                 {/* Column 2: Overrides */}
                 <div className="stack stack-4">
                    <Checkbox 
                      label="Override Header Title" 
                      checked={data.pdfOptions.manualPOHeader}
                      onChange={(val) => updatePdfOption('manualPOHeader', val)}
                    >
                      <Input 
                        value={data.pdfOptions.poHeaderTitle} 
                        onChange={(v) => updatePdfOption('poHeaderTitle', v)} 
                        placeholder="e.g. BOOKING REQUEST"
                        icon={Type}
                      />
                    </Checkbox>

                    <Checkbox 
                      label="Override LPO Number" 
                      checked={data.pdfOptions.manualPONumber}
                      onChange={(val) => updatePdfOption('manualPONumber', val)}
                    >
                      <Input 
                        value={data.pdfOptions.poNumber} 
                        onChange={(v) => updatePdfOption('poNumber', v)} 
                        placeholder="Custom LPO #"
                        icon={Hash}
                      />
                    </Checkbox>

                     <Checkbox 
                      label="Include Supplier Ref #" 
                      checked={data.pdfOptions.showSupplierConfirmation}
                      onChange={(val) => updatePdfOption('showSupplierConfirmation', val)}
                    >
                      <Input 
                        value={data.pdfOptions.supplierConfirmationNumber} 
                        onChange={(v) => updatePdfOption('supplierConfirmationNumber', v)} 
                        placeholder="Confirmation #"
                        icon={FileSpreadsheet}
                      />
                    </Checkbox>

                    <Checkbox 
                      label="Apply Watermark" 
                      checked={!!data.pdfOptions.watermarkText}
                      onChange={(val) => updatePdfOption('watermarkText', val ? 'DRAFT' : '')}
                    >
                      <Input 
                        value={data.pdfOptions.watermarkText || ''} 
                        onChange={(v) => updatePdfOption('watermarkText', v)} 
                        placeholder="e.g. DRAFT or CANCELLED"
                        icon={Type}
                      />
                    </Checkbox>
                 </div>

               </div>
            </SubSection>

            {/* 4. Financial Presentation */}
            <div className="sub-section">
              <Label icon={FileText}>Financial Presentation Mode</Label>
              <div className="fin-mode-grid mt-4">
                {[
                  { id: 'none', icon: EyeOff, label: 'Hide Breakdown', desc: 'Total Amount Only' },
                  { id: 'average', icon: Calculator, label: 'Average Rate', desc: 'Daily Average + Total' },
                  { id: 'breakdown', icon: FileSpreadsheet, label: 'Full Breakdown', desc: 'Detailed Daily Rates' }
                ].map((mode) => (
                  <label key={mode.id} className="relative cursor-pointer group h-full">
                    <input 
                      type="radio" 
                      name="rateMode" 
                      checked={currentRateDisplayMode === mode.id} 
                      onChange={() => setRateDisplayMode(mode.id as any)}
                      className="hidden"
                    />
                    <div className={`fin-mode-card ${currentRateDisplayMode === mode.id ? 'fin-mode-card--active' : ''}`}>
                       <div className={`fin-mode-icon ${currentRateDisplayMode === mode.id ? 'fin-mode-icon--active' : ''}`}>
                         <mode.icon size={24} strokeWidth={1.5} />
                       </div>
                       <div>
                         <span className={`fin-mode-label ${currentRateDisplayMode === mode.id ? 'fin-mode-label--active' : ''}`}>{mode.label}</span>
                         <span className="fin-mode-desc">{mode.desc}</span>
                       </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

          </div>
        </Section>
      </div>
    </div>
  );
};

export default LPOForm;