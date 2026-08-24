import { describe, it, expect } from 'vitest';
import {
  generateId,
  sanitizeText,
  toFiniteNumber,
  ensureArray,
  parseStoredDate,
  sanitizeDateString,
  parseImportPayload,
  normalizeHotelLpoData,
  normalizeGeneralLpoData,
  normalizeHotelInvoiceData,
  normalizeGeneralInvoiceData,
  MAX_IMPORT_BYTES,
} from './dataUtils';
import { INITIAL_LPO_DATA } from '../types';

describe('generateId', () => {
  it('produces non-empty string ids', () => {
    expect(generateId()).toBeTruthy();
    expect(typeof generateId()).toBe('string');
  });

  it('does not collide across many invocations', () => {
    const ids = new Set(Array.from({ length: 500 }, () => generateId()));
    expect(ids.size).toBe(500);
  });
});

describe('sanitizeText', () => {
  it('passes through plain strings', () => {
    expect(sanitizeText('hello')).toBe('hello');
  });

  it('coerces numbers and booleans', () => {
    expect(sanitizeText(42)).toBe('42');
    expect(sanitizeText(true)).toBe('true');
  });

  it('returns empty string for objects / null / undefined', () => {
    expect(sanitizeText({ evil: true })).toBe('');
    expect(sanitizeText(null)).toBe('');
    expect(sanitizeText(undefined)).toBe('');
    expect(sanitizeText(['a'])).toBe('');
  });

  it('truncates overlong strings to MAX_TEXT_LENGTH', () => {
    const long = 'x'.repeat(50_000);
    expect(sanitizeText(long).length).toBe(10_000);
  });

  it('honors a custom max length', () => {
    expect(sanitizeText('abcdefgh', 4)).toBe('abcd');
  });
});

describe('toFiniteNumber', () => {
  it('accepts valid numbers', () => {
    expect(toFiniteNumber(5, 0)).toBe(5);
    expect(toFiniteNumber('12.5', 0)).toBe(12.5);
  });

  it('falls back for NaN/Infinity/garbage/empty strings', () => {
    expect(toFiniteNumber(NaN, 7)).toBe(7);
    expect(toFiniteNumber(Infinity, 3)).toBe(3);
    expect(toFiniteNumber('abc', 2)).toBe(2);
    expect(toFiniteNumber('', 9)).toBe(9);
    expect(toFiniteNumber(null, 4)).toBe(4);
    expect(toFiniteNumber(undefined, 8)).toBe(8);
  });

  it('clamps to min/max bounds', () => {
    expect(toFiniteNumber(-10, 0, 0)).toBe(0);
    expect(toFiniteNumber(500, 0, 0, 100)).toBe(100);
    expect(toFiniteNumber(50, 0, 0, 100)).toBe(50);
  });
});

describe('ensureArray', () => {
  it('returns arrays untouched and wraps/replaces everything else', () => {
    expect(ensureArray([1, 2])).toEqual([1, 2]);
    expect(ensureArray('nope')).toEqual([]);
    expect(ensureArray(null)).toEqual([]);
    expect(ensureArray({ length: 3 })).toEqual([]);
  });
});

describe('parseStoredDate', () => {
  it('parses yyyy-MM-dd as local dates (no UTC shift)', () => {
    const d = parseStoredDate('2026-08-01')!;
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(7);
    expect(d.getDate()).toBe(1);
  });

  it('accepts Date instances and ISO strings', () => {
    const now = new Date();
    expect(parseStoredDate(now)).toBe(now);
    expect(parseStoredDate('2026-08-01T10:00:00Z')).not.toBeNull();
  });

  it('returns null for garbage instead of silently substituting today', () => {
    expect(parseStoredDate('not-a-date')).toBeNull();
    expect(parseStoredDate(12345)).toBeNull();
    expect(parseStoredDate('')).toBeNull();
  });

  it('rejects impossible calendar dates instead of rolling them over (regression)', () => {
    // '2026-02-31' used to silently become March 3rd, corrupting stay data
    expect(parseStoredDate('2026-02-31')).toBeNull();
    expect(parseStoredDate('2026-04-31')).toBeNull();
    expect(parseStoredDate('2025-02-29')).toBeNull(); // not a leap year
    expect(parseStoredDate('2024-02-29')).not.toBeNull(); // leap year is fine
    expect(parseStoredDate('2026-13-01')).toBeNull();
  });
});

