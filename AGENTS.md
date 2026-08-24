# AGENTS.md — Ordris

Guidance for AI coding agents (and humans) working in this repository. Read this before making changes.

---

## 1. Project Overview

**Ordris** is a 100% client-side React SPA that generates professional business documents as downloadable PDFs. There is **no backend, no database, and no network API** — everything runs in the browser with `localStorage` persistence.

It has four independent modules:

| Module | Route (hash) | Entry component | PDF service |
|---|---|---|---|
| Hotel LPO | `#/hotel-lpo` | `components/HotelLPOModule.tsx` | `services/pdfService.ts` (`generateLPOPDF`) |
| General LPO | `#/general-lpo` | `components/generalLpo/GeneralLPOModule.tsx` | `services/generalLpoPdfService.ts` (`generateGeneralLPOPDF`) |
| Hotel Invoice | `#/hotel-invoice` | `components/hotelInvoice/HotelInvoiceModule.tsx` | `services/hotelInvoicePdfService.ts` (`generateHotelInvoicePDF`) |
| General Invoice | `#/general-invoice` | `components/generalInvoice/GeneralInvoiceModule.tsx` | `services/generalInvoicePdfService.ts` (`generateGeneralInvoicePDF`) |

**Tech stack:** React 18 · TypeScript 5 · Vite 6 · jsPDF + jspdf-autotable · date-fns 4 · lucide-react icons · vanilla CSS design system (`index.css`, no Tailwind) · Vitest 3 + React Testing Library + jsdom · vite-plugin-pwa.

**Deployment:** GitHub Pages via `.github/workflows/deploy.yml` (typecheck → test:coverage → build → deploy). Vite `base` is hard-coded to `/Ordris/`.

---

## 2. Commands

Run these from the repo root. On Windows PowerShell, use `npm.cmd` if `npm` is blocked by execution policy.

```bash
npm install            # install dependencies
npm run dev            # Vite dev server on http://localhost:3000
npm run build          # production build -> dist/
npm run preview        # preview production build
npm run typecheck      # tsc --noEmit (STRICT mode)  (CI quality gate #1)
npm test               # vitest run    (CI quality gate #2)
npm run test:watch     # vitest watch mode
npm run test:coverage  # vitest run --coverage
npm run e2e            # build + Playwright suite (real Chromium, real PDF downloads)
npm run e2e:headed     # same, with visible browser
```

There is **no ESLint/Prettier config**; `typecheck` + tests are the only CI gates (Playwright E2E runs locally / can be added to CI). TypeScript **strict mode is enabled** — do not weaken it.

---

## 3. Directory Map

