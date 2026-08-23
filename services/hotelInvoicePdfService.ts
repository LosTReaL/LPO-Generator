import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { HotelInvoiceData } from '../types/hotelInvoice';
import { 
  getAmountInWords, generateDocNumber, PDF_COLORS, 
  getPdfTextHelpers, PDF_TABLE_HEAD_STYLES, PDF_TABLE_BODY_STYLES, 
  PDF_TABLE_ALTERNATE_ROW_STYLES,
  drawPdfFooter, addLogoPdf, drawSignatureArea, drawWatermark
} from './pdfUtils';

export const generateHotelInvoicePDF = (data: HotelInvoiceData) => {
  const doc = new jsPDF();
  const helpers = getPdfTextHelpers(doc);
  const pageWidth = doc.internal.pageSize.width;
  let yCursor = 15;

  const invoiceNum = data.invoiceNumber || generateDocNumber('INV');
  const issueDate = data.invoiceDate ? format(new Date(data.invoiceDate), 'dd MMM yyyy') : format(new Date(), 'dd MMM yyyy');
  const isTaxInvoice = data.taxRate > 0;

  // --- HEADER ---
  if (data.showLogo && data.hotelLogo) {
    addLogoPdf(doc, data.hotelLogo, 15, yCursor, 40, 20);
  } else if (data.hotelName) {
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    helpers.setPrimary();
    doc.text(data.hotelName, 15, yCursor + 8);
  }

  // Invoice Title & Meta
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  helpers.setPrimary();
  const title = isTaxInvoice ? 'TAX INVOICE' : 'HOTEL INVOICE';
  doc.text(title, pageWidth - 15, yCursor + 8, { align: 'right' });

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  helpers.setSecondary();
  doc.text(`Invoice No: ${invoiceNum}`, pageWidth - 15, yCursor + 15, { align: 'right' });
  doc.text(`Date: ${issueDate}`, pageWidth - 15, yCursor + 20, { align: 'right' });
  if (data.status !== 'Draft') {
    doc.text(`Status: ${data.status.toUpperCase()}`, pageWidth - 15, yCursor + 25, { align: 'right' });
  }

  yCursor += 35;
  doc.setDrawColor(PDF_COLORS.border[0], PDF_COLORS.border[1], PDF_COLORS.border[2]);
  doc.setLineWidth(0.5);
  doc.line(15, yCursor, pageWidth - 15, yCursor);
  yCursor += 10;

  // --- DETAILS BLOCKS ---
  const leftColX = 15;
  const midColX = 85;
  const rightColX = 150;

  // Hotel Details
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  helpers.setPrimary();
  doc.text(data.hotelName || 'Hotel Name', leftColX, yCursor);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  helpers.setSecondary();
  if (data.hotelAddress) {
    const addressLines = doc.splitTextToSize(data.hotelAddress, 60);
    doc.text(addressLines, leftColX, yCursor + 5);
    yCursor += (addressLines.length * 4.5);
  }
  if (data.hotelPhone) { doc.text(`Tel: ${data.hotelPhone}`, leftColX, yCursor + 5); yCursor += 4.5; }
  if (data.hotelEmail) { doc.text(`Email: ${data.hotelEmail}`, leftColX, yCursor + 5); }

  // Guest Details
  let guestY = yCursor - (data.hotelAddress ? doc.splitTextToSize(data.hotelAddress, 60).length * 4.5 : 0) - (data.hotelPhone ? 4.5 : 0) - (data.hotelEmail ? 4.5 : 0);

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  helpers.setPrimary();
  doc.text("GUEST / BILL TO", midColX, guestY);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  helpers.setSecondary();
  
  let gLine = guestY + 5;
  if (data.primaryGuest.name) {
    doc.text(data.primaryGuest.name, midColX, gLine); gLine += 4.5;
  }
  if (data.companyName) {
    doc.text(data.companyName, midColX, gLine); gLine += 4.5;
  }
  if (data.primaryGuest.loyaltyNumber) {
    doc.text(`Loyalty No: ${data.primaryGuest.loyaltyNumber}`, midColX, gLine); gLine += 4.5;
  }
  if (data.guestPhone) {
    doc.text(`Tel: ${data.guestPhone}`, midColX, gLine); gLine += 4.5;
  }

  // Stay Details
  let stayY = guestY;
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  helpers.setPrimary();
  doc.text("STAY DETAILS", rightColX, stayY);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  helpers.setSecondary();
  
  let sLine = stayY + 5;
  if (data.folioNumber) { doc.text(`Folio No: ${data.folioNumber}`, rightColX, sLine); sLine += 4.5; }
  if (data.roomNumber) { doc.text(`Room: ${data.roomNumber} (${data.roomType})`, rightColX, sLine); sLine += 4.5; }
  if (data.checkInDate) { doc.text(`Arrival: ${format(new Date(data.checkInDate), 'dd MMM yyyy')}`, rightColX, sLine); sLine += 4.5; }
  if (data.checkOutDate) { doc.text(`Departure: ${format(new Date(data.checkOutDate), 'dd MMM yyyy')}`, rightColX, sLine); sLine += 4.5; }
  
  yCursor = Math.max(yCursor + 15, gLine + 5, sLine + 5);

  // --- CHARGES TABLE ---
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  helpers.setPrimary();
  doc.text("CHARGES", 15, yCursor);
  yCursor += 5;

  const tableData = data.lineItems.map(item => [
    item.date ? format(new Date(item.date), 'dd MMM') : '',
    item.category,
    item.description,
    item.quantity.toString(),
    item.rate.toFixed(2),
    item.amount.toFixed(2)
  ]);

  autoTable(doc, {
    startY: yCursor,
    head: [['Date', 'Category', 'Description', 'Qty', 'Rate', 'Amount']],
    body: tableData,
    theme: 'striped',
    headStyles: PDF_TABLE_HEAD_STYLES,
    bodyStyles: PDF_TABLE_BODY_STYLES,
    alternateRowStyles: PDF_TABLE_ALTERNATE_ROW_STYLES,
    columnStyles: {
      0: { cellWidth: 20 },
      1: { cellWidth: 35 },
      2: { cellWidth: 'auto' },
      3: { cellWidth: 15, halign: 'center' },
      4: { cellWidth: 25, halign: 'right' },
      5: { cellWidth: 30, halign: 'right' },
    },
    margin: { left: 15, right: 15 },
  });

  yCursor = (doc as any).lastAutoTable.finalY + 10;

  // Calculations
  const subtotal = data.lineItems.reduce((sum, item) => sum + item.amount, 0);
  const serviceChargeAmt = data.serviceChargeType === 'percentage' ? subtotal * (data.serviceChargeRate / 100) : data.serviceChargeRate;
  const taxableAmt = subtotal + serviceChargeAmt;
  const taxAmt = data.taxType === 'percentage' ? taxableAmt * (data.taxRate / 100) : data.taxRate;
  const discountAmt = data.discountType === 'percentage' ? (taxableAmt + taxAmt) * (data.discountValue / 100) : data.discountValue;
  const grandTotal = taxableAmt + taxAmt - discountAmt;

  const totalPaid = data.payments.reduce((sum, p) => sum + p.amount, 0);
  const balance = grandTotal - totalPaid;

  // --- TOTALS BLOCK ---
  // Ensure we have space for totals
  if (yCursor > doc.internal.pageSize.height - 60) {
    doc.addPage();
    yCursor = 20;
  }

  // Amount in words
  doc.setFontSize(9);
  doc.setFont("helvetica", "italic");
  helpers.setSecondary();
  const wordAmountText = getAmountInWords(grandTotal, data.currency);
  const wordsLines = doc.splitTextToSize(`Amount in words: ${wordAmountText}`, 100);
  doc.text(wordsLines, 15, yCursor);

  // Totals table (right aligned)
  const totalsX = pageWidth - 80;
  let tLine = yCursor;

  const addTotalRow = (label: string, value: number, isBold: boolean = false) => {
    doc.setFont("helvetica", isBold ? "bold" : "normal");
    helpers.setPrimary();
    doc.text(label, totalsX, tLine);
    doc.text(`${value.toFixed(2)} ${data.currency}`, pageWidth - 15, tLine, { align: 'right' });
    tLine += 6;
  };

  addTotalRow("Subtotal:", subtotal);
  if (serviceChargeAmt > 0) addTotalRow(`${data.serviceChargeLabel}:`, serviceChargeAmt);
  if (taxAmt > 0) addTotalRow(`${data.taxLabel}:`, taxAmt);
  if (discountAmt > 0) addTotalRow(`${data.discountLabel}:`, -discountAmt);
  
  tLine += 2;
  doc.setLineWidth(0.5);
  doc.setDrawColor(PDF_COLORS.border[0], PDF_COLORS.border[1], PDF_COLORS.border[2]);
  doc.line(totalsX, tLine - 4, pageWidth - 15, tLine - 4);
  
  addTotalRow("GRAND TOTAL:", grandTotal, true);

  if (totalPaid > 0) {
    addTotalRow("Total Paid:", -totalPaid);
    doc.line(totalsX, tLine - 4, pageWidth - 15, tLine - 4);
    
    // Balance Due
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(balance > 0 ? 180 : PDF_COLORS.dark[0], balance > 0 ? 0 : PDF_COLORS.dark[1], 0); // Red if balance > 0
    doc.text("BALANCE DUE:", totalsX, tLine);
    doc.text(`${Math.max(0, balance).toFixed(2)} ${data.currency}`, pageWidth - 15, tLine, { align: 'right' });
    tLine += 8;
  }

  yCursor = Math.max(tLine, yCursor + (wordsLines.length * 5)) + 5;

  // --- PAYMENTS TABLE ---
  if (data.payments.length > 0) {
    if (yCursor > doc.internal.pageSize.height - 40) {
      doc.addPage();
      yCursor = 20;
    }

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    helpers.setPrimary();
    doc.text("PAYMENT HISTORY", 15, yCursor);
    yCursor += 4;

    const paymentData = data.payments.map(p => [
      p.date ? format(new Date(p.date), 'dd MMM yyyy') : '',
      p.method,
      p.reference || '-',
      p.amount.toFixed(2)
    ]);

    autoTable(doc, {
      startY: yCursor,
      head: [['Date', 'Method', 'Reference', 'Amount']],
      body: paymentData,
      theme: 'striped',
      headStyles: { ...PDF_TABLE_HEAD_STYLES, fillColor: [248, 250, 252], textColor: PDF_COLORS.muted },
      bodyStyles: { ...PDF_TABLE_BODY_STYLES, fontSize: 8 },
      alternateRowStyles: PDF_TABLE_ALTERNATE_ROW_STYLES,
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 40 },
        2: { cellWidth: 'auto' },
        3: { cellWidth: 30, halign: 'right' },
      },
      margin: { left: 15, right: 15 },
    });
    
    yCursor = (doc as any).lastAutoTable.finalY + 10;
  }

  // --- NOTES ---
  if (data.notes) {
    if (yCursor > doc.internal.pageSize.height - 40) {
      doc.addPage();
      yCursor = 20;
    }
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    helpers.setPrimary();
    doc.text("Notes:", 15, yCursor);
    
    doc.setFont("helvetica", "normal");
    const notesLines = doc.splitTextToSize(data.notes, pageWidth - 30);
    doc.text(notesLines, 15, yCursor + 5);
    yCursor += (notesLines.length * 5) + 10;
  }

  // --- SIGNATURES ---
  if (yCursor > doc.internal.pageSize.height - 40) {
    doc.addPage();
    yCursor = 20;
  }
  
  yCursor += 15; // Space for signature
  drawSignatureArea(doc, yCursor, {
    showCreatedBy: true,
    createdByName: data.signatureName || data.hotelName || 'Reception',
    showSignature: data.showSignature,
    signatureName: 'Guest Signature'
  });

  // --- FOOTER ---
  drawPdfFooter(doc, invoiceNum, 'Thank you for your business. For any queries regarding this invoice, please contact the hotel reception.');

  if (data.watermarkText && data.watermarkText.trim()) {
    drawWatermark(doc, data.watermarkText);
  }

  // --- SAVE ---
  const fileName = `Invoice_${invoiceNum}_${data.hotelName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`;
  doc.save(fileName);
};
