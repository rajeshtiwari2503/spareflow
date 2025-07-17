// Simple PDF Label Generation without Puppeteer dependency
// Uses basic HTML and inline CSS for label generation

export interface SimpleLabelData {
  awbNumber: string;
  shipmentId: string;
  boxNumber: string;
  brandName: string;
  totalWeight: number;
  createdDate: string;
  trackingUrl?: string;
  destinationAddress: {
    name: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
    phone: string;
  };
  partsSummary: {
    code: string;
    name: string;
    quantity: number;
  }[];
}

// Generate simple HTML label that can be printed
export function generateSimpleLabelHTML(data: SimpleLabelData): string {
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
          font-family: Arial, sans-serif;
          background: white;
          color: #000;
          line-height: 1.2;
          padding: 20px;
        }
        
        .label-container {
          width: 4in;
          min-height: 6in;
          border: 3px solid #000;
          padding: 15px;
          background: white;
          margin: 0 auto;
        }
        
        .header {
          text-align: center;
          border-bottom: 2px solid #000;
          padding-bottom: 10px;
          margin-bottom: 15px;
        }
        
        .company-logo {
          font-size: 24px;
          font-weight: bold;
          color: #2563eb;
          margin-bottom: 5px;
        }
        
        .label-title {
          font-size: 12px;
          color: #666;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        
        .awb-section {
          background: #f8f9fa;
          border: 2px solid #dee2e6;
          padding: 10px;
          text-align: center;
          margin-bottom: 15px;
        }
        
        .awb-label {
          font-size: 10px;
          color: #6c757d;
          margin-bottom: 3px;
          text-transform: uppercase;
          font-weight: bold;
        }
        
        .awb-number {
          font-size: 20px;
          font-weight: bold;
          font-family: 'Courier New', monospace;
          letter-spacing: 2px;
        }
        
        .box-info {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;
          font-size: 12px;
        }
        
        .box-id {
          font-weight: bold;
          font-size: 16px;
        }
        
        .weight-info {
          background: #fff3cd;
          padding: 5px 10px;
          border: 1px solid #ffeaa7;
          border-radius: 4px;
          font-weight: bold;
        }
        
        .brand-info {
          font-size: 11px;
          color: #495057;
          margin-bottom: 10px;
          text-align: center;
          background: #e3f2fd;
          padding: 5px;
          border-radius: 4px;
        }
        
        .destination-section {
          border: 1px solid #dee2e6;
          padding: 10px;
          margin-bottom: 15px;
          background: #f8f9fa;
        }
        
        .section-title {
          font-size: 10px;
          font-weight: bold;
          color: #495057;
          text-transform: uppercase;
          margin-bottom: 5px;
          border-bottom: 1px solid #dee2e6;
          padding-bottom: 2px;
        }
        
        .destination-address {
          font-size: 12px;
          line-height: 1.4;
        }
        
        .destination-name {
          font-weight: bold;
          font-size: 14px;
          margin-bottom: 3px;
        }
        
        .parts-section {
          margin-bottom: 15px;
        }
        
        .parts-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 10px;
          margin-top: 5px;
        }
        
        .parts-table th {
          background: #e9ecef;
          border: 1px solid #adb5bd;
          padding: 4px;
          text-align: left;
          font-weight: bold;
          font-size: 9px;
        }
        
        .parts-table td {
          border: 1px solid #dee2e6;
          padding: 4px;
          vertical-align: top;
        }
        
        .part-code {
          font-family: 'Courier New', monospace;
          font-weight: bold;
        }
        
        .part-name {
          font-size: 9px;
        }
        
        .quantity {
          text-align: center;
          font-weight: bold;
        }
        
        .tracking-section {
          background: #f8f9fa;
          border: 1px solid #dee2e6;
          padding: 8px;
          text-align: center;
          font-size: 10px;
          margin-bottom: 10px;
        }
        
        .tracking-url {
          font-family: 'Courier New', monospace;
          font-size: 9px;
          color: #0066cc;
          word-break: break-all;
        }
        
        .footer {
          font-size: 8px;
          color: #6c757d;
          text-align: center;
          border-top: 1px solid #dee2e6;
          padding-top: 5px;
          margin-top: 10px;
        }
        
        .qr-placeholder {
          width: 80px;
          height: 80px;
          border: 2px dashed #adb5bd;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 8px;
          color: #6c757d;
          text-align: center;
          margin: 0 auto 10px;
          background: #f8f9fa;
        }
        
        @media print {
          body { 
            margin: 0; 
            padding: 10px; 
          }
          .label-container { 
            margin: 0;
            border: 2px solid #000;
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
            <div style="font-size: 10px; color: #6c757d;">${data.createdDate}</div>
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

        <!-- QR Code Placeholder -->
        <div class="qr-placeholder">
          QR Code<br>
          (Scan to Track)
        </div>

        <!-- Parts Section -->
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
              ${data.partsSummary.map(part => `
                <tr>
                  <td class="part-code">${part.code}</td>
                  <td class="part-name">${part.name.length > 25 ? part.name.substring(0, 25) + '...' : part.name}</td>
                  <td class="quantity">${part.quantity}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <!-- Tracking Section -->
        <div class="tracking-section">
          <div><strong>Track Online:</strong></div>
          <div class="tracking-url">${data.trackingUrl || `dtdc.in/track/${data.awbNumber}`}</div>
        </div>

        <!-- Footer -->
        <div class="footer">
          Generated: ${new Date().toLocaleString()} | SpareFlow AI Logistics Platform<br>
          For support: support@spareflow.com | +91-9876543200
        </div>
      </div>
    </body>
    </html>
  `;
}

// Generate a simple text-based label for fallback
export function generateTextLabel(data: SimpleLabelData): string {
  const boxId = `SHP-${data.shipmentId.slice(-6)}-BX${data.boxNumber}`;
  
  return `
╔══════════════════════════════════════════════════════════════╗
║                         SPAREFLOW                            ║
║                    AI Logistics Platform                     ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  AWB NUMBER: ${data.awbNumber.padEnd(45)} ║
║                                                              ║
║  BOX ID: ${boxId.padEnd(50)} ║
║  DATE: ${data.createdDate.padEnd(52)} ║
║  WEIGHT: ${(data.totalWeight.toFixed(2) + ' kg').padEnd(49)} ║
║                                                              ║
║  BRAND: ${data.brandName.padEnd(51)} ║
║                                                              ║
╠══════════════════════════════════════════════════════════════╣
║  SHIP TO:                                                    ║
║  ${data.destinationAddress.name.padEnd(58)} ║
║  ${data.destinationAddress.address.substring(0, 58).padEnd(58)} ║
║  ${(data.destinationAddress.city + ', ' + data.destinationAddress.state + ' ' + data.destinationAddress.pincode).padEnd(58)} ║
║  Phone: ${data.destinationAddress.phone.padEnd(51)} ║
║                                                              ║
╠══════════════════════════════════════════════════════════════╣
║  PARTS (${data.partsSummary.length.toString().padStart(2)} items):                                        ║
${data.partsSummary.map(part => 
  `║  ${part.code.padEnd(12)} ${part.name.substring(0, 35).padEnd(35)} x${part.quantity.toString().padStart(3)} ║`
).join('\n')}
║                                                              ║
╠══════════════════════════════════════════════════════════════╣
║  TRACK: ${(data.trackingUrl || `dtdc.in/track/${data.awbNumber}`).substring(0, 53).padEnd(53)} ║
║                                                              ║
║  Generated: ${new Date().toLocaleString().padEnd(45)} ║
╚══════════════════════════════════════════════════════════════╝
  `.trim();
}

// Generate a proper PDF buffer
export async function generateSimplePDFLabel(data: SimpleLabelData): Promise<Buffer> {
  try {
    // Try to use the proper PDF generator first
    const { generatePDFLabel } = await import('./pdf-generator');
    return await generatePDFLabel(data);
  } catch (error) {
    console.error('Error with PDF generator, using fallback:', error);
    
    // Fallback to a simpler PDF structure
    const htmlContent = generateSimpleLabelHTML(data);
    
    // Create a basic PDF with proper text content
    const boxId = `SHP-${data.shipmentId.slice(-6)}-BX${data.boxNumber}`;
    
    let pdfContent = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj

2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj

3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 288 432] /Contents 4 0 R /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >> >>
endobj

4 0 obj
<< /Length 800 >>
stream
BT
/F1 16 Tf
144 400 Td
(SpareFlow) Tj
0 -20 Td
/F1 10 Tf
(AI Logistics Platform) Tj
0 -30 Td
/F1 12 Tf
(AWB: ${data.awbNumber}) Tj
0 -20 Td
(Box: ${boxId}) Tj
0 -15 Td
(Weight: ${data.totalWeight.toFixed(2)} kg) Tj
0 -15 Td
(Date: ${data.createdDate}) Tj
0 -20 Td
(Brand: ${data.brandName}) Tj
0 -30 Td
/F1 10 Tf
(SHIP TO:) Tj
0 -15 Td
(${data.destinationAddress.name}) Tj
0 -12 Td
(${data.destinationAddress.address.substring(0, 40)}) Tj
0 -12 Td
(${data.destinationAddress.city}, ${data.destinationAddress.state}) Tj
0 -12 Td
(${data.destinationAddress.pincode}) Tj
0 -12 Td
(Phone: ${data.destinationAddress.phone}) Tj
0 -25 Td
(Parts Summary: ${data.partsSummary.length} items) Tj`;

    // Add parts (limit to first 5 for space)
    let yOffset = -12;
    data.partsSummary.slice(0, 5).forEach(part => {
      pdfContent += `
0 ${yOffset} Td
(${part.code} - ${part.name.substring(0, 25)} x${part.quantity}) Tj`;
      yOffset -= 10;
    });

    if (data.partsSummary.length > 5) {
      pdfContent += `
0 ${yOffset} Td
(... and ${data.partsSummary.length - 5} more items) Tj`;
    }

    pdfContent += `
0 -20 Td
/F1 8 Tf
(Generated: ${new Date().toLocaleString()}) Tj
0 -10 Td
(SpareFlow AI Logistics Platform) Tj
ET
endstream
endobj

xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000300 00000 n 
trailer
<< /Size 5 /Root 1 0 R >>
startxref
1150
%%EOF`;

    return Buffer.from(pdfContent, 'utf-8');
  }
}

// Export for compatibility
export { generateSimpleLabelHTML as generatePDFLabel };