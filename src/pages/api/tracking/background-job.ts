import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { trackMultipleShipmentsEnhanced, updateTrackingInDatabase, getStatusDisplayText } from '@/lib/enhanced-dtdc-tracking';
import { sendShipmentUpdate, sendDeliveryNotification, formatPhoneNumber } from '@/lib/whatsapp';
import { notifyTrackingUpdate } from '@/lib/websocket';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🔄 Starting background tracking job...');
    
    // Get all boxes with 'IN_TRANSIT' status that have AWB numbers
    const boxesToTrack = await prisma.box.findMany({
      where: {
        status: 'IN_TRANSIT',
        awbNumber: {
          not: null
        }
      },
      include: {
        shipment: {
          include: {
            brand: true,
            serviceCenter: true
          }
        },
        trackingHistory: {
          orderBy: {
            timestamp: 'desc'
          },
          take: 1
        }
      }
    });

    if (boxesToTrack.length === 0) {
      console.log('📦 No boxes to track');
      return res.status(200).json({ 
        success: true, 
        message: 'No boxes to track',
        processed: 0 
      });
    }

    console.log(`📦 Found ${boxesToTrack.length} boxes to track`);

    // Extract AWB numbers
    const awbNumbers = boxesToTrack
      .map(box => box.awbNumber)
      .filter((awb): awb is string => awb !== null);

    // Track all shipments using enhanced tracking
    const trackingResults = await trackMultipleShipmentsEnhanced(awbNumbers);

    let updatedBoxes = 0;
    let newTrackingEntries = 0;
    let notificationsSent = 0;
    let notificationErrors = 0;

    // Process each tracking result
    for (let i = 0; i < trackingResults.length; i++) {
      const trackingResult = trackingResults[i];
      const box = boxesToTrack[i];

      if (!trackingResult.success) {
        console.log(`❌ Failed to track AWB ${trackingResult.awb_number}: ${trackingResult.error}`);
        continue;
      }

      // Check if we have new tracking information
      const latestTrackingEntry = box.trackingHistory[0];
      const currentTrackingStatus = trackingResult.current_status || 'IN_TRANSIT';
      
      const isNewUpdate = !latestTrackingEntry || 
        latestTrackingEntry.status !== currentTrackingStatus ||
        (trackingResult.timestamp && latestTrackingEntry.timestamp.toISOString() !== trackingResult.timestamp);

      if (isNewUpdate) {
        console.log(`🆕 New tracking update for AWB ${trackingResult.awb_number}: ${currentTrackingStatus}`);
        
        // Update database with all tracking information
        await updateTrackingInDatabase(trackingResult);

        // Update box status based on tracking status
        const previousBoxStatus = box.status;
        let newBoxStatus = mapTrackingStatusToBoxStatus(currentTrackingStatus);

        // Update box if status changed
        if (newBoxStatus !== box.status) {
          await prisma.box.update({
            where: { id: box.id },
            data: { status: newBoxStatus }
          });
          updatedBoxes++;
          console.log(`📦 Updated box ${box.id} status: ${box.status} → ${newBoxStatus}`);
        }

        // Send notifications for significant status changes
        try {
          const oldStatus = latestTrackingEntry?.status || 'UNKNOWN';
          const shouldNotify = shouldSendNotification(oldStatus, currentTrackingStatus);
          
          if (shouldNotify && box.shipment.serviceCenter) {
            const serviceCenter = box.shipment.serviceCenter;
            
            // Get phone number (mock for now, in real system get from database)
            const serviceCenterPhone = getServiceCenterPhone(serviceCenter);
            
            if (serviceCenterPhone) {
              const formattedPhone = formatPhoneNumber(serviceCenterPhone);
              const trackingLink = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://spareflow.com'}/track?awb=${trackingResult.awb_number}`;

              if (currentTrackingStatus === 'DELIVERED') {
                // Send delivery notification
                const deliveryTime = new Date(trackingResult.timestamp || Date.now()).toLocaleString('en-IN', {
                  timeZone: 'Asia/Kolkata',
                  dateStyle: 'medium',
                  timeStyle: 'short'
                });

                await sendDeliveryNotification(
                  formattedPhone,
                  serviceCenter.name || 'Service Center',
                  trackingResult.awb_number,
                  deliveryTime
                );
              } else {
                // Send status update notification
                await sendShipmentUpdate(
                  formattedPhone,
                  serviceCenter.name || 'Service Center',
                  trackingResult.awb_number,
                  getStatusDisplayText(currentTrackingStatus),
                  trackingResult.location || 'In Transit',
                  trackingLink
                );
              }

              notificationsSent++;
              console.log(`📱 WhatsApp notification sent to ${serviceCenter.name} for ${trackingResult.awb_number}: ${currentTrackingStatus}`);
            }
          }
        } catch (error) {
          console.error(`❌ WhatsApp notification failed for box ${box.id}:`, error);
          notificationErrors++;
        }

        // Send real-time WebSocket notification
        try {
          notifyTrackingUpdate(box, {
            status: currentTrackingStatus,
            location: trackingResult.location || 'Processing Center',
            description: trackingResult.description || `Package ${currentTrackingStatus.toLowerCase()}`,
            scanCode: trackingResult.scan_code,
            timestamp: trackingResult.timestamp || new Date().toISOString()
          });
          console.log(`🔔 Real-time notification sent for Box ${box.boxNumber}`);
        } catch (error) {
          console.error(`❌ Real-time notification failed for box ${box.id}:`, error);
        }

        newTrackingEntries++;
        console.log(`✅ Updated tracking for Box ${box.boxNumber} (${trackingResult.current_status})`);
      }
    }

    // Update shipment status if all boxes are delivered
    const shipmentIds = [...new Set(boxesToTrack.map(box => box.shipmentId))];
    
    for (const shipmentId of shipmentIds) {
      const shipmentBoxes = await prisma.box.findMany({
        where: { shipmentId }
      });
      
      const allDelivered = shipmentBoxes.every(box => box.status === 'DELIVERED');
      
      if (allDelivered) {
        await prisma.shipment.update({
          where: { id: shipmentId },
          data: { status: 'DELIVERED' }
        });
        console.log(`🚚 Shipment ${shipmentId} marked as DELIVERED`);
      }
    }

    console.log(`✅ Background job completed: ${newTrackingEntries} new entries, ${updatedBoxes} boxes updated, ${notificationsSent} notifications sent`);

    return res.status(200).json({
      success: true,
      message: 'Background tracking job completed',
      processed: boxesToTrack.length,
      newTrackingEntries,
      updatedBoxes,
      notificationsSent,
      notificationErrors
    });

  } catch (error) {
    console.error('❌ Background tracking job failed:', error);
    return res.status(500).json({
      success: false,
      error: 'Background tracking job failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// Helper function to map tracking status to box status
function mapTrackingStatusToBoxStatus(trackingStatus: string): string {
  const statusMap: Record<string, string> = {
    'BOOKED': 'PENDING',
    'PICKUP_AWAITED': 'PENDING',
    'PICKUP_SCHEDULED': 'PENDING',
    'PICKED_UP': 'IN_TRANSIT',
    'IN_TRANSIT': 'IN_TRANSIT',
    'OUT_FOR_DELIVERY': 'IN_TRANSIT',
    'DELIVERED': 'DELIVERED',
    'UNDELIVERED': 'IN_TRANSIT', // Keep as in transit for retry
    'RTO': 'RETURNED',
    'CANCELLED': 'CANCELLED',
    'HELD_UP': 'IN_TRANSIT',
    'DAMAGED': 'FAILED',
    'LOST': 'FAILED'
  };

  return statusMap[trackingStatus] || 'IN_TRANSIT';
}

// Helper function to get service center phone number
function getServiceCenterPhone(serviceCenter: any): string | null {
  // In real implementation, this would get the phone from the database
  // For now, return a mock phone number based on service center
  if (serviceCenter.phone) {
    return serviceCenter.phone;
  }
  
  // Mock phone numbers for demo
  const mockPhones: Record<string, string> = {
    'Central Service Hub': '+919876543210',
    'Mumbai Service Center': '+919876543211',
    'Delhi Service Center': '+919876543212',
    'Bangalore Service Center': '+919876543213'
  };
  
  return mockPhones[serviceCenter.name] || '+919876543210';
}

// Helper function to determine if notification should be sent
function shouldSendNotification(previousStatus: string, newStatus: string): boolean {
  // Send notifications for these status changes
  const notifiableStatuses = [
    'PICKED_UP',
    'OUT_FOR_DELIVERY', 
    'DELIVERED',
    'UNDELIVERED',
    'RTO',
    'CANCELLED',
    'HELD_UP'
  ];

  // Don't send duplicate notifications
  if (previousStatus === newStatus) {
    return false;
  }

  return notifiableStatuses.includes(newStatus);
}