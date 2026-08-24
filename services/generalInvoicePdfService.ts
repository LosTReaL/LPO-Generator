import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { GeneralInvoiceData } from '../types/generalInvoice';
import { getAmountInWords, drawPdfFooter, drawWatermark, ensurePdfSpace, drawWrappedLines, PDF_TABLE_HEAD_STYLES, PDF_TABLE_BODY_STYLES, PDF_TABLE_ALTERNATE_ROW_STYLES } from './pdfUtils';

// jsPDF's built-in Helvetica font cannot render non-Latin currency glyphs
// (₹, ₺, ﷼ …) that Intl.NumberFormat emits for some ISO codes, so amounts
// are formatted as "USD 12.00" instead — matching the other PDF services.
const formatCurrency = (amount: number, currency: string) => {
  return `${currency} ${amount.toFixed(2)}`;
};

export const generateGeneralInvoicePDF = (data: GeneralInvoiceData) => {
  const doc = new jsPDF();
  const currency = data.currency;

  // 1. Header (Logo, title, company info)
  // Reusing a theoretical addPdfHeader if needed, or implement custom logic here
  // For standard structure:
  doc.setFontSize(22);
  doc.setTextColor(33, 33, 33);
  doc.text('INVOICE', 14, 22);

  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Invoice Number: ${data.invoiceNumber || 'DRAFT'}`, 14, 30);
  if (data.invoiceDate) doc.text(`Invoice Date: ${data.invoiceDate}`, 14, 35);
  if (data.dueDate) doc.text(`Due Date: ${data.dueDate}`, 14, 40);
  
  // Status
  doc.setTextColor(50, 150, 50);
  doc.text(`Status: ${data.status.toUpperCase()}`, 14, 45);

  // Company Details (Right aligned)
  doc.setTextColor(33, 33, 33);
  doc.setFontSize(12);
  doc.text(data.companyName || 'Company Name', 140, 22);
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  const companyLines = [
    data.companyAddress,
    data.companyPhone,
    data.companyEmail,
    data.companyTaxId ? `Tax ID: ${data.companyTaxId}` : ''
  ].filter((line): line is string => Boolean(line));
  
  let currentY = 28;
  companyLines.forEach(line => {
    doc.text(line, 140, currentY);
    currentY += 5;
  });

  // 2. Bill To
  currentY = 60;
  doc.setFontSize(12);
  doc.setTextColor(33, 33, 33);
  doc.text('BILL TO:', 14, currentY);
  
  currentY += 6;
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  const customerLines = [
    data.customer.name,
    data.customer.address,
    data.customer.phone,
    data.customer.email,
    data.customer.taxId ? `Tax ID: ${data.customer.taxId}` : ''
  ].filter((line): line is string => Boolean(line));

  customerLines.forEach(line => {
    doc.text(line, 14, currentY);
    currentY += 5;
  });

  // 3. Items Table
  currentY = Math.max(currentY, 60 + companyLines.length * 5) + 10;

  const tableColumn = ["#", "Description", "Qty", "Unit Price", "Discount"];
  if (data.usePerItemTax) tableColumn.push("Tax %");
  tableColumn.push("Total");

  const tableRows = data.items.map((item, index) => {
    // Recompute the displayed total so it always matches the active tax
    // mode (stored item.total can be stale right after toggling modes).
    const gross = item.quantity * item.unitPrice;
    const perItemTax = data.usePerItemTax ? gross * (item.taxRate / 100) : 0;
    const displayTotal = Math.max(0, gross + perItemTax - (item.discount || 0));
    const row = [
      (index + 1).toString(),
      item.description,
      item.quantity.toString(),
      formatCurrency(item.unitPrice, currency),
      formatCurrency(item.discount || 0, currency)
    ];
    if (data.usePerItemTax) row.push(`${item.taxRate}%`);
    row.push(formatCurrency(displayTotal, currency));
    return row;
  });

  autoTable(doc, {
    startY: currentY,
    head: [tableColumn],
    body: tableRows,
    theme: 'striped',
    headStyles: PDF_TABLE_HEAD_STYLES,
    bodyStyles: PDF_TABLE_BODY_STYLES,
    alternateRowStyles: PDF_TABLE_ALTERNATE_ROW_STYLES,
  });

  // 4. Totals Calculation
  const rawTableEnd = (doc as any).lastAutoTable.finalY + 10;
  // The items table can end near the bottom of the page — move the totals
  // block (plus words/payments that follow) to a fresh page instead of
  // rendering it off-page where it would be silently lost.
  const totalsStart = ensurePdfSpace(doc, rawTableEnd, 70);
  let finalY = totalsStart;
  let subtotal = 0;
  let itemTax = 0;
  
  data.items.forEach(item => {
    const itemSub = item.quantity * item.unitPrice;
    subtotal += itemSub - item.discount;
    if (data.usePerItemTax) {
      itemTax += itemSub * (item.taxRate / 100);
    }
  });

  const globalDiscount = data.discountType === 'flat' 
    ? data.discountValue 
    : subtotal * (data.discountValue / 100);

  const taxableAmount = subtotal - globalDiscount;
  const globalTax = !data.usePerItemTax
    ? (data.globalTaxType === 'flat' ? data.globalTaxRate : taxableAmount * (data.globalTaxRate / 100))
    : 0;

  const totalTax = data.usePerItemTax ? itemTax : globalTax;
  const creditNotesTotal = data.creditNotes.reduce((sum, n) => sum + n.amount, 0);
  const grandTotal = taxableAmount + totalTax + data.shippingCharges - creditNotesTotal;

  // Render Totals
  doc.setTextColor(33, 33, 33);
  doc.setFontSize(10);
  
  const totalLabels = [];
  const totalValues = [];

  totalLabels.push('Subtotal:');
  totalValues.push(formatCurrency(subtotal, currency));

  if (globalDiscount > 0) {
    totalLabels.push('Discount:');
    totalValues.push(`-${formatCurrency(globalDiscount, currency)}`);
  }

  if (totalTax > 0) {
    totalLabels.push(data.usePerItemTax ? 'Tax:' : `${data.globalTaxLabel}:`);
    totalValues.push(formatCurrency(totalTax, currency));
  }

  if (data.shippingCharges > 0) {
    totalLabels.push('Shipping/Handling:');
    totalValues.push(formatCurrency(data.shippingCharges, currency));
  }

  if (creditNotesTotal > 0) {
    totalLabels.push('Credit Notes Applied:');
    totalValues.push(`-${formatCurrency(creditNotesTotal, currency)}`);
  }

  totalLabels.push('Grand Total:');
  totalValues.push(formatCurrency(grandTotal, currency));

  let totalsY = finalY;
  for (let i = 0; i < totalLabels.length; i++) {
    const isLast = i === totalLabels.length - 1;
    // Style BEFORE drawing so the Grand Total label and value match.
    doc.setFont('helvetica', isLast ? 'bold' : 'normal');
    doc.setFontSize(isLast ? 12 : 10);
    doc.text(totalLabels[i], 140, totalsY);
    doc.text(totalValues[i], 195, totalsY, { align: 'right' });
    totalsY += 6;
  }

  finalY = Math.max(finalY + 20, totalsY + 10);

  // Amount in words (wrapped so long amounts cannot run off the page)
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(9);
  const pageWidth = doc.internal.pageSize.width;
  const wordLines = doc.splitTextToSize(
    `Amount in Words: ${getAmountInWords(grandTotal, currency)}`,
    pageWidth - 28,
  ) as string[];
  finalY = drawWrappedLines(doc, wordLines, 14, finalY);
  finalY += 5;

  // Payments History
  if (data.payments.length > 0) {
    finalY = ensurePdfSpace(doc, finalY, 45);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Payments Received', 14, finalY);
    finalY += 5;
    
    const paymentRows = data.payments.map(p => [
      p.date,
      p.method,
      p.reference,
      formatCurrency(p.amount, currency)
    ]);
    
    autoTable(doc, {
      startY: finalY,
      head: [['Date', 'Method', 'Reference', 'Amount']],
      body: paymentRows,
      theme: 'striped',
      styles: { fontSize: 8 },
      headStyles: { ...PDF_TABLE_HEAD_STYLES },
      bodyStyles: { ...PDF_TABLE_BODY_STYLES },
      alternateRowStyles: PDF_TABLE_ALTERNATE_ROW_STYLES,
    });
    finalY = (doc as any).lastAutoTable.finalY + 10;
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  
  // Bank Details
  if (data.bankDetails) {
    finalY = ensurePdfSpace(doc, finalY, 30);
    doc.setFont('helvetica', 'bold');
    doc.text('Bank Details:', 14, finalY);
    doc.setFont('helvetica', 'normal');
    const bankLines = doc.splitTextToSize(data.bankDetails, 180) as string[];
    finalY = drawWrappedLines(doc, bankLines, 14, finalY + 5);
    finalY += 5;
  }

  // Terms and Notes
  if (data.termsAndConditions) {
    finalY = ensurePdfSpace(doc, finalY, 30);
    doc.setFont('helvetica', 'bold');
    doc.text('Terms & Conditions:', 14, finalY);
    doc.setFont('helvetica', 'normal');
    const termsLines = doc.splitTextToSize(data.termsAndConditions, 180) as string[];
    finalY = drawWrappedLines(doc, termsLines, 14, finalY + 5);
    finalY += 5;
  }

  if (data.notes) {
    finalY = ensurePdfSpace(doc, finalY, 30);
    doc.setFont('helvetica', 'bold');
    doc.text('Notes:', 14, finalY);
    doc.setFont('helvetica', 'normal');
    const notesLines = doc.splitTextToSize(data.notes, 180) as string[];
    finalY = drawWrappedLines(doc, notesLines, 14, finalY + 5);
    finalY += 5;
  }

  // Signature
  if (data.showSignature) {
    finalY = ensurePdfSpace(doc, finalY + 20, 15);
    finalY += 20;
    doc.line(14, finalY, 74, finalY);
    doc.text(`Authorized Signature: ${data.signatureName}`, 14, finalY + 5);
  }

  // Footer
  drawPdfFooter(doc, data.invoiceNumber || 'DRAFT', 'Thank you for your business.');

  if (data.watermarkText && data.watermarkText.trim()) {
    drawWatermark(doc, data.watermarkText);
  }

  // Save
  const safeCustomer = data.customer.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  const safeInvoiceNum = data.invoiceNumber.replace(/[^a-z0-9]/gi, '_');
  doc.save(`INV_${safeInvoiceNum || 'draft'}_${safeCustomer || 'customer'}.pdf`);
};
