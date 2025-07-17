import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { verifyAuth } from '@/lib/auth'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Authentication check
    const authResult = await verifyAuth(req)
    if (!authResult.success || !authResult.user || authResult.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Access denied' })
    }
    
    const user = authResult.user

    if (req.method === 'GET') {
      // Get platform statistics for super admin dashboard
      const [
        totalUsers,
        totalBrands,
        totalDistributors,
        totalServiceCenters,
        totalCustomers,
        totalParts,
        totalShipments,
        totalPurchaseOrders,
        totalCustomerOrders,
        totalReverseRequests,
        totalWalletTransactions,
        recentUsers,
        recentShipments,
        recentCustomerOrders
      ] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { role: 'BRAND' } }),
        prisma.user.count({ where: { role: 'DISTRIBUTOR' } }),
        prisma.user.count({ where: { role: 'SERVICE_CENTER' } }),
        prisma.user.count({ where: { role: 'CUSTOMER' } }),
        prisma.part.count(),
        prisma.shipment.count(),
        prisma.purchaseOrder.count(),
        prisma.customerOrder.count(),
        prisma.reverseRequest.count(),
        prisma.walletTransaction.count(),
        prisma.user.findMany({
          take: 10,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.shipment.findMany({
          take: 10,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.customerOrder.findMany({
          take: 10,
          orderBy: { createdAt: 'desc' },
        }),
      ])

      // Calculate revenue from wallet transactions
      const walletTransactions = await prisma.walletTransaction.findMany({
        where: { type: 'CREDIT' }
      })
      const totalRevenue = walletTransactions.reduce((sum, txn) => sum + txn.amount, 0)

      // Calculate active users (users created in last 30 days)
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      const activeUsers = await prisma.user.count({
        where: {
          createdAt: {
            gte: thirtyDaysAgo
          }
        }
      })

      const dashboardStats = {
        totalUsers,
        totalRevenue,
        totalOrders: totalCustomerOrders + totalPurchaseOrders,
        totalParts,
        activeUsers,
        pendingOrders: Math.floor(totalCustomerOrders * 0.1), // Mock 10% pending
        lowStockAlerts: Math.floor(totalParts * 0.05), // Mock 5% low stock
        systemHealth: 99.9, // Mock system health
      }

      const dashboardData = {
        ...dashboardStats,
        statistics: {
          totalUsers,
          totalBrands,
          totalDistributors,
          totalServiceCenters,
          totalCustomers,
          totalParts,
          totalShipments,
          totalPurchaseOrders,
          totalCustomerOrders,
          totalReverseRequests,
          totalWalletTransactions,
          totalRevenue,
          activeUsers,
        },
        recentActivity: {
          recentUsers,
          recentShipments,
          recentCustomerOrders,
        },
      }

      res.status(200).json(dashboardData)
    } else {
      res.setHeader('Allow', ['GET'])
      res.status(405).end(`Method ${req.method} Not Allowed`)
    }
  } catch (error) {
    console.error('Error fetching admin dashboard data:', error)
    res.status(500).json({ error: 'Failed to fetch dashboard data' })
  }
}