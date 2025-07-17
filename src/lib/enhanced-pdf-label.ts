// Enhanced PDF Label Generation with proper server-side PDF creation
import { SimpleLabelData } from './simple-pdf-label';

export interface EnhancedLabelData extends SimpleLabelData {
  boxId?: string;
  dimensions?: string;
  customNotes?: string;
}

// Generate proper PDF using PDFKit (server-side compatible)
export async function generateEnhancedPDFLabel(data: EnhancedLabelData): Promise<Buffer> {
  try {
    // Use PDFKit for proper PDF generation
    const PDFDocument = require('pdfkit');
    
    const doc = new PDFDocument({
      size: [288, 432], // 4x6 inches in points (72 DPI)
      margin: 20,
      info: {
        Title: `SpareFlow Shipping Label - ${data.awbNumber}`,
        Author: 'SpareFlow AI Logistics',
        Subject: 'Shipping Label',
        Keywords: 'shipping, label, logistics, spareflow'
      }
    });

    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));

    // Generate the label content
    await generateLabelContent(doc, data);

    doc.end();

    return new Promise((resolve, reject) => {
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(chunks);
        resolve(pdfBuffer);
      });
      doc.on('error', reject);
    });

  } catch (error) {
    console.error('Error generating enhanced PDF label:', error);
    throw new Error(`PDF generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Generate label content using PDFKit
async function generateLabelContent(doc: any, data: EnhancedLabelData) {
  const boxId = `SHP-${data.shipmentId.slice(-6)}-BX${data.boxNumber}`;
  
  // Reset position
  let currentY = 20;

  // Header Section
  doc.fontSize(20)
     .fillColor('#2563eb')
     .font('Helvetica-Bold')
     .text('SpareFlow', 20, currentY, { align: 'center', width: 248 });
  
  currentY += 25;
  
  doc.fontSize(10)
     .fillColor('#666666')
     .font('Helvetica')
     .text('AI Logistics Platform', 20, currentY, { align: 'center', width: 248 });
  
  currentY += 20;

  // Header line
  doc.strokeColor('#000000')
     .lineWidth(2)
     .moveTo(20, currentY)
     .lineTo(268, currentY)
     .stroke();
  
  currentY += 15;

  // AWB Section with background
  doc.rect(20, currentY, 248, 30)
     .fillAndStroke('#f8f9fa', '#dee2e6');
  
  doc.fontSize(8)
     .fillColor('#6c757d')
     .font('Helvetica-Bold')
     .text('AWB NUMBER', 20, currentY + 8, { align: 'center', width: 248 });
  
  doc.fontSize(16)
     .fillColor('#000000')
     .font('Helvetica-Bold')
     .text(data.awbNumber, 20, currentY + 18, { align: 'center', width: 248 });
  
  currentY += 45;

  // Box Information Row
  doc.fontSize(12)
     .fillColor('#000000')
     .font('Helvetica-Bold')
     .text(`Box #: ${boxId}`, 20, currentY);
  
  doc.fontSize(11)
     .fillColor('#000000')
     .font('Helvetica-Bold')
     .text(`${data.totalWeight.toFixed(2)} kg`, 268, currentY, { align: 'right' });
  
  currentY += 15;
  
  doc.fontSize(9)
     .fillColor('#6c757d')
     .font('Helvetica')
     .text(data.createdDate, 20, currentY);
  
  currentY += 20;

  // Brand Information
  doc.rect(20, currentY, 248, 15)
     .fillAndStroke('#e3f2fd', '#bbdefb');
  
  doc.fontSize(10)
     .fillColor('#1565c0')
     .font('Helvetica-Bold')
     .text(`Brand: ${data.brandName}`, 20, currentY + 5, { align: 'center', width: 248 });
  
  currentY += 25;

  // Destination Section
  doc.rect(20, currentY, 248, 60)
     .fillAndStroke('#f8f9fa', '#dee2e6');
  
  doc.fontSize(9)
     .fillColor('#495057')
     .font('Helvetica-Bold')
     .text('SHIP TO:', 25, currentY + 8);
  
  currentY += 18;
  
  doc.fontSize(12)
     .fillColor('#000000')
     .font('Helvetica-Bold')
     .text(data.destinationAddress.name, 25, currentY, { width: 238 });
  
  currentY += 15;
  
  doc.fontSize(10)
     .fillColor('#000000')
     .font('Helvetica')
     .text(data.destinationAddress.address, 25, currentY, { width: 238 });
  
  currentY += 12;
  
  doc.text(`${data.destinationAddress.city}, ${data.destinationAddress.state} ${data.destinationAddress.pincode}`, 25, currentY, { width: 238 });
  
  currentY += 12;
  
  doc.fontSize(9)
     .font('Helvetica-Bold')
     .text(`Phone: ${data.destinationAddress.phone}`, 25, currentY);
  
  currentY += 25;

  // QR Code Placeholder and Parts Section
  const qrCodeX = 25;
  const qrCodeY = currentY;
  const qrCodeSize = 50;
  
  // QR Code placeholder
  doc.rect(qrCodeX, qrCodeY, qrCodeSize, qrCodeSize)
     .stroke('#adb5bd');
  
  doc.fontSize(8)
     .fillColor('#6c757d')
     .text('QR Code', qrCodeX, qrCodeY + 20, { align: 'center', width: qrCodeSize });
  doc.text('Scan to Track', qrCodeX, qrCodeY + 30, { align: 'center', width: qrCodeSize });

  // Parts Summary (next to QR code)
  const partsX = qrCodeX + qrCodeSize + 15;
  const partsWidth = 248 - (partsX - 20);
  
  doc.fontSize(9)
     .fillColor('#495057')
     .font('Helvetica-Bold')
     .text(`Parts Summary (${data.partsSummary.length} items)`, partsX, qrCodeY);
  
  let partsY = qrCodeY + 12;
  
  // Parts table header
  doc.rect(partsX, partsY, partsWidth, 12)
     .fillAndStroke('#e9ecef', '#adb5bd');
  
  doc.fontSize(7)
     .fillColor('#000000')
     .font('Helvetica-Bold')
     .text('Code', partsX + 2, partsY + 4);
  doc.text('Name', partsX + 35, partsY + 4);
  doc.text('Qty', partsX + partsWidth - 15, partsY + 4);
  
  partsY += 12;
  
  // Parts rows (limit to 4 items to fit)
  const maxParts = Math.min(4, data.partsSummary.length);
  for (let i = 0; i < maxParts; i++) {
    const part = data.partsSummary[i];
    
    doc.rect(partsX, partsY, partsWidth, 10)
       .stroke('#dee2e6');
    
    doc.fontSize(6)
       .fillColor('#000000')
       .font('Helvetica')
       .text(part.code.substring(0, 8), partsX + 2, partsY + 3);
    
    const partName = part.name.length > 15 ? part.name.substring(0, 15) + '...' : part.name;
    doc.text(partName, partsX + 35, partsY + 3);
    doc.text(part.quantity.toString(), partsX + partsWidth - 15, partsY + 3);
    
    partsY += 10;
  }
  
  if (data.partsSummary.length > maxParts) {
    doc.fontSize(6)
       .fillColor('#6c757d')
       .text(`... and ${data.partsSummary.length - maxParts} more items`, partsX + 2, partsY + 2);
  }
  
  currentY = Math.max(qrCodeY + qrCodeSize + 10, partsY + 15);

  // Tracking Information
  if (data.trackingUrl) {
    doc.rect(20, currentY, 248, 20)
       .fillAndStroke('#f8f9fa', '#dee2e6');
    
    doc.fontSize(8)
       .fillColor('#495057')
       .font('Helvetica-Bold')
       .text('Track Online:', 25, currentY + 5);
    
    doc.fontSize(7)
       .fillColor('#0066cc')
       .font('Helvetica')
       .text(data.trackingUrl, 25, currentY + 13, { width: 238 });
    
    currentY += 30;
  }

  // Custom Notes (if any)
  if (data.customNotes) {
    doc.fontSize(8)
       .fillColor('#495057')
       .font('Helvetica-Bold')
       .text('Notes:', 20, currentY);
    
    currentY += 10;
    
    doc.fontSize(7)
       .fillColor('#000000')
       .font('Helvetica')
       .text(data.customNotes, 20, currentY, { width: 248 });
    
    currentY += 15;
  }

  // Footer
  const footerY = 400; // Fixed position near bottom
  
  doc.strokeColor('#dee2e6')
     .lineWidth(1)
     .moveTo(20, footerY)
     .lineTo(268, footerY)
     .stroke();
  
  doc.fontSize(6)
     .fillColor('#6c757d')
     .font('Helvetica')
     .text(`Generated: ${new Date().toLocaleString()}`, 20, footerY + 5, { align: 'center', width: 248 });
  
  doc.text('SpareFlow AI Logistics Platform | support@spareflow.com', 20, footerY + 12, { align: 'center', width: 248 });
}

// Generate HTML preview for the label
export function generateEnhancedLabelHTML(data: EnhancedLabelData): string {
  const boxId = `SHP-${data.shipmentId.slice(-6)}-BX${data.boxNumber}`;
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>SpareFlow Shipping Label - ${boxId}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Arial', sans-serif;
          background: #f5f5f5;
          color: #000;
          line-height: 1.3;
          padding: 20px;
        }
        
        .label-container {
          width: 4in;
          min-height: 6in;
          border: 3px solid #000;
          padding: 20px;
          background: white;
          margin: 0 auto;
          box-shadow: 0 4px 8px rgba(0,0,0,0.1);
          position: relative;
        }
        
        .header {
          text-align: center;
          border-bottom: 3px solid #000;
          padding-bottom: 12px;
          margin-bottom: 18px;
        }
        
        .company-logo {
          font-size: 28px;
          font-weight: bold;
          color: #2563eb;
          margin-bottom: 6px;
          text-shadow: 1px 1px 2px rgba(0,0,0,0.1);
        }
        
        .label-title {
          font-size: 12px;
          color: #666;
          text-transform: uppercase;
          letter-spacing: 2px;
          font-weight: 500;
        }
        
        .awb-section {
          background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
          border: 2px solid #dee2e6;
          padding: 12px;
          text-align: center;
          margin-bottom: 18px;
          border-radius: 6px;
        }
        
        .awb-label {
          font-size: 10px;
          color: #6c757d;
          margin-bottom: 4px;
          text-transform: uppercase;
          font-weight: bold;
          letter-spacing: 1px;
        }
        
        .awb-number {
          font-size: 22px;
          font-weight: bold;
          font-family: 'Courier New', monospace;
          letter-spacing: 3px;
          color: #000;
          text-shadow: 1px 1px 2px rgba(0,0,0,0.1);
        }
        
        .box-info {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 18px;
          font-size: 13px;
        }
        
        .box-id {
          font-weight: bold;
          font-size: 18px;
          color: #000;
        }
        
        .box-date {
          font-size: 11px;
          color: #6c757d;
          margin-top: 2px;
        }
        
        .weight-info {
          background: linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%);
          padding: 8px 12px;
          border: 2px solid #ffeaa7;
          border-radius: 6px;
          font-weight: bold;
          font-size: 14px;
          color: #856404;
        }
        
        .brand-info {
          font-size: 12px;
          color: #1565c0;
          margin-bottom: 15px;
          text-align: center;
          background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
          padding: 8px;
          border-radius: 6px;
          border: 1px solid #bbdefb;
          font-weight: 600;
        }
        
        .destination-section {
          border: 2px solid #dee2e6;
          padding: 15px;
          margin-bottom: 18px;
          background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
          border-radius: 6px;
        }
        
        .section-title {
          font-size: 11px;
          font-weight: bold;
          color: #495057;
          text-transform: uppercase;
          margin-bottom: 8px;
          border-bottom: 2px solid #dee2e6;
          padding-bottom: 4px;
          letter-spacing: 1px;
        }
        
        .destination-address {
          font-size: 13px;
          line-height: 1.5;
        }
        
        .destination-name {
          font-weight: bold;
          font-size: 16px;
          margin-bottom: 4px;
          color: #000;
        }
        
        .main-content {
          display: flex;
          gap: 15px;
          margin-bottom: 18px;
          align-items: flex-start;
        }
        
        .qr-section {
          flex-shrink: 0;
          text-align: center;
        }
        
        .qr-placeholder {
          width: 80px;
          height: 80px;
          border: 3px dashed #adb5bd;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          color: #6c757d;
          text-align: center;
          background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
          border-radius: 6px;
          font-weight: 600;
        }
        
        .qr-label {
          font-size: 8px;
          color: #6c757d;
          margin-top: 4px;
          font-weight: 500;
        }
        
        .parts-section {
          flex: 1;
        }
        
        .parts-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 10px;
          margin-top: 8px;
          border-radius: 4px;
          overflow: hidden;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .parts-table th {
          background: linear-gradient(135deg, #e9ecef 0%, #dee2e6 100%);
          border: 1px solid #adb5bd;
          padding: 6px 4px;
          text-align: left;
          font-weight: bold;
          font-size: 9px;
          color: #495057;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .parts-table td {
          border: 1px solid #dee2e6;
          padding: 6px 4px;
          vertical-align: top;
          background: white;
        }
        
        .parts-table tr:nth-child(even) td {
          background: #f8f9fa;
        }
        
        .part-code {
          font-family: 'Courier New', monospace;
          font-weight: bold;
          color: #495057;
        }
        
        .part-name {
          font-size: 9px;
          color: #000;
        }
        
        .quantity {
          text-align: center;
          font-weight: bold;
          color: #28a745;
        }
        
        .tracking-section {
          background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
          border: 2px solid #dee2e6;
          padding: 10px;
          text-align: center;
          font-size: 10px;
          margin-bottom: 15px;
          border-radius: 6px;
        }
        
        .tracking-url {
          font-family: 'Courier New', monospace;
          font-size: 9px;
          color: #0066cc;
          word-break: break-all;
          margin-top: 4px;
          font-weight: 500;
        }
        
        .footer {
          position: absolute;
          bottom: 15px;
          left: 20px;
          right: 20px;
          font-size: 8px;
          color: #6c757d;
          text-align: center;
          border-top: 2px solid #dee2e6;
          padding-top: 8px;
          background: white;
        }
        
        .footer-line1 {
          margin-bottom: 2px;
          font-weight: 500;
        }
        
        .footer-line2 {
          font-size: 7px;
          color: #adb5bd;
        }
        
        @media print {
          body { 
            margin: 0; 
            padding: 10px; 
            background: white;
          }
          .label-container { 
            margin: 0;
            border: 2px solid #000;
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
          <div>
            <div class="box-id">Box #: ${boxId}</div>
            <div class="box-date">${data.createdDate}</div>
          </div>
          <div class="weight-info">${data.totalWeight.toFixed(2)} kg</div>
        </div>

        <!-- Brand Info -->
        <div class="brand-info">
          <strong>Brand:</strong> ${data.brandName}
        </div>

        <!-- Destination -->
        <div class="destination-section">
          <div class="section-title">Ship To</div>
          <div class="destination-address">
            <div class="destination-name">${data.destinationAddress.name}</div>
            <div>${data.destinationAddress.address}</div>
            <div>${data.destinationAddress.city}, ${data.destinationAddress.state} ${data.destinationAddress.pincode}</div>
            <div><strong>Phone:</strong> ${data.destinationAddress.phone}</div>
          </div>
        </div>

        <!-- Main Content: QR Code + Parts -->
        <div class="main-content">
          <div class="qr-section">
            <div class="qr-placeholder">
              <div>QR Code</div>
              <div style="font-size: 8px; margin-top: 4px;">Scan to Track</div>
            </div>
            <div class="qr-label">Track Online</div>
          </div>
          
          <div class="parts-section">
            <div class="section-title">Parts Summary (${data.partsSummary.length} items)</div>
            <table class="parts-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Part Name</th>
                  <th>Qty</th>
                </tr>
              </thead>
              <tbody>
                ${data.partsSummary.slice(0, 6).map(part => `
                  <tr>
                    <td class="part-code">${part.code}</td>
                    <td class="part-name">${part.name.length > 20 ? part.name.substring(0, 20) + '...' : part.name}</td>
                    <td class="quantity">${part.quantity}</td>
                  </tr>
                `).join('')}
                ${data.partsSummary.length > 6 ? `
                  <tr>
                    <td colspan="3" style="text-align: center; font-style: italic; color: #6c757d;">
                      ... and ${data.partsSummary.length - 6} more items
                    </td>
                  </tr>
                ` : ''}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Tracking Section -->
        ${data.trackingUrl ? `
        <div class="tracking-section">
          <div><strong>Track Online:</strong></div>
          <div class="tracking-url">${data.trackingUrl}</div>
        </div>
        ` : ''}

        <!-- Custom Notes -->
        ${data.customNotes ? `
        <div style="margin-bottom: 15px; padding: 8px; background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 4px;">
          <div style="font-size: 9px; font-weight: bold; color: #856404; margin-bottom: 4px;">NOTES:</div>
          <div style="font-size: 8px; color: #856404;">${data.customNotes}</div>
        </div>
        ` : ''}

        <!-- Footer -->
        <div class="footer">
          <div class="footer-line1">Generated: ${new Date().toLocaleString()} | SpareFlow AI Logistics Platform</div>
          <div class="footer-line2">For support: support@spareflow.com | Track: ${data.trackingUrl || `dtdc.in/track/${data.awbNumber}`}</div>
        </div>
      </div>
    </body>
    </html>
  `;
}