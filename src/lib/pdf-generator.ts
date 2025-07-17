// Proper PDF Generation using jsPDF
import { SimpleLabelData } from './simple-pdf-label';

// Since we can't use jsPDF in Node.js environment directly, 
// we'll create a server-side compatible PDF generator
export async function generatePDFLabel(data: SimpleLabelData): Promise<Buffer> {
  try {
    // Import jsPDF dynamically for server-side usage
    const { jsPDF } = await import('jspdf');
    
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [101.6, 152.4] // 4x6 inches in mm
    });

    // Set font
    doc.setFont('helvetica');
    
    // Header
    doc.setFontSize(16);
    doc.setTextColor(37, 99, 235); // Blue color
    doc.text('SpareFlow', 50.8, 15, { align: 'center' });
    
    doc.setFontSize(8);
    doc.setTextColor(102, 102, 102);
    doc.text('AI Logistics Platform', 50.8, 20, { align: 'center' });
    
    // Line separator
    doc.setDrawColor(0, 0, 0);
    doc.line(10, 25, 91.6, 25);
    
    // AWB Section
    doc.setFillColor(248, 249, 250);
    doc.rect(10, 30, 81.6, 15, 'F');
    doc.rect(10, 30, 81.6, 15, 'S');
    
    doc.setFontSize(8);
    doc.setTextColor(108, 117, 125);
    doc.text('AWB NUMBER', 50.8, 35, { align: 'center' });
    
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.setFont('courier', 'bold');
    doc.text(data.awbNumber, 50.8, 42, { align: 'center' });
    
    // Box Info
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const boxId = `SHP-${data.shipmentId.slice(-6)}-BX${data.boxNumber}`;
    doc.text(`Box #: ${boxId}`, 10, 55);
    doc.text(`${data.totalWeight.toFixed(2)} kg`, 91.6, 55, { align: 'right' });
    
    doc.setFontSize(8);
    doc.setTextColor(108, 117, 125);
    doc.text(data.createdDate, 10, 60);
    
    // Brand Info
    doc.setFillColor(227, 242, 253);
    doc.rect(10, 65, 81.6, 8, 'F');
    doc.setFontSize(9);
    doc.setTextColor(73, 80, 87);
    doc.text(`Brand: ${data.brandName}`, 50.8, 70, { align: 'center' });
    
    // Destination Section
    doc.setFillColor(248, 249, 250);
    doc.rect(10, 78, 81.6, 35, 'F');
    doc.rect(10, 78, 81.6, 35, 'S');
    
    doc.setFontSize(8);
    doc.setTextColor(73, 80, 87);
    doc.setFont('helvetica', 'bold');
    doc.text('SHIP TO', 12, 83);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text(data.destinationAddress.name, 12, 88);
    
    doc.setFontSize(8);
    doc.text(data.destinationAddress.address, 12, 93);
    doc.text(`${data.destinationAddress.city}, ${data.destinationAddress.state} ${data.destinationAddress.pincode}`, 12, 98);
    doc.text(`Phone: ${data.destinationAddress.phone}`, 12, 103);
    
    // QR Code placeholder
    doc.rect(35, 108, 20, 20, 'S');
    doc.setFontSize(6);
    doc.text('QR Code', 45, 118, { align: 'center' });
    doc.text('(Scan to Track)', 45, 121, { align: 'center' });
    
    // Parts Summary
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text(`Parts Summary (${data.partsSummary.length} items)`, 10, 135);
    
    // Parts table (simplified)
    let yPos = 140;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    
    data.partsSummary.slice(0, 3).forEach((part, index) => {
      const partName = part.name.length > 20 ? part.name.substring(0, 20) + '...' : part.name;
      doc.text(`${part.code}`, 10, yPos);
      doc.text(partName, 30, yPos);
      doc.text(`x${part.quantity}`, 80, yPos);
      yPos += 4;
    });
    
    if (data.partsSummary.length > 3) {
      doc.text(`... and ${data.partsSummary.length - 3} more items`, 10, yPos);
    }
    
    // Footer
    doc.setFontSize(6);
    doc.setTextColor(108, 117, 125);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 50.8, 148, { align: 'center' });
    doc.text('SpareFlow AI Logistics Platform', 50.8, 151, { align: 'center' });
    
    return Buffer.from(doc.output('arraybuffer'));
    
  } catch (error) {
    console.error('Error generating PDF with jsPDF:', error);
    
    // Fallback to HTML-based PDF
    return generateHTMLToPDF(data);
  }
}

// Fallback HTML to PDF conversion
async function generateHTMLToPDF(data: SimpleLabelData): Promise<Buffer> {
  const { generateSimpleLabelHTML } = await import('./simple-pdf-label');
  
  const htmlContent = generateSimpleLabelHTML(data);
  
  // Create a more proper PDF structure
  let pdfHeader = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj

2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj

3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 288 432] /Contents 4 0 R >>
endobj

4 0 obj
<< /Length ${htmlContent.length} >>
stream
BT
/F1 12 Tf
50 400 Td
(SpareFlow Shipping Label) Tj
0 -20 Td
(AWB: ${data.awbNumber}) Tj
0 -20 Td
(Box: SHP-${data.shipmentId.slice(-6)}-BX${data.boxNumber}) Tj
0 -20 Td
(Weight: ${data.totalWeight.toFixed(2)} kg) Tj
0 -20 Td
(Brand: ${data.brandName}) Tj
0 -30 Td
(Ship To:) Tj
0 -15 Td
(${data.destinationAddress.name}) Tj
0 -15 Td
(${data.destinationAddress.address}) Tj
0 -15 Td
(${data.destinationAddress.city}, ${data.destinationAddress.state} ${data.destinationAddress.pincode}) Tj
0 -15 Td
(Phone: ${data.destinationAddress.phone}) Tj
0 -30 Td
(Parts: ${data.partsSummary.length} items) Tj`;

  let yOffset = -15;
  data.partsSummary.forEach(part => {
    pdfHeader += `
0 ${yOffset} Td
(${part.code} - ${part.name.substring(0, 30)} x${part.quantity}) Tj`;
    yOffset -= 12;
  });

  pdfHeader += `
ET
endstream
endobj

xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000206 00000 n 
trailer
<< /Size 5 /Root 1 0 R >>
startxref
${400 + htmlContent.length}
%%EOF`;

  return Buffer.from(pdfHeader, 'utf-8');
}