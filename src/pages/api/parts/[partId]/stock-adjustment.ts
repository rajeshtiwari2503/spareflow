import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const user = await verifyToken(req);
    
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const partId = req.query.partId as string;

    if (!partId) {
      return res.status(400).json({ error: 'Part ID is required' });
    }

    if (req.method === 'POST') {
      if (user.role !== 'BRAND' && user.role !== 'SUPER_ADMIN') {
        return res.status(403).json({ error: 'Access denied. Brand role required.' });
      }

      const {
        brandId,
        locationId,
        adjustmentType,
        quantity,
        reason,
        notes
      } = req.body;

      // Validate required fields
      if (!brandId || !adjustmentType || !quantity || !reason) {
        return res.status(400).json({ 
          error: 'Missing required fields: brandId, adjustmentType, quantity, reason' 
        });
      }

      // Validate adjustment type
      if (!['ADD', 'REMOVE', 'SET'].includes(adjustmentType)) {
        return res.status(400).json({ 
          error: 'Invalid adjustment type. Must be ADD, REMOVE, or SET' 
        });
      }

      // Validate quantity
      const adjustmentQuantity = parseInt(quantity);
      if (isNaN(adjustmentQuantity) || adjustmentQuantity < 0) {
        return res.status(400).json({ 
          error: 'Quantity must be a positive number' 
        });
      }

      // Check if part exists and user has permission
      const part = await prisma.part.findUnique({
        where: { id: partId }
      });

      if (!part) {
        return res.status(404).json({ error: 'Part not found' });
      }

      if (user.role === 'BRAND' && part.brandId !== user.id) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Get or create inventory record
      let inventory = await prisma.brandInventory.findFirst({
        where: {
          brandId,
          partId
        }
      });

      if (!inventory) {
        // Create initial inventory record
        inventory = await prisma.brandInventory.create({
          data: {
            brandId,
            partId,
            onHandQuantity: 0,
            availableQuantity: 0,
            reservedQuantity: 0,
            defectiveQuantity: 0,
            quarantineQuantity: 0,
            inTransitQuantity: 0,
            lastUpdated: new Date()
          }
        });
      }

      // Calculate new quantity based on adjustment type
      let newQuantity: number;
      let actualAdjustment: number;

      switch (adjustmentType) {
        case 'ADD':
          newQuantity = inventory.onHandQuantity + adjustmentQuantity;
          actualAdjustment = adjustmentQuantity;
          break;
        case 'REMOVE':
          newQuantity = Math.max(0, inventory.onHandQuantity - adjustmentQuantity);
          actualAdjustment = inventory.onHandQuantity - newQuantity;
          break;
        case 'SET':
          newQuantity = adjustmentQuantity;
          actualAdjustment = newQuantity - inventory.onHandQuantity;
          break;
        default:
          return res.status(400).json({ error: 'Invalid adjustment type' });
      }

      // Update inventory in a transaction
      const result = await prisma.$transaction(async (tx) => {
        // Update inventory
        const updatedInventory = await tx.brandInventory.update({
          where: { id: inventory!.id },
          data: {
            onHandQuantity: newQuantity,
            availableQuantity: Math.max(0, newQuantity - inventory!.reservedQuantity - inventory!.defectiveQuantity - inventory!.quarantineQuantity),
            lastUpdated: new Date(),
            ...(adjustmentType === 'ADD' && { lastRestocked: new Date() })
          }
        });

        // Create inventory ledger entry
        const ledgerEntry = await tx.inventoryLedger.create({
          data: {
            brandId,
            partId,
            actionType: adjustmentType === 'ADD' ? 'ADD' : adjustmentType === 'REMOVE' ? 'CONSUMED' : 'ADJUSTMENT',
            quantity: Math.abs(actualAdjustment),
            source: 'BRAND',
            destination: 'BRAND',
            referenceNote: `${adjustmentType}: ${reason}${notes ? ` - ${notes}` : ''}`,
            createdBy: user.id,
            unitCost: null,
            totalValue: null
          }
        });

        return { updatedInventory, ledgerEntry };
      });

      return res.status(200).json({
        success: true,
        data: {
          inventory: result.updatedInventory,
          ledgerEntry: result.ledgerEntry,
          adjustment: {
            type: adjustmentType,
            quantity: actualAdjustment,
            previousQuantity: inventory.onHandQuantity,
            newQuantity: newQuantity
          }
        },
        message: 'Stock adjustment recorded successfully'
      });
    }

    if (req.method === 'GET') {
      // Get stock adjustment history for this part
      const adjustments = await prisma.inventoryLedger.findMany({
        where: {
          partId,
          actionType: { in: ['ADD', 'CONSUMED', 'ADJUSTMENT'] }
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: {
          part: {
            select: {
              code: true,
              name: true
            }
          }
        }
      });

      return res.status(200).json({
        success: true,
        data: adjustments
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Stock adjustment API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}