describe('sanitizeDateString', () => {
  it('keeps only well-formed yyyy-MM-dd strings', () => {
    expect(sanitizeDateString('2026-08-01')).toBe('2026-08-01');
    expect(sanitizeDateString('2026-8-1')).toBe('');
    expect(sanitizeDateString('garbage')).toBe('');
    expect(sanitizeDateString(undefined)).toBe('');
    // Prototype-pollution style junk must not survive
    expect(sanitizeDateString('__proto__')).toBe('');
  });

  it('rejects well-formed but non-existent dates (regression)', () => {
    // These passed the old regex-only check, then crashed date-fns format()
    // during PDF generation for imported documents.
    expect(sanitizeDateString('2026-02-31')).toBe('');
    expect(sanitizeDateString('2026-00-10')).toBe('');
    expect(sanitizeDateString('2026-01-32')).toBe('');
    expect(sanitizeDateString('2024-02-29')).toBe('2024-02-29');
  });
});

describe('parseImportPayload', () => {
  it('rejects malformed JSON with a friendly error', () => {
    const result = parseImportPayload('{ broken');
    expect(result.ok).toBe(false);
    expect(result.error).toBe('Invalid JSON file.');
  });

  it('rejects non-object payloads (strings, arrays, null)', () => {
    expect(parseImportPayload('"just a string"').error).toBe('Invalid data file format.');
    expect(parseImportPayload('[1,2,3]').error).toBe('Invalid data file format.');
    expect(parseImportPayload('null').error).toBe('Invalid data file format.');
  });

  it('rejects oversized payloads before parsing', () => {
    const huge = '"'.repeat(MAX_IMPORT_BYTES + 1);
    expect(parseImportPayload(huge).error).toMatch(/too large/i);
  });

  it('unwraps storage-shaped backups ({data: {...}})', () => {
    const result = parseImportPayload(JSON.stringify({ data: { hotelName: 'X' }, timestamp: 1 }));
    expect(result.ok).toBe(true);
    expect(result.data).toEqual({ hotelName: 'X' });
  });

  it('accepts bare exports', () => {
    const result = parseImportPayload(JSON.stringify({ hotelName: 'Y' }));
    expect(result.ok).toBe(true);
    expect(result.data!.hotelName).toBe('Y');
  });
});

