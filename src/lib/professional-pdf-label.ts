// Simple yet Beautiful Professional PDF Label Generation
import { SimpleLabelData } from './simple-pdf-label';

export interface ProfessionalLabelData extends SimpleLabelData {
  boxId?: string;
  dimensions?: string;
  customNotes?: string;
  insurance?: string;
  priority?: string;
  courierPartner?: string;
}

// Generate professional PDF using PDFKit with clean, minimal design
export async function generateProfessionalPDFLabel(data: ProfessionalLabelData): Promise<Buffer> {
  try {
    const PDFDocument = require('pdfkit');
    
    const doc = new PDFDocument({
      size: [288, 432], // 4x6 inches in points (72 DPI)
      margin: 0,
      info: {
        Title: `SpareFlow Shipping Label - ${data.awbNumber}`,
        Author: 'SpareFlow AI Logistics',
        Subject: 'Professional Shipping Label',
        Keywords: 'shipping, label, logistics, spareflow, professional'
      }
    });

    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));

    // Generate the clean professional label content
    await generateCleanProfessionalLabelContent(doc, data);

    doc.end();

    return new Promise((resolve, reject) => {
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(chunks);
        resolve(pdfBuffer);
      });
      doc.on('error', reject);
    });

  } catch (error) {
    console.error('Error generating professional PDF label:', error);
    throw new Error(`Professional PDF generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Generate clean professional label content with minimal design
async function generateCleanProfessionalLabelContent(doc: any, data: ProfessionalLabelData) {
  const boxId = `SHP-${data.shipmentId.slice(-6)}-BX${data.boxNumber}`;
  
  // Define clean color palette
  const colors = {
    primary: [37, 99, 235],      // Blue #2563eb
    dark: [31, 41, 55],          // Gray-800 #1f2937
    gray: [107, 114, 128],       // Gray-500 #6b7280
    lightGray: [249, 250, 251],  // Gray-50 #f9fafb
    white: [255, 255, 255],      // White #ffffff
    border: [229, 231, 235]      // Gray-200 #e5e7eb
  };

  // Clean border around entire label
  doc.rect(0, 0, 288, 432)
     .lineWidth(2)
     .strokeColor(colors.border)
     .stroke();

  // Simple header section
  doc.rect(0, 0, 288, 50)
     .fillColor(colors.primary)
     .fill();

  // Company name
  doc.fontSize(22)
     .fillColor(colors.white)
     .font('Helvetica-Bold')
     .text('SpareFlow', 15, 12, { align: 'center', width: 258 });

  doc.fontSize(9)
     .fillColor(colors.white)
     .font('Helvetica')
     .text('AI Logistics Platform', 15, 32, { align: 'center', width: 258 });

  let currentY = 65;

  // AWB Section - Clean and prominent
  doc.rect(15, currentY, 258, 40)
     .fillColor(colors.lightGray)
     .fill();
  
  doc.rect(15, currentY, 258, 40)
     .lineWidth(1)
     .strokeColor(colors.border)
     .stroke();

  doc.fontSize(8)
     .fillColor(colors.gray)
     .font('Helvetica-Bold')
     .text('AWB NUMBER', 15, currentY + 6, { align: 'center', width: 258 });

  doc.fontSize(18)
     .fillColor(colors.dark)
     .font('Helvetica-Bold')
     .text(data.awbNumber, 15, currentY + 18, { align: 'center', width: 258 });

  currentY += 55;

  // Box info row - Simple layout
  doc.fontSize(11)
     .fillColor(colors.dark)
     .font('Helvetica-Bold')
     .text(`Box: ${boxId}`, 20, currentY);

  doc.fontSize(11)
     .fillColor(colors.primary)
     .font('Helvetica-Bold')
     .text(`${data.totalWeight.toFixed(2)} kg`, 200, currentY);

  currentY += 20;

  // Brand and date info
  doc.fontSize(9)
     .fillColor(colors.gray)
     .font('Helvetica')
     .text(`Brand: ${data.brandName}`, 20, currentY);

  doc.text(`Date: ${data.createdDate}`, 200, currentY);

  currentY += 25;

  // Destination section - Clean design
  doc.rect(15, currentY, 258, 70)
     .fillColor(colors.white)
     .fill();
  
  doc.rect(15, currentY, 258, 70)
     .lineWidth(1)
     .strokeColor(colors.primary)
     .stroke();

  // Destination header
  doc.fontSize(10)
     .fillColor(colors.primary)
     .font('Helvetica-Bold')
     .text('SHIP TO', 20, currentY + 8);

  currentY += 22;

  // Destination details
  doc.fontSize(12)
     .fillColor(colors.dark)
     .font('Helvetica-Bold')
     .text(data.destinationAddress.name, 20, currentY, { width: 248 });

  currentY += 14;

  doc.fontSize(9)
     .fillColor(colors.dark)
     .font('Helvetica')
     .text(data.destinationAddress.address, 20, currentY, { width: 248 });

  currentY += 12;

  doc.text(`${data.destinationAddress.city}, ${data.destinationAddress.state} ${data.destinationAddress.pincode}`, 20, currentY, { width: 248 });

  currentY += 12;

  doc.fontSize(9)
     .fillColor(colors.gray)
     .font('Helvetica')
     .text(`Phone: ${data.destinationAddress.phone}`, 20, currentY);

  currentY += 25;

  // Parts section - Simple table
  doc.fontSize(10)
     .fillColor(colors.dark)
     .font('Helvetica-Bold')
     .text(`Parts (${data.partsSummary.length} items)`, 20, currentY);

  currentY += 15;

  // Simple parts table
  const maxVisibleParts = Math.min(6, data.partsSummary.length);
  const rowHeight = 12;

  // Table header
  doc.rect(20, currentY, 248, 15)
     .fillColor(colors.lightGray)
     .fill();
  
  doc.rect(20, currentY, 248, 15)
     .lineWidth(1)
     .strokeColor(colors.border)
     .stroke();

  doc.fontSize(8)
     .fillColor(colors.dark)
     .font('Helvetica-Bold')
     .text('Part Code', 25, currentY + 4)
     .text('Name', 85, currentY + 4)
     .text('Qty', 240, currentY + 4);

  currentY += 15;

  // Table rows
  for (let i = 0; i < maxVisibleParts; i++) {
    const part = data.partsSummary[i];
    
    doc.rect(20, currentY, 248, rowHeight)
       .fillColor(colors.white)
       .fill();
    
    doc.rect(20, currentY, 248, rowHeight)
       .lineWidth(0.5)
       .strokeColor(colors.border)
       .stroke();

    doc.fontSize(7)
       .fillColor(colors.dark)
       .font('Helvetica')
       .text(part.code.substring(0, 12), 25, currentY + 3);
    
    const partName = part.name.length > 25 ? part.name.substring(0, 25) + '...' : part.name;
    doc.text(partName, 85, currentY + 3);
    
    doc.fontSize(8)
       .fillColor(colors.primary)
       .font('Helvetica-Bold')
       .text(part.quantity.toString(), 240, currentY + 3);

    currentY += rowHeight;
  }

  // Show remaining items count
  if (data.partsSummary.length > maxVisibleParts) {
    doc.fontSize(7)
       .fillColor(colors.gray)
       .font('Helvetica')
       .text(`... and ${data.partsSummary.length - maxVisibleParts} more items`, 25, currentY + 2);
    currentY += 12;
  }

  currentY += 10;

  // QR Code section - Simple placeholder
  const qrSize = 50;
  doc.rect(20, currentY, qrSize, qrSize)
     .lineWidth(1)
     .strokeColor(colors.border)
     .stroke();

  // Simple QR pattern
  for (let i = 0; i < 6; i++) {
    for (let j = 0; j < 6; j++) {
      if ((i + j) % 2 === 0) {
        doc.rect(20 + (i * 8) + 1, currentY + (j * 8) + 1, 6, 6)
           .fillColor(colors.dark)
           .fill();
      }
    }
  }

  doc.fontSize(7)
     .fillColor(colors.gray)
     .font('Helvetica')
     .text('Scan to Track', 20, currentY + qrSize + 3);

  // Tracking URL next to QR code
  if (data.trackingUrl) {
    doc.fontSize(8)
       .fillColor(colors.primary)
       .font('Helvetica')
       .text('Track: dtdc.in/track', 85, currentY + 10);
    
    doc.fontSize(7)
       .fillColor(colors.gray)
       .font('Helvetica')
       .text(data.awbNumber, 85, currentY + 22);
  }

  // Priority indicator (if high priority)
  if (data.priority && data.priority !== 'MEDIUM') {
    doc.fontSize(8)
       .fillColor([239, 68, 68]) // Red
       .font('Helvetica-Bold')
       .text(`PRIORITY: ${data.priority}`, 85, currentY + 35);
  }

  // Custom notes (if any)
  if (data.customNotes) {
    currentY += 65;
    doc.fontSize(8)
       .fillColor(colors.gray)
       .font('Helvetica-Bold')
       .text('Notes:', 20, currentY);
    
    doc.fontSize(7)
       .fillColor(colors.gray)
       .font('Helvetica')
       .text(data.customNotes, 20, currentY + 10, { width: 248 });
  }

  // Simple footer
  const footerY = 410;
  
  doc.fontSize(6)
     .fillColor(colors.gray)
     .font('Helvetica')
     .text(`Generated: ${new Date().toLocaleString()} | SpareFlow AI Logistics`, 15, footerY, { align: 'center', width: 258 });

  if (data.courierPartner) {
    doc.fontSize(6)
       .fillColor(colors.gray)
       .text(`Courier: ${data.courierPartner}`, 15, footerY + 10, { align: 'center', width: 258 });
  }
}

// Generate clean HTML preview for professional labels
export function generateProfessionalLabelHTML(data: ProfessionalLabelData): string {
  const boxId = `SHP-${data.shipmentId.slice(-6)}-BX${data.boxNumber}`;
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>SpareFlow Professional Shipping Label - ${boxId}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background: #f9fafb;
          color: #1f2937;
          line-height: 1.4;
          padding: 20px;
        }
        
        .label-container {
          width: 4in;
          min-height: 6in;
          border: 2px solid #e5e7eb;
          background: white;
          margin: 0 auto;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          position: relative;
        }
        
        .header {
          background: #2563eb;
          color: white;
          padding: 12px 20px;
          text-align: center;
        }
        
        .company-logo {
          font-size: 22px;
          font-weight: bold;
          margin-bottom: 2px;
        }
        
        .label-title {
          font-size: 9px;
          opacity: 0.9;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        
        .awb-section {
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          margin: 15px;
          padding: 15px;
          text-align: center;
        }
        
        .awb-label {
          font-size: 8px;
          color: #6b7280;
          margin-bottom: 8px;
          text-transform: uppercase;
          font-weight: bold;
          letter-spacing: 1px;
        }
        
        .awb-number {
          font-size: 18px;
          font-weight: bold;
          font-family: 'Courier New', monospace;
          letter-spacing: 2px;
          color: #1f2937;
        }
        
        .box-info {
          margin: 15px;
          padding: 12px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .box-details {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        
        .box-id {
          font-weight: bold;
          font-size: 11px;
          color: #1f2937;
        }
        
        .box-date {
          font-size: 9px;
          color: #6b7280;
        }
        
        .weight-info {
          color: #2563eb;
          font-weight: bold;
          font-size: 11px;
        }
        
        .priority-badge {
          background: #ef4444;
          color: white;
          padding: 2px 6px;
          border-radius: 3px;
          font-size: 7px;
          font-weight: bold;
          text-transform: uppercase;
          margin-left: 8px;
        }
        
        .brand-info {
          margin: 15px;
          padding: 8px;
          text-align: center;
          font-size: 9px;
          color: #6b7280;
        }
        
        .destination-section {
          border: 1px solid #2563eb;
          margin: 15px;
          overflow: hidden;
        }
        
        .destination-header {
          background: #2563eb;
          color: white;
          padding: 8px 15px;
          font-weight: bold;
          font-size: 10px;
          text-transform: uppercase;
        }
        
        .destination-content {
          padding: 15px;
          background: white;
        }
        
        .destination-name {
          font-weight: bold;
          font-size: 12px;
          margin-bottom: 6px;
          color: #1f2937;
        }
        
        .destination-address {
          font-size: 9px;
          line-height: 1.4;
          color: #1f2937;
          margin-bottom: 4px;
        }
        
        .destination-phone {
          font-size: 9px;
          color: #6b7280;
        }
        
        .parts-section {
          margin: 15px;
        }
        
        .parts-header {
          font-size: 10px;
          font-weight: bold;
          color: #1f2937;
          margin-bottom: 8px;
        }
        
        .parts-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 8px;
        }
        
        .parts-table th {
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          padding: 6px 4px;
          text-align: left;
          font-weight: bold;
          font-size: 8px;
          color: #1f2937;
        }
        
        .parts-table td {
          border: 1px solid #e5e7eb;
          padding: 6px 4px;
          vertical-align: top;
          background: white;
        }
        
        .part-code {
          font-family: 'Courier New', monospace;
          font-weight: bold;
          color: #1f2937;
          font-size: 7px;
        }
        
        .part-name {
          font-size: 7px;
          color: #1f2937;
        }
        
        .quantity {
          text-align: center;
          font-weight: bold;
          color: #2563eb;
          font-size: 8px;
        }
        
        .qr-tracking {
          margin: 15px;
          display: flex;
          gap: 15px;
          align-items: center;
        }
        
        .qr-placeholder {
          width: 50px;
          height: 50px;
          border: 1px solid #e5e7eb;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 8px;
          color: #6b7280;
          text-align: center;
          background: #f9fafb;
        }
        
        .tracking-info {
          flex: 1;
        }
        
        .tracking-label {
          font-size: 8px;
          color: #2563eb;
          font-weight: bold;
        }
        
        .tracking-url {
          font-size: 7px;
          color: #6b7280;
          margin-top: 2px;
        }
        
        .priority-section {
          margin: 15px;
          padding: 8px;
          background: #fef2f2;
          border: 1px solid #fecaca;
          font-size: 8px;
          color: #dc2626;
          font-weight: bold;
        }
        
        .notes-section {
          margin: 15px;
          padding: 8px;
          background: #fffbeb;
          border: 1px solid #fed7aa;
          font-size: 8px;
          color: #92400e;
        }
        
        .footer {
          background: #f9fafb;
          color: #6b7280;
          padding: 8px 15px;
          font-size: 6px;
          text-align: center;
          border-top: 1px solid #e5e7eb;
        }
        
        @media print {
          body { 
            margin: 0; 
            padding: 10px; 
            background: white;
          }
          .label-container { 
            margin: 0;
            border: 2px solid #1f2937;
            box-shadow: none;
            page-break-after: always;
          }
        }
      </style>
    </head>
    <body>
      <div class="label-container">
        <!-- Header -->
        <div class="header">
          <div class="company-logo">SpareFlow</div>
          <div class="label-title">AI Logistics Platform</div>
        </div>

        <!-- AWB Section -->
        <div class="awb-section">
          <div class="awb-label">AWB Number</div>
          <div class="awb-number">${data.awbNumber}</div>
        </div>

        <!-- Box Info -->
        <div class="box-info">
          <div class="box-details">
            <div class="box-id">Box: ${boxId}</div>
            <div class="box-date">Date: ${data.createdDate}</div>
          </div>
          <div class="weight-info">
            ${data.totalWeight.toFixed(2)} kg
            ${data.priority && data.priority !== 'MEDIUM' ? `<span class="priority-badge">${data.priority}</span>` : ''}
          </div>
        </div>

        <!-- Brand Info -->
        <div class="brand-info">
          Brand: ${data.brandName}
        </div>

        <!-- Destination -->
        <div class="destination-section">
          <div class="destination-header">
            Ship To
          </div>
          <div class="destination-content">
            <div class="destination-name">${data.destinationAddress.name}</div>
            <div class="destination-address">${data.destinationAddress.address}</div>
            <div class="destination-address">${data.destinationAddress.city}, ${data.destinationAddress.state} ${data.destinationAddress.pincode}</div>
            <div class="destination-phone">Phone: ${data.destinationAddress.phone}</div>
          </div>
        </div>

        <!-- Parts Section -->
        <div class="parts-section">
          <div class="parts-header">Parts (${data.partsSummary.length} items)</div>
          <table class="parts-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Name</th>
                <th>Qty</th>
              </tr>
            </thead>
            <tbody>
              ${data.partsSummary.slice(0, 6).map(part => `
                <tr>
                  <td class="part-code">${part.code.substring(0, 12)}</td>
                  <td class="part-name">${part.name.length > 25 ? part.name.substring(0, 25) + '...' : part.name}</td>
                  <td class="quantity">${part.quantity}</td>
                </tr>
              `).join('')}
              ${data.partsSummary.length > 6 ? `
                <tr>
                  <td colspan="3" style="text-align: center; font-style: italic; color: #6b7280; padding: 6px;">
                    ... and ${data.partsSummary.length - 6} more items
                  </td>
                </tr>
              ` : ''}
            </tbody>
          </table>
        </div>

        <!-- QR Code and Tracking -->
        <div class="qr-tracking">
          <div class="qr-placeholder">
            QR
          </div>
          <div class="tracking-info">
            <div class="tracking-label">Track: dtdc.in/track</div>
            <div class="tracking-url">${data.awbNumber}</div>
          </div>
        </div>

        <!-- Priority (if high) -->
        ${data.priority && data.priority !== 'MEDIUM' ? `
        <div class="priority-section">
          PRIORITY: ${data.priority}
        </div>
        ` : ''}

        <!-- Custom Notes -->
        ${data.customNotes ? `
        <div class="notes-section">
          Notes: ${data.customNotes}
        </div>
        ` : ''}

        <!-- Footer -->
        <div class="footer">
          Generated: ${new Date().toLocaleString()} | SpareFlow AI Logistics${data.courierPartner ? ` | Courier: ${data.courierPartner}` : ''}
        </div>
      </div>
    </body>
    </html>
  `;
}