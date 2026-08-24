// ============================================================
// Shared data utilities: ID generation, input coercion and
// defensive normalization of imported / persisted JSON payloads.
//
// Everything here is deliberately paranoid: user-supplied files
// and localStorage contents must never crash the app or poison
// form state with wrong types.
// ============================================================

import { INITIAL_LPO_DATA, LPOData } from '../types';
import { GLOBAL_CURRENCIES } from '../types/currencies';
import { INITIAL_GENERAL_LPO, GeneralLPOData, UNIT_OPTIONS } from '../types/generalLpo';
import { INITIAL_HOTEL_INVOICE, HotelInvoiceData, CHARGE_CATEGORIES, PAYMENT_METHODS } from '../types/hotelInvoice';
import { INITIAL_GENERAL_INVOICE, GeneralInvoiceData } from '../types/generalInvoice';

/** Hard ceiling for imported files (~2 MB) — larger payloads cannot be persisted anyway. */
export const MAX_IMPORT_BYTES = 2 * 1024 * 1024;

/** Hard ceiling applied to every imported string field. */
export const MAX_TEXT_LENGTH = 10_000;

const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Build a local Date from a regex-validated yyyy-MM-dd string, rejecting
 * impossible calendar dates ('2026-02-31') instead of letting them roll
 * over into March — which would corrupt stay schedules and crash
 * date-fns formatters downstream.
 */
const dateFromValidParts = (value: string): Date | null => {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
      ? date
      : null
  );
};

/**
 * Short random identifier used across forms/PDFs.
 * Prefers crypto.randomUUID when available, falls back to
 * Math.random + timestamp so collisions stay practically impossible.
 */
export const generateId = (): string => {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID().replace(/-/g, '').substring(0, 12);
    }
  } catch {
    /* fall through to Math.random */
  }
  return (
    Math.random().toString(36).substring(2, 9) +
    Date.now().toString(36).slice(-4)
  );
};

/** Coerce an unknown value into a bounded string. */
export const sanitizeText = (value: unknown, maxLength: number = MAX_TEXT_LENGTH): string => {
  if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') {
    return '';
  }
  const str = String(value);
  return str.length > maxLength ? str.slice(0, maxLength) : str;
};

/** Coerce an unknown value into a finite number within optional bounds. */
export const toFiniteNumber = (
  value: unknown,
  fallback: number,
  min?: number,
  max?: number,
): number => {
  let num: number =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && value.trim() !== ''
        ? Number(value)
        : NaN;
  if (!Number.isFinite(num)) num = fallback;
  if (min !== undefined && num < min) num = min;
  if (max !== undefined && num > max) num = max;
  return num;
};

/** Return the value when it is an array, otherwise an empty array. */
export const ensureArray = <T,>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);

/** Parse a date-ish value (Date, ISO string, or yyyy-MM-dd). Invalid input -> null. */
export const parseStoredDate = (value: unknown): Date | null => {
  if (value instanceof Date && !isNaN(value.getTime())) return value;
  if (typeof value === 'string') {
    if (DATE_ONLY_RE.test(value)) {
      return dateFromValidParts(value);
    }
    const parsed = new Date(value);
    return isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
};

/** Validate a yyyy-MM-dd string used by the invoice modules. */
export const sanitizeDateString = (value: unknown): string =>
  typeof value === 'string' && DATE_ONLY_RE.test(value) && dateFromValidParts(value) !== null
    ? value
    : '';

/** Keep only known ISO codes; anything else falls back to the module default. */
export const sanitizeCurrency = (value: unknown, fallback: string): string => {
  const code = sanitizeText(value, 8).toUpperCase();
  return (GLOBAL_CURRENCIES as string[]).includes(code) ? code : fallback;
};

/** Whitelist helper for enum-ish string fields ('percentage' | 'flat', statuses…). */
const oneOf = <T extends string>(value: unknown, allowed: readonly T[], fallback: T): T =>
  allowed.includes(value as T) ? (value as T) : fallback;

export interface ImportResult<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

/**
 * Parse raw file text into a plain object payload.
 * Accepts both bare data exports and `{data: ...}` storage-shaped backups.
 */
export const parseImportPayload = (raw: string): ImportResult<Record<string, unknown>> => {
  if (raw.length > MAX_IMPORT_BYTES) {
    return { ok: false, error: 'File is too large to import (max 2 MB).' };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, error: 'Invalid JSON file.' };
  }
  // Unwrap storage-shaped payloads ({data: {...}, timestamp})
  if (
    parsed &&
    typeof parsed === 'object' &&
    !Array.isArray(parsed) &&
    'data' in parsed &&
    parsed.data &&
    typeof parsed.data === 'object' &&
    !Array.isArray(parsed.data)
  ) {
    parsed = (parsed as { data: unknown }).data;
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { ok: false, error: 'Invalid data file format.' };
  }
  return { ok: true, data: parsed as Record<string, unknown> };
};