describe('normalizeHotelLpoData', () => {
  it('returns fully-populated defaults for an empty object', () => {
    const result = normalizeHotelLpoData({});
    expect(result.mealPlan).toBe(INITIAL_LPO_DATA.mealPlan);
    expect(result.guests.length).toBeGreaterThan(0);
    expect(result.pdfOptions.poHeaderTitle).toBe('PURCHASE ORDER');
  });

  it('drops ranges/rates with invalid dates rather than inventing today', () => {
    const result = normalizeHotelLpoData({
      stayRanges: [
        { start: '2026-01-01', end: '2026-01-05' },
        { start: 'bogus', end: '2026-02-01' },
      ],
      applicableRates: [{ start: '2026-01-01', end: '2026-01-03', amount: 100 }],
    });
    expect(result.stayRanges).toHaveLength(1);
    expect(result.applicableRates).toHaveLength(1);
  });

  it('repairs corrupt numeric fields with clamping', () => {
    const result = normalizeHotelLpoData({
      adultCount: -5,
      childCount: 200,
      applicableRates: [{ start: '2026-01-01', end: '2026-01-02', amount: 'not-a-number' }],
    });
    expect(result.adultCount).toBe(0);
    expect(result.childCount).toBe(99);
    expect(result.applicableRates[0].amount).toBe(0);
  });

  it('pads/truncates childAges to match childCount and clamps ages', () => {
    const result = normalizeHotelLpoData({ childCount: 3, childAges: [300, 5] });
    expect(result.childAges).toEqual([17, 5, 0]);
  });

  it('supports legacy string-guest entries', () => {
    const result = normalizeHotelLpoData({ guests: ['Legacy Guest'] });
    expect(result.guests).toEqual([{ name: 'Legacy Guest', loyaltyNumber: '' }]);
  });

  it('migrates legacy flat pdf options onto the nested pdfOptions object', () => {
    const result = normalizeHotelLpoData({ showCompanyBillTo: true, manualPONumber: true, poNumber: 'X1' });
    expect(result.pdfOptions.showCompanyBillTo).toBe(true);
    expect(result.pdfOptions.manualPONumber).toBe(true);
    expect(result.pdfOptions.poNumber).toBe('X1');
  });

  it('merges partial nested pdfOptions without losing defaults', () => {
    const result = normalizeHotelLpoData({ pdfOptions: { showLogo: true } });
    expect(result.pdfOptions.showLogo).toBe(true);
    expect(result.pdfOptions.showRateCodes).toBe(true); // default preserved
  });

  it('drops inverted or zero-length stay ranges (stay semantics require end > start)', () => {
    const result = normalizeHotelLpoData({
      stayRanges: [
        { start: '2026-03-10', end: '2026-03-08' }, // inverted
        { start: '2026-03-10', end: '2026-03-10' }, // zero nights
        { start: '2026-03-10', end: '2026-03-12' }, // valid
      ],
    });
    expect(result.stayRanges).toHaveLength(1);
    expect(result.stayRanges[0].nights).toBeGreaterThan(0);
  });

  it('rejects unknown currency codes, keeping the module default', () => {
    const result = normalizeHotelLpoData({ currency: 'XOX' });
    expect(result.currency).toBe(INITIAL_LPO_DATA.currency);
  });

  it('handles null/undefined input without throwing', () => {
    expect(() => normalizeHotelLpoData(null as any)).not.toThrow();
    expect(normalizeHotelLpoData(undefined as any).currency).toBeDefined();
  });

  it('survives prototype-pollution keys in the payload', () => {
    const payload = JSON.parse('{"__proto__": {"polluted": "yes"}, "hotelName": "Safe"}');
    const result = normalizeHotelLpoData(payload);
    expect(result.hotelName).toBe('Safe');
    expect(({} as any).polluted).toBeUndefined();
  });
});

