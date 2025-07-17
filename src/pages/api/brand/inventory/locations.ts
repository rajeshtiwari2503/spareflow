import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const user = await verifyToken(req);
    
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (user.role !== 'BRAND') {
      return res.status(403).json({ error: 'Access denied. Brand role required.' });
    }

    const brandId = req.query.brandId as string || user.id;

    if (req.method === 'GET') {
      // For now, return mock data since we don't have a locations table
      // In a real implementation, you would fetch from a locations table
      const locations = [
        {
          id: 'loc1',
          code: 'WH001',
          name: 'Main Warehouse',
          type: 'WAREHOUSE',
          zone: 'A',
          aisle: '01',
          rack: 'R1',
          shelf: 'S1',
          bin: 'B1',
          capacity: 1000,
          currentUtilization: 750,
          temperature: 25,
          humidity: 60,
          securityLevel: 'HIGH',
          accessRestricted: false,
          active: true,
          address: 'Main warehouse address, Industrial Area',
          coordinates: '28.7041,77.1025',
          manager: 'John Doe',
          contact: '+91-9876543210',
          notes: 'Primary storage location for all parts'
        },
        {
          id: 'loc2',
          code: 'ST001',
          name: 'Store Room',
          type: 'STORE',
          zone: 'B',
          aisle: '02',
          rack: 'R2',
          shelf: 'S2',
          bin: 'B2',
          capacity: 500,
          currentUtilization: 300,
          temperature: 22,
          humidity: 55,
          securityLevel: 'MEDIUM',
          accessRestricted: true,
          active: true,
          address: 'Store room, Ground floor',
          coordinates: '28.7041,77.1025',
          manager: 'Jane Smith',
          contact: '+91-9876543211',
          notes: 'Secondary storage for overflow items'
        },
        {
          id: 'loc3',
          code: 'QC001',
          name: 'Quality Control Area',
          type: 'QUARANTINE',
          zone: 'C',
          aisle: '03',
          rack: 'R3',
          shelf: 'S3',
          bin: 'B3',
          capacity: 100,
          currentUtilization: 25,
          temperature: 20,
          humidity: 50,
          securityLevel: 'HIGH',
          accessRestricted: true,
          active: true,
          address: 'QC Lab, First floor',
          coordinates: '28.7041,77.1025',
          manager: 'Quality Manager',
          contact: '+91-9876543212',
          notes: 'Quarantine area for quality inspection'
        },
        {
          id: 'loc4',
          code: 'TR001',
          name: 'Transit Hub',
          type: 'TRANSIT',
          zone: 'D',
          aisle: '04',
          rack: 'R4',
          shelf: 'S4',
          bin: 'B4',
          capacity: 200,
          currentUtilization: 150,
          temperature: 25,
          humidity: 60,
          securityLevel: 'MEDIUM',
          accessRestricted: false,
          active: true,
          address: 'Transit hub, Loading dock',
          coordinates: '28.7041,77.1025',
          manager: 'Transit Manager',
          contact: '+91-9876543213',
          notes: 'Temporary storage for in-transit items'
        }
      ];

      return res.status(200).json({
        success: true,
        data: locations
      });
    }

    if (req.method === 'POST') {
      const {
        code,
        name,
        type,
        zone,
        aisle,
        rack,
        shelf,
        bin,
        capacity,
        temperature,
        humidity,
        securityLevel,
        accessRestricted,
        address,
        coordinates,
        manager,
        contact,
        notes
      } = req.body;

      // Validate required fields
      if (!code || !name || !type) {
        return res.status(400).json({ 
          error: 'Missing required fields: code, name, type' 
        });
      }

      // For now, simulate adding a location
      // In a real implementation, you would insert into a locations table
      const newLocation = {
        id: `loc_${Date.now()}`,
        code,
        name,
        type,
        zone: zone || null,
        aisle: aisle || null,
        rack: rack || null,
        shelf: shelf || null,
        bin: bin || null,
        capacity: capacity || null,
        currentUtilization: 0,
        temperature: temperature || null,
        humidity: humidity || null,
        securityLevel: securityLevel || null,
        accessRestricted: accessRestricted || false,
        active: true,
        address: address || null,
        coordinates: coordinates || null,
        manager: manager || null,
        contact: contact || null,
        notes: notes || null,
        brandId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      return res.status(201).json({
        success: true,
        data: newLocation,
        message: 'Location added successfully'
      });
    }

    if (req.method === 'PUT') {
      const locationId = req.query.locationId as string;
      
      if (!locationId) {
        return res.status(400).json({ error: 'Location ID is required' });
      }

      const updateData = req.body;

      // For now, simulate updating a location
      // In a real implementation, you would update the locations table
      const updatedLocation = {
        id: locationId,
        ...updateData,
        updatedAt: new Date().toISOString()
      };

      return res.status(200).json({
        success: true,
        data: updatedLocation,
        message: 'Location updated successfully'
      });
    }

    if (req.method === 'DELETE') {
      const locationId = req.query.locationId as string;
      
      if (!locationId) {
        return res.status(400).json({ error: 'Location ID is required' });
      }

      // For now, simulate deleting a location
      // In a real implementation, you would soft delete or remove from locations table
      return res.status(200).json({
        success: true,
        message: 'Location deleted successfully'
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Locations API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}