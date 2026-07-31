import React from 'react';
import { Building, Briefcase, FileText, CreditCard, Package, Settings, Plus, Trash2 } from 'lucide-react';
import { Section, SubSection, Label, Input, Select, TextArea, Checkbox, StatusBadge } from '../shared/SharedUI';
import { GeneralLPOData, LineItem, LPOStatus } from '../../types/generalLpo';

// In case UNIT_OPTIONS is not in types, defining a fallback
const UNIT_OPTIONS = [
  { value: 'pcs', label: 'Pieces (pcs)' },
  { value: 'kg', label: 'Kilograms (kg)' },
  { value: 'g', label: 'Grams (g)' },
  { value: 'l', label: 'Liters (l)' },
  { value: 'ml', label: 'Milliliters (ml)' },
  { value: 'm', label: 'Meters (m)' },
  { value: 'cm', label: 'Centimeters (cm)' },
  { value: 'box', label: 'Boxes (box)' },
  { value: 'pack', label: 'Packs (pack)' },
  { value: 'hr', label: 'Hours (hr)' },
  { value: 'day', label: 'Days (day)' },
  { value: 'month', label: 'Months (month)' },
];

const LPO_STATUS_OPTIONS = [
  { value: 'Draft', label: 'Draft' },
  { value: 'Pending Approval', label: 'Pending Approval' },
  { value: 'Approved', label: 'Approved' },
  { value: 'Sent to Supplier', label: 'Sent to Supplier' },
  { value: 'Partially Received', label: 'Partially Received' },
  { value: 'Completed', label: 'Completed' },
  { value: 'Cancelled', label: 'Cancelled' }
];

interface GeneralLPOFormProps {
  data: GeneralLPOData;
  onChange: (data: GeneralLPOData) => void;
}