// ------------------------------------------------------------
// Per-module normalizers. Each merges a partial/untrusted object
// over its INITIAL_* constant and repairs nested structures.
// ------------------------------------------------------------

/** Coerce an arbitrary parsed value into a plain-object record. */
const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

export const normalizeHotelLpoData = (rawInput: unknown): LPOData => {
  const input = asRecord(rawInput);
  const base = JSON.parse(JSON.stringify(INITIAL_LPO_DATA)) as LPOData;
  const merged = { ...base, ...input } as Record<string, unknown>;

  const guests = ensureArray<unknown>(merged.guests).map((g) =>
    typeof g === 'string'
      ? { name: sanitizeText(g), loyaltyNumber: '' }
      : {
          name: sanitizeText(asRecord(g).name),
          loyaltyNumber: sanitizeText(asRecord(g).loyaltyNumber),
        },
  );

  const stayRanges = ensureArray<Record<string, unknown>>(merged.stayRanges)
    .map((r) => {
      const start = parseStoredDate(r?.start);
      const end = parseStoredDate(r?.end);
      if (!start || !end || end <= start) return null;
      return {
        id: sanitizeText(r?.id) || generateId(),
        start,
        end,
        nights: toFiniteNumber(r?.nights, Math.max(0, Math.round((end.getTime() - start.getTime()) / 86_400_000)), 1),
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  const applicableRates = ensureArray<Record<string, unknown>>(merged.applicableRates)
    .map((r) => {
      const start = parseStoredDate(r?.start);
      const end = parseStoredDate(r?.end);
      if (!start || !end) return null;
      return {
        id: sanitizeText(r?.id) || generateId(),
        start,
        end,
        amount: toFiniteNumber(r?.amount, 0, 0),
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  const childCount = toFiniteNumber(merged.childCount, base.childCount, 0, 99);
  let childAges = ensureArray<number>(merged.childAges)
    .slice(0, childCount)
    .map((a) => toFiniteNumber(a, 0, 0, 17));
  while (childAges.length < childCount) childAges.push(0);

  // Legacy payloads stored PDF toggles flat on the data object
  // (only when the payload itself carries no nested pdfOptions).
  const rawPdfOptions = (input.pdfOptions && typeof input.pdfOptions === 'object')
    ? input.pdfOptions as Record<string, unknown>
    : undefined;

  const legacyPdfOptions: Record<string, unknown> | undefined = rawPdfOptions
    ? undefined
    : {
        showCompanyBillTo: Boolean(merged.showCompanyBillTo),
        showGuestInBillTo: Boolean(merged.showGuestInBillTo),
        showSignatureArea: Boolean(merged.showSignatureArea),
        authorizedSignatoryName: sanitizeText(merged.authorizedSignatoryName),
        showAverageRate: Boolean(merged.showAverageRate),
        showDailyRateBreakdown: Boolean(merged.showDailyRateBreakdown),
        showLogo: Boolean(merged.showLogo),
        logoDataUrl: sanitizeText(merged.logoDataUrl),
        showCreatedBy: Boolean(merged.showCreatedBy),
        createdByName: sanitizeText(merged.createdByName),
        showSupplierConfirmation: Boolean(merged.showSupplierConfirmation),
        supplierConfirmationNumber: sanitizeText(merged.supplierConfirmationNumber),
        showRateCodes: merged.showRateCodes !== false,
        showApplicableRates: merged.showApplicableRates !== false,
        showPaymentRemarks: merged.showPaymentRemarks !== false,
        showCancellationPolicy: merged.showCancellationPolicy !== false,
        showGeneralRemarks: merged.showGeneralRemarks !== false,
        manualPOHeader: Boolean(merged.manualPOHeader),
        poHeaderTitle: sanitizeText(merged.poHeaderTitle) || 'PURCHASE ORDER',
        manualPONumber: Boolean(merged.manualPONumber),
        poNumber: sanitizeText(merged.poNumber),
        showHotelInOccupancy: Boolean(merged.showHotelInOccupancy),
      };

  const effectivePdfOptions = rawPdfOptions ?? legacyPdfOptions ?? {};

  return {
    ...base,
    hotelName: sanitizeText(merged.hotelName),
    hotelAddress: sanitizeText(merged.hotelAddress),
    roomType: sanitizeText(merged.roomType),
    rateCodes: sanitizeText(merged.rateCodes),
    companyName: sanitizeText(merged.companyName),
    mealPlan: sanitizeText(merged.mealPlan) || base.mealPlan,
    paymentRemarks: sanitizeText(merged.paymentRemarks),
    cancellationRemarks: sanitizeText(merged.cancellationRemarks),
    generalRemarks: sanitizeText(merged.generalRemarks),
    guestPhone: sanitizeText(merged.guestPhone),
    guestEmail: sanitizeText(merged.guestEmail),
    currency: sanitizeCurrency(merged.currency, base.currency),
    adultCount: toFiniteNumber(merged.adultCount, base.adultCount, 0, 999),
    infantCount: toFiniteNumber(merged.infantCount, base.infantCount, 0, 999),
    childCount,
    childAges,
    guests: guests.length > 0 ? guests : base.guests,
    stayRanges,
    applicableRates,
    pdfOptions: { ...base.pdfOptions, ...effectivePdfOptions } as LPOData['pdfOptions'],
  } as LPOData;
};

/**
 * Payment methods must stay inside each module's own Select options or the
 * dropdown renders blank while state keeps a divergent value. The allow
 * list is therefore passed per module rather than shared.
 */
const GENERAL_INVOICE_PAYMENT_METHODS = ['Cash', 'Credit Card', 'Bank Transfer', 'Online Payment', 'Cheque', 'Other'];

const normalizePayments = (raw: unknown, allowedMethods: string[]) =>
  ensureArray<Record<string, unknown>>(raw)
    .filter((p) => p && typeof p === 'object')
    .slice(0, 200)
    .map((p) => {
      const method = sanitizeText(p?.method);
      return {
        id: sanitizeText(p?.id) || generateId(),
        method: allowedMethods.includes(method) ? method : 'Other',
        amount: toFiniteNumber(p?.amount, 0, 0),
        date: sanitizeDateString(p?.date),
        reference: sanitizeText(p?.reference),
      };
    });

export const normalizeGeneralLpoData = (rawInput: unknown): GeneralLPOData => {
  const input = asRecord(rawInput);
  const base = JSON.parse(JSON.stringify(INITIAL_GENERAL_LPO)) as GeneralLPOData;
  const companyInfo = asRecord(input.companyInfo);
  const supplierInfo = asRecord(input.supplierInfo);

  const items = ensureArray<Record<string, unknown>>(input.items)
    .filter((i) => i && typeof i === 'object')
    .slice(0, 500)
    .map((item) => {
      const quantity = toFiniteNumber(item?.quantity, 1, 0);
      const unitPrice = toFiniteNumber(item?.unitPrice, 0, 0);
      const unitRaw = sanitizeText(item?.unit);
      return {
        id: sanitizeText(item?.id) || generateId(),
        description: sanitizeText(item?.description),
        quantity,
        // Must stay inside the Select's options or the dropdown shows blank
        unit: UNIT_OPTIONS.includes(unitRaw) ? unitRaw : 'pcs',
        unitPrice,
        total: quantity * unitPrice,
      };
    });

  return {
    ...base,
    ...input,
    companyInfo: {
      name: sanitizeText(companyInfo.name),
      email: sanitizeText(companyInfo.email),
      phone: sanitizeText(companyInfo.phone),
      address: sanitizeText(companyInfo.address),
    },
    supplierInfo: {
      name: sanitizeText(supplierInfo.name),
      contactPerson: sanitizeText(supplierInfo.contactPerson),
      email: sanitizeText(supplierInfo.email),
      phone: sanitizeText(supplierInfo.phone),
      taxId: sanitizeText(supplierInfo.taxId),
      address: sanitizeText(supplierInfo.address),
    },
    items,
    currency: sanitizeCurrency(input.currency, base.currency || 'USD'),
    discountType: oneOf(input.discountType, ['flat', 'percentage'] as const, 'flat'),
    taxType: oneOf(input.taxType, ['percentage', 'flat'] as const, 'percentage'),
    status: oneOf(
      input.status,
      ['Draft', 'Pending Approval', 'Approved', 'Sent to Supplier', 'Partially Received', 'Completed', 'Cancelled'] as const,
      'Draft',
    ),
    includeSignature: input.includeSignature === undefined ? base.includeSignature === true : Boolean(input.includeSignature),
    discountValue: toFiniteNumber(input.discountValue, 0, 0),
    taxRate: toFiniteNumber(input.taxRate, 0, 0),
    taxLabel: sanitizeText(input.taxLabel) || 'VAT',
    shippingCharges: toFiniteNumber(input.shippingCharges, 0, 0),
    lpoNumberOverride: sanitizeText(input.lpoNumberOverride),
    notes: sanitizeText(input.notes),
    termsAndConditions: sanitizeText(input.termsAndConditions),
    logoUpload: sanitizeText(input.logoUpload),
    signatureName: sanitizeText(input.signatureName),
    watermarkText: sanitizeText(input.watermarkText),
    expectedDeliveryDate: sanitizeDateString(input.expectedDeliveryDate),
    approvalDate: sanitizeDateString(input.approvalDate),
    approvedBy: sanitizeText(input.approvedBy),
    deliveryNotes: sanitizeText(input.deliveryNotes),
  } as GeneralLPOData;
};

export const normalizeHotelInvoiceData = (rawInput: unknown): HotelInvoiceData => {
  const input = asRecord(rawInput);
  const base = JSON.parse(JSON.stringify(INITIAL_HOTEL_INVOICE)) as HotelInvoiceData;

  const lineItems = ensureArray<Record<string, unknown>>(input.lineItems)
    .filter((i) => i && typeof i === 'object')
    .slice(0, 500)
    .map((item) => {
      const quantity = toFiniteNumber(item?.quantity, 1, 0);
      const rate = toFiniteNumber(item?.rate, 0, 0);
      const category = sanitizeText(item?.category);
      return {
        id: sanitizeText(item?.id) || generateId(),
        // Single source of truth: the Select's own option list
        category: CHARGE_CATEGORIES.includes(category) ? category : 'Other',
        description: sanitizeText(item?.description),
        quantity,
        rate,
        amount: quantity * rate,
        date: sanitizeDateString(item?.date),
      };
    });

  const primaryGuest = asRecord(input.primaryGuest);

  return {
    ...base,
    ...input,
    hotelName: sanitizeText(input.hotelName),
    hotelLogo: sanitizeText(input.hotelLogo),
    showLogo: Boolean(input.showLogo),
    hotelAddress: sanitizeText(input.hotelAddress),
    hotelPhone: sanitizeText(input.hotelPhone),
    hotelEmail: sanitizeText(input.hotelEmail),
    primaryGuest: {
      name: sanitizeText(primaryGuest.name),
      loyaltyNumber: sanitizeText(primaryGuest.loyaltyNumber),
    },
    guestPhone: sanitizeText(input.guestPhone),
    guestEmail: sanitizeText(input.guestEmail),
    companyName: sanitizeText(input.companyName),
    checkInDate: sanitizeDateString(input.checkInDate),
    checkOutDate: sanitizeDateString(input.checkOutDate),
    folioNumber: sanitizeText(input.folioNumber),
    roomNumber: sanitizeText(input.roomNumber),
    roomType: sanitizeText(input.roomType),
    lineItems,
    payments: normalizePayments(input.payments, PAYMENT_METHODS),
    serviceChargeType: input.serviceChargeType === 'flat' ? 'flat' : 'percentage',
    serviceChargeRate: toFiniteNumber(input.serviceChargeRate, 0, 0),
    serviceChargeLabel: sanitizeText(input.serviceChargeLabel) || base.serviceChargeLabel,
    taxType: input.taxType === 'flat' ? 'flat' : 'percentage',
    taxRate: toFiniteNumber(input.taxRate, 0, 0),
    taxLabel: sanitizeText(input.taxLabel) || base.taxLabel,
    discountType: input.discountType === 'percentage' ? 'percentage' : 'flat',
    discountValue: toFiniteNumber(input.discountValue, 0, 0),
    discountLabel: sanitizeText(input.discountLabel) || base.discountLabel,
    status: oneOf(
      input.status,
      ['Draft', 'Sent', 'Paid', 'Partially Paid', 'Overdue', 'Cancelled'] as const,
      'Draft',
    ),
    invoiceDate: sanitizeDateString(input.invoiceDate),
    dueDate: sanitizeDateString(input.dueDate),
    currency: sanitizeCurrency(input.currency, base.currency),
    invoiceNumber: sanitizeText(input.invoiceNumber),
    manualInvoiceNumber: Boolean(input.manualInvoiceNumber),
    notes: sanitizeText(input.notes),
    signatureName: sanitizeText(input.signatureName),
    watermarkText: sanitizeText(input.watermarkText),
  } as HotelInvoiceData;
};

export const normalizeGeneralInvoiceData = (rawInput: unknown): GeneralInvoiceData => {
  const input = asRecord(rawInput);
  const base = JSON.parse(JSON.stringify(INITIAL_GENERAL_INVOICE)) as GeneralInvoiceData;
  const customer = asRecord(input.customer);
  const recurring = asRecord(input.recurring);

  const items = ensureArray<Record<string, unknown>>(input.items)
    .filter((i) => i && typeof i === 'object')
    .slice(0, 500)
    .map((item) => {
      const quantity = toFiniteNumber(item?.quantity, 1, 0);
      const unitPrice = toFiniteNumber(item?.unitPrice, 0, 0);
      const taxRate = toFiniteNumber(item?.taxRate, 0, 0, 100);
      const discount = toFiniteNumber(item?.discount, 0, 0);
      return {
        id: sanitizeText(item?.id) || generateId(),
        description: sanitizeText(item?.description),
        quantity,
        unitPrice,
        taxRate,
        discount,
        total: Math.max(0, quantity * unitPrice + (quantity * unitPrice * taxRate) / 100 - discount),
      };
    });

  const creditNotes = ensureArray<Record<string, unknown>>(input.creditNotes)
    .filter((n) => n && typeof n === 'object')
    .slice(0, 200)
    .map((n) => ({
      id: sanitizeText(n?.id) || generateId(),
      amount: toFiniteNumber(n?.amount, 0, 0),
      reason: sanitizeText(n?.reason),
      date: sanitizeDateString(n?.date),
    }));

  return {
    ...base,
    ...input,
    companyName: sanitizeText(input.companyName),
    companyTaxId: sanitizeText(input.companyTaxId),
    companyAddress: sanitizeText(input.companyAddress),
    companyEmail: sanitizeText(input.companyEmail),
    companyPhone: sanitizeText(input.companyPhone),
    bankDetails: sanitizeText(input.bankDetails),
    customer: {
      name: sanitizeText(customer.name),
      taxId: sanitizeText(customer.taxId),
      address: sanitizeText(customer.address),
      email: sanitizeText(customer.email),
      phone: sanitizeText(customer.phone),
    },
    items,
    payments: normalizePayments(input.payments, GENERAL_INVOICE_PAYMENT_METHODS),
    creditNotes,
    recurring: {
      enabled: Boolean(recurring.enabled),
      // Whitelist against the Select's options so the displayed value can
      // never diverge from state.
      frequency: oneOf(
        recurring.frequency,
        ['weekly', 'monthly', 'quarterly', 'yearly'] as const,
        'monthly',
      ),
      nextDate: sanitizeDateString(recurring.nextDate),
    },
    manualInvoiceNumber: Boolean(input.manualInvoiceNumber),
    invoiceNumber: sanitizeText(input.invoiceNumber),
    invoiceDate: sanitizeDateString(input.invoiceDate),
    dueDate: sanitizeDateString(input.dueDate),
    status: oneOf(
      input.status,
      ['Draft', 'Sent', 'Paid', 'Overdue', 'Cancelled', 'Partially Paid'] as const,
      'Draft',
    ),
    showSignature: Boolean(input.showSignature),
    signatureName: sanitizeText(input.signatureName),
    notes: sanitizeText(input.notes),
    termsAndConditions: sanitizeText(input.termsAndConditions),
    currency: sanitizeCurrency(input.currency, base.currency),
    shippingCharges: toFiniteNumber(input.shippingCharges, 0, 0),
    usePerItemTax: Boolean(input.usePerItemTax),
    globalTaxType: oneOf(input.globalTaxType, ['percentage', 'flat'] as const, 'percentage'),
    globalTaxRate: toFiniteNumber(input.globalTaxRate, 0, 0),
    globalTaxLabel: sanitizeText(input.globalTaxLabel) || base.globalTaxLabel,
    discountType: oneOf(input.discountType, ['flat', 'percentage'] as const, 'flat'),
    discountValue: toFiniteNumber(input.discountValue, 0, 0),
    watermarkText: sanitizeText(input.watermarkText),
  } as GeneralInvoiceData;
};
