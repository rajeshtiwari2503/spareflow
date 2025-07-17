// Enhanced PDF Label Generation Service with Puppeteer and QR Code support
import puppeteer from 'puppeteer';
import QRCode from 'qrcode';

export interface LabelData {
  boxNumber: string;
  awbNumber: string;
  shipmentId: string;
  brandName: string;
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
  totalWeight: number;
  createdDate: string;
  trackingUrl?: string;
}

export interface LabelGenerationOptions {
  format?: 'pdf' | 'html';
  size?: 'A4' | 'A5' | 'label';
  includeQR?: boolean;
}

// Generate QR Code as base64 data URL
export async function generateQRCode(data: string): Promise<string> {
  try {
    const qrCodeDataURL = await QRCode.toDataURL(data, {
      width: 150,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    return qrCodeDataURL;
  } catch (error) {
    console.error('Error generating QR code:', error);
    // Return a placeholder QR code URL as fallback
    return `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(data)}`;
  }
}

// Generate QR code data for tracking
export function generateQRCodeData(labelData: LabelData): string {
  const qrData = {
    type: 'SPAREFLOW_SHIPMENT',
    boxId: `SHP-${labelData.shipmentId}-BX${labelData.boxNumber}`,
    awb: labelData.awbNumber,
    shipment: labelData.shipmentId,
    box: labelData.boxNumber,
    weight: labelData.totalWeight,
    trackingUrl: labelData.trackingUrl || `https://spareflow.com/track/${labelData.awbNumber}`,
    timestamp: new Date().toISOString()
  };
  
  return JSON.stringify(qrData);
}

// Generate professional HTML template for the label
export async function generateLabelHTML(data: LabelData, options: LabelGenerationOptions = {}): Promise<string> {
  const { includeQR = true } = options;
  
  // Generate QR code
  let qrCodeDataURL = '';
  if (includeQR) {
    const qrData = generateQRCodeData(data);
    qrCodeDataURL = await generateQRCode(qrData);
  }

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
          background: white;
          color: #000;
          line-height: 1.2;
        }
        
        .label-container {
          width: 4in;
          height: 6in;
          border: 3px solid #000;
          padding: 12px;
          position: relative;
          background: white;
          page-break-after: always;
        }
        
        .header {
          text-align: center;
          border-bottom: 2px solid #000;
          padding-bottom: 8px;
          margin-bottom: 12px;
        }
        
        .company-logo {
          font-size: 20px;
          font-weight: bold;
          color: #2563eb;
          margin-bottom: 4px;
        }
        
        .label-title {
          font-size: 12px;
          color: #374151;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        
        .awb-section {
          background: #f8fafc;
          border: 2px solid #e2e8f0;
          padding: 8px;
          text-align: center;
          margin-bottom: 12px;
        }
        
        .awb-label {
          font-size: 10px;
          color: #64748b;
          margin-bottom: 2px;
          text-transform: uppercase;
        }
        
        .awb-number {
          font-size: 18px;
          font-weight: bold;
          font-family: 'Courier New', monospace;
          letter-spacing: 1px;
        }
        
        .box-info {
          display: flex;
          justify-content: space-between;
          margin-bottom: 12px;
          font-size: 11px;
        }
        
        .box-id {
          font-weight: bold;
          font-size: 14px;
        }
        
        .weight-info {
          background: #fef3c7;
          padding: 4px 8px;
          border-radius: 4px;
          font-weight: bold;
        }
        
        .destination-section {
          border: 1px solid #d1d5db;
          padding: 8px;
          margin-bottom: 12px;
          background: #fafafa;
        }
        
        .section-title {
          font-size: 10px;
          font-weight: bold;
          color: #374151;
          text-transform: uppercase;
          margin-bottom: 4px;
          border-bottom: 1px solid #d1d5db;
          padding-bottom: 2px;
        }
        
        .destination-address {
          font-size: 11px;
          line-height: 1.3;
        }
        
        .destination-name {
          font-weight: bold;
          font-size: 12px;
          margin-bottom: 2px;
        }
        
        .main-content {
          display: flex;
          gap: 8px;
          margin-bottom: 12px;
        }
        
        .qr-section {
          flex-shrink: 0;
          text-align: center;
        }
        
        .qr-code {
          width: 80px;
          height: 80px;
          border: 1px solid #d1d5db;
        }
        
        .qr-label {
          font-size: 8px;
          color: #6b7280;
          margin-top: 2px;
        }
        
        .parts-section {
          flex: 1;
        }
        
        .parts-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 9px;
        }
        
        .parts-table th {
          background: #f1f5f9;
          border: 1px solid #cbd5e1;
          padding: 3px;
          text-align: left;
          font-weight: bold;
          font-size: 8px;
        }
        
        .parts-table td {
          border: 1px solid #e2e8f0;
          padding: 3px;
          vertical-align: top;
        }
        
        .part-code {
          font-family: 'Courier New', monospace;
          font-weight: bold;
        }
        
        .part-name {
          font-size: 8px;
        }
        
        .quantity {
          text-align: center;
          font-weight: bold;
        }
        
        .footer {
          position: absolute;
          bottom: 8px;
          left: 12px;
          right: 12px;
          font-size: 7px;
          color: #9ca3af;
          text-align: center;
          border-top: 1px solid #e5e7eb;
          padding-top: 4px;
        }
        
        .brand-info {
          font-size: 10px;
          color: #4b5563;
          margin-bottom: 8px;
          text-align: center;
          background: #f0f9ff;
          padding: 4px;
          border-radius: 4px;
        }
        
        @media print {
          body { 
            margin: 0; 
            padding: 0; 
          }
          .label-container { 
            margin: 0;
            border: 2px solid #000;
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
            <div style="font-size: 9px; color: #6b7280;">${data.createdDate}</div>
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
          ${includeQR ? `
          <div class="qr-section">
            <img src="${qrCodeDataURL}" alt="Tracking QR Code" class="qr-code">
            <div class="qr-label">Scan to Track</div>
          </div>
          ` : ''}
          
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
                    <td class="part-name">${part.name.length > 20 ? part.name.substring(0, 20) + '...' : part.name}</td>
                    <td class="quantity">${part.quantity}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Footer -->
        <div class="footer">
          Generated: ${new Date().toLocaleString()} | SpareFlow AI Logistics Platform<br>
          Track: ${data.trackingUrl || `spareflow.com/track/${data.awbNumber}`}
        </div>
      </div>
    </body>
    </html>
  `;
}

// Generate PDF using Puppeteer
export async function generateLabelPDF(data: LabelData, options: LabelGenerationOptions = {}): Promise<Buffer> {
  const { size = 'label' } = options;
  
  let browser;
  try {
    // Launch Puppeteer browser
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu'
      ]
    });

    const page = await browser.newPage();
    
    // Generate HTML content
    const htmlContent = await generateLabelHTML(data, options);
    
    // Set content
    await page.setContent(htmlContent, { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });

    // Configure PDF options based on size
    let pdfOptions: any = {
      printBackground: true,
      preferCSSPageSize: true
    };

    switch (size) {
      case 'A4':
        pdfOptions = {
          ...pdfOptions,
          format: 'A4',
          margin: { top: '0.5in', right: '0.5in', bottom: '0.5in', left: '0.5in' }
        };
        break;
      case 'A5':
        pdfOptions = {
          ...pdfOptions,
          format: 'A5',
          margin: { top: '0.3in', right: '0.3in', bottom: '0.3in', left: '0.3in' }
        };
        break;
      case 'label':
      default:
        pdfOptions = {
          ...pdfOptions,
          width: '4in',
          height: '6in',
          margin: { top: '0', right: '0', bottom: '0', left: '0' }
        };
        break;
    }

    // Generate PDF
    const pdfBuffer = await page.pdf(pdfOptions);
    
    return pdfBuffer;

  } catch (error) {
    console.error('Error generating PDF label:', error);
    throw new Error(`Failed to generate PDF label: ${error instanceof Error ? error.message : 'Unknown error'}`);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Utility function to trigger label generation after DTDC order success
export async function triggerLabelGeneration(boxId: string, options: LabelGenerationOptions = {}): Promise<{
  success: boolean;
  pdfBuffer?: Buffer;
  htmlContent?: string;
  error?: string;
}> {
  try {
    // This would typically be called from the DTDC integration
    // after successful AWB generation
    
    const response = await fetch('/api/labels/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ boxId, options })
    });

    if (!response.ok) {
      throw new Error(`Label generation failed: ${response.statusText}`);
    }

    const result = await response.json();
    return {
      success: true,
      ...result
    };

  } catch (error) {
    console.error('Error triggering label generation:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Export legacy function for backward compatibility
export function generateQRCodeData_Legacy(boxData: any): string {
  return JSON.stringify({
    boxId: boxData.id,
    awb: boxData.awbNumber,
    shipment: boxData.shipmentId,
    box: boxData.boxNumber,
    weight: boxData.weight,
    timestamp: new Date().toISOString()
  });
}