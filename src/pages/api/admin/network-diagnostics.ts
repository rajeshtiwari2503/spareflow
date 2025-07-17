import { NextApiRequest, NextApiResponse } from 'next'
import { runNetworkDiagnostics } from '@/lib/dtdc-enhanced'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).end(`Method ${req.method} Not Allowed`)
  }

  try {
    console.log('Running network diagnostics...')
    
    const diagnostics = await runNetworkDiagnostics()
    
    console.log('Network diagnostics completed:', diagnostics)
    
    res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      diagnostics,
      environment: {
        nodeEnv: process.env.NODE_ENV,
        hasDtdcApiKey: !!process.env.DTDC_API_KEY_NEW,
        hasDtdcCustomerCode: !!process.env.DTDC_CUSTOMER_CODE,
        dtdcServiceType: process.env.DTDC_SERVICE_TYPE || 'B2C SMART EXPRESS'
      }
    })

  } catch (error) {
    console.error('Network diagnostics error:', error)
    res.status(500).json({ 
      success: false,
      error: 'Failed to run network diagnostics',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}