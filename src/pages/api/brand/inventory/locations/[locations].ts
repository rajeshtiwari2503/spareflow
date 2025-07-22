import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma'; // adjust if needed

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const locationId = req.query.locations as string;
// console.log("req.query.locationId",req.query.locations);

  if (req.method === 'PUT') {
    const updateData = req.body;

    if (!locationId) {
      return res.status(400).json({ error: 'Location ID is required' });
    }

    try {
      const existingLocation = await prisma.location.findUnique({
        where: { id: locationId },
      });

      if (!existingLocation) {
        return res.status(404).json({ error: 'Location not found' });
      }

      const updatedLocation = await prisma.location.update({
        where: { id: locationId },
        data: updateData,
      });

      return res.status(200).json({
        success: true,
        data: updatedLocation,
        message: 'Location updated successfully',
      });
    } catch (error) {
      console.error('Error updating location:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  } else {
    res.setHeader('Allow', ['PUT']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}