```
App.tsx                       Hash router (#/hotel-lpo etc.) + lazy() code splitting
index.tsx                     ReactDOM entry (StrictMode)
types.ts                      Hotel LPO types: LPOData, PdfOptions, DateRange,
                              ApplicableRate, GuestInfo + INITIAL_LPO_DATA / INITIAL_PDF_OPTIONS
types/currencies.ts           GLOBAL_CURRENCIES (50 ISO codes)
types/generalInvoice.ts       General Invoice types (GeneralInvoiceData + INITIAL_GENERAL_INVOICE)
types/hotelInvoice.ts         Hotel Invoice types (HotelInvoiceData + INITIAL_HOTEL_INVOICE)
types/generalLpo.ts           General LPO types + UNIT_OPTIONS + INITIAL_GENERAL_LPO

components/
  ModeSelectorPage.tsx        Landing grid of the 4 modules (keyboard accessible)
  DateManager.tsx             Custom month calendar for date-range picking;
                              dual mode via props (stay ranges vs rate ranges)
  HotelLPOModule.tsx / LPOForm.tsx        Hotel LPO (module = state+persist+PDF, form = pure UI)
  generalLpo/                 GeneralLPOModule.tsx + GeneralLPOForm.tsx (+ tests)
  hotelInvoice/               HotelInvoiceModule.tsx + HotelInvoiceForm.tsx (+ tests)
  generalInvoice/             GeneralInvoiceModule.tsx + GeneralInvoiceForm.tsx (+ tests)
  shared/
    SharedUI.tsx              Design-system primitives: Section, SubSection, Label,
                              Input, Select, TextArea, Checkbox, StatusBadge, ModuleHeader
    ToastContext.tsx          useToast() / <ToastProvider> — success|error|info|warning toasts
    ErrorBoundary.tsx         Class boundary w/ "Restart Application" fallback

services/
  pdfUtils.ts                 SHARED PDF toolkit — reuse this, don't reinvent:
                              numToWords, getAmountInWords, generateDocNumber,
                              getTimeZoneAbbr, PDF_COLORS, getPdfTextHelpers,
                              PDF_TABLE_HEAD_STYLES / _BODY_STYLES / _ALTERNATE_ROW_STYLES,
                              drawPdfFooter, addLogoPdf, drawSignatureArea, drawWatermark
  dataUtils.ts                SHARED data safety toolkit — use for ALL untrusted input:
                              generateId, sanitizeText, toFiniteNumber, ensureArray,
                              parseStoredDate, sanitizeDateString, parseImportPayload,
                              normalize<Module>Data (per-module defensive normalizers)
  pdfService.ts               Hotel LPO PDF (largest, oldest — some duplication of pdfUtils)
  generalLpoPdfService.ts     General LPO PDF
  hotelInvoicePdfService.ts   Hotel Invoice PDF
  generalInvoicePdfService.ts General Invoice PDF (formats amounts as `USD 12.00` — never Intl currency symbols; Helvetica can't render ₹/₺)

src/test/setup.ts             Vitest global setup: browser API mocks (scrollTo, blob URLs,
                              canvas). jsPDF/autoTable mocks are COLOCATED per service test;
                              realPdfOutput.test.ts runs the real libraries instead.
e2e/app.spec.ts               Playwright journeys vs production preview (desktop + mobile)
index.css                     ~1.7k-line vanilla CSS design system (CSS custom properties)
.github/workflows/deploy.yml  CI/CD (Node 20, GitHub Pages)
```

### Test files
Every component/service has a colocated `*.test.ts(x)`. 22 files / 307 tests currently pass,including `services/realPdfOutput.test.ts` which runs the REAL (unmocked) jsPDF stack and validates actual PDF binaries (`pdfService.hotelLpo.test.ts` is a second spec for pdfService.ts — the filename describes the module under test). Playwright E2E journeys live in `e2e/app.spec.ts` against the production preview build.

---

## 4. Architecture & Data Flow

Each module follows the same pattern (keep new modules consistent):

```
Module (stateful container)
 ├─ useState(<Data>) initialized from localStorage (7-day TTL payload {data, timestamp})
 ├─ useEffect: load once on mount (validate TTL, hydrate dates)
 ├─ useEffect: persist on every data change (some debounce, see §7)
 ├─ Import/Export JSON buttons (FileReader + Blob download)
 ├─ Reset button (window.confirm + toast)
 ├─ Generate PDF button (validate → generateXxxPDF(data) → toast)
 └─ renders <XxxForm data onChange/>  ← form components are stateless/pure
```

- **Forms are controlled**: all state lives in the Module container. Forms receive `data` + `onChange` (or `setData`) and compute derived values (subtotal/tax/grand total) inline during render.
- **Routing**: hash-based (`getModeFromHash` in `App.tsx`). Valid hashes: `hotel-lpo`, `general-lpo`, `hotel-invoice`, `general-invoice`; anything else → home. Navigation uses `history.pushState`; back/forward handled via `hashchange` + `popstate`.
- **Code splitting**: each module is `React.lazy`-loaded behind `<Suspense>`.
- **Error handling**: single `<ErrorBoundary>` wraps everything; per-module errors surface via toasts.
- **IDs** are generated with `Math.random().toString(36).substring(2, 9)` everywhere (not crypto.randomUUID).

