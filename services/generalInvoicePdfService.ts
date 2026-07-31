import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { GeneralInvoiceData } from '../types/hotelInvoice';
import { getAmountInWords, drawPdfFooter } from './pdfUtils';

const formatCurrency = (amount: number, currency: string) => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
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
  ].filter(Boolean);
  
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
  ].filter(Boolean);

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
    const row = [
      (index + 1).toString(),
      item.description,
      item.quantity.toString(),
      formatCurrency(item.unitPrice, currency),
      formatCurrency(item.discount, currency)
    ];
    if (data.usePerItemTax) row.push(`${item.taxRate}%`);
    row.push(formatCurrency(item.total, currency));
    return row;
  });

  autoTable(doc, {
    startY: currentY,
    head: [tableColumn],
    body: tableRows,
    theme: 'grid',
    headStyles: { fillColor: [63, 81, 181] },
    styles: { fontSize: 9 },
  });

  let finalY = (doc as any).lastAutoTable.finalY + 10;

  // 4. Totals Calculation
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
    doc.text(totalLabels[i], 140, totalsY);
    if (i === totalLabels.length - 1) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
    }
    doc.text(totalValues[i], 195, totalsY, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    totalsY += 6;
  }

  finalY = Math.max(finalY + 20, totalsY + 10);

  // Amount in words
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(9);
  doc.text(`Amount in Words: ${getAmountInWords(grandTotal, currency)}`, 14, finalY);
  finalY += 10;

  // Payments History
  if (data.payments.length > 0) {
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
      theme: 'plain',
      styles: { fontSize: 8 },
      headStyles: { fontStyle: 'bold', textColor: [100, 100, 100] }
    });
    finalY = (doc as any).lastAutoTable.finalY + 10;
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  
  // Bank Details
  if (data.bankDetails) {
    doc.setFont('helvetica', 'bold');
    doc.text('Bank Details:', 14, finalY);
    doc.setFont('helvetica', 'normal');
    const bankLines = doc.splitTextToSize(data.bankDetails, 180);
    doc.text(bankLines, 14, finalY + 5);
    finalY += (bankLines.length * 5) + 5;
  }

  // Terms and Notes
  if (data.termsAndConditions) {
    doc.setFont('helvetica', 'bold');
    doc.text('Terms & Conditions:', 14, finalY);
    doc.setFont('helvetica', 'normal');
    const termsLines = doc.splitTextToSize(data.termsAndConditions, 180);
    doc.text(termsLines, 14, finalY + 5);
    finalY += (termsLines.length * 5) + 5;
  }

  if (data.notes) {
    doc.setFont('helvetica', 'bold');
    doc.text('Notes:', 14, finalY);
    doc.setFont('helvetica', 'normal');
    const notesLines = doc.splitTextToSize(data.notes, 180);
    doc.text(notesLines, 14, finalY + 5);
    finalY += (notesLines.length * 5) + 5;
  }

  // Signature
  if (data.showSignature) {
    finalY += 20;
    doc.line(14, finalY, 74, finalY);
    doc.text(`Authorized Signature: ${data.signatureName}`, 14, finalY + 5);
  }

  // Footer
  drawPdfFooter(doc, data.invoiceNumber || 'DRAFT', 'Thank you for your business.');

  // Save
  const safeCustomer = data.customer.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  const safeInvoiceNum = data.invoiceNumber.replace(/[^a-z0-9]/gi, '_');
  doc.save(`INV_${safeInvoiceNum || 'draft'}_${safeCustomer || 'customer'}.pdf`);
};
