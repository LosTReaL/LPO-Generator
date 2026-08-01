import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { GeneralLPOData } from '../types/generalLpo';
import { 
  generateDocNumber, 
  getAmountInWords, 
  getTimeZoneAbbr, 
  PDF_COLORS, 
  getPdfTextHelpers, 
  PDF_TABLE_HEAD_STYLES, 
  PDF_TABLE_BODY_STYLES,
  PDF_TABLE_ALTERNATE_ROW_STYLES,
  drawPdfFooter, 
  addLogoPdf, 
  drawSignatureArea,
  drawWatermark
} from './pdfUtils';

export const generateGeneralLPOPDF = (data: GeneralLPOData): void => {
  const doc = new jsPDF();
  const helpers = getPdfTextHelpers(doc);

  const poNumber = data.lpoNumberOverride?.trim() || generateDocNumber('PO');
  const currency = data.currency || 'USD';
  const supplierName = data.supplierInfo?.name || 'Supplier';

  // 1. Header & Logo
  let startY = 20;
  
  if (data.logoUpload) {
    // Attempt to add logo, if it fails gracefully continue
    try {
      addLogoPdf(doc, data.logoUpload, 14, startY - 5, 40, 20);
    } catch (e) {
      console.warn('Failed to add logo to PDF', e);
    }
  }

  // Title
  doc.setFontSize(22);
  doc.setTextColor(PDF_COLORS.dark[0], PDF_COLORS.dark[1], PDF_COLORS.dark[2]);
  doc.setFont('helvetica', 'bold');
  doc.text('PURCHASE ORDER', 196, startY, { align: 'right' });
  
  startY += 8;
  doc.setFontSize(10);
  doc.setTextColor(PDF_COLORS.muted[0], PDF_COLORS.muted[1], PDF_COLORS.muted[2]);
  doc.setFont('helvetica', 'normal');
  doc.text(`PO Number: ${poNumber}`, 196, startY, { align: 'right' });
  
  startY += 5;
  const dateStr = data.approvalDate || new Date().toISOString().slice(0, 10);
  doc.text(`Date: ${dateStr}`, 196, startY, { align: 'right' });

  startY += 5;
  doc.text(`Status: ${data.status || 'Draft'}`, 196, startY, { align: 'right' });

  startY += 15;

  // 2. Addresses (From / To)
  const addressY = startY;
  
  // From (Company)
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(PDF_COLORS.dark[0], PDF_COLORS.dark[1], PDF_COLORS.dark[2]);
  doc.text('From:', 14, addressY);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  let currentY = addressY + 6;
  if (data.companyInfo?.name) {
    doc.text(data.companyInfo.name, 14, currentY);
    currentY += 5;
  }
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(PDF_COLORS.muted[0], PDF_COLORS.muted[1], PDF_COLORS.muted[2]);
  
  if (data.companyInfo?.address) {
    const addressLines = doc.splitTextToSize(data.companyInfo.address, 70);
    doc.text(addressLines, 14, currentY);
    currentY += (addressLines.length * 5);
  }
  if (data.companyInfo?.phone) {
    doc.text(`Phone: ${data.companyInfo.phone}`, 14, currentY);
    currentY += 5;
  }
  if (data.companyInfo?.email) {
    doc.text(`Email: ${data.companyInfo.email}`, 14, currentY);
  }

  // To (Supplier)
  let toY = addressY;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(PDF_COLORS.dark[0], PDF_COLORS.dark[1], PDF_COLORS.dark[2]);
  doc.text('To:', 110, toY);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  toY += 6;
  if (data.supplierInfo?.name) {
    doc.text(data.supplierInfo.name, 110, toY);
    toY += 5;
  }
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(PDF_COLORS.muted[0], PDF_COLORS.muted[1], PDF_COLORS.muted[2]);
  
  if (data.supplierInfo?.address) {
    const addressLines = doc.splitTextToSize(data.supplierInfo.address, 70);
    doc.text(addressLines, 110, toY);
    toY += (addressLines.length * 5);
  }
  if (data.supplierInfo?.contactPerson) {
    doc.text(`Attn: ${data.supplierInfo.contactPerson}`, 110, toY);
    toY += 5;
  }
  if (data.supplierInfo?.phone) {
    doc.text(`Phone: ${data.supplierInfo.phone}`, 110, toY);
    toY += 5;
  }
  if (data.supplierInfo?.email) {
    doc.text(`Email: ${data.supplierInfo.email}`, 110, toY);
    toY += 5;
  }
  if (data.supplierInfo?.taxId) {
    doc.text(`Tax ID: ${data.supplierInfo.taxId}`, 110, toY);
  }

  startY = Math.max(currentY, toY) + 15;

  // 3. Items Table
  const tableData = (data.items || []).map((item, index) => [
    (index + 1).toString(),
    item.description || '',
    item.quantity?.toString() || '0',
    item.unit || '',
    `${currency} ${(item.unitPrice || 0).toFixed(2)}`,
    `${currency} ${(item.total || 0).toFixed(2)}`
  ]);

  autoTable(doc, {
    startY,
    head: [['#', 'Description', 'Qty', 'Unit', 'Unit Price', 'Total']],
    body: tableData,
    headStyles: PDF_TABLE_HEAD_STYLES,
    bodyStyles: PDF_TABLE_BODY_STYLES,
    alternateRowStyles: PDF_TABLE_ALTERNATE_ROW_STYLES,
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 20, halign: 'center' },
      3: { cellWidth: 20, halign: 'center' },
      4: { cellWidth: 30, halign: 'right' },
      5: { cellWidth: 35, halign: 'right' }
    },
    margin: { top: 20, left: 14, right: 14 }
  });

  const finalY = (doc as any).lastAutoTable.finalY || startY + 20;

  // 4. Financial Summary
  const subtotal = (data.items || []).reduce((sum, item) => sum + (item.total || 0), 0);
  
  let discountAmount = 0;
  if (data.discountType === 'percentage') {
    discountAmount = subtotal * (Number(data.discountValue) / 100);
  } else {
    discountAmount = Number(data.discountValue || 0);
  }

  const taxableAmount = subtotal - discountAmount;
  
  let taxAmount = 0;
  if (data.taxType === 'percentage') {
    taxAmount = taxableAmount * (Number(data.taxRate) / 100);
  } else {
    taxAmount = Number(data.taxRate || 0);
  }

  const shippingAmount = Number(data.shippingCharges || 0);
  const grandTotal = subtotal - discountAmount + taxAmount + shippingAmount;

  let summaryY = finalY + 10;
  const summaryX = 140;
  const valX = 196;

  doc.setFontSize(10);
  doc.setTextColor(PDF_COLORS.dark[0], PDF_COLORS.dark[1], PDF_COLORS.dark[2]);

  doc.text('Subtotal:', summaryX, summaryY);
  doc.text(`${currency} ${subtotal.toFixed(2)}`, valX, summaryY, { align: 'right' });
  summaryY += 6;

  if (discountAmount > 0) {
    doc.text('Discount:', summaryX, summaryY);
    doc.text(`-${currency} ${discountAmount.toFixed(2)}`, valX, summaryY, { align: 'right' });
    summaryY += 6;
  }

  if (taxAmount > 0) {
    doc.text(`${data.taxLabel || 'Tax'}:`, summaryX, summaryY);
    doc.text(`${currency} ${taxAmount.toFixed(2)}`, valX, summaryY, { align: 'right' });
    summaryY += 6;
  }

  if (shippingAmount > 0) {
    doc.text('Shipping:', summaryX, summaryY);
    doc.text(`${currency} ${shippingAmount.toFixed(2)}`, valX, summaryY, { align: 'right' });
    summaryY += 6;
  }

  // Grand Total Line
  doc.setLineWidth(0.5);
  doc.setDrawColor(PDF_COLORS.border[0], PDF_COLORS.border[1], PDF_COLORS.border[2]);
  doc.line(summaryX, summaryY + 2, 196, summaryY + 2);
  
  summaryY += 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Grand Total:', summaryX, summaryY);
  doc.text(`${currency} ${grandTotal.toFixed(2)}`, valX, summaryY, { align: 'right' });

  // 5. Amount in Words
  let notesY = Math.max(finalY + 10, summaryY + 15);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(PDF_COLORS.muted[0], PDF_COLORS.muted[1], PDF_COLORS.muted[2]);
  doc.text(`Amount in words: ${getAmountInWords(grandTotal, currency)}`, 14, notesY);
  notesY += 10;

  doc.setFont('helvetica', 'normal');

  // 6. Notes and Terms
  if (data.notes || data.deliveryNotes) {
    doc.setFont('helvetica', 'bold');
    doc.text('Notes / Instructions:', 14, notesY);
    notesY += 6;
    doc.setFont('helvetica', 'normal');
    
    let combinedNotes = '';
    if (data.notes) combinedNotes += data.notes + '\n';
    if (data.deliveryNotes) combinedNotes += `Delivery: ${data.deliveryNotes}`;
    
    const noteLines = doc.splitTextToSize(combinedNotes.trim(), 180);
    doc.text(noteLines, 14, notesY);
    notesY += (noteLines.length * 5) + 5;
  }

  if (data.termsAndConditions) {
    doc.setFont('helvetica', 'bold');
    doc.text('Terms & Conditions:', 14, notesY);
    notesY += 6;
    doc.setFont('helvetica', 'normal');
    const termLines = doc.splitTextToSize(data.termsAndConditions, 180);
    doc.text(termLines, 14, notesY);
    notesY += (termLines.length * 5) + 5;
  }

  // 7. Signature Area
  if (data.includeSignature) {
    if (notesY > 240) {
      doc.addPage();
      notesY = 20;
    }
    notesY += 10;
    drawSignatureArea(doc, notesY, { showSignature: true, signatureName: data.signatureName });
  }

  // 8. Footer
  drawPdfFooter(doc, poNumber, 'This is a computer-generated Purchase Order.');

  if (data.watermarkText && data.watermarkText.trim()) {
    drawWatermark(doc, data.watermarkText);
  }

  // Save the PDF
  const safeSupplierName = supplierName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  doc.save(`LPO_${poNumber}_${safeSupplierName}.pdf`);
};
