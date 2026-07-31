export interface DateRange {
  id: string;
  start: Date;
  end: Date;
  nights: number;
}

export interface ApplicableRate {
  id: string;
  start: Date;
  end: Date;
  amount: number;
}

export interface PdfOptions {
  // Billing & Branding
  showCompanyBillTo: boolean;
  showGuestInBillTo: boolean;
  showLogo: boolean;
  logoDataUrl: string;

  // Metadata & Layout
  showSignatureArea: boolean;
  authorizedSignatoryName: string;
  showCreatedBy: boolean;
  createdByName: string;
  showSupplierConfirmation: boolean;
  supplierConfirmationNumber: string;
  
  // Financial Presentation
  showAverageRate: boolean;
  showDailyRateBreakdown: boolean;

  // Content Visibility
  showRateCodes: boolean;
  showApplicableRates: boolean;
  showPaymentRemarks: boolean;
  showCancellationPolicy: boolean;
  showGeneralRemarks: boolean;
  showHotelInOccupancy: boolean;

  // Manual Overrides
  manualPOHeader: boolean;
  poHeaderTitle: string;
  manualPONumber: boolean;
  poNumber: string;
}

export interface GuestInfo {
  name: string;
  loyaltyNumber: string;
}

export interface LPOData {
  // Hotel Info
  hotelName: string;
  hotelAddress: string;

  // Stay Info
  roomType: string;
  rateCodes: string; // Comma separated or free text
  companyName: string; // Corporate rates
  mealPlan: string;
  stayRanges: DateRange[];
  
  // Occupancy
  guests: GuestInfo[]; // List of names and loyalty numbers
  adultCount: number;
  childCount: number;
  childAges: number[]; // Added for tracking ages
  infantCount: number;

  // Pricing
  currency: string;
  applicableRates: ApplicableRate[]; // Specific rates for date ranges

  // Contact
  guestPhone: string;
  guestEmail: string;

  // Remarks
  paymentRemarks: string;
  cancellationRemarks: string;
  generalRemarks: string;

  // PDF Configuration
  pdfOptions: PdfOptions;
}

export const INITIAL_PDF_OPTIONS: PdfOptions = {
  showCompanyBillTo: false,
  showGuestInBillTo: false,
  showLogo: false,
  logoDataUrl: "",
  showSignatureArea: false,
  authorizedSignatoryName: "",
  showCreatedBy: false,
  createdByName: "",
  showSupplierConfirmation: false,
  supplierConfirmationNumber: "",
  showAverageRate: false,
  showDailyRateBreakdown: false,
  showRateCodes: true,
  showApplicableRates: true,
  showPaymentRemarks: true,
  showCancellationPolicy: true,
  showGeneralRemarks: true,
  showHotelInOccupancy: false,
  manualPOHeader: false,
  poHeaderTitle: "PURCHASE ORDER",
  manualPONumber: false,
  poNumber: ""
};

export const INITIAL_LPO_DATA: LPOData = {
  hotelName: "",
  hotelAddress: "",
  roomType: "",
  rateCodes: "",
  companyName: "",
  mealPlan: "Bed & Breakfast",
  stayRanges: [],
  guests: [{ name: "", loyaltyNumber: "" }],
  adultCount: 1,
  childCount: 0,
  childAges: [],
  infantCount: 0,
  currency: "AED",
  applicableRates: [],
  guestPhone: "",
  guestEmail: "",
  paymentRemarks: "Payment will be settled prior to or upon check-in, either directly or through an official payment method provided by the hotel. Each stay period listed in this LPO shall be treated and paid independently, closer to the respective check-in date, as required by the hotel.",
  cancellationRemarks: "Cancellation is free of charge up to 24 hours prior to check-in. Late cancellations or no-shows will be subject to a one-night penalty.",
  generalRemarks: "Kindly allocate a non-smoking room with a king-size bed.",
  pdfOptions: INITIAL_PDF_OPTIONS
};