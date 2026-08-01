import { GLOBAL_CURRENCIES } from './currencies';

export type LPOStatus = 'Draft' | 'Pending Approval' | 'Approved' | 'Sent to Supplier' | 'Partially Received' | 'Completed' | 'Cancelled';

export interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  total?: number;
}

export interface GeneralLPOData {
  companyInfo?: {
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
  };
  supplierInfo?: {
    name?: string;
    contactPerson?: string;
    email?: string;
    phone?: string;
    taxId?: string;
    address?: string;
  };
  items: LineItem[];
  currency?: string;
  discountType?: string;
  discountValue?: number;
  taxType?: string;
  taxRate?: number;
  taxLabel?: string;
  shippingCharges?: number;
  status?: LPOStatus;
  includeSignature?: boolean;
  expectedDeliveryDate?: string;
  approvedBy?: string;
  approvalDate?: string;
  deliveryNotes?: string;
  lpoNumberOverride?: string;
  notes?: string;
  termsAndConditions?: string;
  logoUpload?: string;
  signatureName?: string;
  watermarkText?: string;
}

export const INITIAL_GENERAL_LPO: GeneralLPOData = {
  companyInfo: { name: '', email: '', phone: '', address: '' },
  supplierInfo: { name: '', contactPerson: '', email: '', phone: '', taxId: '', address: '' },
  items: [],
  currency: 'USD',
  discountType: 'flat',
  discountValue: 0,
  taxType: 'percentage',
  taxRate: 0,
  taxLabel: 'VAT',
  shippingCharges: 0,
  status: 'Draft',
  includeSignature: true
};

export const UNIT_OPTIONS = ['pcs', 'kg', 'g', 'l', 'ml', 'm', 'cm', 'box', 'pack', 'hr', 'day', 'month', 'unit', 'set'];

export const CURRENCY_LIST = GLOBAL_CURRENCIES;
