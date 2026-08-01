import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, eachDayOfInterval, startOfDay, subDays } from 'date-fns';
import { LPOData } from '../types';

import {
  numToWords,
  getAmountInWords,
  getTimeZoneAbbr,
  generateDocNumber as generatePONumber,
  PDF_COLORS,
  getPdfTextHelpers,
  PDF_TABLE_HEAD_STYLES,
  PDF_TABLE_BODY_STYLES,
  PDF_TABLE_ALTERNATE_ROW_STYLES,
  drawWatermark
} from './pdfUtils';

export const generateLPOPDF = (data: LPOData) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const marginX = 15;
  const opts = data.pdfOptions; // Short alias for configuration
  
  // -- Pastel Professional Color Palette --
  const { dark: darkColor, muted: mutedColor, accent: accentColor, headerFill: tableHeaderFill, headerText: tableHeaderTx, stripe: tableStripe, border: tableBorder } = PDF_COLORS;
  const { setPrimary, setSecondary, setAccent } = getPdfTextHelpers(doc);

  // Ensure rates are sorted for deterministic behavior
  const sortedRates = [...data.applicableRates].sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

  // -- Helpers for Calculation --
  const getRateForDate = (date: Date): number => {
    // Check applicable rates
    const match = sortedRates.find(r => {
      const start = startOfDay(r.start);
      const end = startOfDay(r.end);
      const d = startOfDay(date);
      // STRICT REQUIREMENT: Fully inclusive logic [start, end].
      return d >= start && d <= end; 
    });
    return match ? match.amount : 0;
  };

  const calculateStayCost = (start: Date, end: Date) => {
    if (start >= end) return 0;
    const nights = eachDayOfInterval({ start, end: subDays(end, 1) });
    return nights.reduce((sum, date) => sum + getRateForDate(date), 0);
  };

  // -- Header Section --
  let yCursor = 20;
  
  // PO Number logic
  const poNumber = (opts.manualPONumber && opts.poNumber.trim()) 
    ? opts.poNumber 
    : generatePONumber();

  // Date with Time Zone
  const tz = getTimeZoneAbbr();
  const dateStr = `${format(new Date(), 'dd MMM yyyy HH:mm')} ${tz}`;

  // Top Left: Logo or Nothing
  if (opts.showLogo && opts.logoDataUrl) {
    try {
      const imgFormat = opts.logoDataUrl.split(';')[0].split('/')[1]?.toUpperCase() || 'JPEG';
      doc.addImage(opts.logoDataUrl, imgFormat, marginX, 12, 40, 20, undefined, 'FAST');
    } catch (e) {
      console.warn("Could not add logo", e);
    }
  }

  // Top Right: PO Meta Data
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  setPrimary();
  const headerTitle = (opts.manualPOHeader && opts.poHeaderTitle.trim()) 
    ? opts.poHeaderTitle 
    : "PURCHASE ORDER";
  doc.text(headerTitle, pageWidth - marginX, yCursor, { align: 'right' });
  
  yCursor += 7;
  doc.setFontSize(10);
  setSecondary();
  doc.text(`Ref #: ${poNumber}`, pageWidth - marginX, yCursor, { align: 'right' });
  yCursor += 5;
  doc.text(`Date: ${dateStr}`, pageWidth - marginX, yCursor, { align: 'right' });

  // Reset Cursor
  yCursor = 20 + 28; // 48mm down

  // -- Address Blocks (Vendor vs Bill To) --
  const col1X = marginX;
  const col2X = pageWidth / 2 + 10;
  const maxColWidth = (pageWidth / 2) - marginX - 10;
  
  // Block 1: Vendor (Hotel)
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  setSecondary();
  doc.text("VENDOR", col1X, yCursor);
  
  doc.setFont("helvetica", "bold");
  setPrimary();
  doc.setFontSize(11);
  const hotelNameLines = doc.splitTextToSize(data.hotelName || "Unknown Hotel", maxColWidth);
  doc.text(hotelNameLines, col1X, yCursor + 6);
  
  const hotelNameHeight = hotelNameLines.length * 5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  setAccent();
  const addressLines = doc.splitTextToSize(data.hotelAddress || "Address not specified", maxColWidth);
  doc.text(addressLines, col1X, yCursor + 6 + hotelNameHeight);

  // Block 2: Bill To - Independent Logic
  
  // Prepare content strings
  const primaryGuestObj = data.guests.find(g => g && g.name.trim().length > 0) || { name: "Guest", loyaltyNumber: "" };
  const primaryGuest = primaryGuestObj.name;
  const primaryGuestLoyalty = primaryGuestObj.loyaltyNumber;
  const billToHeaderStrings: string[] = [];
  const billToDetailStrings: string[] = [];

  // 1. Header Logic (Company / Guest Name)
  if (opts.showCompanyBillTo && data.companyName) {
    billToHeaderStrings.push(data.companyName);
  }
  
  if (opts.showGuestInBillTo) {
    // If company is also shown, the guest name moves to details for clarity
    if (opts.showCompanyBillTo && data.companyName) {
        billToDetailStrings.push(`Name: ${primaryGuest}`);
    } else {
        billToHeaderStrings.push(primaryGuest);
    }
  }

  // 2. Details Logic (Phone / Email)
  if (data.guestPhone) billToDetailStrings.push(`Tel: ${data.guestPhone}`);
  if (data.guestEmail) billToDetailStrings.push(`Email: ${data.guestEmail}`);

  // Determine if we show the Bill To block at all
  const hasBillToContent = billToHeaderStrings.length > 0 || billToDetailStrings.length > 0;
  
  let billToBlockHeight = 0;

  if (hasBillToContent) {
    // Label
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    setSecondary();
    doc.text("BILL TO", col2X, yCursor);

    let currentY = yCursor + 6;

    // Header (Bold, larger)
    if (billToHeaderStrings.length > 0) {
        doc.setFont("helvetica", "bold");
        setPrimary();
        doc.setFontSize(11);
        const headerLines = doc.splitTextToSize(billToHeaderStrings.join("\n"), maxColWidth);
        doc.text(headerLines, col2X, currentY);
        
        const headerHeight = headerLines.length * 5;
        currentY += headerHeight;
        billToBlockHeight += headerHeight;
    }

    // Details (Normal, smaller)
    if (billToDetailStrings.length > 0) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        setAccent();
        const detailLines = doc.splitTextToSize(billToDetailStrings.join("\n"), maxColWidth);
        doc.text(detailLines, col2X, currentY);
        
        const detailHeight = detailLines.length * 4;
        billToBlockHeight += detailHeight;
    }
    
    // Add base spacing for the block label offset
    billToBlockHeight += 6; 
  }

  // Spacing Calculation
  const addressBlockHeight = 6 + hotelNameHeight + (addressLines.length * 4);
  const maxBlockHeight = Math.max(addressBlockHeight, billToBlockHeight, 25);

  yCursor += (12 + maxBlockHeight); 

  // -- Guest & Occupancy Table --
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  setSecondary();
  doc.text("GUEST & OCCUPANCY DETAILS", marginX, yCursor);
  yCursor += 4;

  // Occupancy String
  let occupancyString = `${data.adultCount} Adult(s)`;
  if (data.childCount > 0) {
    occupancyString += `, ${data.childCount} Child(ren)`;
    if (data.childAges && data.childAges.length > 0) {
       occupancyString += ` (Ages: ${data.childAges.join(", ")})`;
    }
  }
  if (data.infantCount > 0) {
    occupancyString += `, ${data.infantCount} Infant(s)`;
  }

  // Headers & Row Construction
  const headRow = [];
  const bodyRow = [];

  headRow.push('Primary Guest');
  let guestDisplay = primaryGuest;
  if (primaryGuestLoyalty) {
    guestDisplay += `\n(Loyalty: ${primaryGuestLoyalty})`;
  }
  bodyRow.push(guestDisplay);

  if (opts.showHotelInOccupancy) {
    headRow.push('Hotel');
    bodyRow.push(data.hotelName);
  }

  if (opts.showSupplierConfirmation) {
    headRow.push('Confirmation #');
    bodyRow.push(opts.supplierConfirmationNumber || "N/A");
  }

  headRow.push('Occupancy Details', 'Room Type', 'Meal Plan', 'Currency');
  bodyRow.push(occupancyString, data.roomType, data.mealPlan, data.currency);

  autoTable(doc, {
    startY: yCursor,
    head: [headRow],
    body: [bodyRow],
    theme: 'plain',
    headStyles: PDF_TABLE_HEAD_STYLES,
    styles: PDF_TABLE_BODY_STYLES,
    alternateRowStyles: PDF_TABLE_ALTERNATE_ROW_STYLES,
    margin: { left: marginX, right: marginX },
  });

  yCursor = (doc as any).lastAutoTable.finalY + 12;

  // -- Stay Schedule Table --
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  setSecondary();
  doc.text("STAY SCHEDULE", marginX, yCursor);
  yCursor += 4;

  let grandTotalCost = 0;

  // Build Headers based on config
  const tableHeaders = ['#', 'Check-In', 'Check-Out', 'Nights'];
  
  if (opts.showDailyRateBreakdown) {
    tableHeaders.push('Daily Rate Breakdown');
  } else if (opts.showAverageRate) {
    tableHeaders.push('Daily Average Rate');
  }
  
  tableHeaders.push('Total');

  const stayRows = data.stayRanges.map((range, index) => {
    const totalCost = calculateStayCost(range.start, range.end);
    grandTotalCost += totalCost;
    
    // Default row content
    const row = [
      index + 1,
      format(range.start, 'dd MMM yyyy'),
      format(range.end, 'dd MMM yyyy'),
      `${range.nights}`
    ];
    
    // Add Middle Column (Breakdown or Average)
    if (opts.showDailyRateBreakdown) {
      if (range.nights > 0 && range.start < range.end) {
        // Generate multiline string for breakdown
        const nightsInterval = eachDayOfInterval({ start: range.start, end: subDays(range.end, 1) });
        const breakdownLines = nightsInterval.map(d => {
           const rate = getRateForDate(d);
           return `${format(d, 'dd MMM')}: ${rate.toFixed(2)}`;
        });
        row.push(breakdownLines.join('\n'));
      } else {
        row.push('N/A');
      }
    } else if (opts.showAverageRate) {
      const avgRate = range.nights > 0 ? (totalCost / range.nights).toFixed(2) : "0.00";
      row.push(`${avgRate}`);
    }
    
    row.push(`${totalCost.toFixed(2)}`);
    return row;
  });

  const totalNights = data.stayRanges.reduce((acc, curr) => acc + curr.nights, 0);

  // Column Styles Logic
  const dynamicColumnStyles: any = {
      0: { cellWidth: 10, halign: 'center' },
      3: { cellWidth: 15, halign: 'center' }
  };

  if (opts.showAverageRate || opts.showDailyRateBreakdown) {
      dynamicColumnStyles[4] = { halign: 'right' };
      dynamicColumnStyles[5] = { halign: 'right', fontStyle: 'bold' };
  } else {
      dynamicColumnStyles[4] = { halign: 'right', fontStyle: 'bold' };
  }

  autoTable(doc, {
    startY: yCursor,
    head: [tableHeaders],
    body: stayRows,
    theme: 'striped',
    headStyles: { ...PDF_TABLE_HEAD_STYLES },
    styles: { ...PDF_TABLE_BODY_STYLES, valign: 'middle' }, 
    alternateRowStyles: PDF_TABLE_ALTERNATE_ROW_STYLES,
    columnStyles: dynamicColumnStyles,
    margin: { left: marginX, right: marginX },
  });

  yCursor = (doc as any).lastAutoTable.finalY + 10;

  // -- Summary Block & Amount in Words --
  const amountInWords = getAmountInWords(grandTotalCost, data.currency);
  
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  const labelWidth = doc.getTextWidth("Total Amount in Words: ");
  const wordLines = doc.splitTextToSize(amountInWords, pageWidth - (marginX + labelWidth + 15));
  const amountBlockHeight = (wordLines.length * 5) + 10;
  
  const summaryHeight = 25; 
  const totalBlockHeight = summaryHeight + amountBlockHeight + 10;

  // Check Page Break
  if (yCursor + totalBlockHeight > pageHeight - 30) {
      doc.addPage();
      yCursor = 20;
  }

  // Draw Summary
  const summaryXLabel = pageWidth - marginX - 60;
  const summaryXValue = pageWidth - marginX;
  
  // Total Nights
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  setSecondary();
  doc.text("Total Nights:", summaryXLabel, yCursor);
  setPrimary();
  doc.text(`${totalNights}`, summaryXValue, yCursor, { align: 'right' });
  
  yCursor += 6;
  
  // Grand Total
  doc.setFontSize(12);
  setPrimary();
  doc.text("GRAND TOTAL:", summaryXLabel, yCursor);
  doc.text(`${data.currency} ${grandTotalCost.toFixed(2)}`, summaryXValue, yCursor, { align: 'right' });
  
  yCursor += 12;

  // Amount in Words
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  setSecondary();
  doc.text("Total Amount in Words:", marginX, yCursor);
  
  doc.setFont("helvetica", "italic");
  setPrimary();
  doc.text(wordLines, marginX + labelWidth + 2, yCursor);
  
  yCursor += (wordLines.length * 5) + 12;

  // -- Remarks Section (Conditional) --
  const remarksData = [];

  if (opts.showRateCodes) {
     const rateCodeInfo = data.rateCodes ? data.rateCodes : "N/A";
     remarksData.push(['Rate Code(s)', rateCodeInfo]);
  }

  if (opts.showApplicableRates) {
    let rateBreakdownText = "";
    if (data.applicableRates.length > 0) {
      rateBreakdownText = sortedRates.map(r => 
        `${format(r.start, 'd MMM yyyy')} – ${format(r.end, 'd MMM yyyy')}: ${r.amount} ${data.currency}`
      ).join("\n");
    } else {
      rateBreakdownText = "No specific rates defined.";
    }
    remarksData.push(['Applicable Rates', rateBreakdownText]);
  }

  if (opts.showPaymentRemarks && data.paymentRemarks.trim()) {
    remarksData.push(['Payment Remarks', data.paymentRemarks]);
  }

  if (opts.showCancellationPolicy && data.cancellationRemarks.trim()) {
    remarksData.push(['Cancellation / No-Show', data.cancellationRemarks]);
  }

  if (opts.showGeneralRemarks && data.generalRemarks.trim()) {
    remarksData.push(['General Remarks', data.generalRemarks]);
  }

  if (remarksData.length > 0) {
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      setSecondary();
      doc.text("REMARKS & INSTRUCTIONS", marginX, yCursor);
      yCursor += 4;

      autoTable(doc, {
        startY: yCursor,
        body: remarksData,
        theme: 'plain',
        styles: { 
            fontSize: 9, 
            cellPadding: 4,
            valign: 'top',
            textColor: darkColor
        },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 45, textColor: mutedColor },
          1: { textColor: darkColor }
        },
        margin: { left: marginX, right: marginX },
        didDrawCell: (data) => {
            if (data.section === 'body' && data.column.index === 1 && data.row.index < remarksData.length - 1) {
                doc.setDrawColor(241, 245, 249);
                doc.line(
                    data.cell.x, 
                    data.cell.y + data.cell.height, 
                    data.cell.x + data.cell.width, 
                    data.cell.y + data.cell.height
                );
            }
        }
      });
      yCursor = (doc as any).lastAutoTable.finalY + 20;
  } else {
     yCursor += 12;
  }

  // -- Signatures & Created By Section --
  
  if (opts.showSignatureArea || opts.showCreatedBy) {
    if (yCursor > pageHeight - 40) {
        doc.addPage();
        yCursor = 20;
    }

    const sigWidth = 60;
    
    // Created By (Left)
    if (opts.showCreatedBy) {
        const createX = marginX;
        doc.setDrawColor(203, 213, 225); // Slate 300
        doc.setLineWidth(0.5);
        doc.line(createX, yCursor + 10, createX + sigWidth, yCursor + 10); 
        
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        setSecondary();
        doc.text("PREPARED BY", createX, yCursor + 14);
        
        doc.setFont("helvetica", "normal");
        setPrimary();
        doc.text(opts.createdByName || "__________________", createX, yCursor + 6);
        doc.text(`Date: ${format(new Date(), 'dd MMM yyyy')}`, createX, yCursor + 18);
    }

    // Authorized Signature (Right)
    if (opts.showSignatureArea) {
        const sigX = pageWidth - marginX - sigWidth;
        doc.setDrawColor(203, 213, 225); // Slate 300
        doc.setLineWidth(0.5);
        doc.line(sigX, yCursor + 10, sigX + sigWidth, yCursor + 10);
        
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        setSecondary();
        doc.text("AUTHORIZED SIGNATURE", sigX, yCursor + 14);
        
        if (opts.authorizedSignatoryName) {
            doc.setFont("helvetica", "normal");
            setPrimary();
            doc.text(opts.authorizedSignatoryName, sigX, yCursor + 6);
        }
        
        doc.setFont("helvetica", "normal");
        setPrimary();
        doc.text("Date:", sigX, yCursor + 18);
    }
  }

  // -- Footer --
  const footerY = pageHeight - 12;
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184); // Slate 400

  let footerText = "This document is computer generated and may be valid without a signature.";
  if (opts.showSignatureArea) {
    footerText = "This Local Purchase Order is valid only when signed by an authorized representative.";
  }
  
  const pageCount = doc.getNumberOfPages();
  for(let i = 1; i <= pageCount; i++) {
     doc.setPage(i);
     const rightX = pageWidth - marginX;
     doc.text(`Ref: ${poNumber}`, rightX, footerY, { align: 'right' });
     doc.text(`Page ${i} of ${pageCount}`, rightX, footerY + 3.5, { align: 'right' });

     const maxDisclaimerWidth = pageWidth - (marginX * 2) - 50;
     const disclaimerLines = doc.splitTextToSize(footerText, maxDisclaimerWidth);
     doc.text(disclaimerLines, marginX, footerY);
  }

  // Draw Watermark if configured
  if (opts.watermarkText && opts.watermarkText.trim()) {
    drawWatermark(doc, opts.watermarkText);
  }

  const safeFilename = `LPO_${poNumber}_${data.hotelName.replace(/[^a-z0-9]/gi, '_').substring(0, 10)}.pdf`;
  doc.save(safeFilename);
};