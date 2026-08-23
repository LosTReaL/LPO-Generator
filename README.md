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
- 🌍 **Multi-Currency Support**: Supports 50 major global currencies (*USD, EUR, GBP, AED, SAR, INR, JPY, CNY, and more*).
- 🎨 **Custom Vanilla CSS Design System**: Production-grade styling using CSS Custom Properties (`:root` tokens) — responsive, fast, and completely free of heavy framework overhead.
- 🔒 **Privacy-First & Offline Ready**: Operates 100% client-side without external database or server tracking.

---

## 🛠️ Installation & Local Setup

### Prerequisites
- **Node.js**: `v20.x` (CI runs Node 20)
- **npm**: `v10` or higher

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

Ordris includes a comprehensive automated testing framework built with **Vitest**, **React Testing Library**, and **jsdom**. The entire suite is deeply linked — firing a single command executes every unit, integration, layout, and service test concurrently.

### 🌐 Cross-Platform Execution

The testing suite relies on Node.js and is fully cross-platform. It automatically runs all `.test.ts` and `.test.tsx` files across the codebase in a single batch. Here is how to fire the suite on your specific operating system:

#### 🪟 Windows (Command Prompt or PowerShell)
1. Press `Win + R`, type `cmd` (or `powershell`), and press Enter.
2. Navigate to your project directory: `cd D:\Projects\Ordris` (or your specific path).
3. Ensure dependencies are installed: `npm install`
4. **Fire all tests at once**:
   ```cmd
   npm run test
   ```
5. **Run tests with coverage report**:
   ```cmd
   npm run test:coverage
   ```

#### 🍎 macOS (Terminal or iTerm2)
1. Open Spotlight Search (`Cmd + Space`), type `Terminal`, and press Enter.
2. Navigate to your project directory: `cd ~/path/to/Ordris`
3. Ensure dependencies are installed: `npm install`
4. **Fire all tests at once**:
   ```bash
   npm run test
   ```
5. **Run tests with coverage report**:
   ```bash
   npm run test:coverage
   ```

#### 🐧 Linux (Bash / Zsh)
1. Open your terminal emulator (`Ctrl + Alt + T` on Ubuntu/Debian).
2. Navigate to your project directory: `cd ~/path/to/Ordris`
3. Ensure dependencies are installed: `npm install`
4. **Fire all tests at once**:
   ```bash
   npm run test
   ```
5. **Run tests with coverage report**:
   ```bash
   npm run test:coverage
   ```

### 📊 Understanding the Output & Test Types

When you run `npm run test:coverage`, Vitest links and executes the following simultaneously:
- **Component Tests**: Validates that all React UI elements render properly without missing DOM nodes.
- **Service Tests**: Validates PDF generation boundaries using `jsPDF` mocks.
- **Integration Tests**: Validates form state changes, data parsing, and user interactions.

A coverage report table will print to the terminal, and an interactive HTML report will be generated in the `coverage/index.html` directory.

### 🔄 Interactive Watch Mode (TDD)
If you are actively developing and want the test suite to watch your files and instantly fire only the related tests when a file is saved, run:
```bash
npm run test:watch
```

### 🎭 End-to-End Tests (Playwright)
Real-browser journeys (including genuine PDF downloads) run against the production preview build in desktop and mobile viewports:
```bash
npm run e2e           # builds, serves dist/, runs Chromium suites
npm run e2e:headed    # same with a visible browser
```
Requires a one-time `npx playwright install chromium`.

### 🛡️ Running Type Safety Checks
To verify TypeScript type safety across all components and modules without running the actual test assertions:
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
│   │   ├── ToastContext.tsx      # Toast notification system
│   │   ├── ErrorBoundary.tsx     # Global error boundary
│   │   └── SharedUI.test.tsx
│   ├── generalLpo/               # General LPO form & module components
│   ├── hotelInvoice/             # Hotel Invoice form & module components
│   ├── generalInvoice/           # General Invoice form & module components
│   ├── ModeSelectorPage.tsx      # Landing page & mode selection grid
│   ├── HotelLPOModule.tsx        # Hotel LPO module container
│   ├── LPOForm.tsx               # Hotel LPO form component
│   └── DateManager.tsx           # Multi-stay date calendar picker
├── services/
│   ├── pdfUtils.ts               # Shared PDF utilities & helpers
│   ├── dataUtils.ts              # Import validation / defensive normalizers
│   ├── generalLpoPdfService.ts   # General LPO PDF generator
│   ├── hotelInvoicePdfService.ts # Hotel Invoice PDF generator
│   ├── generalInvoicePdfService.ts# General Invoice PDF generator
│   ├── pdfService.ts             # Hotel LPO PDF generator
│   └── realPdfOutput.test.ts     # Byte-level PDF tests (real jsPDF)
├── e2e/app.spec.ts               # Playwright journeys (desktop + mobile)
├── playwright.config.ts          # E2E config vs production preview
├── public/icon.svg               # PWA icon / favicon
├── src/test/setup.ts             # Vitest global browser-API mocks
├── types/                        # TypeScript interface definitions
├── index.css                     # Vanilla CSS design system tokens & rules
├── App.tsx                       # Hash-based dynamic module router
├── App.test.tsx                  # App integration & routing tests
├── vite.config.ts                # Vite bundler, PWA & Vitest config
└── package.json                  # Dependencies & npm scripts
```

---

## 🛠️ Tech Stack

- **Framework**: React 18 + TypeScript 5 (strict mode)
- **Build Tool**: Vite 6
- **Test Framework**: Vitest 3 + React Testing Library + jsdom · Playwright E2E
- **PDF Generation**: jsPDF + jspdf-autotable
- **Icons**: Lucide React
- **Date Handling**: date-fns 4
- **Styling**: Vanilla CSS Custom Properties (Tokens & Responsive Utilities)

---

AI-Orchestrated with ❤️ [Let's connect on LinkedIn!](https://www.linkedin.com/in/mismailyilmaz)