export const GeneralLPOForm: React.FC<GeneralLPOFormProps> = ({ data, onChange }) => {
  const handleChange = (field: keyof GeneralLPOData, value: any) => {
    onChange({ ...data, [field]: value });
  };

  const handleNestedChange = (parent: keyof GeneralLPOData, field: string, value: any) => {
    onChange({
      ...data,
      [parent]: {
        ...(data[parent] as any),
        [field]: value
      }
    });
  };

  const addItem = () => {
    const newItem: LineItem = {
      id: Math.random().toString(36).substring(2, 9),
      description: '',
      quantity: 1,
      unit: 'pcs',
      unitPrice: 0,
      total: 0
    };
    handleChange('items', [...data.items, newItem]);
  };

  const updateItem = (id: string, field: keyof LineItem, value: any) => {
    const updatedItems = data.items.map((item) => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value };
        if (field === 'quantity' || field === 'unitPrice') {
          updatedItem.total = Number(updatedItem.quantity || 0) * Number(updatedItem.unitPrice || 0);
        }
        return updatedItem;
      }
      return item;
    });
    handleChange('items', updatedItems);
  };

  const removeItem = (id: string) => {
    handleChange('items', data.items.filter(item => item.id !== id));
  };

  // Calculate totals
  const subtotal = data.items.reduce((sum, item) => sum + (item.total || 0), 0);
  
  let discountAmount = 0;
  if (data.discountType === 'percentage') {
    discountAmount = subtotal * (Number(data.discountValue) / 100);
  } else {
    discountAmount = Number(data.discountValue || 0);
  }

  const taxableAmount = subtotal - discountAmount;
  
  let taxAmount = 0;
  if (data.taxType === 'percentage') {
    taxAmount = taxableAmount * (Number(data.taxRate) / 100);
  } else {
    taxAmount = Number(data.taxRate || 0);
  }

  const shippingAmount = Number(data.shippingCharges || 0);
  const grandTotal = subtotal - discountAmount + taxAmount + shippingAmount;

  return (
    <div className="two-col-layout">
      <div className="left-col">
        <Section title="Company Information" icon={<Building size={18} />}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Label text="Company Name">
              <Input
                value={data.companyInfo?.name || ''}
                onChange={(e) => handleNestedChange('companyInfo', 'name', e.target.value)}
                placeholder="Enter company name"
              />
            </Label>
            <Label text="Email">
              <Input
                type="email"
                value={data.companyInfo?.email || ''}
                onChange={(e) => handleNestedChange('companyInfo', 'email', e.target.value)}
                placeholder="Enter email address"
              />
            </Label>
            <Label text="Phone">
              <Input
                value={data.companyInfo?.phone || ''}
                onChange={(e) => handleNestedChange('companyInfo', 'phone', e.target.value)}
                placeholder="Enter phone number"
              />
            </Label>
            <div style={{ gridColumn: '1 / -1' }}>
              <Label text="Address">
                <TextArea
                  value={data.companyInfo?.address || ''}
                  onChange={(e) => handleNestedChange('companyInfo', 'address', e.target.value)}
                  placeholder="Enter full address"
                  rows={2}
                />
              </Label>
            </div>
          </div>
        </Section>

        <Section title="Supplier Information" icon={<Briefcase size={18} />}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Label text="Supplier Name">
              <Input
                value={data.supplierInfo?.name || ''}
                onChange={(e) => handleNestedChange('supplierInfo', 'name', e.target.value)}
                placeholder="Enter supplier name"
              />
            </Label>
            <Label text="Contact Person">
              <Input
                value={data.supplierInfo?.contactPerson || ''}
                onChange={(e) => handleNestedChange('supplierInfo', 'contactPerson', e.target.value)}
                placeholder="Enter contact person"
              />
            </Label>
            <Label text="Email">
              <Input
                type="email"
                value={data.supplierInfo?.email || ''}
                onChange={(e) => handleNestedChange('supplierInfo', 'email', e.target.value)}
                placeholder="Enter email address"
              />
            </Label>
            <Label text="Phone">
              <Input
                value={data.supplierInfo?.phone || ''}
                onChange={(e) => handleNestedChange('supplierInfo', 'phone', e.target.value)}
                placeholder="Enter phone number"
              />
            </Label>
            <Label text="Tax ID / VAT No.">
              <Input
                value={data.supplierInfo?.taxId || ''}
                onChange={(e) => handleNestedChange('supplierInfo', 'taxId', e.target.value)}
                placeholder="Enter Tax/VAT ID"
              />
            </Label>
            <div style={{ gridColumn: '1 / -1' }}>
              <Label text="Address">
                <TextArea
                  value={data.supplierInfo?.address || ''}
                  onChange={(e) => handleNestedChange('supplierInfo', 'address', e.target.value)}
                  placeholder="Enter full address"
                  rows={2}
                />
              </Label>
            </div>
          </div>
        </Section>

        <Section title="Line Items" icon={<FileText size={18} />}>
          <div className="items-table-wrap">
            <table className="items-table">
              <thead>
                <tr>
                  <th style={{ width: '40%' }}>Description</th>
                  <th style={{ width: '12%' }}>Qty</th>
                  <th style={{ width: '15%' }}>Unit</th>
                  <th style={{ width: '15%' }}>Unit Price</th>
                  <th style={{ width: '15%' }}>Total</th>
                  <th style={{ width: '3%' }}></th>
                </tr>
              </thead>
              <tbody>
                {data.items?.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <Input
                        className="items-table-input"
                        value={item.description}
                        onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                        placeholder="Item description"
                      />
                    </td>
                    <td>
                      <Input
                        className="items-table-input"
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value))}
                      />
                    </td>
                    <td>
                      <Select
                        className="items-table-input"
                        value={item.unit}
                        onChange={(e) => updateItem(item.id, 'unit', e.target.value)}
                        options={UNIT_OPTIONS}
                      />
                    </td>
                    <td>
                      <Input
                        className="items-table-input"
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unitPrice}
                        onChange={(e) => updateItem(item.id, 'unitPrice', parseFloat(e.target.value))}
                      />
                    </td>
                    <td style={{ textAlign: 'right', paddingRight: '0.5rem', fontWeight: 500 }}>
                      {item.total?.toFixed(2)}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button 
                        type="button" 
                        onClick={() => removeItem(item.id)}
                        className="btn-ghost" 
                        style={{ padding: '0.25rem', color: 'var(--danger-color)' }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button 
            type="button" 
            className="btn-ghost" 
            onClick={addItem}
            style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Plus size={16} /> Add Item
          </button>
        </Section>
      </div>

      <div className="right-col">
        <Section title="Financial Configuration" icon={<CreditCard size={18} />}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <Label text="Currency">
              <Input
                value={data.currency || 'USD'}
                onChange={(e) => handleChange('currency', e.target.value)}
                placeholder="e.g. USD, EUR, AED"
              />
            </Label>
            
            <SubSection title="Discount">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '0.5rem' }}>
                <Select
                  value={data.discountType || 'flat'}
                  onChange={(e) => handleChange('discountType', e.target.value)}
                  options={[
                    { value: 'flat', label: 'Amount' },
                    { value: 'percentage', label: 'Percentage (%)' }
                  ]}
                />
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={data.discountValue || 0}
                  onChange={(e) => handleChange('discountValue', parseFloat(e.target.value))}
                />
              </div>
            </SubSection>

            <SubSection title="Tax Settings">
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <div style={{ flex: 1 }}>
                  <Label text="Tax Label">
                    <Input
                      value={data.taxLabel || 'Tax'}
                      onChange={(e) => handleChange('taxLabel', e.target.value)}
                      placeholder="e.g. VAT, GST"
                    />
                  </Label>
                </div>
                <div style={{ flex: 1 }}>
                  <Label text="Tax Rate">
                    <div style={{ display: 'flex' }}>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={data.taxRate || 0}
                        onChange={(e) => handleChange('taxRate', parseFloat(e.target.value))}
                        style={{ borderRight: 'none', borderTopRightRadius: 0, borderBottomRightRadius: 0 }}
                      />
                      <Select
                        value={data.taxType || 'percentage'}
                        onChange={(e) => handleChange('taxType', e.target.value)}
                        options={[
                          { value: 'percentage', label: '%' },
                          { value: 'flat', label: 'Flat' }
                        ]}
                        style={{ width: '80px', borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }}
                      />
                    </div>
                  </Label>
                </div>
              </div>
            </SubSection>

            <Label text="Shipping Charges">
              <Input
                type="number"
                min="0"
                step="0.01"
                value={data.shippingCharges || 0}
                onChange={(e) => handleChange('shippingCharges', parseFloat(e.target.value))}
              />
            </Label>
          </div>
        </Section>

        <Section title="Order Tracking" icon={<Package size={18} />}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <Label text="Status">
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <Select
                  value={data.status || 'Draft'}
                  onChange={(e) => handleChange('status', e.target.value as LPOStatus)}
                  options={LPO_STATUS_OPTIONS}
                  style={{ flex: 1 }}
                />
                <StatusBadge status={data.status || 'Draft'} />
              </div>
            </Label>
            <Label text="Expected Delivery Date">
              <Input
                type="date"
                value={data.expectedDeliveryDate || ''}
                onChange={(e) => handleChange('expectedDeliveryDate', e.target.value)}
              />
            </Label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <Label text="Approved By">
                <Input
                  value={data.approvedBy || ''}
                  onChange={(e) => handleChange('approvedBy', e.target.value)}
                  placeholder="Name"
                />
              </Label>
              <Label text="Approval Date">
                <Input
                  type="date"
                  value={data.approvalDate || ''}
                  onChange={(e) => handleChange('approvalDate', e.target.value)}
                />
              </Label>
            </div>
            <Label text="Delivery Notes">
              <TextArea
                value={data.deliveryNotes || ''}
                onChange={(e) => handleChange('deliveryNotes', e.target.value)}
                placeholder="Special instructions for delivery"
                rows={2}
              />
            </Label>
          </div>
        </Section>

        <Section title="Document Settings" icon={<Settings size={18} />}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <Label text="Manual LPO Number Override (Optional)">
              <Input
                value={data.lpoNumberOverride || ''}
                onChange={(e) => handleChange('lpoNumberOverride', e.target.value)}
                placeholder="Leave blank to auto-generate"
              />
            </Label>
            <Label text="Notes">
              <TextArea
                value={data.notes || ''}
                onChange={(e) => handleChange('notes', e.target.value)}
                placeholder="General notes"
                rows={2}
              />
            </Label>
            <Label text="Terms & Conditions">
              <TextArea
                value={data.termsAndConditions || ''}
                onChange={(e) => handleChange('termsAndConditions', e.target.value)}
                placeholder="Terms and conditions"
                rows={3}
              />
            </Label>
            <Label text="Logo URL / Base64 (Optional)">
              <Input
                value={data.logoUpload || ''}
                onChange={(e) => handleChange('logoUpload', e.target.value)}
                placeholder="Paste logo URL or Base64 string"
              />
            </Label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
              <Checkbox
                checked={!!data.includeSignature}
                onChange={(e) => handleChange('includeSignature', e.target.checked)}
                id="includeSignature"
              />
              <label htmlFor="includeSignature" style={{ cursor: 'pointer', fontSize: '0.9rem' }}>
                Include Signature Area
              </label>
            </div>
            {data.includeSignature && (
              <Label text="Signatory Name">
                <Input
                  value={data.signatureName || ''}
                  onChange={(e) => handleChange('signatureName', e.target.value)}
                  placeholder="Name of authorized person"
                />
              </Label>
            )}
          </div>
        </Section>

        <div className="summary-card">
          <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
            Order Summary
          </h3>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span>Subtotal:</span>
            <span>{subtotal.toFixed(2)} {data.currency || 'USD'}</span>
          </div>
          {discountAmount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: 'var(--danger-color)' }}>
              <span>Discount:</span>
              <span>-{discountAmount.toFixed(2)} {data.currency || 'USD'}</span>
            </div>
          )}
          {taxAmount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span>{data.taxLabel || 'Tax'}:</span>
              <span>{taxAmount.toFixed(2)} {data.currency || 'USD'}</span>
            </div>
          )}
          {shippingAmount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span>Shipping:</span>
              <span>{shippingAmount.toFixed(2)} {data.currency || 'USD'}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem', paddingTop: '0.5rem', borderTop: '2px solid var(--border-color)', fontWeight: 'bold', fontSize: '1.2rem' }}>
            <span>Grand Total:</span>
            <span>{grandTotal.toFixed(2)} {data.currency || 'USD'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
