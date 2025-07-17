import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { verifyAuth } from '@/lib/auth'
import bcrypt from 'bcryptjs'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Authentication check
    const authResult = await verifyAuth(req)
    if (!authResult.success || !authResult.user || authResult.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Access denied' })
    }
    
    const user = authResult.user

    if (req.method === 'GET') {
      // Check if stats are requested
      if (req.query.stats === 'true') {
        const totalUsers = await prisma.user.count()
        
        const roleDistribution = await prisma.user.groupBy({
          by: ['role'],
          _count: { role: true }
        })

        const roleStats = {
          BRAND: 0,
          DISTRIBUTOR: 0,
          SERVICE_CENTER: 0,
          CUSTOMER: 0
        }

        roleDistribution.forEach(item => {
          roleStats[item.role as keyof typeof roleStats] = item._count.role
        })

        // Get active users (last 30 days)
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
        
        const activeUsers = await prisma.user.count({
          where: {
            updatedAt: {
              gte: thirtyDaysAgo
            }
          }
        })

        // Get new registrations (last 30 days)
        const newRegistrations = await prisma.user.count({
          where: {
            createdAt: {
              gte: thirtyDaysAgo
            }
          }
        })

        // Account status distribution
        const activeCount = await prisma.user.count({
          where: {
            NOT: {
              name: {
                contains: '[DEACTIVATED]'
              }
            }
          }
        })

        const inactiveCount = await prisma.user.count({
          where: {
            name: {
              contains: '[DEACTIVATED]'
            }
          }
        })

        // Mock geographic distribution (you can implement this based on user profiles)
        const geographicDistribution = [
          { location: 'Mumbai', count: Math.floor(totalUsers * 0.2) },
          { location: 'Delhi', count: Math.floor(totalUsers * 0.15) },
          { location: 'Bangalore', count: Math.floor(totalUsers * 0.12) },
          { location: 'Chennai', count: Math.floor(totalUsers * 0.1) },
          { location: 'Pune', count: Math.floor(totalUsers * 0.08) },
          { location: 'Others', count: totalUsers - Math.floor(totalUsers * 0.65) }
        ]

        const stats = {
          totalUsers,
          activeUsers,
          newRegistrations,
          roleDistribution: roleStats,
          geographicDistribution,
          accountStatus: {
            active: activeCount,
            inactive: inactiveCount,
            suspended: 0 // You can implement suspension logic
          }
        }

        return res.status(200).json({ stats })
      }

      const users = await prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: {
          createdAt: 'desc'
        }
      })

      // Add status and other fields for compatibility
      const usersWithStatus = users.map(user => ({
        ...user,
        status: user.name.includes('[DEACTIVATED]') ? 'INACTIVE' : 'ACTIVE',
        lastLogin: null, // Mock data - you can implement this later
        walletBalance: 0, // Mock data - you can implement this later
        isVerified: true, // Mock data - you can implement this later
        profileComplete: true, // Mock data
        totalOrders: Math.floor(Math.random() * 50), // Mock data
        totalSpent: Math.floor(Math.random() * 10000), // Mock data
        location: ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Pune'][Math.floor(Math.random() * 5)], // Mock data
        companyName: user.role === 'BRAND' ? `${user.name} Corp` : undefined // Mock data
      }))

      // Check if export is requested
      if (req.query.export === 'true') {
        const csvHeader = 'ID,Name,Email,Phone,Role,Status,Created At,Last Login,Wallet Balance,Verified,Total Orders,Total Spent,Location\n'
        const csvData = usersWithStatus.map(user => 
          `${user.id},"${user.name}","${user.email}","${user.phone || ''}","${user.role}","${user.status}","${user.createdAt}","${user.lastLogin || ''}","${user.walletBalance || 0}","${user.isVerified}","${user.totalOrders}","${user.totalSpent}","${user.location || ''}"`
        ).join('\n')
        
        return res.status(200).json({ csv: csvHeader + csvData })
      }

      return res.status(200).json({ users: usersWithStatus })
    }

    if (req.method === 'POST') {
      const { name, email, phone, role, status, walletBalance, sendWelcomeEmail } = req.body

      if (!name || !email || !role) {
        return res.status(400).json({ error: 'Name, email, and role are required' })
      }

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email }
      })

      if (existingUser) {
        return res.status(400).json({ error: 'User with this email already exists' })
      }

      // Generate a temporary password
      const tempPassword = 'temp_' + Math.random().toString(36).substring(7)
      const hashedPassword = await bcrypt.hash(tempPassword, 10)

      const user = await prisma.user.create({
        data: {
          name: status === 'INACTIVE' ? `[DEACTIVATED] ${name}` : name,
          email,
          phone: phone || null,
          role: role || 'CUSTOMER',
          password: hashedPassword,
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          createdAt: true,
        }
      })

      // Create wallet if needed
      if (walletBalance && walletBalance > 0) {
        if (role === 'BRAND') {
          await prisma.brandWallet.create({
            data: {
              brandId: user.id,
              balance: walletBalance,
              totalSpent: 0
            }
          })
        } else {
          await prisma.wallet.create({
            data: {
              userId: user.id,
              balance: walletBalance,
              totalEarned: 0,
              totalSpent: 0
            }
          })
        }
      }

      // Send welcome notification if requested
      if (sendWelcomeEmail) {
        await prisma.notification.create({
          data: {
            userId: user.id,
            title: 'Welcome to SpareFlow!',
            message: `Welcome to SpareFlow! Your account has been created successfully. Your temporary password is: ${tempPassword}. Please change it after your first login.`,
            type: 'WELCOME',
            createdAt: new Date()
          }
        })
      }

      // Log the user creation
      await prisma.activityLog.create({
        data: {
          userId: user.id,
          action: 'USER_CREATED',
          details: JSON.stringify({
            createdUserId: user.id,
            role: user.role,
            email: user.email
          }),
          createdAt: new Date()
        }
      })

      const userWithStatus = {
        ...user,
        status: user.name.includes('[DEACTIVATED]') ? 'INACTIVE' : 'ACTIVE',
        lastLogin: null,
        walletBalance: walletBalance || 0,
        isVerified: true,
        profileComplete: false,
        totalOrders: 0,
        totalSpent: 0,
        location: null,
        companyName: null
      }

      return res.status(201).json({ user: userWithStatus })
    }

    if (req.method === 'PUT') {
      const { id, action, name, email, phone, role, status, walletBalance, originalName } = req.body

      if (!id) {
        return res.status(400).json({ error: 'User ID is required' })
      }

      let updateData: any = {}
      let logAction = 'USER_UPDATED'

      if (action === 'approve') {
        updateData = {
          updatedAt: new Date()
        }
        logAction = 'USER_APPROVED'
      } else if (action === 'deactivate') {
        updateData = {
          name: `[DEACTIVATED] ${originalName || 'User'}`,
          updatedAt: new Date()
        }
        logAction = 'USER_DEACTIVATED'
      } else {
        // Regular update
        if (name) updateData.name = status === 'INACTIVE' ? `[DEACTIVATED] ${name}` : name
        if (email) updateData.email = email
        if (phone !== undefined) updateData.phone = phone
        if (role) updateData.role = role
        updateData.updatedAt = new Date()
      }

      const user = await prisma.user.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        }
      })

      // Log the user update
      await prisma.activityLog.create({
        data: {
          userId: user.id,
          action: logAction,
          details: JSON.stringify({
            targetUserId: id,
            changes: updateData,
            action
          }),
          createdAt: new Date()
        }
      })

      const userWithStatus = {
        ...user,
        status: user.name.includes('[DEACTIVATED]') ? 'INACTIVE' : 'ACTIVE',
        lastLogin: null,
        walletBalance: walletBalance || 0,
        isVerified: true,
        profileComplete: true,
        totalOrders: Math.floor(Math.random() * 50),
        totalSpent: Math.floor(Math.random() * 10000),
        location: ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Pune'][Math.floor(Math.random() * 5)],
        companyName: user.role === 'BRAND' ? `${user.name} Corp` : undefined
      }

      return res.status(200).json({ user: userWithStatus })
    }

    if (req.method === 'DELETE') {
      const { id } = req.body

      if (!id) {
        return res.status(400).json({ error: 'User ID is required' })
      }

      // Log the user deletion before deleting
      await prisma.activityLog.create({
        data: {
          userId: user.id,
          action: 'USER_DELETED',
          details: JSON.stringify({
            deletedUserId: id
          }),
          createdAt: new Date()
        }
      })

      await prisma.user.delete({
        where: { id }
      })

      return res.status(200).json({ message: 'User deleted successfully' })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    console.error('Admin users API error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}