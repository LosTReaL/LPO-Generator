import React from 'react';
import { 
  Building, User, Calendar, CreditCard, Calculator, 
  Wallet, Settings, Plus, Trash2, Upload, FileSignature 
} from 'lucide-react';
import { 
  Section, SubSection, Label, Input, Select, 
  TextArea, Checkbox, StatusBadge 
} from '../shared/SharedUI';
import { useToast } from '../shared/ToastContext';
import { 
  HotelInvoiceData, InvoiceLineItem, PaymentRecord, 
  CHARGE_CATEGORIES, PAYMENT_METHODS, HOTEL_INVOICE_CURRENCIES, 
  HotelGuestInfo 
} from '../../types/hotelInvoice';
import { generateId } from '../../services/dataUtils';

interface Props {
  data: HotelInvoiceData;
  onChange: (updates: Partial<HotelInvoiceData>) => void;
}

export const HotelInvoiceForm: React.FC<Props> = ({ data, onChange }) => {
  const { addToast } = useToast();

  // Handlers for primitive arrays
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Same limits as the Hotel LPO module: oversized images would blow the
      // localStorage quota on the next save and bloat every generated PDF.
      if (!file.type.startsWith('image/')) {
        addToast('Please select an image file.', 'error');
        e.target.value = '';
        return;
      }
      if (file.size > 500 * 1024) {
        addToast('File size too large. Please select an image under 500KB.', 'error');
        e.target.value = '';
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        onChange({ hotelLogo: reader.result as string, showLogo: true });
      };
      reader.onerror = () => {
        addToast('Failed to read the selected image.', 'error');
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePrimaryGuestChange = (field: keyof HotelGuestInfo, value: string) => {
    onChange({ primaryGuest: { ...data.primaryGuest, [field]: value } });
  };

  // Line items
  const addLineItem = () => {
    const newItem: InvoiceLineItem = {
      id: generateId(),
      category: 'Room',
      description: '',
      quantity: 1,
      rate: 0,
      amount: 0,
      date: new Date().toISOString().split('T')[0]
    };
    onChange({ lineItems: [...data.lineItems, newItem] });
  };

  const updateLineItem = (id: string, updates: Partial<InvoiceLineItem>) => {
    const newItems = data.lineItems.map(item => {
      if (item.id === id) {
        const updated = { ...item, ...updates };
        if (updates.quantity !== undefined || updates.rate !== undefined) {
          updated.amount = (updated.quantity || 0) * (updated.rate || 0);
        }
        return updated;
      }
      return item;
    });
    onChange({ lineItems: newItems });
  };

  const removeLineItem = (id: string) => {
    onChange({ lineItems: data.lineItems.filter(i => i.id !== id) });
  };

  // Payments
  const addPayment = () => {
    const newPayment: PaymentRecord = {
      id: generateId(),
      method: 'Credit Card',
      amount: 0,
      date: new Date().toISOString().split('T')[0],
      reference: ''
    };
    onChange({ payments: [...data.payments, newPayment] });
  };

  const updatePayment = (id: string, updates: Partial<PaymentRecord>) => {
    onChange({
      payments: data.payments.map(p => p.id === id ? { ...p, ...updates } : p)
    });
  };

  const removePayment = (id: string) => {
    onChange({ payments: data.payments.filter(p => p.id !== id) });
  };

  // Calculations
  const subtotal = data.lineItems.reduce((sum, item) => sum + item.amount, 0);
  const serviceChargeAmount = data.serviceChargeType === 'percentage' 
    ? subtotal * (data.serviceChargeRate / 100) 
    : data.serviceChargeRate;
  const taxableAmount = subtotal + serviceChargeAmount;
  const taxAmount = data.taxType === 'percentage' 
    ? taxableAmount * (data.taxRate / 100) 
    : data.taxRate;
  const discountAmount = data.discountType === 'percentage' 
    ? (taxableAmount + taxAmount) * (data.discountValue / 100) 
    : data.discountValue;
  const grandTotal = taxableAmount + taxAmount - discountAmount;
  
  const totalPaid = data.payments.reduce((sum, p) => sum + p.amount, 0);
  const balance = grandTotal - totalPaid;

  // Render categories breakdown for summary
  const categoryTotals = data.lineItems.reduce((acc, item) => {
    acc[item.category] = (acc[item.category] || 0) + item.amount;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="two-col-layout">
      {/* LEFT COLUMN */}
      <div className="layout-col layout-col-main">
        
        {/* Hotel Details */}
        <Section title="Hotel Information" icon={Building}>
          <div className="form-grid-2">
            <div>
              <Label>Hotel Name</Label>
              <Input value={data.hotelName} onChange={(v) => onChange({ hotelName: String(v) })} placeholder="e.g. The Grand Continental" />
            </div>
            <div>
              <Label>Logo</Label>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <label className="btn-ghost" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Upload size={14} /> Upload Logo
                  <input type="file" accept="image/*" onChange={handleLogoUpload} className="sr-only" aria-label="Upload hotel logo" />
                </label>
                {data.hotelLogo && (
                  <Checkbox label="Show Logo" checked={data.showLogo} onChange={c => onChange({ showLogo: c })} />
                )}
              </div>
            </div>
            <div className="col-span-2">
              <Label>Hotel Address</Label>
              <TextArea value={data.hotelAddress} onChange={(v) => onChange({ hotelAddress: v })} rows={2} />
            </div>
            <div>
              <Label>Phone Number</Label>
              <Input value={data.hotelPhone} onChange={(v) => onChange({ hotelPhone: String(v) })} />
            </div>
            <div>
              <Label>Email</Label>
              <Input value={data.hotelEmail} onChange={(v) => onChange({ hotelEmail: String(v) })} type="email" />
            </div>
          </div>
        </Section>

        {/* Guest Details */}
        <Section title="Guest Information" icon={User}>
          <SubSection title="Primary Guest">
            <div className="form-grid-2">
              <div>
                <Label>Guest Name</Label>
                <Input value={data.primaryGuest.name} onChange={(v) => handlePrimaryGuestChange('name', String(v))} placeholder="John Doe" />
              </div>
              <div>
                <Label>Loyalty / Member No.</Label>
                <Input value={data.primaryGuest.loyaltyNumber} onChange={(v) => handlePrimaryGuestChange('loyaltyNumber', String(v))} />
              </div>
            </div>
          </SubSection>

          <div className="form-grid-2" style={{ marginTop: '16px' }}>
            <div>
              <Label>Contact Phone</Label>
              <Input value={data.guestPhone} onChange={(v) => onChange({ guestPhone: String(v) })} />
            </div>
            <div>
              <Label>Contact Email</Label>
              <Input value={data.guestEmail} onChange={(v) => onChange({ guestEmail: String(v) })} type="email" />
            </div>
            <div className="col-span-2">
              <Label>Company Name (Bill To)</Label>
              <Input value={data.companyName} onChange={(v) => onChange({ companyName: String(v) })} placeholder="Leave blank if not applicable" />
            </div>
          </div>
        </Section>

        {/* Stay Details */}
        <Section title="Stay Details" icon={Calendar}>
          <div className="form-grid-3">
            <div>
              <Label>Check-In Date</Label>
              <input type="date" className="input-field" value={data.checkInDate ?? ''} onChange={(e) => onChange({ checkInDate: e.target.value })} />
            </div>
            <div>
              <Label>Check-Out Date</Label>
              <input type="date" className="input-field" value={data.checkOutDate ?? ''} onChange={(e) => onChange({ checkOutDate: e.target.value })} />
            </div>
            <div>
              <Label>Folio / Reg No.</Label>
              <Input value={data.folioNumber} onChange={(v) => onChange({ folioNumber: String(v) })} />
            </div>
            <div>
              <Label>Room Number</Label>
              <Input value={data.roomNumber} onChange={(v) => onChange({ roomNumber: String(v) })} />
            </div>
            <div className="col-span-2">
              <Label>Room Type</Label>
              <Input value={data.roomType} onChange={(v) => onChange({ roomType: String(v) })} placeholder="e.g. Deluxe Double Sea View" />
            </div>
          </div>
        </Section>

        {/* Charges */}
        <Section title="Charges" icon={CreditCard}>
          <div className="items-table-wrap">
            <table className="items-table">
              <thead>
                <tr>
                  <th style={{ width: '15%' }}>Date</th>
                  <th style={{ width: '20%' }}>Category</th>
                  <th style={{ width: '30%' }}>Description</th>
                  <th style={{ width: '10%' }}>Qty</th>
                  <th style={{ width: '12%' }}>Rate</th>
                  <th style={{ width: '13%' }}>Amount</th>
                  <th style={{ width: '5%' }}></th>
                </tr>
              </thead>
              <tbody>
                {data.lineItems.length === 0 && (
                  <tr>
                    <td colSpan={7}>
                      <div className="items-empty">No charges recorded for this invoice yet.</div>
                    </td>
                  </tr>
                )}
                {data.lineItems.map(item => (
                  <tr key={item.id}>
                    <td>
                      <input 
                        type="date" 
                        className="items-table-input" 
                        value={item.date} 
                        onChange={(e) => updateLineItem(item.id, { date: e.target.value })}
                      />
                    </td>
                    <td>
                      <select 
                        className="items-table-input"
                        value={item.category}
                        onChange={(e) => updateLineItem(item.id, { category: e.target.value as any })}
                      >
                        {CHARGE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </td>
                    <td>
                      <input 
                        type="text" 
                        className="items-table-input" 
                        value={item.description} 
                        onChange={(e) => updateLineItem(item.id, { description: e.target.value })}
                        placeholder="Detail..."
                      />
                    </td>
                    <td>
                      <input 
                        type="number" 
                        min="1"
                        className="items-table-input" 
                        value={item.quantity} 
                        onChange={(e) => updateLineItem(item.id, { quantity: Number(e.target.value) })}
                      />
                    </td>
                    <td>
                      <input 
                        type="number" 
                        min="0"
                        className="items-table-input" 
                        value={item.rate} 
                        onChange={(e) => updateLineItem(item.id, { rate: Number(e.target.value) })}
                      />
                    </td>
                    <td style={{ textAlign: 'right', paddingRight: '12px' }}>
                      {item.amount.toFixed(2)}
                    </td>
                    <td>
                      <button className="btn-icon" onClick={() => removeLineItem(item.id)} aria-label="Remove charge">
                        <Trash2 size={14} className="text-danger" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: '12px' }}>
            <button className="btn-ghost" onClick={addLineItem}>
              <Plus size={16} /> Add Charge
            </button>
          </div>
        </Section>

        {/* Payments */}
        <Section title="Payments" icon={Wallet}>
          <div className="items-table-wrap">
            <table className="items-table">
              <thead>
                <tr>
                  <th style={{ width: '20%' }}>Date</th>
                  <th style={{ width: '25%' }}>Method</th>
                  <th style={{ width: '30%' }}>Reference</th>
                  <th style={{ width: '20%' }}>Amount</th>
                  <th style={{ width: '5%' }}></th>
                </tr>
              </thead>
              <tbody>
                {data.payments.length === 0 && (
                  <tr>
                    <td colSpan={5}>
                      <div className="items-empty">No payments recorded yet.</div>
                    </td>
                  </tr>
                )}
                {data.payments.map(item => (
                  <tr key={item.id}>
                    <td>
                      <input 
                        type="date" 
                        className="items-table-input" 
                        value={item.date} 
                        onChange={(e) => updatePayment(item.id, { date: e.target.value })}
                      />
                    </td>
                    <td>
                      <select 
                        className="items-table-input"
                        value={item.method}
                        onChange={(e) => updatePayment(item.id, { method: e.target.value as any })}
                      >
                        {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </td>
                    <td>
                      <input 
                        type="text" 
                        className="items-table-input" 
                        value={item.reference} 
                        onChange={(e) => updatePayment(item.id, { reference: e.target.value })}
                        placeholder="Auth code/Ref..."
                      />
                    </td>
                    <td>
                      <input 
                        type="number" 
                        min="0"
                        className="items-table-input" 
                        value={item.amount} 
                        onChange={(e) => updatePayment(item.id, { amount: Number(e.target.value) })}
                      />
                    </td>
                    <td>
                      <button className="btn-icon" onClick={() => removePayment(item.id)} aria-label="Remove payment">
                        <Trash2 size={14} className="text-danger" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: '12px' }}>
            <button className="btn-ghost" onClick={addPayment}>
              <Plus size={16} /> Add Payment
            </button>
          </div>
        </Section>
        
        {/* Invoice Settings */}
        <Section title="Document Settings" icon={Settings}>
          <div className="form-grid-3">
            <div>
              <Label>Invoice Date</Label>
              <input type="date" className="input-field" value={data.invoiceDate ?? ''} onChange={(e) => onChange({ invoiceDate: e.target.value })} />
            </div>
            <div>
              <Label>Due Date</Label>
              <input type="date" className="input-field" value={data.dueDate ?? ''} onChange={(e) => onChange({ dueDate: e.target.value })} />
            </div>
            <div>
              <Label>Currency</Label>
              <Select value={data.currency} options={HOTEL_INVOICE_CURRENCIES} onChange={(v) => onChange({ currency: v })} />
            </div>
            <div>
              <Label>Status</Label>
              <Select 
                value={data.status} 
                options={['Draft', 'Sent', 'Paid', 'Partially Paid', 'Overdue', 'Cancelled']} 
                onChange={(v) => onChange({ status: v as any })} 
              />
            </div>
            <div className="col-span-2">
              <Label>Invoice Number</Label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <Input 
                  value={data.invoiceNumber} 
                  onChange={(v) => onChange({ invoiceNumber: String(v), manualInvoiceNumber: true })}
                  placeholder="Auto-generated if empty"
                  disabled={!data.manualInvoiceNumber && data.invoiceNumber === ''}
                />
                <Checkbox label="Manual" checked={data.manualInvoiceNumber} onChange={c => onChange({ manualInvoiceNumber: c })} />
              </div>
            </div>
          </div>

          <div style={{ marginTop: '16px' }}>
            <Label>Notes / Remarks</Label>
            <TextArea value={data.notes} onChange={v => onChange({ notes: v })} rows={3} placeholder="Thank you for staying with us..." />
          </div>

          <div style={{ marginTop: '16px' }}>
            <Checkbox label="Include Signature Block" checked={data.showSignature} onChange={c => onChange({ showSignature: c })}>
              <div style={{ marginTop: '8px', width: '50%' }}>
                <Label>Signatory Name</Label>
                <Input value={data.signatureName} onChange={v => onChange({ signatureName: String(v) })} placeholder="Front Desk / Manager" icon={FileSignature} />
              </div>
            </Checkbox>
          </div>

          <div style={{ marginTop: '16px' }}>
            <Checkbox label="Apply Watermark" checked={!!data.watermarkText} onChange={c => onChange({ watermarkText: c ? 'DRAFT' : '' })}>
              <div style={{ marginTop: '8px', width: '50%' }}>
                <Label>Watermark Text</Label>
                <Input value={data.watermarkText || ''} onChange={v => onChange({ watermarkText: String(v) })} placeholder="e.g. DRAFT" />
              </div>
            </Checkbox>
          </div>
        </Section>
      </div>

      {/* RIGHT COLUMN */}
      <div className="layout-col layout-col-side">
        <Section title="Taxes & Adjustments" icon={Calculator}>
          <SubSection title="Service Charge">
            <div className="form-grid-2">
              <div>
                <Label>Type</Label>
                <Select value={data.serviceChargeType} options={['percentage', 'flat']} onChange={v => onChange({ serviceChargeType: v as any })} />
              </div>
              <div>
                <Label>Rate/Amount</Label>
                <Input value={data.serviceChargeRate} onChange={v => onChange({ serviceChargeRate: Number(v) })} type="number" />
              </div>
            </div>
            <div style={{ marginTop: '8px' }}>
              <Label>Label</Label>
              <Input value={data.serviceChargeLabel} onChange={v => onChange({ serviceChargeLabel: String(v) })} />
            </div>
          </SubSection>

          <div style={{ margin: '16px 0' }} className="header-divider" />

          <SubSection title="Tax">
            <div className="form-grid-2">
              <div>
                <Label>Type</Label>
                <Select value={data.taxType} options={['percentage', 'flat']} onChange={v => onChange({ taxType: v as any })} />
              </div>
              <div>
                <Label>Rate/Amount</Label>
                <Input value={data.taxRate} onChange={v => onChange({ taxRate: Number(v) })} type="number" />
              </div>
            </div>
            <div style={{ marginTop: '8px' }}>
              <Label>Label</Label>
              <Input value={data.taxLabel} onChange={v => onChange({ taxLabel: String(v) })} />
            </div>
          </SubSection>
          
          <div style={{ margin: '16px 0' }} className="header-divider" />
          
          <SubSection title="Discount">
            <div className="form-grid-2">
              <div>
                <Label>Type</Label>
                <Select value={data.discountType} options={['percentage', 'flat']} onChange={v => onChange({ discountType: v as any })} />
              </div>
              <div>
                <Label>Value</Label>
                <Input value={data.discountValue} onChange={v => onChange({ discountValue: Number(v) })} type="number" />
              </div>
            </div>
            <div style={{ marginTop: '8px' }}>
              <Label>Label</Label>
              <Input value={data.discountLabel} onChange={v => onChange({ discountLabel: String(v) })} />
            </div>
          </SubSection>
        </Section>

        <div className="summary-card" style={{ position: 'sticky', top: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Summary</h3>
            <StatusBadge status={data.status} />
          </div>
          
          {Object.entries(categoryTotals).length > 0 && (
            <div style={{ marginBottom: '16px', fontSize: '12px' }}>
              <div style={{ fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>Breakdown</div>
              {Object.entries(categoryTotals).map(([cat, amt]) => (
                <div key={cat} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span>{cat}</span>
                  <span>{amt.toFixed(2)}</span>
                </div>
              ))}
              <div className="header-divider" style={{ margin: '8px 0' }} />
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Subtotal</span>
              <span style={{ fontWeight: 500 }}>{subtotal.toFixed(2)} {data.currency}</span>
            </div>
            
            {serviceChargeAmount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>{data.serviceChargeLabel}</span>
                <span>{serviceChargeAmount.toFixed(2)} {data.currency}</span>
              </div>
            )}
            
            {taxAmount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>{data.taxLabel}</span>
                <span>{taxAmount.toFixed(2)} {data.currency}</span>
              </div>
            )}
            
            {discountAmount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--danger)' }}>
                <span>{data.discountLabel}</span>
                <span>-{discountAmount.toFixed(2)} {data.currency}</span>
              </div>
            )}
            
            <div className="header-divider" style={{ margin: '4px 0' }} />
            
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: 700 }}>
              <span>Total</span>
              <span>{grandTotal.toFixed(2)} {data.currency}</span>
            </div>

            {totalPaid > 0 && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--success)', marginTop: '8px' }}>
                  <span>Paid Amount</span>
                  <span>{totalPaid.toFixed(2)} {data.currency}</span>
                </div>
                
                <div className="header-divider" style={{ margin: '4px 0' }} />
                
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', fontWeight: 700, color: balance > 0 ? 'var(--warning-text, #b45309)' : 'var(--text-main)' }}>
                  <span>Balance Due</span>
                  <span>{Math.max(0, balance).toFixed(2)} {data.currency}</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
