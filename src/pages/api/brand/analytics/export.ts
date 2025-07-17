import { NextApiRequest, NextApiResponse } from 'next';
import { verifyAuth } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const user = await verifyAuth(req);
    if (!user || user.role !== 'BRAND') {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { format, timeRange, brandId, data } = req.body;

    if (format === 'pdf') {
      // Generate PDF report
      const pdfContent = `
        Brand Analytics Report
        Time Range: ${timeRange}
        Generated: ${new Date().toISOString()}
        
        Overview:
        - Total Revenue: ₹${data.overview.totalRevenue.toLocaleString()}
        - Total Shipments: ${data.overview.totalShipments}
        - Average Order Value: ₹${data.overview.averageOrderValue}
        - Customer Satisfaction: ${data.overview.customerSatisfaction}/5
        
        Performance:
        - Delivery Success: ${data.performance.deliverySuccess}%
        - On-Time Delivery: ${data.performance.onTimeDelivery}%
        - Return Rate: ${data.performance.returnRate}%
        - Customer Retention: ${data.performance.customerRetention}%
      `;

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=brand-analytics-${timeRange}.pdf`);
      res.status(200).send(Buffer.from(pdfContent));
    } else if (format === 'excel') {
      // Generate Excel report (CSV format for simplicity)
      const csvContent = [
        'Metric,Value',
        `Total Revenue,${data.overview.totalRevenue}`,
        `Total Shipments,${data.overview.totalShipments}`,
        `Average Order Value,${data.overview.averageOrderValue}`,
        `Customer Satisfaction,${data.overview.customerSatisfaction}`,
        `Delivery Success Rate,${data.performance.deliverySuccess}%`,
        `On-Time Delivery,${data.performance.onTimeDelivery}%`,
        `Return Rate,${data.performance.returnRate}%`,
        `Customer Retention,${data.performance.customerRetention}%`
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=brand-analytics-${timeRange}.csv`);
      res.status(200).send(csvContent);
    } else {
      res.status(400).json({ error: 'Invalid format' });
    }
  } catch (error) {
    console.error('Export API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}