describe('normalizeGeneralLpoData', () => {
  it('fills company/supplier info with sanitized strings', () => {
    const result = normalizeGeneralLpoData({
      companyInfo: { name: 'Acme', email: 42 },
      supplierInfo: { name: { bad: true } },
    });
    expect(result.companyInfo!.name).toBe('Acme');
    expect(result.companyInfo!.email).toBe('42');
    expect(result.supplierInfo!.name).toBe('');
  });

  it('recomputes item totals from coerced quantity/unitPrice', () => {
    const result = normalizeGeneralLpoData({
      items: [{ description: 'A', quantity: 'x', unitPrice: 5 }, { description: 'B', quantity: 3, unitPrice: '2.5' }],
    });
    // 'x' falls back to default quantity 1 (matches addItem defaults) -> 1 * 5
    expect(result.items![0].total).toBe(5);
    expect(result.items![1].total).toBe(7.5);
  });

  it('drops non-object junk entries from the items array', () => {
    const result = normalizeGeneralLpoData({ items: ['garbage', null, { description: 'Real' }] as any });
    expect(result.items).toHaveLength(1);
    expect(result.items![0].description).toBe('Real');
  });

  it('keeps item units inside the Select options (regression)', () => {
    // Free-form units would render a blank dropdown in the form
    const result = normalizeGeneralLpoData({
      items: [{ unit: 'tonnes' }, { unit: 'kg' }, {}],
    });
    expect(result.items![0].unit).toBe('pcs'); // unknown -> fallback
    expect(result.items![1].unit).toBe('kg'); // valid option survives
    expect(result.items![2].unit).toBe('pcs');
  });

  it('rejects date fields in the wrong format', () => {
    const result = normalizeGeneralLpoData({ expectedDeliveryDate: '01/30/2026', approvalDate: '2026-01-30' });
    expect(result.expectedDeliveryDate).toBe('');
    expect(result.approvalDate).toBe('2026-01-30');
  });

  it('coerces enum-ish and boolean fields instead of trusting the payload (regression)', () => {
    const result = normalizeGeneralLpoData({
      status: 'TOTALLY-BOGUS',
      discountType: 'weird',
      taxType: 42,
      includeSignature: 'no',
      currency: 'FAKE',
    });
    expect(result.status).toBe('Draft');
    expect(result.discountType).toBe('flat');
    expect(result.taxType).toBe('percentage');
    // Deterministic JS truthiness: any non-empty string coerces to true;
    // only ''/0/null/undefined/false become false.
    expect(result.includeSignature).toBe(true);
    expect(normalizeGeneralLpoData({ includeSignature: '' }).includeSignature).toBe(false);
    expect(normalizeGeneralLpoData({}).includeSignature).toBe(true); // base default
    expect(result.currency).toBe('USD');
  });
});

describe('normalizeHotelInvoiceData', () => {
  it('recomputes line item amounts and keeps known categories only', () => {
    const result = normalizeHotelInvoiceData({
      lineItems: [
        { category: 'Room', quantity: 2, rate: 100 },
        { category: 'HackedCategory', quantity: 1, rate: 50 },
        'junk',
      ],
    });
    expect(result.lineItems).toHaveLength(2);
    expect(result.lineItems[0].amount).toBe(200);
    expect(result.lineItems[1].category).toBe('Other');
  });

  it('normalizes enum-ish fields to safe values', () => {
    const result = normalizeHotelInvoiceData({
      serviceChargeType: 'weird',
      taxType: 'flat',
      discountType: 'percentage',
    });
    expect(result.serviceChargeType).toBe('percentage'); // fallback
    expect(result.taxType).toBe('flat');
    expect(result.discountType).toBe('percentage');
  });

  it('sanitizes payment records', () => {
    const result = normalizeHotelInvoiceData({
      payments: [{ method: 'Cash', amount: '20', date: 'bad-date' }, { amount: Infinity }],
    });
    expect(result.payments[0]).toMatchObject({ method: 'Cash', amount: 20, date: '' });
    expect(result.payments[1].method).toBe('Other');
    expect(result.payments[1].amount).toBe(0);
  });

  it('falls back to a selectable payment method when the stored one is not in the Select (regression)', () => {
    // A stale/hostile method would render a blank dropdown while state kept
    // the divergent value — it must collapse to the select's fallback.
    const result = normalizeHotelInvoiceData({
      payments: [{ method: 'Bitcoin' }, { method: 'Bank Transfer' }],
    });
    expect(result.payments[0].method).toBe('Other');
    expect(result.payments[1].method).toBe('Bank Transfer'); // valid option survives
  });

  it('uses the HOTEL select list, not a union, so cross-module imports stay displayable (regression)', () => {
    // 'Online Payment'/'Cheque' exist only in the General Invoice module's
    // Select; imported into Hotel Invoice they must collapse to 'Other'.
    const result = normalizeHotelInvoiceData({
      payments: [{ method: 'Online Payment' }, { method: 'Cheque' }],
    });
    expect(result.payments[0].method).toBe('Other');
    expect(result.payments[1].method).toBe('Other');
  });
});

