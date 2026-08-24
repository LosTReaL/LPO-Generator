import { GLOBAL_CURRENCIES } from './currencies';

export type GeneralInvoiceStatus = 'Draft' | 'Sent' | 'Paid' | 'Overdue' | 'Cancelled' | 'Partially Paid';

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  discount: number;
  total: number;
}

export interface GenPaymentRecord {
  id: string;
  method: string;
  amount: number;
  date: string;
  reference: string;
}

export interface CreditNote {
  id: string;
  amount: number;
  reason: string;
  date: string;
}

export interface GeneralInvoiceData {
  companyName: string;
  companyTaxId?: string;
  companyAddress?: string;
  companyEmail?: string;
  companyPhone?: string;
  bankDetails?: string;
  customer: {
    name: string;
    taxId?: string;
    address?: string;
    email?: string;
    phone?: string;
  };
  items: InvoiceItem[];
  payments: GenPaymentRecord[];
  creditNotes: CreditNote[];
  recurring: {
    enabled: boolean;
    frequency?: string;
    nextDate?: string;
  };
  manualInvoiceNumber: boolean;
  invoiceNumber: string;
  invoiceDate?: string;
  dueDate?: string;
  status: GeneralInvoiceStatus;
  showSignature?: boolean;
  signatureName?: string;
  notes?: string;
  termsAndConditions?: string;
  currency: string;
  shippingCharges: number;
  usePerItemTax: boolean;
  globalTaxType: 'percentage' | 'flat';
  globalTaxRate: number;
  globalTaxLabel: string;
  discountType: 'percentage' | 'flat';
  discountValue: number;
  watermarkText?: string;
}

export const INITIAL_GENERAL_INVOICE: GeneralInvoiceData = {
  companyName: '',
  companyTaxId: '',
  companyAddress: '',
  companyEmail: '',
  companyPhone: '',
  bankDetails: '',
  customer: { name: '', taxId: '', address: '', email: '', phone: '' },
  items: [],
  payments: [],
  creditNotes: [],
  recurring: { enabled: false, frequency: 'monthly', nextDate: '' },
  manualInvoiceNumber: false,
  invoiceNumber: '',
  invoiceDate: '',
  dueDate: '',
  status: 'Draft',
  showSignature: false,
  signatureName: '',
  notes: '',
  termsAndConditions: '',
  currency: 'USD',
  shippingCharges: 0,
  usePerItemTax: false,
  globalTaxType: 'percentage',
  globalTaxRate: 0,
  globalTaxLabel: 'Tax',
  discountType: 'flat',
  discountValue: 0,
  watermarkText: ''
};

export const GEN_INVOICE_CURRENCIES = GLOBAL_CURRENCIES;
