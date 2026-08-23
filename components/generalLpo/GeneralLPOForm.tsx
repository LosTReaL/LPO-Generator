import React from 'react';
import { Building, Briefcase, FileText, CreditCard, Package, Settings, Plus, Trash2 } from 'lucide-react';
import { Section, SubSection, Label, Input, Select, TextArea, Checkbox, StatusBadge } from '../shared/SharedUI';
import { GeneralLPOData, LineItem, LPOStatus, UNIT_OPTIONS, CURRENCY_LIST } from '../../types/generalLpo';

const LPO_STATUS_OPTIONS: LPOStatus[] = [
  'Draft',
  'Pending Approval',
  'Approved',
  'Sent to Supplier',
  'Partially Received',
  'Completed',
  'Cancelled'
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

  const items = data.items ?? [];

  const addItem = () => {
    const newItem: LineItem = {
      id: Math.random().toString(36).substring(2, 9),
      description: '',
      quantity: 1,
      unit: 'pcs',
      unitPrice: 0,
      total: 0
    };
    handleChange('items', [...items, newItem]);
  };

  const updateItem = (id: string, field: keyof LineItem, value: any) => {
    const updatedItems = items.map((item) => {
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
    handleChange('items', items.filter(item => item.id !== id));
  };

  // Calculate totals
  const subtotal = (data.items || []).reduce((sum, item) => sum + (item.total || 0), 0);
  
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
      <div className="left-col stack stack-6">
        <Section title="Company Information" icon={Building}>
          <div className="grid-2col gap-4">
            <div>
              <Label>Company Name</Label>
              <Input
                value={data.companyInfo?.name || ''}
                onChange={(val) => handleNestedChange('companyInfo', 'name', val)}
                placeholder="Enter company name"
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={data.companyInfo?.email || ''}
                onChange={(val) => handleNestedChange('companyInfo', 'email', val)}
                placeholder="Enter email address"
              />
            </div>
            <div>
              <Label>Phone</Label>
              <Input
                value={data.companyInfo?.phone || ''}
                onChange={(val) => handleNestedChange('companyInfo', 'phone', val)}
                placeholder="Enter phone number"
              />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <Label>Address</Label>
              <TextArea
                value={data.companyInfo?.address || ''}
                onChange={(val) => handleNestedChange('companyInfo', 'address', val)}
                placeholder="Enter full address"
                rows={2}
              />
            </div>
          </div>
        </Section>

        <Section title="Supplier Information" icon={Briefcase}>
          <div className="grid-2col gap-4">
            <div>
              <Label>Supplier Name</Label>
              <Input
                value={data.supplierInfo?.name || ''}
                onChange={(val) => handleNestedChange('supplierInfo', 'name', val)}
                placeholder="Enter supplier name"
              />
            </div>
            <div>
              <Label>Contact Person</Label>
              <Input
                value={data.supplierInfo?.contactPerson || ''}
                onChange={(val) => handleNestedChange('supplierInfo', 'contactPerson', val)}
                placeholder="Enter contact person"
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={data.supplierInfo?.email || ''}
                onChange={(val) => handleNestedChange('supplierInfo', 'email', val)}
                placeholder="Enter email address"
              />
            </div>
            <div>
              <Label>Phone</Label>
              <Input
                value={data.supplierInfo?.phone || ''}
                onChange={(val) => handleNestedChange('supplierInfo', 'phone', val)}
                placeholder="Enter phone number"
              />
            </div>
            <div>
              <Label>Tax ID / VAT No.</Label>
              <Input
                value={data.supplierInfo?.taxId || ''}
                onChange={(val) => handleNestedChange('supplierInfo', 'taxId', val)}
                placeholder="Enter Tax/VAT ID"
              />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <Label>Address</Label>
              <TextArea
                value={data.supplierInfo?.address || ''}
                onChange={(val) => handleNestedChange('supplierInfo', 'address', val)}
                placeholder="Enter full address"
                rows={2}
              />
            </div>
          </div>
        </Section>

        <Section title="Line Items" icon={FileText}>
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
                {(!data.items || data.items.length === 0) && (
                  <tr>
                    <td colSpan={6}>
                      <div className="items-empty">No line items yet. Use the button below to add the first one.</div>
                    </td>
                  </tr>
                )}
                {data.items?.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <Input
                        className="items-table-input"
                        value={item.description}
                        onChange={(val) => updateItem(item.id, 'description', val)}
                        placeholder="Item description"
                      />
                    </td>
                    <td>
                      <Input
                        className="items-table-input"
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={(val) => updateItem(item.id, 'quantity', val)}
                      />
                    </td>
                    <td>
                      <Select
                        value={item.unit}
                        onChange={(val) => updateItem(item.id, 'unit', val)}
                        options={UNIT_OPTIONS}
                      />
                    </td>
                    <td>
                      <Input
                        className="items-table-input"
                        type="number"
                        min={0}
                        value={item.unitPrice}
                        onChange={(val) => updateItem(item.id, 'unitPrice', val)}
                      />
                    </td>
                    <td style={{ textAlign: 'right', paddingRight: '0.5rem', fontWeight: 600 }}>
                      {(item.total || 0).toFixed(2)}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="btn-icon-delete"
                        aria-label="Remove line item"
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
            className="btn-add" 
            onClick={addItem}
          >
            <Plus size={16} /> Add Item
          </button>
        </Section>
      </div>

      <div className="right-col stack stack-6">
        <Section title="Financial Configuration" icon={CreditCard}>
          <div className="stack stack-4">
            <div>
              <Label>Currency</Label>
              <Select
                value={data.currency || 'USD'}
                onChange={(val) => handleChange('currency', val)}
                options={CURRENCY_LIST}
              />
            </div>
            
            <SubSection title="Discount">
              <div className="grid-2col gap-2">
                <Select
                  value={data.discountType || 'flat'}
                  onChange={(val) => handleChange('discountType', val)}
                  options={['flat', 'percentage']}
                />
                <Input
                  type="number"
                  min={0}
                  value={data.discountValue || 0}
                  onChange={(val) => handleChange('discountValue', val)}
                />
              </div>
            </SubSection>

            <SubSection title="Tax Settings">
              <div className="grid-2col gap-2">
                <div>
                  <Label>Tax Label</Label>
                  <Input
                    value={data.taxLabel || 'Tax'}
                    onChange={(val) => handleChange('taxLabel', val)}
                    placeholder="e.g. VAT, GST"
                  />
                </div>
                <div>
                  <Label>Tax Rate</Label>
                  <div style={{ display: 'flex', gap: '0.25rem' }}>
                    <Input
                      type="number"
                      min={0}
                      value={data.taxRate || 0}
                      onChange={(val) => handleChange('taxRate', val)}
                    />
                    <Select
                      value={data.taxType || 'percentage'}
                      onChange={(val) => handleChange('taxType', val)}
                      options={['percentage', 'flat']}
                    />
                  </div>
                </div>
              </div>
            </SubSection>

            <div>
              <Label>Shipping Charges</Label>
              <Input
                type="number"
                min={0}
                value={data.shippingCharges || 0}
                onChange={(val) => handleChange('shippingCharges', val)}
              />
            </div>
          </div>
        </Section>

        <Section title="Order Tracking" icon={Package}>
          <div className="stack stack-4">
            <div>
              <Label>Status</Label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <Select
                  value={data.status || 'Draft'}
                  onChange={(val) => handleChange('status', val as LPOStatus)}
                  options={LPO_STATUS_OPTIONS}
                />
                <StatusBadge status={data.status || 'Draft'} />
              </div>
            </div>
            <div>
              <Label>Expected Delivery Date</Label>
              <input
                type="date"
                className="input-field"
                value={data.expectedDeliveryDate || ''}
                onChange={(e) => handleChange('expectedDeliveryDate', e.target.value)}
              />
            </div>
            <div className="grid-2col gap-4">
              <div>
                <Label>Approved By</Label>
                <Input
                  value={data.approvedBy || ''}
                  onChange={(val) => handleChange('approvedBy', val)}
                  placeholder="Name"
                />
              </div>
              <div>
                <Label>Approval Date</Label>
                <input
                  type="date"
                  className="input-field"
                  value={data.approvalDate || ''}
                  onChange={(e) => handleChange('approvalDate', e.target.value)}
                />
              </div>
            </div>
            <div>
              <Label>Delivery Notes</Label>
              <TextArea
                value={data.deliveryNotes || ''}
                onChange={(val) => handleChange('deliveryNotes', val)}
                placeholder="Special instructions for delivery"
                rows={2}
              />
            </div>
          </div>
        </Section>

        <Section title="Document Settings" icon={Settings}>
          <div className="stack stack-4">
            <div>
              <Label>Manual LPO Number Override (Optional)</Label>
              <Input
                value={data.lpoNumberOverride || ''}
                onChange={(val) => handleChange('lpoNumberOverride', val)}
                placeholder="Leave blank to auto-generate"
              />
            </div>
            <div>
              <Label>Notes</Label>
              <TextArea
                value={data.notes || ''}
                onChange={(val) => handleChange('notes', val)}
                placeholder="General notes"
                rows={2}
              />
            </div>
            <div>
              <Label>Terms & Conditions</Label>
              <TextArea
                value={data.termsAndConditions || ''}
                onChange={(val) => handleChange('termsAndConditions', val)}
                placeholder="Terms and conditions"
                rows={3}
              />
            </div>
            <div>
              <Label>Logo URL / Base64 (Optional)</Label>
              <Input
                value={data.logoUpload || ''}
                onChange={(val) => handleChange('logoUpload', val)}
                placeholder="Paste logo URL or Base64 string"
              />
            </div>
            <Checkbox
              label="Include Signature Area"
              checked={!!data.includeSignature}
              onChange={(checked) => handleChange('includeSignature', checked)}
            >
              <div>
                <Label>Signatory Name</Label>
                <Input
                  value={data.signatureName || ''}
                  onChange={(val) => handleChange('signatureName', val)}
                  placeholder="Name of authorized person"
                />
              </div>
            </Checkbox>
            <Checkbox 
              label="Apply Watermark" 
              checked={!!data.watermarkText}
              onChange={(val) => handleChange('watermarkText', val ? 'DRAFT' : '')}
            >
              <div style={{ marginTop: '8px' }}>
                <Input 
                  value={data.watermarkText || ''} 
                  onChange={(v) => handleChange('watermarkText', v)} 
                  placeholder="e.g. DRAFT or CANCELLED"
                />
              </div>
            </Checkbox>
          </div>
        </Section>

        <div className="summary-card">
          <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1rem' }}>Summary</h3>
          <div className="summary-card-row">
            <span className="summary-card-label">Subtotal</span>
            <span className="summary-card-value">{data.currency || 'USD'} {subtotal.toFixed(2)}</span>
          </div>
          {discountAmount > 0 && (
            <div className="summary-card-row">
              <span className="summary-card-label">Discount</span>
              <span className="summary-card-value">-{data.currency || 'USD'} {discountAmount.toFixed(2)}</span>
            </div>
          )}
          {taxAmount > 0 && (
            <div className="summary-card-row">
              <span className="summary-card-label">{data.taxLabel || 'Tax'}</span>
              <span className="summary-card-value">+{data.currency || 'USD'} {taxAmount.toFixed(2)}</span>
            </div>
          )}
          {shippingAmount > 0 && (
            <div className="summary-card-row">
              <span className="summary-card-label">Shipping</span>
              <span className="summary-card-value">+{data.currency || 'USD'} {shippingAmount.toFixed(2)}</span>
            </div>
          )}
          <div className="summary-card-row summary-card-total">
            <span className="summary-card-label" style={{ color: 'white', fontWeight: 700 }}>Grand Total</span>
            <span className="summary-card-value">{data.currency || 'USD'} {grandTotal.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