describe('normalizeGeneralInvoiceData', () => {
  it('rebuilds customer and recurring blocks defensively', () => {
    const result = normalizeGeneralInvoiceData({
      customer: { name: 'Cust', email: ['array'] },
      recurring: { enabled: 1, frequency: 'monthly', nextDate: '2026-09-01' },
    });
    expect(result.customer.name).toBe('Cust');
    expect(result.customer.email).toBe('');
    expect(result.recurring.enabled).toBe(true);
    expect(result.recurring.nextDate).toBe('2026-09-01');
  });

  it('defaults recurring frequency so the Select never shows a phantom option (regression)', () => {
    const result = normalizeGeneralInvoiceData({ recurring: { enabled: true } });
    expect(result.recurring.frequency).toBe('monthly');

    // Garbage frequency falls back to a valid option too
    const garbage = normalizeGeneralInvoiceData({ recurring: { frequency: 'fortnightly' } });
    expect(garbage.recurring.frequency).toBe('monthly');
  });

  it('recomputes per-item totals including tax minus discount', () => {
    const result = normalizeGeneralInvoiceData({
      items: [{ quantity: 2, unitPrice: 100, taxRate: 10, discount: 25 }],
    });
    // 200 + 20 - 25 = 195
    expect(result.items[0].total).toBeCloseTo(195);
  });

  it('clamps tax rate at 100% and discounts at 0', () => {
    const result = normalizeGeneralInvoiceData({
      items: [{ quantity: 1, unitPrice: 10, taxRate: 250, discount: -50 }],
    });
    expect(result.items[0].taxRate).toBe(100);
    expect(result.items[0].discount).toBe(0);
  });

  it('coerces tax-mode enums, status and booleans defensively (regression)', () => {
    const result = normalizeGeneralInvoiceData({
      usePerItemTax: 'yes',
      globalTaxType: 'bogus',
      discountType: 7,
      status: 'HACKED',
      currency: '??',
      showSignature: 1,
    });
    // Truthy strings coerce to real booleans
    expect(result.usePerItemTax).toBe(true);
    expect(result.globalTaxType).toBe('percentage');
    expect(result.discountType).toBe('flat');
    expect(result.status).toBe('Draft');
    expect(result.currency).toBe('USD');
    expect(result.showSignature).toBe(true);
  });

  it('keeps the full General-Invoice payment method list selectable (regression)', () => {
    const result = normalizeGeneralInvoiceData({
      payments: [{ method: 'Online Payment' }, { method: 'Cheque' }, { method: 'Barter' }],
    });
    expect(result.payments[0].method).toBe('Online Payment'); // valid in THIS module
    expect(result.payments[1].method).toBe('Cheque');
    expect(result.payments[2].method).toBe('Other');
  });
});

describe('prototype pollution safety (import path)', () => {
  const PROTOTYPE_CLEAN = () => {
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    expect((Object.prototype as Record<string, unknown>).polluted).toBeUndefined();
  };

  it('does not pollute Object.prototype via __proto__ keys in imported payloads', () => {
    const result = parseImportPayload(
      '{"__proto__": {"polluted": true}, "companyName": "Evil Co", "customer": {"name": "C"}}',
    );
    expect(result.ok).toBe(true);
    PROTOTYPE_CLEAN();

    const normalized = normalizeGeneralInvoiceData(result.data);
    expect(normalized.companyName).toBe('Evil Co');
    PROTOTYPE_CLEAN();
  });

  it('survives constructor/hasOwnProperty shadowing attempts in all normalizers', () => {
    const hostile = JSON.parse(
      '{"constructor": {"prototype": {"polluted": 1}}, "hasOwnProperty": "junk", "hotelName": "H"}',
    );
    expect(() => normalizeHotelLpoData(hostile)).not.toThrow();
    expect(() => normalizeGeneralLpoData(hostile)).not.toThrow();
    expect(() => normalizeHotelInvoiceData(hostile)).not.toThrow();
    expect(() => normalizeGeneralInvoiceData(hostile)).not.toThrow();
    PROTOTYPE_CLEAN();
  });
});
