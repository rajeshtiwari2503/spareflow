import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { trackShipmentEnhanced, trackMultipleShipmentsEnhanced } from '@/lib/dtdc-tracking';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { boxId, awbNumber, shipmentId, userId, role, liveTracking = 'false' } = req.query;

    let whereClause: any = {};

    if (boxId) {
      whereClause.id = boxId as string;
    } else if (awbNumber) {
      whereClause.awbNumber = awbNumber as string;
    } else if (shipmentId) {
      whereClause.shipmentId = shipmentId as string;
    } else if (userId && role) {
      // Filter based on user role
      if (role === 'BRAND') {
        whereClause.shipment = {
          brandId: userId as string
        };
      } else if (role === 'SERVICE_CENTER') {
        whereClause.shipment = {
          serviceCenterId: userId as string
        };
      }
    }

    const boxes = await prisma.box.findMany({
      where: whereClause,
      include: {
        shipment: {
          include: {
            brand: {
              select: { id: true, name: true, email: true }
            },
            serviceCenter: {
              select: { id: true, name: true, email: true }
            }
          }
        },
        boxParts: {
          include: {
            part: {
              select: { id: true, code: true, name: true, weight: true }
            }
          }
        },
        trackingHistory: {
          orderBy: {
            timestamp: 'desc'
          }
        }
      }
    });

    // Get live tracking data if requested
    let liveTrackingData: Record<string, any> = {};
    
    if (liveTracking === 'true') {
      const awbNumbers = boxes
        .filter(box => box.awbNumber && !box.awbNumber.startsWith('TEST'))
        .map(box => box.awbNumber!);

      if (awbNumbers.length > 0) {
        try {
          const liveResults = await trackMultipleShipmentsEnhanced(awbNumbers);
          
          // Create a mapping of AWB to live tracking data
          liveResults.forEach(result => {
            if (result.success) {
              liveTrackingData[result.awb_number] = {
                currentStatus: result.current_status,
                location: result.location,
                timestamp: result.timestamp,
                description: result.description,
                scanCode: result.scan_code,
                trackingHistory: result.tracking_history,
                lastUpdated: new Date().toISOString()
              };
            }
          });
        } catch (error) {
          console.error('Error fetching live tracking data:', error);
          // Continue with stored data if live tracking fails
        }
      }
    }

    // Format the response
    const trackingData = boxes.map(box => {
      const latestTracking = box.trackingHistory[0];
      const liveData = box.awbNumber ? liveTrackingData[box.awbNumber] : null;
      
      // Use live data if available, otherwise fall back to stored data
      const currentTracking = liveData ? {
        status: liveData.currentStatus,
        location: liveData.location,
        timestamp: liveData.timestamp,
        description: liveData.description,
        scanCode: liveData.scanCode,
        isLive: true,
        lastUpdated: liveData.lastUpdated
      } : (latestTracking ? {
        status: latestTracking.status,
        location: latestTracking.location,
        timestamp: latestTracking.timestamp,
        description: latestTracking.description,
        scanCode: latestTracking.scanCode,
        isLive: false
      } : null);

      return {
        boxId: box.id,
        boxNumber: box.boxNumber,
        awbNumber: box.awbNumber,
        status: box.status,
        weight: box.weight,
        shipment: {
          id: box.shipment.id,
          brand: box.shipment.brand,
          serviceCenter: box.shipment.serviceCenter,
          status: box.shipment.status
        },
        parts: box.boxParts.map(bp => ({
          ...bp.part,
          quantity: bp.quantity
        })),
        currentTracking,
        trackingHistory: liveData ? liveData.trackingHistory.map((th: any) => ({
          status: th.status,
          location: th.location,
          timestamp: th.timestamp,
          description: th.description,
          scanCode: th.scan_code,
          isLive: true
        })) : box.trackingHistory.map(th => ({
          status: th.status,
          location: th.location,
          timestamp: th.timestamp,
          description: th.description,
          scanCode: th.scanCode,
          isLive: false
        })),
        liveTrackingAvailable: !!liveData,
        trackingUrl: box.awbNumber ? `https://www.dtdc.in/tracking/track.asp?strAWBNo=${box.awbNumber}` : null
      };
    });

    return res.status(200).json({
      success: true,
      data: trackingData,
      liveTrackingEnabled: liveTracking === 'true',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching tracking data:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch tracking data',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}