import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const user = await verifyToken(req);
    
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (req.method === 'GET') {
      const brandId = req.query.brandId as string;
      
      // If brandId is provided and user is BRAND, filter by brandId
      // If user is BRAND but no brandId provided, use user.id
      // For other roles, return all parts they have access to
      let whereClause: any = {};
      
      if (user.role === 'BRAND') {
        whereClause.brandId = brandId || user.id;
      } else if (user.role === 'SUPER_ADMIN') {
        // Super admin can see all parts
        if (brandId) {
          whereClause.brandId = brandId;
        }
      } else {
        // For other roles, implement appropriate access control
        whereClause.isActive = true;
      }

      const parts = await prisma.part.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        include: {
          brand: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      return res.status(200).json({
        success: true,
        data: parts
      });
    }

    if (req.method === 'POST') {
      if (user.role !== 'BRAND' && user.role !== 'SUPER_ADMIN') {
        return res.status(403).json({ error: 'Access denied. Brand role required.' });
      }

      const {
        brandId,
        code,
        name,
        description,
        partNumber,
        category,
        subCategory,
        price,
        costPrice,
        weight,
        length,
        breadth,
        height,
        minStockLevel,
        maxStockLevel,
        reorderPoint,
        reorderQty,
        warranty,
        specifications,
        tags,
        featured,
        isActive,
        // Media fields
        imageUrl,
        imageUrls,
        diyVideoUrl,
        installationVideos,
        technicalDrawings,
        // Enhanced AI-optimized fields
        problemKeywords,
        symptoms,
        compatibleAppliances,
        installationDifficulty,
        commonFailureReasons,
        troubleshootingSteps,
        relatedParts,
        urgencyLevel,
        customerDescription,
        technicalSpecs,
        safetyWarnings,
        maintenanceInterval,
        lifespan,
        environmentalConditions,
        // SEO fields
        seoTitle,
        seoDescription
      } = req.body;

      // Validate required fields
      if (!code || !name || price === undefined) {
        return res.status(400).json({ 
          error: 'Missing required fields: code, name, price' 
        });
      }

      // Use provided brandId or user.id for BRAND role
      const finalBrandId = brandId || (user.role === 'BRAND' ? user.id : null);
      
      if (!finalBrandId) {
        return res.status(400).json({ error: 'Brand ID is required' });
      }

      // Check if part code already exists for this brand
      const existingPart = await prisma.part.findFirst({
        where: {
          brandId: finalBrandId,
          code: code
        }
      });

      if (existingPart) {
        return res.status(400).json({ 
          error: 'Part code already exists for this brand' 
        });
      }

      // Combine all specifications into a comprehensive format for AI search
      const enhancedSpecifications = [
        specifications,
        technicalSpecs && `Technical Specs: ${technicalSpecs}`,
        problemKeywords && `Problem Keywords: ${problemKeywords}`,
        symptoms && `Symptoms: ${symptoms}`,
        compatibleAppliances && `Compatible Appliances: ${compatibleAppliances}`,
        commonFailureReasons && `Failure Reasons: ${commonFailureReasons}`,
        troubleshootingSteps && `Troubleshooting: ${troubleshootingSteps}`,
        customerDescription && `Customer Description: ${customerDescription}`,
        safetyWarnings && `Safety: ${safetyWarnings}`,
        environmentalConditions && `Environment: ${environmentalConditions}`,
        relatedParts && `Related Parts: ${relatedParts}`,
        seasonalDemand && `Seasonal: ${seasonalDemand}`,
        maintenanceInterval && `Maintenance: ${maintenanceInterval}`,
        lifespan && `Lifespan: ${lifespan}`,
        installationDifficulty && `Installation: ${installationDifficulty}`,
        urgencyLevel && `Urgency: ${urgencyLevel}`
      ].filter(Boolean).join('\n\n');

      // Enhanced tags for better searchability
      const enhancedTags = [
        tags,
        problemKeywords,
        compatibleAppliances,
        category,
        subCategory
      ].filter(Boolean).join(', ');

      const newPart = await prisma.part.create({
        data: {
          brandId: finalBrandId,
          code,
          name,
          description: description || null,
          partNumber: partNumber || null,
          category: category || null,
          subCategory: subCategory || null,
          price: parseFloat(price),
          costPrice: costPrice ? parseFloat(costPrice) : null,
          weight: weight ? parseFloat(weight) : null,
          length: length ? parseFloat(length) : null,
          breadth: breadth ? parseFloat(breadth) : null,
          height: height ? parseFloat(height) : null,
          minStockLevel: parseInt(minStockLevel) || 0,
          maxStockLevel: maxStockLevel ? parseInt(maxStockLevel) : null,
          reorderPoint: reorderPoint ? parseInt(reorderPoint) : null,
          reorderQty: reorderQty ? parseInt(reorderQty) : null,
          warranty: warranty ? parseInt(warranty) : null,
          specifications: enhancedSpecifications || null,
          tags: enhancedTags || null,
          featured: featured || false,
          isActive: isActive !== undefined ? isActive : true,
          status: 'published',
          // Media fields
          imageUrl: imageUrl || null,
          imageUrls: imageUrls || null,
          diyVideoUrl: diyVideoUrl || null,
          installationVideos: installationVideos || null,
          technicalDrawings: technicalDrawings || null,
          // AI-optimized fields
          problemKeywords: problemKeywords || null,
          symptoms: symptoms || null,
          compatibleAppliances: compatibleAppliances || null,
          installationDifficulty: installationDifficulty || null,
          commonFailureReasons: commonFailureReasons || null,
          troubleshootingSteps: troubleshootingSteps || null,
          relatedParts: relatedParts || null,
          urgencyLevel: urgencyLevel || null,
          customerDescription: customerDescription || null,
          technicalSpecs: technicalSpecs || null,
          safetyWarnings: safetyWarnings || null,
          maintenanceInterval: maintenanceInterval || null,
          lifespan: lifespan || null,
          environmentalConditions: environmentalConditions || null,
          // SEO fields
          seoTitle: seoTitle || null,
          seoDescription: seoDescription || null,
          publishedAt: new Date()
        },
        include: {
          brand: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      // Create initial inventory record for this part
      try {
        await prisma.brandInventory.create({
          data: {
            brandId: finalBrandId,
            partId: newPart.id,
            onHandQuantity: 0,
            availableQuantity: 0,
            reservedQuantity: 0,
            defectiveQuantity: 0,
            quarantineQuantity: 0,
            inTransitQuantity: 0,
            lastUpdated: new Date()
          }
        });
      } catch (inventoryError) {
        console.warn('Failed to create initial inventory record:', inventoryError);
        // Don't fail the part creation if inventory creation fails
      }

      return res.status(201).json({
        success: true,
        data: newPart,
        message: 'Part created successfully'
      });
    }

    if (req.method === 'PUT') {
      if (user.role !== 'BRAND' && user.role !== 'SUPER_ADMIN') {
        return res.status(403).json({ error: 'Access denied. Brand role required.' });
      }

      const {
        id,
        brandId,
        code,
        name,
        description,
        partNumber,
        category,
        subCategory,
        price,
        costPrice,
        weight,
        length,
        breadth,
        height,
        minStockLevel,
        maxStockLevel,
        reorderPoint,
        reorderQty,
        warranty,
        specifications,
        tags,
        featured,
        isActive,
        // Media fields
        imageUrl,
        imageUrls,
        diyVideoUrl,
        installationVideos,
        technicalDrawings,
        // Enhanced AI-optimized fields
        problemKeywords,
        symptoms,
        compatibleAppliances,
        installationDifficulty,
        commonFailureReasons,
        troubleshootingSteps,
        relatedParts,
        urgencyLevel,
        customerDescription,
        technicalSpecs,
        safetyWarnings,
        maintenanceInterval,
        lifespan,
        environmentalConditions,
        // SEO fields
        seoTitle,
        seoDescription
      } = req.body;

      if (!id) {
        return res.status(400).json({ error: 'Part ID is required for update' });
      }

      // Validate required fields
      if (!code || !name || price === undefined) {
        return res.status(400).json({ 
          error: 'Missing required fields: code, name, price' 
        });
      }

      // Check if part exists and user has permission to update it
      const existingPart = await prisma.part.findUnique({
        where: { id }
      });

      if (!existingPart) {
        return res.status(404).json({ error: 'Part not found' });
      }

      // Check permissions
      if (user.role === 'BRAND' && existingPart.brandId !== user.id) {
        return res.status(403).json({ error: 'Access denied. You can only update your own parts.' });
      }

      // Check if part code already exists for this brand (excluding current part)
      const duplicatePart = await prisma.part.findFirst({
        where: {
          brandId: existingPart.brandId,
          code: code,
          id: { not: id }
        }
      });

      if (duplicatePart) {
        return res.status(400).json({ 
          error: 'Part code already exists for this brand' 
        });
      }

      // Combine all specifications into a comprehensive format for AI search
      const enhancedSpecifications = [
        specifications,
        technicalSpecs && `Technical Specs: ${technicalSpecs}`,
        problemKeywords && `Problem Keywords: ${problemKeywords}`,
        symptoms && `Symptoms: ${symptoms}`,
        compatibleAppliances && `Compatible Appliances: ${compatibleAppliances}`,
        commonFailureReasons && `Failure Reasons: ${commonFailureReasons}`,
        troubleshootingSteps && `Troubleshooting: ${troubleshootingSteps}`,
        customerDescription && `Customer Description: ${customerDescription}`,
        safetyWarnings && `Safety: ${safetyWarnings}`,
        environmentalConditions && `Environment: ${environmentalConditions}`,
        relatedParts && `Related Parts: ${relatedParts}`,
        maintenanceInterval && `Maintenance: ${maintenanceInterval}`,
        lifespan && `Lifespan: ${lifespan}`,
        installationDifficulty && `Installation: ${installationDifficulty}`,
        urgencyLevel && `Urgency: ${urgencyLevel}`
      ].filter(Boolean).join('\n\n');

      // Enhanced tags for better searchability
      const enhancedTags = [
        tags,
        problemKeywords,
        compatibleAppliances,
        category,
        subCategory
      ].filter(Boolean).join(', ');

      const updatedPart = await prisma.part.update({
        where: { id },
        data: {
          code,
          name,
          description: description || null,
          partNumber: partNumber || null,
          category: category || null,
          subCategory: subCategory || null,
          price: parseFloat(price),
          costPrice: costPrice ? parseFloat(costPrice) : null,
          weight: weight ? parseFloat(weight) : null,
          length: length ? parseFloat(length) : null,
          breadth: breadth ? parseFloat(breadth) : null,
          height: height ? parseFloat(height) : null,
          minStockLevel: parseInt(minStockLevel) || 0,
          maxStockLevel: maxStockLevel ? parseInt(maxStockLevel) : null,
          reorderPoint: reorderPoint ? parseInt(reorderPoint) : null,
          reorderQty: reorderQty ? parseInt(reorderQty) : null,
          warranty: warranty ? parseInt(warranty) : null,
          specifications: enhancedSpecifications || null,
          tags: enhancedTags || null,
          featured: featured || false,
          isActive: isActive !== undefined ? isActive : true,
          // Media fields
          imageUrl: imageUrl || null,
          imageUrls: imageUrls || null,
          diyVideoUrl: diyVideoUrl || null,
          installationVideos: installationVideos || null,
          technicalDrawings: technicalDrawings || null,
          // AI-optimized fields
          problemKeywords: problemKeywords || null,
          symptoms: symptoms || null,
          compatibleAppliances: compatibleAppliances || null,
          installationDifficulty: installationDifficulty || null,
          commonFailureReasons: commonFailureReasons || null,
          troubleshootingSteps: troubleshootingSteps || null,
          relatedParts: relatedParts || null,
          urgencyLevel: urgencyLevel || null,
          customerDescription: customerDescription || null,
          technicalSpecs: technicalSpecs || null,
          safetyWarnings: safetyWarnings || null,
          maintenanceInterval: maintenanceInterval || null,
          lifespan: lifespan || null,
          environmentalConditions: environmentalConditions || null,
          // SEO fields
          seoTitle: seoTitle || null,
          seoDescription: seoDescription || null
        },
        include: {
          brand: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      return res.status(200).json({
        success: true,
        data: updatedPart,
        message: 'Part updated successfully'
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Parts API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}