### localStorage keys (do not change casually — users' saved work depends on them)
| Key | Module | Payload shape |
|---|---|---|
| `lpo_generator_data_v1` | Hotel LPO | `{timestamp, data}` (dates serialized `yyyy-MM-dd`, rehydrated by `hydrateData` incl. legacy flat pdfOptions) |
| `ordris_general_lpo_v1` | General LPO | `{data, _timestamp}` |
| `ordris_hotel_invoice_v1` | Hotel Invoice | `{data, timestamp}` |
| `ordris_general_invoice_v1` | General Invoice | `{timestamp, data}` |

All expire after 7 days (`Date.now() - timestamp > 7d` ⇒ delete).

---

## 5. Conventions & Code Style

- **TypeScript**: **strict mode IS enabled** (plus noUnusedLocals/noUnusedParameters/noFallthroughCasesInSwitch). Keep it that way; new code must compile clean.
- **Comments**: existing code comments sparingly explain "why". Match that tone.
- **Styling**: use CSS classes from `index.css` (design tokens under `:root`: slate/indigo/rose/emerald/amber/sky scales). Never add Tailwind classes — they don't exist here. Inline `style={{}}` objects are common for one-off tweaks (follow suit only when necessary).
- **Icons**: always lucide-react (`size={N}`, `strokeWidth`), never emoji/SVGs.
- **UI primitives**: build forms from `components/shared/SharedUI.tsx` (`Section`, `Input`, `Select`, `TextArea`, `Checkbox`…). Note their custom callback signatures: `onChange(value)` receives the **value directly**, not an event (e.g. `<Select onChange={(val)=>...}>`).
- **User feedback**: use `useToast()` (`addToast(msg, 'success'|'error'|'info'|'warning')`). Legacy `window.alert`/`window.confirm` still exist (confirm for destructive actions is intentional).
- **Currency**: pick from `GLOBAL_CURRENCIES`; display amounts as `${currency} ${amount.toFixed(2)}` in forms and most PDFs.
- **Dates**: date-fns everywhere (`format`, `differenceInCalendarDays`, `eachDayOfInterval`, `startOfDay`). Hotel-LPO stay ranges are `[start, end)` — checkout day excluded, nights = `differenceInCalendarDays(end, start)`. Rate ranges are inclusive `[start, end]`.
- **File paths**: tsconfig maps `@/*` to repo root (alias available but most code uses relative imports — prefer relative to match surroundings).

---

## 6. PDF Generation Rules

- Always import shared helpers from `services/pdfUtils.ts` (`PDF_COLORS`, table styles, `drawPdfFooter`, `drawSignatureArea`, `addLogoPdf`, `drawWatermark`, `getAmountInWords`, `generateDocNumber(prefix)`).
- Document numbering: `PREFIX-YYYYMMDD-XXXX` (random suffix), overridable per module via manual fields (`poNumber`, `lpoNumberOverride`, `invoiceNumber`).
- Amount-in-words supports ~20 currencies (`currencyUnits` map in pdfUtils); unknown currencies fall back to the raw code name.
- Watermarks: diagonal, 45°, opacity 0.1, applied to every page via `GState`.
- Filenames are sanitized: `TYPE_number_name.pdf` with `[^a-z0-9]` → `_`.
- **jsPDF standard fonts (Helvetica) cannot render non-Latin glyphs** (₹, ₺, ﷼ …). Prefer `USD 12.00` style over symbol-based formatting (`generalInvoicePdfService` uses `Intl.NumberFormat` and can garble such symbols — see audit).
- In tests, jsPDF/autoTable are globally mocked in `src/test/setup.ts` — assert on mock calls, not real bytes.

---

## 7. Known Quirks (don't "fix" blindly)

