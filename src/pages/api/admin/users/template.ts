import { NextApiRequest, NextApiResponse } from 'next'
import { verifyToken } from '@/lib/auth'

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

    if (req.method === 'GET') {
      // CSV template for bulk user import
      const csvTemplate = `name,email,phone,role,status,walletBalance
John Doe,john.doe@example.com,+91-9876543210,CUSTOMER,ACTIVE,0
Jane Smith,jane.smith@example.com,+91-9876543211,BRAND,ACTIVE,5000
Mike Johnson,mike.johnson@example.com,+91-9876543212,DISTRIBUTOR,ACTIVE,2000
Sarah Wilson,sarah.wilson@example.com,+91-9876543213,SERVICE_CENTER,ACTIVE,1000`

      res.setHeader('Content-Type', 'text/csv')
      res.setHeader('Content-Disposition', 'attachment; filename="user_import_template.csv"')
      return res.status(200).send(csvTemplate)
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    console.error('Template download API error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}