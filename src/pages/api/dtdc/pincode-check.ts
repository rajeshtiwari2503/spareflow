import { NextApiRequest, NextApiResponse } from 'next';
import { checkPincodeServiceability } from '@/lib/dtdc-with-wallet';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      const { orgPincode, desPincode } = req.body;

      if (!orgPincode || !desPincode) {
        return res.status(400).json({ 
          error: 'Both origin and destination pincodes are required' 
        });
      }

      // Validate pincode format (6 digits)
      const pincodeRegex = /^\d{6}$/;
      if (!pincodeRegex.test(orgPincode) || !pincodeRegex.test(desPincode)) {
        return res.status(400).json({ 
          error: 'Invalid pincode format. Pincode must be 6 digits.' 
        });
      }

      const result = await checkPincodeServiceability({
        orgPincode,
        desPincode
      });

      res.status(200).json(result);

    } catch (error) {
      console.error('Error checking pincode serviceability:', error);
      res.status(500).json({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}