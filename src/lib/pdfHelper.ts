import { jsPDF } from 'jspdf';
import { Order } from '../types';

/**
 * Image loader helper to fetch web/static assets inside the browser and render them 
 * cleanly on the vector-level canvas in jsPDF.
 */
const loadImage = (url: string): Promise<HTMLImageElement | null> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = url;
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
  });
};

/**
 * Utility to generate and download a gorgeous, high-contrast, professional-grade PDF document of an order.
 * Built mathematically with jsPDF vector drawings with embedded company branding (logo, seal, sign, QR).
 * Redesigned to look exactly like the premium, high-fidelity Invoice layout (Model 1).
 */
export async function downloadOrderPDF(order: Order) {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;

  // Pre-load our rich branding imagery
  const [logoImg, qrImg, sealImg, sigImg] = await Promise.all([
    loadImage('/logo.png'),
    loadImage('/Qr.png'),
    loadImage('/SEAL.png'),
    loadImage('/signature.png')
  ]);

  // Typography Settings
  doc.setFont('helvetica', 'normal');

  // --- TOP CLEAN HEADER LAYER (Image Model 1) ---
  // Left-aligned: Pallywear Corporate Branding
  if (logoImg) {
    doc.addImage(logoImg, 'PNG', margin, 15, 10, 10);
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(26, 11, 145); // `#1A0B91` Brand Primary
  doc.text('Pallywear', margin + 13, 23.5);

  // Right-aligned: Document Metadata Block
  const headerRightX = pageWidth - margin;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(120, 120, 120);

  let rightY = 16;
  doc.text('Order Sheet no:', headerRightX - 45, rightY);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(17, 24, 39);
  doc.text(`#${order.id.slice(-8).toUpperCase()}`, headerRightX, rightY, { align: 'right' });

  rightY += 5.5;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120, 120, 120);
  doc.text('Order date:', headerRightX - 45, rightY);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(17, 24, 39);
  doc.text(new Date(order.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), headerRightX, rightY, { align: 'right' });

  rightY += 5.5;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120, 120, 120);
  doc.text('Due:', headerRightX - 45, rightY);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(17, 24, 39);
  const estDueDate = new Date(order.createdAt + 15 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  doc.text(estDueDate, headerRightX, rightY, { align: 'right' });


  // --- FROM & BILL TO ADDRESSING SECTIONS ---
  let fromY = 40;

  // Left Column: Seller Corporate Identity
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(156, 163, 175); // gray-400 upper-label
  doc.text('FROM', margin, fromY);

  fromY += 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(17, 24, 39);
  doc.text('Pallywear Gifting Solutions', margin, fromY);

  fromY += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(80, 80, 80);
  doc.text('Pallywear Gifting Solutions, Bus Stop, 49/1, Mudichur', margin, fromY);
  fromY += 4.5;
  doc.text('Road, Near By Parvathi Nagar, Shanthi Nagar, Old', margin, fromY);
  fromY += 4.5;
  doc.text('Perungalathur, Chennai, Tamil Nadu - 600063', margin, fromY);
  fromY += 4.5;
  doc.text('+91 91583 01804', margin, fromY);

  // Right Column: Buyer/Customer Identity (Aligned Right)
  let billY = 40;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(156, 163, 175);
  doc.text('BILL TO', headerRightX, billY, { align: 'right' });

  billY += 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(17, 24, 39);
  doc.text(order.customerInfo.name || 'Walk-in Customer', headerRightX, billY, { align: 'right' });

  billY += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(80, 80, 80);
  doc.text(order.customerInfo.phone || 'N/A', headerRightX, billY, { align: 'right' });

  billY += 4.5;
  const custAddress = order.customerInfo.address || 'N/A';
  const splitCustAddress = doc.splitTextToSize(custAddress, 80);
  for (let i = 0; i < splitCustAddress.length; i++) {
    doc.text(splitCustAddress[i], headerRightX, billY, { align: 'right' });
    billY += 4.5;
  }


  // --- COMPREHENSIVE SPEC TABLE SYSTEM ---
  let tableY = Math.max(fromY, billY) + 12;

  // Header Box styled with deep Pallywear Blue
  doc.setFillColor(26, 11, 145);
  doc.rect(margin, tableY, pageWidth - (margin * 2), 10, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);

  const colCategory = margin + 3;
  const colSize = colCategory + 26;
  const colQty = colSize + 12;
  const colMaterial = colQty + 10;
  const colColour = colMaterial + 26;
  const colPrint = colColour + 22;
  const colSleeve = colPrint + 24;
  const colPrice = colSleeve + 18;
  const colSubTotal = colPrice + 16;

  const headerTextY = tableY + 6.5;
  doc.text('Description / Cat', colCategory, headerTextY);
  doc.text('Size', colSize, headerTextY);
  doc.text('Qty', colQty, headerTextY, { align: 'center' });
  doc.text('Material', colMaterial, headerTextY);
  doc.text('Colour', colColour, headerTextY);
  doc.text('Print / details', colPrint, headerTextY);
  doc.text('Sleeve', colSleeve, headerTextY);
  doc.text('Price', colPrice, headerTextY, { align: 'right' });
  doc.text('Subtotal', colSubTotal, headerTextY, { align: 'right' });

  // Render Table Specification rows
  let rowY = tableY + 10;
  doc.setFontSize(8);

  if (order.sizeBreakdown && order.sizeBreakdown.length > 0) {
    order.sizeBreakdown.forEach((item, index) => {
      // Shading alternating rows
      if (index % 2 === 1) {
        doc.setFillColor(249, 250, 251);
        doc.rect(margin, rowY, pageWidth - (margin * 2), 8, 'F');
      }

      doc.setTextColor(17, 24, 39);
      doc.setFont('helvetica', 'bold');
      doc.text(item.category || order.category || 'Apparel', colCategory, rowY + 5.5);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(80, 80, 80);
      doc.text(item.size || 'N/A', colSize, rowY + 5.5);
      doc.text(String(item.quantity || 0), colQty, rowY + 5.5, { align: 'center' });

      const matText = item.material ? (item.material.length > 13 ? item.material.substring(0, 12) + '...' : item.material) : 'N/A';
      doc.text(matText, colMaterial, rowY + 5.5);

      const colText = item.colour ? (item.colour.length > 10 ? item.colour.substring(0, 9) + '...' : item.colour) : 'N/A';
      doc.text(colText, colColour, rowY + 5.5);

      const prtText = item.printType ? (item.printType.length > 12 ? item.printType.substring(0, 11) + '...' : item.printType) : 'N/A';
      doc.text(prtText, colPrint, rowY + 5.5);

      doc.text(item.sleeve || 'N/A', colSleeve, rowY + 5.5);
      doc.text(`Rs.${(item.price || 0).toLocaleString()}`, colPrice - 2, rowY + 5.5, { align: 'right' });

      doc.setTextColor(17, 24, 39);
      doc.setFont('helvetica', 'bold');
      doc.text(`Rs.${((item.quantity || 0) * (item.price || 0)).toLocaleString()}`, colSubTotal, rowY + 5.5, { align: 'right' });

      rowY += 8;
    });
  } else {
    doc.setTextColor(120, 120, 120);
    doc.setFont('helvetica', 'italic');
    doc.text('No core specs defined in the size breakdown table.', colCategory, rowY + 5.5);
    rowY += 8;
  }

  // Draw dividing vector baseline
  doc.setDrawColor(243, 244, 246);
  doc.setLineWidth(0.3);
  doc.line(margin, rowY, pageWidth - margin, rowY);
  rowY += 10;


  // --- PAYMENT METHOD, TERMS, QR & FINANCIAL SPLIT (BENTO CARD SYTEM) ---
  const bentoGridY = rowY;

  // Left Bento block: PAYMENT & TERMS with SCAN QR
  let leftY = bentoGridY;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(156, 163, 175);
  doc.text('PAYMENT & TERMS', margin, leftY);

  leftY += 5.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(156, 163, 175);
  doc.text('PAYMENT METHOD', margin, leftY);

  leftY += 4.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(17, 24, 39);
  doc.text('GPay / UPI Portal', margin, leftY);

  // QR and Bank Details inside the Grid
  leftY += 6;
  const qrX = margin;
  const qrWidth = 35;
  if (qrImg) {
    doc.addImage(qrImg, 'PNG', qrX, leftY, qrWidth, qrWidth);
  } else {
    doc.setDrawColor(229, 231, 235);
    doc.rect(qrX, leftY, qrWidth, qrWidth);
    doc.setFontSize(7);
    doc.text('QR PORTAL', qrX + qrWidth / 2, leftY + qrWidth / 2, { align: 'center' });
  }

  const bankX = margin + qrWidth + 6;
  let bankY = leftY + 2;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(156, 163, 175);
  doc.text('COMPANY BANK DETAILS', bankX, bankY);

  doc.setFontSize(8);
  doc.setTextColor(17, 24, 39);

  bankY += 5;
  doc.setFont('helvetica', 'normal');
  doc.text('Bank:', bankX, bankY);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(26, 11, 145);
  doc.text('HDFC BANK', bankX + 16, bankY);

  bankY += 4.5;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text('Acc Name:', bankX, bankY);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(17, 24, 39);
  doc.text('PALLYWEAR PVT LTD', bankX + 16, bankY);

  bankY += 4.5;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text('IFSC Code:', bankX, bankY);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(17, 24, 39);
  doc.text('HDFC0008964', bankX + 16, bankY);

  bankY += 4.5;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text('Account:', bankX, bankY);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(17, 24, 39);
  doc.text('50202110682524', bankX + 16, bankY);

  // Left-aligned Notes box (Below QR block)
  leftY += qrWidth + 8;
  if (order.notes) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(156, 163, 175);
    doc.text('STAFF REMARKS & PRODUCTION NOTES', margin, leftY);

    leftY += 4.5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 100, 100);
    const splitNotes = doc.splitTextToSize(order.notes, 78);
    for (let i = 0; i < splitNotes.length; i++) {
      doc.text(splitNotes[i], margin, leftY);
      leftY += 3.5;
    }
  }


  // Right Bento Block: Financial Invoice Summary
  rightY = bentoGridY;
  const rightColX = pageWidth - margin - 75;
  const rightColWidth = 75;

  const totalAmt = order.financials?.totalAmount || 0;
  const advPay = order.financials?.advancePay || 0;
  const balDue = order.financials?.balanceAmount || 0;

  const renderFinancialRow = (lbl: string, val: string, bold = false, colRGB = [80, 80, 80]) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(colRGB[0], colRGB[1], colRGB[2]);
    doc.text(lbl, rightColX, rightY + 5);
    doc.text(val, headerRightX, rightY + 5, { align: 'right' });
    rightY += 6;
  };

  renderFinancialRow('Subtotal:', `Rs.${totalAmt.toLocaleString()}`);
  renderFinancialRow('Discount (0%):', 'Rs.0');
  renderFinancialRow('Shipping Cost:', 'Rs.0');
  renderFinancialRow('Sales Tax:', 'Rs.0');

  // Thin separator
  doc.setDrawColor(243, 244, 246);
  doc.setLineWidth(0.3);
  doc.line(rightColX, rightY + 2, headerRightX, rightY + 2);
  rightY += 6;

  renderFinancialRow('Total Order Value:', `Rs.${totalAmt.toLocaleString()}`, true, [17, 24, 39]);
  renderFinancialRow('Advance Pay Received:', `Rs.${advPay.toLocaleString()}`, false, [46, 125, 50]);

  // Rounded Balance due Card (Matching Model 1 layout perfectly)
  rightY += 4;
  const balanceCardHeight = 14;
  doc.setFillColor(243, 244, 255); // high contrast brand blue tint
  doc.roundedRect(rightColX, rightY, rightColWidth, balanceCardHeight, 3.5, 3.5, 'F');

  doc.setDrawColor(218, 224, 239);
  doc.setLineWidth(0.35);
  doc.roundedRect(rightColX, rightY, rightColWidth, balanceCardHeight, 3.5, 3.5, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(26, 11, 145);
  doc.text('BALANCE DUE:', rightColX + 5, rightY + balanceCardHeight / 2 + 1.5);
  doc.text(`Rs.${balDue.toLocaleString()}`, headerRightX - 5, rightY + balanceCardHeight / 2 + 1.5, { align: 'right' });


  // --- BOTTOM SEAL & SIGNATURE TRUST SECTIONS (Model 1) ---
  const stampY = pageHeight - 65;

  // Render Low Opacity Corporate Stamp (Seal) on the bottom left
  if (sealImg) {
    doc.addImage(sealImg, 'PNG', margin, stampY, 32, 32);
  }

  // Render Official Authorized Signature on the bottom right
  const sigX = headerRightX - 55;
  const sigY = pageHeight - 55;
  if (sigImg) {
    doc.addImage(sigImg, 'PNG', sigX + 5, sigY, 45, 18);
  }

  const signatureDividerY = pageHeight - 32;
  doc.setDrawColor(209, 213, 219);
  doc.setLineWidth(0.4);
  doc.line(headerRightX - 60, signatureDividerY, headerRightX, signatureDividerY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(17, 24, 39);
  doc.text('Authorized Signature', headerRightX - 30, signatureDividerY + 5, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(156, 163, 175);
  doc.text('Pallywear Pvt. Ltd.', headerRightX - 30, signatureDividerY + 9, { align: 'center' });


  // --- PAGE FOOTER NOTICE ---
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(156, 163, 175);
  doc.text('Thank you for choosing Pallywear. For query contact accounts@pallywear.com', pageWidth / 2, pageHeight - 12, { align: 'center' });


  // Launch Download Protocol
  doc.save(`Pallywear-Order-Sheet-${order.id.slice(-8).toUpperCase()}.pdf`);
}
