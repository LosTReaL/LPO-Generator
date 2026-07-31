# Ordris — Professional Business Document Generator

A comprehensive business document management platform supporting multiple operational modes:

- 🏨 **Hotel LPO** — Purchase orders for hotel accommodations with multi-stay support, rate management, and PDF export
- 📦 **General LPO** — Purchase orders for any business with supplier management, line items, approval workflows, and delivery tracking
- 🧾 **Hotel Invoice** — Guest invoices with categorized charges (room, F&B, spa, transport, events) and payment tracking
- 📄 **General Invoice** — Professional invoicing with itemized billing, taxes, credit notes, recurring invoices, and more

## Features

- 📑 Professional PDF generation for all document types
- 💾 Auto-save with localStorage persistence
- 📤 JSON export/import for data backup
- 🌍 Multi-currency support (40+ currencies)
- 📱 Responsive design (mobile + desktop)
- 🔒 No server required — runs entirely in the browser

## Run Locally

**Prerequisites:** Node.js (v18+)

1. Install dependencies:
   ```bash
   npm install
   ```
2. Run the development server:
   ```bash
   npm run dev
   ```
3. Open [http://localhost:3000](http://localhost:3000)

## Build for Production

```bash
npm run build
```

Output will be in the `dist/` directory.

## Deployment

This project is configured for automatic deployment via **GitHub Pages**. Every push to the `main` branch triggers the CI/CD workflow defined in `.github/workflows/deploy.yml`.

To enable GitHub Pages:
1. Go to your repo's **Settings → Pages**
2. Under **Source**, select **GitHub Actions**
3. Push to `main` — the site will be deployed automatically

## Tech Stack

- **React 18** + TypeScript
- **Vite** for build tooling
- **jsPDF** + jspdf-autotable for PDF generation
- **Lucide React** for icons
- **date-fns** for date utilities
- **Vanilla CSS** design system (no Tailwind)

---

Made with ❤️ using Gemini AI. [Let's connect!](https://www.linkedin.com/in/mismailyilmaz)
