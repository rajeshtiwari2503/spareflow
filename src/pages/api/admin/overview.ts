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
      const now = new Date()
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

      // System Health Indicators - using safe queries that match the schema
      const [
        totalUsers,
        activeUsersToday,
        totalTransactions,
        recentTransactions,
        totalShipments,
        activeShipments,
        totalParts,
        lowStockParts,
        totalWalletBalance,
        totalRevenue,
        systemErrors,
        failedLogins,
        pendingApprovals,
        criticalAlerts
      ] = await Promise.all([
        // Total users
        prisma.user.count().catch(() => 0),
        
        // Active users (updated today)
        prisma.user.count({
          where: {
            updatedAt: {
              gte: oneDayAgo
            }
          }
        }).catch(() => 0),
        
        // Total transactions
        prisma.walletTransaction.count().catch(() => 0),
        
        // Recent transactions (last 24h)
        prisma.walletTransaction.count({
          where: {
            createdAt: {
              gte: oneDayAgo
            }
          }
        }).catch(() => 0),
        
        // Total shipments
        prisma.shipment.count().catch(() => 0),
        
        // Active shipments (not delivered)
        prisma.shipment.count({
          where: {
            status: {
              not: 'DELIVERED'
            }
          }
        }).catch(() => 0),
        
        // Total parts
        prisma.part.count().catch(() => 0),
        
        // Low stock parts (count parts with stock <= 5)
        prisma.part.count({
          where: {
            stockQuantity: {
              lte: 5
            }
          }
        }).catch(() => 0),
        
        // Total wallet balance from BrandWallet
        prisma.brandWallet.aggregate({
          _sum: {
            balance: true
          }
        }).catch(() => ({ _sum: { balance: 0 } })),
        
        // Total revenue (sum of all debit transactions)
        prisma.walletTransaction.aggregate({
          where: {
            type: 'DEBIT'
          },
          _sum: {
            amount: true
          }
        }).catch(() => ({ _sum: { amount: 0 } })),
        
        // System errors (mock - in real implementation, fetch from error logs)
        Promise.resolve(Math.floor(Math.random() * 10)),
        
        // Failed logins (mock - in real implementation, fetch from auth logs)
        Promise.resolve(Math.floor(Math.random() * 20)),
        
        // Pending approvals - using status field from schema
        prisma.part.count({
          where: {
            status: 'draft'
          }
        }).catch(() => 0),
        
        // Critical alerts (mock - in real implementation, fetch from monitoring system)
        Promise.resolve(Math.floor(Math.random() * 3))
      ])

      // Calculate metrics
      const transactionVolume = recentTransactions
      const errorRate = totalTransactions > 0 ? (systemErrors / totalTransactions) * 100 : 0
      const responseTime = 120 + Math.floor(Math.random() * 50) // Mock response time 120-170ms
      
      // Recent activity - using safe queries
      const [recentUsers, recentShipments, recentOrders, recentAlerts] = await Promise.all([
        prisma.user.findMany({
          take: 5,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            createdAt: true
          }
        }).catch(() => []),
        
        prisma.shipment.findMany({
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: {
            brand: {
              select: { name: true }
            }
          }
        }).catch(() => []),
        
        prisma.customerOrder.findMany({
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: {
            customer: {
              select: { name: true }
            }
          }
        }).catch(() => []),
        
        // Mock recent alerts
        Promise.resolve([
          {
            id: '1',
            type: 'SECURITY',
            title: 'Multiple failed login attempts',
            message: 'User attempted to login 5 times unsuccessfully',
            severity: 'HIGH',
            timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString()
          },
          {
            id: '2',
            type: 'PERFORMANCE',
            title: 'High API response time',
            message: 'Average response time exceeded 200ms threshold',
            severity: 'MEDIUM',
            timestamp: new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString()
          },
          {
            id: '3',
            type: 'SYSTEM',
            title: 'Low stock alert',
            message: `${lowStockParts} parts are below minimum stock level`,
            severity: 'LOW',
            timestamp: new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString()
          }
        ])
      ])

      // User distribution
      const userDistribution = await prisma.user.groupBy({
        by: ['role'],
        _count: {
          role: true
        }
      }).catch(() => [])

      const overviewData = {
        systemHealth: {
          systemStatus: errorRate < 1 ? 'HEALTHY' : errorRate < 5 ? 'WARNING' : 'CRITICAL',
          activeUsers: activeUsersToday,
          transactionVolume,
          errorRate: parseFloat(errorRate.toFixed(2)),
          responseTime,
          databaseHealth: 'HEALTHY' // Mock - in real implementation, check DB performance
        },
        
        criticalAlerts: {
          securityAlerts: Math.floor(Math.random() * 3),
          systemErrors: systemErrors,
          performanceWarnings: responseTime > 150 ? 1 : 0,
          backupStatus: 'SUCCESS', // Mock
          integrationIssues: 0 // Mock
        },
        
        quickStats: {
          totalUsers,
          totalRevenue: totalRevenue._sum?.amount || 0,
          totalWalletBalance: totalWalletBalance._sum?.balance || 0,
          activeShipments,
          totalParts,
          lowStockParts,
          pendingApprovals,
          failedLogins
        },
        
        userDistribution: userDistribution.reduce((acc, item) => {
          acc[item.role] = item._count.role
          return acc
        }, {} as Record<string, number>),
        
        recentActivity: {
          users: recentUsers,
          shipments: recentShipments,
          orders: recentOrders,
          alerts: recentAlerts
        },
        
        performanceMetrics: {
          systemUptime: 99.9, // Mock
          apiResponseTime: responseTime,
          databaseResponseTime: 45, // Mock
          memoryUsage: 68, // Mock
          cpuUsage: 42, // Mock
          diskUsage: 34, // Mock
          networkLatency: 12 // Mock
        },
        
        financialOverview: {
          totalRevenue: totalRevenue._sum?.amount || 0,
          totalWalletBalance: totalWalletBalance._sum?.balance || 0,
          monthlyGrowth: 15.2, // Mock
          transactionCount: totalTransactions,
          averageTransactionValue: totalTransactions > 0 ? (totalRevenue._sum?.amount || 0) / totalTransactions : 0
        }
      }

      res.status(200).json(overviewData)
    } else {
      res.setHeader('Allow', ['GET'])
      res.status(405).end(`Method ${req.method} Not Allowed`)
    }
  } catch (error) {
    console.error('Error fetching admin overview data:', error)
    res.status(500).json({ 
      error: 'Failed to fetch overview data',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}