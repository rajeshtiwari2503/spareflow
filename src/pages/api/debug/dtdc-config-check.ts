import { NextApiRequest, NextApiResponse } from 'next';
import { verifyAuth } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify authentication - only SUPER_ADMIN can access this
    const authResult = await verifyAuth(req);
    if (!authResult.success || !authResult.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (authResult.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Only super admin can access this endpoint' });
    }

    // Check all DTDC-related environment variables
    const dtdcConfig = {
      DTDC_API_KEY: process.env.DTDC_API_KEY ? `${process.env.DTDC_API_KEY.substring(0, 8)}***` : 'NOT_SET',
      DTDC_API_KEY_NEW: process.env.DTDC_API_KEY_NEW ? `${process.env.DTDC_API_KEY_NEW.substring(0, 8)}***` : 'NOT_SET',
      DTDC_CUSTOMER_ID: process.env.DTDC_CUSTOMER_ID ? `${process.env.DTDC_CUSTOMER_ID.substring(0, 4)}***` : 'NOT_SET',
      DTDC_CUSTOMER_CODE: process.env.DTDC_CUSTOMER_CODE ? `${process.env.DTDC_CUSTOMER_CODE.substring(0, 4)}***` : 'NOT_SET',
      DTDC_SERVICE_TYPE: process.env.DTDC_SERVICE_TYPE || 'NOT_SET',
      DTDC_TRACKING_ACCESS_TOKEN: process.env.DTDC_TRACKING_ACCESS_TOKEN ? `${process.env.DTDC_TRACKING_ACCESS_TOKEN.substring(0, 8)}***` : 'NOT_SET',
      DTDC_TRACKING_USERNAME: process.env.DTDC_TRACKING_USERNAME || 'NOT_SET',
      DTDC_TRACKING_PASSWORD: process.env.DTDC_TRACKING_PASSWORD ? '***' : 'NOT_SET',
      NODE_ENV: process.env.NODE_ENV || 'NOT_SET'
    };

    // Test basic DTDC API connectivity (without authentication)
    let connectivityTest = { success: false, error: 'Not tested' };
    
    try {
      const testResponse = await fetch('https://pxapi.dtdc.in/health', {
        method: 'GET',
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });
      
      connectivityTest = {
        success: testResponse.ok,
        error: testResponse.ok ? null : `HTTP ${testResponse.status}: ${testResponse.statusText}`
      };
    } catch (error) {
      connectivityTest = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown connectivity error'
      };
    }

    // Determine which API key would be used
    const activeApiKey = process.env.DTDC_API_KEY_NEW || process.env.DTDC_API_KEY;
    const activeCustomerCode = process.env.DTDC_CUSTOMER_CODE || process.env.DTDC_CUSTOMER_ID;
    
    const analysis = {
      configurationStatus: {
        hasApiKey: !!activeApiKey,
        hasCustomerCode: !!activeCustomerCode,
        hasTrackingCredentials: !!(process.env.DTDC_TRACKING_ACCESS_TOKEN || (process.env.DTDC_TRACKING_USERNAME && process.env.DTDC_TRACKING_PASSWORD)),
        isDevelopmentMode: process.env.NODE_ENV === 'development' || !activeApiKey
      },
      recommendations: []
    };

    // Generate recommendations
    if (!activeApiKey) {
      analysis.recommendations.push('❌ CRITICAL: No DTDC API key configured. Set DTDC_API_KEY_NEW or DTDC_API_KEY');
    }
    
    if (!activeCustomerCode) {
      analysis.recommendations.push('❌ CRITICAL: No DTDC customer code configured. Set DTDC_CUSTOMER_CODE or DTDC_CUSTOMER_ID');
    }
    
    if (!process.env.DTDC_TRACKING_ACCESS_TOKEN && !(process.env.DTDC_TRACKING_USERNAME && process.env.DTDC_TRACKING_PASSWORD)) {
      analysis.recommendations.push('⚠️ WARNING: No DTDC tracking credentials configured');
    }
    
    if (analysis.configurationStatus.isDevelopmentMode) {
      analysis.recommendations.push('ℹ️ INFO: Running in development mode - using mock DTDC responses');
    }
    
    if (analysis.configurationStatus.hasApiKey && analysis.configurationStatus.hasCustomerCode && !analysis.configurationStatus.isDevelopmentMode) {
      analysis.recommendations.push('✅ GOOD: Production DTDC configuration appears complete');
    }

    return res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      dtdcConfiguration: dtdcConfig,
      connectivityTest,
      analysis,
      nextSteps: [
        'If API key is configured but getting 401 errors, verify the key is correct and active',
        'Check with DTDC support if the API key has proper permissions',
        'Ensure the customer code matches the API key',
        'Test with a simple AWB generation request'
      ]
    });

  } catch (error) {
    console.error('❌ DTDC config check failed:', error);
    
    return res.status(500).json({
      error: 'DTDC configuration check failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
}