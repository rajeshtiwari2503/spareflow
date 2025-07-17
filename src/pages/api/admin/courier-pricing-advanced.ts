import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      // Fetch all advanced courier pricing rules
      const advancedPricingRules = await prisma.advancedCourierPricing.findMany({
        include: {
          brand: {
            select: { id: true, name: true, email: true }
          }
        },
        orderBy: { updatedAt: 'desc' }
      });

      // Fetch role-based pricing
      const roleBasedPricing = await prisma.roleBasedPricing.findMany({
        orderBy: { role: 'asc' }
      });

      // Fetch weight-based pricing
      const weightBasedPricing = await prisma.weightBasedPricing.findMany({
        orderBy: { minWeight: 'asc' }
      });

      // Fetch pincode-based pricing
      const pincodeBasedPricing = await prisma.pincodeBasedPricing.findMany({
        orderBy: { pincode: 'asc' }
      });

      // Get default rates
      const defaultRates = await prisma.systemSettings.findMany({
        where: {
          key: {
            in: ['default_courier_rate', 'base_weight_rate', 'additional_weight_rate', 'remote_area_surcharge']
          }
        }
      });

      const defaultRatesObj = defaultRates.reduce((acc, setting) => {
        acc[setting.key] = parseFloat(setting.value);
        return acc;
      }, {} as Record<string, number>);

      res.status(200).json({
        advancedPricingRules,
        roleBasedPricing,
        weightBasedPricing,
        pincodeBasedPricing,
        defaultRates: {
          defaultCourierRate: defaultRatesObj.default_courier_rate || 50,
          baseWeightRate: defaultRatesObj.base_weight_rate || 30,
          additionalWeightRate: defaultRatesObj.additional_weight_rate || 10,
          remoteAreaSurcharge: defaultRatesObj.remote_area_surcharge || 25
        }
      });
    } catch (error) {
      console.error('Error fetching advanced courier pricing:', error);
      res.status(500).json({ error: 'Failed to fetch advanced courier pricing' });
    }
  } else if (req.method === 'POST') {
    try {
      const { action, ...data } = req.body;

      switch (action) {
        case 'createAdvancedRule':
          return await createAdvancedRule(data, res);
        case 'updateAdvancedRule':
          return await updateAdvancedRule(data, res);
        case 'deleteAdvancedRule':
          return await deleteAdvancedRule(data, res);
        case 'setRoleBasedPricing':
          return await setRoleBasedPricing(data, res);
        case 'setWeightBasedPricing':
          return await setWeightBasedPricing(data, res);
        case 'setPincodeBasedPricing':
          return await setPincodeBasedPricing(data, res);
        case 'updateDefaultRates':
          return await updateDefaultRates(data, res);
        case 'calculatePrice':
          return await calculatePrice(data, res);
        case 'deleteRoleBasedPricing':
          return await deleteRoleBasedPricing(data, res);
        case 'deleteWeightBasedPricing':
          return await deleteWeightBasedPricing(data, res);
        case 'deletePincodeBasedPricing':
          return await deletePincodeBasedPricing(data, res);
        default:
          res.status(400).json({ error: 'Invalid action' });
      }
    } catch (error) {
      console.error('Error processing advanced courier pricing operation:', error);
      res.status(500).json({ error: 'Failed to process advanced courier pricing operation' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

async function createAdvancedRule(data: any, res: NextApiResponse) {
  const { brandId, ruleName, conditions, baseRate, isActive } = data;

  if (!brandId || !ruleName || !conditions || !baseRate) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const rule = await prisma.advancedCourierPricing.create({
    data: {
      brandId,
      ruleName,
      conditions: JSON.stringify(conditions),
      baseRate: parseFloat(baseRate),
      isActive: isActive !== undefined ? isActive : true
    },
    include: {
      brand: {
        select: { id: true, name: true, email: true }
      }
    }
  });

  res.status(201).json({
    success: true,
    message: 'Advanced pricing rule created successfully',
    rule
  });
}

async function updateAdvancedRule(data: any, res: NextApiResponse) {
  const { ruleId, ruleName, conditions, baseRate, isActive } = data;

  if (!ruleId) {
    return res.status(400).json({ error: 'Rule ID is required' });
  }

  const rule = await prisma.advancedCourierPricing.update({
    where: { id: ruleId },
    data: {
      ...(ruleName && { ruleName }),
      ...(conditions && { conditions: JSON.stringify(conditions) }),
      ...(baseRate && { baseRate: parseFloat(baseRate) }),
      ...(isActive !== undefined && { isActive })
    },
    include: {
      brand: {
        select: { id: true, name: true, email: true }
      }
    }
  });

  res.status(200).json({
    success: true,
    message: 'Advanced pricing rule updated successfully',
    rule
  });
}

async function deleteAdvancedRule(data: any, res: NextApiResponse) {
  const { ruleId } = data;

  if (!ruleId) {
    return res.status(400).json({ error: 'Rule ID is required' });
  }

  await prisma.advancedCourierPricing.delete({
    where: { id: ruleId }
  });

  res.status(200).json({
    success: true,
    message: 'Advanced pricing rule deleted successfully'
  });
}

async function setRoleBasedPricing(data: any, res: NextApiResponse) {
  const { role, baseRate, multiplier, isActive } = data;

  if (!role || !baseRate) {
    return res.status(400).json({ error: 'Role and base rate are required' });
  }

  const pricing = await prisma.roleBasedPricing.upsert({
    where: { role },
    update: {
      baseRate: parseFloat(baseRate),
      multiplier: multiplier ? parseFloat(multiplier) : 1.0,
      isActive: isActive !== undefined ? isActive : true
    },
    create: {
      role,
      baseRate: parseFloat(baseRate),
      multiplier: multiplier ? parseFloat(multiplier) : 1.0,
      isActive: isActive !== undefined ? isActive : true
    }
  });

  res.status(200).json({
    success: true,
    message: 'Role-based pricing updated successfully',
    pricing
  });
}

async function setWeightBasedPricing(data: any, res: NextApiResponse) {
  const { minWeight, maxWeight, baseRate, additionalRate, isActive } = data;

  if (!minWeight || !baseRate) {
    return res.status(400).json({ error: 'Minimum weight and base rate are required' });
  }

  const pricing = await prisma.weightBasedPricing.create({
    data: {
      minWeight: parseFloat(minWeight),
      maxWeight: maxWeight ? parseFloat(maxWeight) : null,
      baseRate: parseFloat(baseRate),
      additionalRate: additionalRate ? parseFloat(additionalRate) : 0,
      isActive: isActive !== undefined ? isActive : true
    }
  });

  res.status(201).json({
    success: true,
    message: 'Weight-based pricing created successfully',
    pricing
  });
}

async function setPincodeBasedPricing(data: any, res: NextApiResponse) {
  const { pincode, zone, baseRate, surcharge, isActive } = data;

  if (!pincode || !baseRate) {
    return res.status(400).json({ error: 'Pincode and base rate are required' });
  }

  const pricing = await prisma.pincodeBasedPricing.upsert({
    where: { pincode },
    update: {
      zone: zone || 'STANDARD',
      baseRate: parseFloat(baseRate),
      surcharge: surcharge ? parseFloat(surcharge) : 0,
      isActive: isActive !== undefined ? isActive : true
    },
    create: {
      pincode,
      zone: zone || 'STANDARD',
      baseRate: parseFloat(baseRate),
      surcharge: surcharge ? parseFloat(surcharge) : 0,
      isActive: isActive !== undefined ? isActive : true
    }
  });

  res.status(200).json({
    success: true,
    message: 'Pincode-based pricing updated successfully',
    pricing
  });
}

async function updateDefaultRates(data: any, res: NextApiResponse) {
  const { defaultCourierRate, baseWeightRate, additionalWeightRate, remoteAreaSurcharge } = data;

  const updates = [];

  if (defaultCourierRate) {
    updates.push(
      prisma.systemSettings.upsert({
        where: { key: 'default_courier_rate' },
        update: { value: defaultCourierRate.toString() },
        create: { key: 'default_courier_rate', value: defaultCourierRate.toString(), description: 'Default courier rate per box' }
      })
    );
  }

  if (baseWeightRate) {
    updates.push(
      prisma.systemSettings.upsert({
        where: { key: 'base_weight_rate' },
        update: { value: baseWeightRate.toString() },
        create: { key: 'base_weight_rate', value: baseWeightRate.toString(), description: 'Base rate for first kg' }
      })
    );
  }

  if (additionalWeightRate) {
    updates.push(
      prisma.systemSettings.upsert({
        where: { key: 'additional_weight_rate' },
        update: { value: additionalWeightRate.toString() },
        create: { key: 'additional_weight_rate', value: additionalWeightRate.toString(), description: 'Rate per additional kg' }
      })
    );
  }

  if (remoteAreaSurcharge) {
    updates.push(
      prisma.systemSettings.upsert({
        where: { key: 'remote_area_surcharge' },
        update: { value: remoteAreaSurcharge.toString() },
        create: { key: 'remote_area_surcharge', value: remoteAreaSurcharge.toString(), description: 'Surcharge for remote areas' }
      })
    );
  }

  await Promise.all(updates);

  res.status(200).json({
    success: true,
    message: 'Default rates updated successfully'
  });
}

async function calculatePrice(data: any, res: NextApiResponse) {
  const { brandId, role, weight, pincode, numBoxes } = data;

  if (!role || !weight || !pincode || !numBoxes) {
    return res.status(400).json({ error: 'Role, weight, pincode, and number of boxes are required' });
  }

  try {
    let totalPrice = 0;
    const breakdown = {
      baseRate: 0,
      roleMultiplier: 1,
      weightSurcharge: 0,
      pincodeSurcharge: 0,
      totalPerBox: 0,
      numBoxes: parseInt(numBoxes),
      totalPrice: 0
    };

    // Get base rate (brand-specific or default)
    let baseRate = 50; // fallback
    if (brandId) {
      const brandPricing = await prisma.courierPricing.findUnique({
        where: { brandId, isActive: true }
      });
      if (brandPricing) {
        baseRate = brandPricing.perBoxRate;
      }
    }

    // Apply role-based pricing
    const rolePricing = await prisma.roleBasedPricing.findUnique({
      where: { role, isActive: true }
    });
    if (rolePricing) {
      baseRate = rolePricing.baseRate;
      breakdown.roleMultiplier = rolePricing.multiplier;
    }

    breakdown.baseRate = baseRate;

    // Apply weight-based pricing
    const weightPricing = await prisma.weightBasedPricing.findFirst({
      where: {
        minWeight: { lte: parseFloat(weight) },
        OR: [
          { maxWeight: null },
          { maxWeight: { gte: parseFloat(weight) } }
        ],
        isActive: true
      },
      orderBy: { minWeight: 'desc' }
    });

    if (weightPricing) {
      const additionalWeight = Math.max(0, parseFloat(weight) - weightPricing.minWeight);
      breakdown.weightSurcharge = additionalWeight * weightPricing.additionalRate;
    }

    // Apply pincode-based pricing
    const pincodePricing = await prisma.pincodeBasedPricing.findUnique({
      where: { pincode, isActive: true }
    });
    if (pincodePricing) {
      breakdown.pincodeSurcharge = pincodePricing.surcharge;
    }

    // Calculate total per box
    breakdown.totalPerBox = (breakdown.baseRate * breakdown.roleMultiplier) + breakdown.weightSurcharge + breakdown.pincodeSurcharge;
    breakdown.totalPrice = breakdown.totalPerBox * breakdown.numBoxes;

    res.status(200).json({
      success: true,
      price: breakdown.totalPrice,
      breakdown
    });
  } catch (error) {
    console.error('Error calculating price:', error);
    res.status(500).json({ error: 'Failed to calculate price' });
  }
}

async function deleteRoleBasedPricing(data: any, res: NextApiResponse) {
  const { id } = data;

  if (!id) {
    return res.status(400).json({ error: 'ID is required' });
  }

  try {
    await prisma.roleBasedPricing.delete({
      where: { id }
    });

    res.status(200).json({
      success: true,
      message: 'Role-based pricing deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting role-based pricing:', error);
    res.status(500).json({ error: 'Failed to delete role-based pricing' });
  }
}

async function deleteWeightBasedPricing(data: any, res: NextApiResponse) {
  const { id } = data;

  if (!id) {
    return res.status(400).json({ error: 'ID is required' });
  }

  try {
    await prisma.weightBasedPricing.delete({
      where: { id }
    });

    res.status(200).json({
      success: true,
      message: 'Weight-based pricing deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting weight-based pricing:', error);
    res.status(500).json({ error: 'Failed to delete weight-based pricing' });
  }
}

async function deletePincodeBasedPricing(data: any, res: NextApiResponse) {
  const { id } = data;

  if (!id) {
    return res.status(400).json({ error: 'ID is required' });
  }

  try {
    await prisma.pincodeBasedPricing.delete({
      where: { id }
    });

    res.status(200).json({
      success: true,
      message: 'Pincode-based pricing deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting pincode-based pricing:', error);
    res.status(500).json({ error: 'Failed to delete pincode-based pricing' });
  }
}