1. **Type filenames are correct now** (`types/hotelInvoice.ts` = Hotel types, `types/generalInvoice.ts` = General types) — they were historically swapped and renamed in place; import paths all match the contents today.
2. **Persistence styles differ**: General LPO debounces saves (~1s); Hotel LPO & both invoice modules save immediately on change; General Invoice loads storage inside the `useState` initializer rather than an effect. ALL modules now wrap `setItem` in try/catch and toast a warning on failure — keep that pattern.
3. **Discount ordering differs**: Hotel Invoice applies percentage discount *after* tax; General Invoice/LPO apply it *before* tax. Intentional-looking business difference — don't unify silently.
4. **`numToWords` handles negatives ("Minus …") up to billions**; ≥ 1 trillion returns ''. `getAmountInWords(0)` yields "Zero X Only".
5. **Tailwind-residue classes are now DEFINED** in `index.css` §29.7 (`form-grid*`, `form-group`, `item-card`, `layout-col`, `full-width`, `col-span-2`, `btn-icon(-danger)`, `text-danger`, `mt-2/3/4`, `d-md-none`, `.items-empty`). The General Invoice summary card was refactored onto the shared `summary-card` classes. Don't reintroduce raw Tailwind utilities that aren't defined here.
6. **PWA assets exist** (`public/icon.svg`); manifest theme color is unified with index.html (`#0f172a`).
7. **`coverage.txt` is gitignored** — never commit coverage output.
8. `pdfService.ts` (Hotel LPO) duplicates footer/signature logic instead of using `drawPdfFooter`/`drawSignatureArea` — legacy; prefer helpers in new code.
9. **Import safety**: every module routes file imports AND storage hydration through the `services/dataUtils.ts` normalizers (`parseImportPayload` + per-module `normalize*Data`). Error toasts are standardized: 'Invalid JSON file.' / 'Invalid data file format.' / size-limit message.
10. **Doc numbers**: `generateDocNumber` emits `PREFIX-YYYYMMDD-XXXXXX` (6 crypto-backed chars). Tests pin this regex — update together.

---

## 8. Testing Guide

- Framework: **Vitest** (`globals: true`, jsdom), setup at `src/test/setup.ts` (browser API mocks only — jsPDF/autoTable mocks are collocated per service test).
- Colocate tests next to source: `Foo.tsx` → `Foo.test.tsx`.
- Patterns in use:
  - Render + RTL queries (`screen.getByText/getByPlaceholderText`), `fireEvent.change` on inputs.
  - Mock child modules with `vi.mock('./components/X', () => ({ default: ... }))` for router-level tests.
  - Service tests instantiate their own local jsPDF mock and assert calls (`expect(doc.text).toHaveBeenCalledWith(...)`).
  - `services/realPdfOutput.test.ts` runs the REAL jsPDF/autoTable stack and asserts on actual PDF bytes (`%PDF-` magic, page counts, sanitized filenames) by patching `jsPDF.API.save`.
  - Use `act()` for hash/popstate simulation; `waitFor` for lazy-loaded content.
- Run `npm test` before pushing; keep the suite green. If you add a feature, add colocated tests following the same patterns.
- `/* v8 ignore next */` comments mark intentionally-uncovered branches.

---

## 9. CI/CD Contract

`.github/workflows/deploy.yml` on push/PR to `main`:
1. `npm ci` (Node 20, npm cache)
2. `npm run typecheck`
3. `npm run test:coverage`
4. `npm run build`
5. Deploy `dist/` to GitHub Pages (main only; concurrency group `pages`, cancel-in-progress).

A PR is only mergeable when typecheck + full suite + build succeed locally too.

---

## 10. Task Playbooks

### Add a field to an existing document
1. Extend the interface + `INITIAL_*` constant in the right `types/*.ts` (mind §7.1 swap!).
2. Add UI in the module's `*Form.tsx` using SharedUI primitives.
3. If it must appear in the PDF, update the matching `services/*PdfService.ts`.
4. Update/add tests (form interaction + service assertion). Run `npm run typecheck && npm test`.

### Add a brand-new module
Follow the 4-step module pattern in §4 end-to-end (container, pure form, types file with `INITIAL_*`, PDF service importing `pdfUtils`), register the lazy import + valid mode in `App.tsx`, add a card in `ModeSelectorPage.tsx`, choose a fresh localStorage key, and add tests for routing + form + service.

### Change persistence format
Bump the storage-key version suffix AND keep `hydrateData`-style backward compatibility (see `HotelLPOModule.hydrateData` for the canonical example incl. legacy flat options migration).

---

*Last audited: 2026-08-24 — React 18.3, Vite 6, Vitest 3, jspdf 4.2.x, jspdf-autotable 5.0.x.*
