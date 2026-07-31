export interface HotelGuestInfo {
  name: string;
  loyaltyNumber?: string;
}

export interface InvoiceLineItem {
  id: string;
  category: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
  date: string;
}

export interface PaymentRecord {
  id: string;
  method: string;
  amount: number;
  date: string;
  reference: string;
}

export interface HotelInvoiceData {
  hotelName: string;
  hotelLogo?: string;
  showLogo?: boolean;
  hotelAddress?: string;
  hotelPhone?: string;
  hotelEmail?: string;
  primaryGuest: HotelGuestInfo;
  guestPhone?: string;
  guestEmail?: string;
  companyName?: string;
  checkInDate?: string;
  checkOutDate?: string;
  folioNumber?: string;
  roomNumber?: string;
  roomType?: string;
  lineItems: InvoiceLineItem[];
  payments: PaymentRecord[];
  serviceChargeType: 'percentage' | 'flat';
  serviceChargeRate: number;
  serviceChargeLabel: string;
  taxType: 'percentage' | 'flat';
  taxRate: number;
  taxLabel: string;
  discountType: 'percentage' | 'flat';
  discountValue: number;
  discountLabel: string;
  status: string;
  invoiceDate?: string;
  dueDate?: string;
  currency: string;
  invoiceNumber: string;
  manualInvoiceNumber: boolean;
  notes?: string;
  showSignature?: boolean;
  signatureName?: string;
}

export const INITIAL_HOTEL_INVOICE: HotelInvoiceData = {
  hotelName: '',
  primaryGuest: { name: '' },
  lineItems: [],
  payments: [],
  serviceChargeType: 'percentage',
  serviceChargeRate: 0,
  serviceChargeLabel: 'Service Charge',
  taxType: 'percentage',
  taxRate: 0,
  taxLabel: 'Tax',
  discountType: 'flat',
  discountValue: 0,
  discountLabel: 'Discount',
  status: 'Draft',
  currency: 'USD',
  invoiceNumber: '',
  manualInvoiceNumber: false
};

export const CHARGE_CATEGORIES = ['Room', 'Food & Beverage', 'Spa', 'Laundry', 'Mini Bar', 'Other'];
export const PAYMENT_METHODS = ['Cash', 'Credit Card', 'Bank Transfer', 'Other'];
export const HOTEL_INVOICE_CURRENCIES = [
  { value: 'USD', label: 'USD' },
  { value: 'EUR', label: 'EUR' },
];
