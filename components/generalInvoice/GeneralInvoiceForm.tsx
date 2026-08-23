import React from 'react';
import { 
  Building2, User, FileText, CreditCard, Wallet, 
  Settings, RefreshCw, Plus, Trash2, Calendar, FileDigit
} from 'lucide-react';
import { GeneralInvoiceData, InvoiceItem, GenPaymentRecord, CreditNote, GEN_INVOICE_CURRENCIES, GeneralInvoiceStatus } from '../../types/generalInvoice';
import { Section, Label, Input, Select, TextArea, Checkbox, StatusBadge } from '../shared/SharedUI';

interface Props {
  data: GeneralInvoiceData;
  setData: React.Dispatch<React.SetStateAction<GeneralInvoiceData>>;
}

export const GeneralInvoiceForm: React.FC<Props> = ({ data, setData }) => {

  const updateField = <K extends keyof GeneralInvoiceData>(field: K, value: GeneralInvoiceData[K]) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  const updateCustomer = <K extends keyof GeneralInvoiceData['customer']>(field: K, value: GeneralInvoiceData['customer'][K]) => {
    setData(prev => ({ ...prev, customer: { ...prev.customer, [field]: value } }));
  };

  const updateRecurring = <K extends keyof GeneralInvoiceData['recurring']>(field: K, value: GeneralInvoiceData['recurring'][K]) => {
    setData(prev => ({ ...prev, recurring: { ...prev.recurring, [field]: value } }));
  };

  // Items
  const addItem = () => {
    const newItem: InvoiceItem = {
      id: Date.now().toString(),
      description: '',
      quantity: 1,
      unitPrice: 0,
      taxRate: 0,
      discount: 0,
      total: 0
    };
    setData(prev => ({ ...prev, items: [...prev.items, newItem] }));
  };

  const updateItem = (index: number, field: keyof InvoiceItem, value: any) => {
    setData(prev => {
      const newItems = [...prev.items];
      newItems[index] = { ...newItems[index], [field]: value };
      
      // Auto-calc total
      const item = newItems[index];
      const subtotal = item.quantity * item.unitPrice;
      const taxAmount = prev.usePerItemTax ? subtotal * (item.taxRate / 100) : 0;
      item.total = subtotal + taxAmount - item.discount;
      
      return { ...prev, items: newItems };
    });
  };

  const removeItem = (index: number) => {
    setData(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));
  };

  // Payments
  const addPayment = () => {
    const newPayment: GenPaymentRecord = {
      id: Date.now().toString(),
      method: 'Bank Transfer',
      amount: 0,
      date: new Date().toISOString().split('T')[0],
      reference: ''
    };
    setData(prev => ({ ...prev, payments: [...prev.payments, newPayment] }));
  };

  const updatePayment = (index: number, field: keyof GenPaymentRecord, value: any) => {
    setData(prev => {
      const newPayments = [...prev.payments];
      newPayments[index] = { ...newPayments[index], [field]: value };
      return { ...prev, payments: newPayments };
    });
  };

  const removePayment = (index: number) => {
    setData(prev => ({ ...prev, payments: prev.payments.filter((_, i) => i !== index) }));
  };

  // Credit Notes
  const addCreditNote = () => {
    const newCreditNote: CreditNote = {
      id: Date.now().toString(),
      amount: 0,
      reason: '',
      date: new Date().toISOString().split('T')[0],
    };
    setData(prev => ({ ...prev, creditNotes: [...prev.creditNotes, newCreditNote] }));
  };

  const updateCreditNote = (index: number, field: keyof CreditNote, value: any) => {
    setData(prev => {
      const newNotes = [...prev.creditNotes];
      newNotes[index] = { ...newNotes[index], [field]: value };
      return { ...prev, creditNotes: newNotes };
    });
  };

  const removeCreditNote = (index: number) => {
    setData(prev => ({ ...prev, creditNotes: prev.creditNotes.filter((_, i) => i !== index) }));
  };


  // Calculations
  const calculateTotals = () => {
    let subtotal = 0;
    let itemTax = 0;
    
    data.items.forEach(item => {
      const itemSub = item.quantity * item.unitPrice;
      subtotal += itemSub - item.discount;
      if (data.usePerItemTax) {
        itemTax += itemSub * (item.taxRate / 100);
      }
    });

    const globalDiscount = data.discountType === 'flat' 
      ? data.discountValue 
      : subtotal * (data.discountValue / 100);

    const taxableAmount = subtotal - globalDiscount;
    
    const globalTax = !data.usePerItemTax
      ? (data.globalTaxType === 'flat' ? data.globalTaxRate : taxableAmount * (data.globalTaxRate / 100))
      : 0;

    const totalTax = data.usePerItemTax ? itemTax : globalTax;
    
    const creditNotesTotal = data.creditNotes.reduce((sum, n) => sum + n.amount, 0);
    const paymentsTotal = data.payments.reduce((sum, p) => sum + p.amount, 0);

    const grandTotal = taxableAmount + totalTax + data.shippingCharges - creditNotesTotal;
    const balance = grandTotal - paymentsTotal;

    return { subtotal, globalDiscount, totalTax, creditNotesTotal, grandTotal, paymentsTotal, balance };
  };

  const totals = calculateTotals();

  return (
    <div className="two-col-layout">
      {/* LEFT COLUMN */}
      <div className="layout-col">
        
        {/* SELLER / COMPANY */}
        <Section icon={Building2} title="Company (Seller) Details">
          <div className="form-grid">
            <div className="form-group">
              <Label>Company Name</Label>
              <Input value={data.companyName} onChange={v => updateField('companyName', v as string)} placeholder="e.g. Acme Corp" />
            </div>
            <div className="form-group">
              <Label>Tax ID / VAT No.</Label>
              <Input value={data.companyTaxId} onChange={v => updateField('companyTaxId', v as string)} placeholder="e.g. TRN1234567" />
            </div>
            <div className="form-group full-width">
              <Label>Address</Label>
              <TextArea value={data.companyAddress} onChange={v => updateField('companyAddress', v)} placeholder="Company full address..." rows={2} />
            </div>
            <div className="form-group">
              <Label>Email</Label>
              <Input value={data.companyEmail} onChange={v => updateField('companyEmail', v as string)} placeholder="billing@acme.com" type="email" />
            </div>
            <div className="form-group">
              <Label>Phone</Label>
              <Input value={data.companyPhone} onChange={v => updateField('companyPhone', v as string)} placeholder="+1 234 567 890" />
            </div>
            <div className="form-group full-width">
              <Label>Bank Details</Label>
              <TextArea value={data.bankDetails} onChange={v => updateField('bankDetails', v)} placeholder="Bank Name, IBAN, SWIFT..." rows={2} />
            </div>
          </div>
        </Section>

        {/* CUSTOMER */}
        <Section icon={User} title="Customer Details">
          <div className="form-grid">
            <div className="form-group">
              <Label>Customer Name</Label>
              <Input value={data.customer.name} onChange={v => updateCustomer('name', v as string)} placeholder="John Doe or Company Ltd" />
            </div>
            <div className="form-group">
              <Label>Tax ID</Label>
              <Input value={data.customer.taxId} onChange={v => updateCustomer('taxId', v as string)} placeholder="Customer Tax ID" />
            </div>
            <div className="form-group full-width">
              <Label>Address</Label>
              <TextArea value={data.customer.address} onChange={v => updateCustomer('address', v)} placeholder="Customer full address..." rows={2} />
            </div>
            <div className="form-group">
              <Label>Email</Label>
              <Input value={data.customer.email} onChange={v => updateCustomer('email', v as string)} type="email" placeholder="customer@email.com" />
            </div>
            <div className="form-group">
              <Label>Phone</Label>
              <Input value={data.customer.phone} onChange={v => updateCustomer('phone', v as string)} placeholder="+1 987 654 321" />
            </div>
          </div>
        </Section>

        {/* LINE ITEMS */}
        <Section icon={FileText} title="Invoice Items">
          <div className="items-list">
            {data.items.map((item, index) => (
              <div key={item.id} className="item-card">
                <div className="item-card-header">
                  <span className="item-card-number">Item {index + 1}</span>
                  <button onClick={() => removeItem(index)} className="btn-icon btn-icon-danger" aria-label="Remove item">
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="form-grid">
                  <div className="form-group full-width">
                    <Label>Description</Label>
                    <Input value={item.description} onChange={v => updateItem(index, 'description', v)} placeholder="Product or service description..." />
                  </div>
                  <div className="form-group">
                    <Label>Quantity</Label>
                    <Input value={item.quantity} onChange={v => updateItem(index, 'quantity', v)} type="number" min={1} />
                  </div>
                  <div className="form-group">
                    <Label>Unit Price</Label>
                    <Input value={item.unitPrice} onChange={v => updateItem(index, 'unitPrice', v)} type="number" min={0} />
                  </div>
                  {data.usePerItemTax && (
                    <div className="form-group">
                      <Label>Tax Rate (%)</Label>
                      <Input value={item.taxRate} onChange={v => updateItem(index, 'taxRate', v)} type="number" min={0} />
                    </div>
                  )}
                  <div className="form-group">
                    <Label>Discount</Label>
                    <Input value={item.discount} onChange={v => updateItem(index, 'discount', v)} type="number" min={0} />
                  </div>
                  <div className="form-group">
                    <Label>Total</Label>
                    <div style={{ padding: '0.5rem 0', fontSize: '1.125rem', fontWeight: 600 }}>
                      {item.total.toFixed(2)} {data.currency}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            <button onClick={addItem} className="btn btn-outline full-width">
              <Plus size={16} /> Add Item
            </button>
          </div>
        </Section>
        
        {/* PAYMENTS */}
        <Section icon={Wallet} title="Payments Received">
          <div className="items-list">
            {data.payments.map((payment, index) => (
              <div key={payment.id} className="item-card">
                 <div className="item-card-header">
                  <span className="item-card-number">Payment {index + 1}</span>
                  <button onClick={() => removePayment(index)} className="btn-icon btn-icon-danger" aria-label="Remove payment">
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="form-grid">
                  <div className="form-group">
                    <Label>Method</Label>
                    <Select 
                      value={payment.method} 
                      onChange={v => updatePayment(index, 'method', v)}
                      options={['Cash', 'Credit Card', 'Bank Transfer', 'Online Payment', 'Cheque', 'Other']} 
                    />
                  </div>
                  <div className="form-group">
                    <Label>Date</Label>
                    <input 
                      type="date" 
                      className="input-field" 
                      value={payment.date} 
                      onChange={e => updatePayment(index, 'date', e.target.value)} 
                    />
                  </div>
                  <div className="form-group">
                    <Label>Amount ({data.currency})</Label>
                    <Input value={payment.amount} onChange={v => updatePayment(index, 'amount', v)} type="number" min={0} />
                  </div>
                  <div className="form-group">
                    <Label>Reference</Label>
                    <Input value={payment.reference} onChange={v => updatePayment(index, 'reference', v)} placeholder="Transaction ID, Cheque #..." />
                  </div>
                </div>
              </div>
            ))}
            <button onClick={addPayment} className="btn btn-outline full-width">
              <Plus size={16} /> Add Payment
            </button>
          </div>
        </Section>

      </div>

      {/* RIGHT COLUMN */}
      <div className="layout-col">
        
        {/* SETTINGS */}
        <Section icon={Settings} title="Invoice Settings">
           <div className="form-grid">
            <div className="form-group full-width">
              <Checkbox label="Manual Invoice Number" checked={data.manualInvoiceNumber} onChange={v => updateField('manualInvoiceNumber', v)}>
                <div className="mt-2">
                  <Input value={data.invoiceNumber} onChange={v => updateField('invoiceNumber', v as string)} icon={FileDigit} placeholder="e.g. INV-2023-001" />
                </div>
              </Checkbox>
            </div>
            
            <div className="form-group">
              <Label icon={Calendar}>Invoice Date</Label>
              <input type="date" className="input-field" value={data.invoiceDate} onChange={e => updateField('invoiceDate', e.target.value)} />
            </div>
            <div className="form-group">
              <Label icon={Calendar}>Due Date</Label>
              <input type="date" className="input-field" value={data.dueDate} onChange={e => updateField('dueDate', e.target.value)} />
            </div>
            <div className="form-group">
              <Label>Status</Label>
              <Select 
                value={data.status} 
                onChange={v => updateField('status', v as GeneralInvoiceStatus)}
                options={['Draft', 'Sent', 'Paid', 'Overdue', 'Cancelled']}
              />
            </div>
            <div className="form-group full-width">
              <Checkbox label="Show Signature Section" checked={data.showSignature} onChange={v => updateField('showSignature', v)}>
                <div className="mt-2">
                   <Input value={data.signatureName} onChange={v => updateField('signatureName', v as string)} placeholder="Signatory Name" />
                </div>
              </Checkbox>
            </div>
            <div className="form-group full-width">
              <Label>Notes</Label>
              <TextArea value={data.notes} onChange={v => updateField('notes', v)} placeholder="Additional notes..." rows={2} />
            </div>
            <div className="form-group full-width">
              <Label>Terms & Conditions</Label>
              <TextArea value={data.termsAndConditions} onChange={v => updateField('termsAndConditions', v)} placeholder="Terms and conditions..." rows={2} />
            </div>
            
            <div className="form-group full-width">
              <Checkbox label="Apply Watermark" checked={!!data.watermarkText} onChange={v => updateField('watermarkText', v ? 'DRAFT' : '')}>
                <div className="mt-2">
                   <Input value={data.watermarkText || ''} onChange={v => updateField('watermarkText', v as string)} placeholder="e.g. DRAFT or CANCELLED" />
                </div>
              </Checkbox>
            </div>
           </div>
        </Section>

        {/* FINANCIALS */}
        <Section icon={CreditCard} title="Financial Settings">
          <div className="form-grid">
            <div className="form-group">
              <Label>Currency</Label>
              <Select value={data.currency} onChange={v => updateField('currency', v)} options={GEN_INVOICE_CURRENCIES} />
            </div>
            <div className="form-group">
              <Label>Shipping / Handling</Label>
              <Input value={data.shippingCharges} onChange={v => updateField('shippingCharges', v as number)} type="number" min={0} />
            </div>
            <div className="form-group full-width">
              <Checkbox label="Use Per-Item Tax (Instead of Global)" checked={data.usePerItemTax} onChange={v => updateField('usePerItemTax', v)} />
            </div>
            
            {!data.usePerItemTax && (
              <>
                <div className="form-group">
                  <Label>Tax Type</Label>
                  <Select value={data.globalTaxType} onChange={v => updateField('globalTaxType', v as any)} options={['percentage', 'flat']} />
                </div>
                <div className="form-group">
                  <Label>Tax Rate/Amount</Label>
                  <Input value={data.globalTaxRate} onChange={v => updateField('globalTaxRate', v as number)} type="number" min={0} />
                </div>
                <div className="form-group full-width">
                  <Label>Tax Label (e.g. VAT, GST)</Label>
                  <Input value={data.globalTaxLabel} onChange={v => updateField('globalTaxLabel', v as string)} />
                </div>
              </>
            )}

            <div className="form-group">
              <Label>Global Discount Type</Label>
              <Select value={data.discountType} onChange={v => updateField('discountType', v as any)} options={['percentage', 'flat']} />
            </div>
            <div className="form-group">
              <Label>Discount Value</Label>
              <Input value={data.discountValue} onChange={v => updateField('discountValue', v as number)} type="number" min={0} />
            </div>
          </div>
        </Section>
        
        {/* CREDIT NOTES */}
        <Section icon={FileText} title="Credit Notes">
           <div className="items-list">
            {data.creditNotes.map((note, index) => (
              <div key={note.id} className="item-card">
                 <div className="item-card-header">
                  <span className="item-card-number">Credit Note {index + 1}</span>
                  <button onClick={() => removeCreditNote(index)} className="btn-icon btn-icon-danger" aria-label="Remove credit note">
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="form-grid">
                  <div className="form-group">
                    <Label>Date</Label>
                    <input type="date" className="input-field" value={note.date} onChange={e => updateCreditNote(index, 'date', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <Label>Amount ({data.currency})</Label>
                    <Input value={note.amount} onChange={v => updateCreditNote(index, 'amount', v)} type="number" min={0} />
                  </div>
                  <div className="form-group full-width">
                    <Label>Reason</Label>
                    <Input value={note.reason} onChange={v => updateCreditNote(index, 'reason', v as string)} placeholder="e.g. Return, Overcharge..." />
                  </div>
                </div>
              </div>
            ))}
            <button onClick={addCreditNote} className="btn btn-outline full-width">
              <Plus size={16} /> Add Credit Note
            </button>
          </div>
        </Section>

        {/* RECURRING */}
        <Section icon={RefreshCw} title="Recurring Settings">
          <Checkbox label="Enable Recurring Invoice" checked={data.recurring.enabled} onChange={v => updateRecurring('enabled', v)}>
             <div className="form-grid mt-3">
               <div className="form-group">
                 <Label>Frequency</Label>
                 <Select 
                   value={data.recurring.frequency ?? ''} 
                   onChange={v => updateRecurring('frequency', v as any)}
                   options={['weekly', 'monthly', 'quarterly', 'yearly']} 
                 />
               </div>
               <div className="form-group">
                 <Label>Next Invoice Date</Label>
                 <input type="date" className="input-field" value={data.recurring.nextDate} onChange={e => updateRecurring('nextDate', e.target.value)} />
               </div>
             </div>
          </Checkbox>
        </Section>

        {/* SUMMARY CARD */}
        <div className="summary-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700 }}>Summary</h3>
            <StatusBadge status={data.status} />
          </div>

          <div className="summary-card-row">
            <span className="summary-card-label">Subtotal</span>
            <span className="summary-card-value">{totals.subtotal.toFixed(2)} {data.currency}</span>
          </div>
          {totals.globalDiscount > 0 && (
            <div className="summary-card-row">
              <span className="summary-card-label">Discount</span>
              <span className="summary-card-value" style={{ color: 'var(--emerald-200)' }}>-{totals.globalDiscount.toFixed(2)} {data.currency}</span>
            </div>
          )}
          {totals.totalTax > 0 && (
            <div className="summary-card-row">
              <span className="summary-card-label">{data.usePerItemTax ? 'Tax' : data.globalTaxLabel}</span>
              <span className="summary-card-value">{totals.totalTax.toFixed(2)} {data.currency}</span>
            </div>
          )}
          {data.shippingCharges > 0 && (
            <div className="summary-card-row">
              <span className="summary-card-label">Shipping/Handling</span>
              <span className="summary-card-value">{data.shippingCharges.toFixed(2)} {data.currency}</span>
            </div>
          )}
          {totals.creditNotesTotal > 0 && (
            <div className="summary-card-row">
              <span className="summary-card-label">Credit Notes Applied</span>
              <span className="summary-card-value" style={{ color: 'var(--rose-300)' }}>-{totals.creditNotesTotal.toFixed(2)} {data.currency}</span>
            </div>
          )}

          <div className="summary-card-row summary-card-total">
            <span className="summary-card-label" style={{ color: 'white', fontWeight: 700 }}>Grand Total</span>
            <span className="summary-card-value">{totals.grandTotal.toFixed(2)} {data.currency}</span>
          </div>

          {totals.paymentsTotal > 0 && (
            <div className="summary-card-row">
              <span className="summary-card-label">Amount Paid</span>
              <span className="summary-card-value" style={{ color: 'var(--emerald-200)' }}>{totals.paymentsTotal.toFixed(2)} {data.currency}</span>
            </div>
          )}

          {totals.paymentsTotal > 0 && (
            <div className="summary-card-row">
              <span className="summary-card-label" style={{ color: 'white', fontWeight: 700 }}>Balance Due</span>
              <span className="summary-card-value">{totals.balance.toFixed(2)} {data.currency}</span>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
