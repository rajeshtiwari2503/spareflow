import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const { type, limit = 100, offset = 0 } = req.query
      
      // Get shipment activities
      const shipmentLogs = await prisma.shipment.findMany({
        include: {
          brand: { select: { id: true, name: true, email: true } },
          serviceCenter: { select: { id: true, name: true, email: true } },
          boxes: {
            include: {
              boxParts: {
                include: {
                  part: { select: { id: true, code: true, name: true } }
                }
              }
            }
          }
        },
        orderBy: { updatedAt: 'desc' },
        take: parseInt(limit as string) / 2,
        skip: parseInt(offset as string)
      })

      // Get reverse request activities
      const reverseRequestLogs = await prisma.reverseRequest.findMany({
        include: {
          serviceCenter: { select: { id: true, name: true, email: true } },
          part: { select: { id: true, code: true, name: true } }
        },
        orderBy: { updatedAt: 'desc' },
        take: parseInt(limit as string) / 2,
        skip: parseInt(offset as string)
      })

      // Get purchase order activities
      const purchaseOrderLogs = await prisma.purchaseOrder.findMany({
        include: {
          distributor: { select: { id: true, name: true, email: true } },
          brand: { select: { id: true, name: true, email: true } },
          items: {
            include: {
              part: { select: { id: true, code: true, name: true } }
            }
          }
        },
        orderBy: { updatedAt: 'desc' },
        take: parseInt(limit as string) / 3,
        skip: parseInt(offset as string)
      })

      // Format logs for consistent structure
      const formattedLogs = [
        ...shipmentLogs.map(log => ({
          id: log.id,
          type: 'SHIPMENT',
          action: `Shipment ${log.status.toLowerCase()}`,
          entity: 'Shipment',
          entityId: log.id,
          details: {
            brand: log.brand?.name || 'Unknown Brand',
            serviceCenter: log.serviceCenter?.name || 'Unknown Service Center',
            numBoxes: log.numBoxes,
            status: log.status
          },
          user: log.brand || { id: 'unknown', name: 'Unknown Brand', email: 'unknown@example.com' },
          timestamp: log.updatedAt,
          createdAt: log.createdAt
        })),
        ...reverseRequestLogs.map(log => ({
          id: log.id,
          type: 'REVERSE_REQUEST',
          action: `Reverse request ${log.status.toLowerCase()}`,
          entity: 'Reverse Request',
          entityId: log.id,
          details: {
            serviceCenter: log.serviceCenter?.name || 'Unknown Service Center',
            part: log.part?.name || 'Unknown Part',
            reason: log.reason,
            status: log.status,
            quantity: log.quantity
          },
          user: log.serviceCenter || { id: 'unknown', name: 'Unknown Service Center', email: 'unknown@example.com' },
          timestamp: log.updatedAt,
          createdAt: log.createdAt
        })),
        ...purchaseOrderLogs.map(log => ({
          id: log.id,
          type: 'PURCHASE_ORDER',
          action: `Purchase order ${log.status.toLowerCase()}`,
          entity: 'Purchase Order',
          entityId: log.id,
          details: {
            distributor: log.distributor?.name || 'Unknown Distributor',
            brand: log.brand?.name || 'Unknown Brand',
            orderNumber: log.orderNumber,
            totalAmount: log.totalAmount,
            status: log.status,
            itemCount: log.items?.length || 0,
            parts: log.items?.map(item => item.part?.name || 'Unknown Part').join(', ') || 'No parts'
          },
          user: log.distributor || { id: 'unknown', name: 'Unknown Distributor', email: 'unknown@example.com' },
          timestamp: log.updatedAt,
          createdAt: log.createdAt
        }))
      ]

      // Sort by timestamp and apply filters
      let filteredLogs = formattedLogs.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )

      if (type && type !== 'ALL') {
        filteredLogs = filteredLogs.filter(log => log.type === type)
      }

      res.status(200).json({
        logs: filteredLogs.slice(0, parseInt(limit as string)),
        total: filteredLogs.length,
        hasMore: filteredLogs.length > parseInt(limit as string)
      })
    } catch (error) {
      console.error('Error fetching audit logs:', error)
      res.status(500).json({ error: 'Failed to fetch audit logs' })
    }
  } else {
    res.setHeader('Allow', ['GET'])
    res.status(405).end(`Method ${req.method} Not Allowed`)
  }
}