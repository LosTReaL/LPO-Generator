<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Ordris — Professional Business Document Generator

**Ordris** is a high-performance, client-side web application for generating, managing, and exporting professional business documents. Designed for high reliability and clean aesthetic excellence, it supports four distinct operational modules with zero server dependencies.

---

## 🚀 Operational Modules

- 🏨 **Hotel LPO (Local Purchase Order)** — Generate purchase orders for hotel accommodations featuring multi-stay date ranges, seasonal rate rules, guest/occupancy breakdowns, and PDF exports.
- 📦 **General LPO** — Create purchase orders for standard business procurement with supplier management, line item tables, approval workflows, delivery tracking, and PO PDF generation.
- 🧾 **Hotel Invoice** — Issue guest invoices with categorized charges (*Room, F&B, Spa, Laundry, Transport, Events*), stay details, payment records, and folio invoice PDFs.
- 📄 **General Invoice** — Build customer invoices with global or per-item tax support, payment tracking, credit notes, recurring settings, and invoice PDFs.

---

## ✨ Features

- 📑 **Instant PDF Export**: High-resolution, vector-based PDF generation via `jsPDF` and `jspdf-autotable`.
- 💾 **Automatic Local Persistence**: Automatic state saving to browser `localStorage` with configurable TTL (7 days).
- 📤 **JSON Backup & Import**: Complete data import and export for offline backups and multi-device portability.
- 🌍 **Multi-Currency Support**: Supports major global currencies (*USD, EUR, GBP, AED, SAR, INR, CAD, AUD, SGD, CHF, JPY, CNY*).
- 🎨 **Custom Vanilla CSS Design System**: Production-grade styling using CSS Custom Properties (`:root` tokens) — responsive, fast, and completely free of heavy framework overhead.
- 🔒 **Privacy-First & Offline Ready**: Operates 100% client-side without external database or server tracking.

---

## 🛠️ Installation & Local Setup

### Prerequisites
- **Node.js**: `v18.0.0` or higher
- **npm**: `v9.0.0` or higher

### Setup Instructions

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/ordris/Ordris.git
   cd Ordris
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Start Development Server**:
   ```bash
   npm run dev
   ```
   Open your browser at `http://localhost:3000`.

---

## 🧪 Testing & Quality Assurance

Ordris includes a comprehensive automated testing framework built with **Vitest**, **React Testing Library**, and **jsdom**.

### Test Commands

| Command | Purpose |
| :--- | :--- |
| `npm run test` | Executes all unit and integration tests once. |
| `npm run test:watch` | Starts Vitest in interactive watch mode for TDD. |
| `npm run test:coverage` | Generates a complete test coverage report in text, JSON, and HTML formats. |
| `npm run typecheck` | Runs the TypeScript compiler (`tsc --noEmit`) to verify zero type errors. |

### Running the Test Suite

Run the automated test suite locally:
```bash
npm run test
```

### Running Coverage Reports

Generate detailed statement, branch, function, and line coverage metrics:
```bash
npm run test:coverage
```
Coverage reports will be generated in the `coverage/` directory (viewable in browser via `coverage/index.html`).

### Running Type Safety Checks

Verify TypeScript type safety across all components, modules, and services:
```bash
npm run typecheck
```

---

## 🏗️ Production Build & Preview

To bundle the application for production:
```bash
npm run build
```
The optimized assets will be compiled into the `dist/` directory.

To preview the built production bundle locally:
```bash
npm run preview
```

---

## 🚢 CI/CD & Deployment

This project is configured for automated build, test verification, and deployment via **GitHub Actions** and **GitHub Pages**.

### Workflow Pipeline (`.github/workflows/deploy.yml`)

On every commit pushed to `main` or pull request, the CI/CD pipeline executes:
1. **Dependency Sync**: `npm ci`
2. **Type Gate**: `npm run typecheck`
3. **Automated Test Gate**: `npm run test:coverage`
4. **Production Build**: `npm run build`
5. **Automated Deploy**: Publishes `dist/` directly to **GitHub Pages**.

### Setting Up GitHub Pages

1. Navigate to your repository's **Settings → Pages**.
2. Under **Build and deployment → Source**, select **GitHub Actions**.
3. Push changes to `main` — GitHub Pages will deploy automatically.

---

## 📁 Project Architecture

```
Ordris/
├── .github/workflows/deploy.yml  # GitHub Actions CI/CD pipeline
├── components/
│   ├── shared/
│   │   ├── SharedUI.tsx          # Reusable design system primitives
│   │   └── SharedUI.test.tsx     # Shared UI component tests
│   ├── generalLpo/               # General LPO form & module components
│   ├── hotelInvoice/             # Hotel Invoice form & module components
│   ├── generalInvoice/           # General Invoice form & module components
│   ├── ModeSelectorPage.tsx      # Landing page & mode selection grid
│   ├── HotelLPOModule.tsx        # Preserved Hotel LPO module
│   ├── LPOForm.tsx               # Hotel LPO form component
│   └── DateManager.tsx           # Multi-stay date calendar picker
├── services/
│   ├── pdfUtils.ts               # Shared PDF & math utilities
│   ├── pdfUtils.test.ts          # Unit tests for PDF utilities
│   ├── generalLpoPdfService.ts   # General LPO PDF generator
│   ├── hotelInvoicePdfService.ts # Hotel Invoice PDF generator
│   ├── generalInvoicePdfService.ts# General Invoice PDF generator
│   └── pdfService.ts             # Hotel LPO PDF generator
├── src/test/
│   └── setup.ts                  # Vitest & jest-dom global setup
├── types/                        # TypeScript interface definitions
├── index.css                     # Vanilla CSS design system tokens & rules
├── App.tsx                       # Hash-based dynamic module router
├── App.test.tsx                  # App integration & routing tests
├── vite.config.ts                # Vite bundler & Vitest test config
└── package.json                  # Dependencies & npm scripts
```

---

## 🛠️ Tech Stack

- **Framework**: React 18 + TypeScript 5
- **Build Tool**: Vite 6
- **Test Framework**: Vitest 3 + React Testing Library + jsdom
- **PDF Generation**: jsPDF + jspdf-autotable
- **Icons**: Lucide React
- **Date Handling**: date-fns 4
- **Styling**: Vanilla CSS Custom Properties (Tokens & Responsive Utilities)

---

Made with ❤️ using Gemini AI. [Let's connect on LinkedIn!](https://www.linkedin.com/in/mismailyilmaz)
