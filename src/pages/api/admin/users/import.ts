import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import bcrypt from 'bcryptjs'
import formidable from 'formidable'
import fs from 'fs'
import csv from 'csv-parser'

export const config = {
  api: {
    bodyParser: false,
  },
}

interface ImportUser {
  name: string
  email: string
  phone?: string
  role: string
  status?: string
  walletBalance?: number
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Authentication check
    const token = req.headers.authorization?.replace('Bearer ', '')
    if (!token) {
      return res.status(401).json({ error: 'No token provided' })
    }

    const decoded = verifyToken(token)
    if (!decoded || decoded.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Access denied' })
    }

    if (req.method === 'POST') {
      const form = formidable({
        maxFileSize: 10 * 1024 * 1024, // 10MB
      })

      const [fields, files] = await form.parse(req)
      const file = Array.isArray(files.file) ? files.file[0] : files.file

      if (!file) {
        return res.status(400).json({ error: 'No file uploaded' })
      }

      const users: ImportUser[] = []
      const errors: string[] = []
      let lineNumber = 0

      // Parse CSV file
      await new Promise((resolve, reject) => {
        fs.createReadStream(file.filepath)
          .pipe(csv())
          .on('data', (data) => {
            lineNumber++
            try {
              // Validate required fields
              if (!data.name || !data.email || !data.role) {
                errors.push(`Line ${lineNumber}: Missing required fields (name, email, role)`)
                return
              }

              // Validate email format
              const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
              if (!emailRegex.test(data.email)) {
                errors.push(`Line ${lineNumber}: Invalid email format`)
                return
              }

              // Validate role
              const validRoles = ['BRAND', 'DISTRIBUTOR', 'SERVICE_CENTER', 'CUSTOMER']
              if (!validRoles.includes(data.role)) {
                errors.push(`Line ${lineNumber}: Invalid role. Must be one of: ${validRoles.join(', ')}`)
                return
              }

              users.push({
                name: data.name.trim(),
                email: data.email.trim().toLowerCase(),
                phone: data.phone?.trim() || undefined,
                role: data.role.trim(),
                status: data.status?.trim() || 'ACTIVE',
                walletBalance: data.walletBalance ? parseFloat(data.walletBalance) : 0
              })
            } catch (error) {
              errors.push(`Line ${lineNumber}: Error parsing data - ${error}`)
            }
          })
          .on('end', resolve)
          .on('error', reject)
      })

      if (errors.length > 0 && users.length === 0) {
        return res.status(400).json({ 
          error: 'No valid users found in CSV',
          errors: errors.slice(0, 10) // Return first 10 errors
        })
      }

      let successCount = 0
      let errorCount = 0
      const importErrors: string[] = []

      // Process users in batches
      for (const user of users) {
        try {
          // Check if user already exists
          const existingUser = await prisma.user.findUnique({
            where: { email: user.email }
          })

          if (existingUser) {
            importErrors.push(`User with email ${user.email} already exists`)
            errorCount++
            continue
          }

          // Generate temporary password
          const tempPassword = 'temp_' + Math.random().toString(36).substring(7)
          const hashedPassword = await bcrypt.hash(tempPassword, 10)

          // Create user
          await prisma.user.create({
            data: {
              name: user.status === 'INACTIVE' ? `[DEACTIVATED] ${user.name}` : user.name,
              email: user.email,
              phone: user.phone,
              role: user.role as any,
              password: hashedPassword,
              createdAt: new Date(),
              updatedAt: new Date()
            }
          })

          successCount++
        } catch (error) {
          console.error(`Error creating user ${user.email}:`, error)
          importErrors.push(`Failed to create user ${user.email}: ${error}`)
          errorCount++
        }
      }

      // Log the import activity
      await prisma.activityLog.create({
        data: {
          userId: decoded.userId,
          action: 'BULK_USER_IMPORT',
          details: JSON.stringify({
            totalProcessed: users.length,
            successCount,
            errorCount,
            fileName: file.originalFilename
          }),
          createdAt: new Date()
        }
      })

      // Clean up uploaded file
      fs.unlinkSync(file.filepath)

      return res.status(200).json({
        success: true,
        message: `Import completed: ${successCount} users created, ${errorCount} errors`,
        results: {
          success: successCount,
          errors: errorCount,
          totalProcessed: users.length
        },
        importErrors: importErrors.slice(0, 10) // Return first 10 import errors
      })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    console.error('Import users API error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}