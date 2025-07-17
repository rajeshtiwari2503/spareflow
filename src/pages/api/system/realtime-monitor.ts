import { NextApiRequest, NextApiResponse } from 'next';
import { systemMetrics } from '@/lib/system-metrics';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Set headers for Server-Sent Events
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });

    // Send initial connection message
    res.write(`data: ${JSON.stringify({ 
      type: 'connected', 
      message: 'Real-time monitoring connected',
      timestamp: new Date().toISOString()
    })}\n\n`);

    // Function to send metrics
    const sendMetrics = async () => {
      try {
        const metrics = await systemMetrics.collectMetrics();
        const alerts = systemMetrics.getActiveAlerts();
        const health = systemMetrics.getSystemHealth();

        const data = {
          type: 'metrics',
          data: {
            metrics,
            alerts,
            health,
            summary: {
              cpu: metrics.cpu.usage,
              memory: metrics.memory.usage,
              disk: metrics.disk.usage,
              responseTime: metrics.application.responseTime,
              errorRate: metrics.application.errorRate,
              uptime: metrics.application.uptime,
              dbConnections: metrics.database.connections,
              dbQueryTime: metrics.database.queryTime
            }
          },
          timestamp: new Date().toISOString()
        };

        res.write(`data: ${JSON.stringify(data)}\n\n`);
      } catch (error) {
        console.error('Error sending metrics:', error);
        res.write(`data: ${JSON.stringify({ 
          type: 'error', 
          message: 'Error collecting metrics',
          timestamp: new Date().toISOString()
        })}\n\n`);
      }
    };

    // Send metrics immediately
    await sendMetrics();

    // Set up interval to send metrics every 5 seconds
    const interval = setInterval(sendMetrics, 5000);

    // Handle client disconnect
    req.on('close', () => {
      clearInterval(interval);
      console.log('Real-time monitoring client disconnected');
    });

    req.on('end', () => {
      clearInterval(interval);
      console.log('Real-time monitoring connection ended');
    });

  } catch (error) {
    console.error('Error setting up real-time monitoring:', error);
    return res.status(500).json({
      error: 'Failed to set up real-time monitoring',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}