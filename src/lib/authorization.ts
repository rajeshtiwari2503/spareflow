import { prisma } from './prisma';

/**
 * Check if a brand has active authorization to ship to a service center
 */
export async function checkServiceCenterAuthorization(brandId: string, serviceCenterId: string): Promise<{
  authorized: boolean;
  status?: string;
  error?: string;
}> {
  try {
    const authorization = await prisma.brandAuthorizedServiceCenter.findFirst({
      where: {
        brandId,
        serviceCenterUserId: serviceCenterId,
      },
      select: {
        status: true,
      },
    });

    if (!authorization) {
      return {
        authorized: false,
        error: 'Service center is not in your authorized network',
      };
    }

    if (authorization.status !== 'Active') {
      return {
        authorized: false,
        status: authorization.status,
        error: 'Service center access has been deactivated',
      };
    }

    return {
      authorized: true,
      status: authorization.status,
    };
  } catch (error) {
    console.error('Error checking service center authorization:', error);
    return {
      authorized: false,
      error: 'Failed to verify authorization',
    };
  }
}

/**
 * Check if a brand has active authorization to ship to a distributor
 */
export async function checkDistributorAuthorization(brandId: string, distributorId: string): Promise<{
  authorized: boolean;
  status?: string;
  error?: string;
}> {
  try {
    const authorization = await prisma.brandAuthorizedDistributor.findFirst({
      where: {
        brandId,
        distributorUserId: distributorId,
      },
      select: {
        status: true,
      },
    });

    if (!authorization) {
      return {
        authorized: false,
        error: 'Distributor is not in your authorized network',
      };
    }

    if (authorization.status !== 'Active') {
      return {
        authorized: false,
        status: authorization.status,
        error: 'Distributor access has been deactivated',
      };
    }

    return {
      authorized: true,
      status: authorization.status,
    };
  } catch (error) {
    console.error('Error checking distributor authorization:', error);
    return {
      authorized: false,
      error: 'Failed to verify authorization',
    };
  }
}

/**
 * Check authorization for multiple service centers at once
 */
export async function checkMultipleServiceCenterAuthorizations(
  brandId: string, 
  serviceCenterIds: string[]
): Promise<{
  authorized: string[];
  unauthorized: Array<{ id: string; error: string; status?: string }>;
}> {
  const authorized: string[] = [];
  const unauthorized: Array<{ id: string; error: string; status?: string }> = [];

  for (const serviceCenterId of serviceCenterIds) {
    const check = await checkServiceCenterAuthorization(brandId, serviceCenterId);
    if (check.authorized) {
      authorized.push(serviceCenterId);
    } else {
      unauthorized.push({
        id: serviceCenterId,
        error: check.error || 'Authorization failed',
        status: check.status,
      });
    }
  }

  return { authorized, unauthorized };
}

/**
 * Check authorization for multiple distributors at once
 */
export async function checkMultipleDistributorAuthorizations(
  brandId: string, 
  distributorIds: string[]
): Promise<{
  authorized: string[];
  unauthorized: Array<{ id: string; error: string; status?: string }>;
}> {
  const authorized: string[] = [];
  const unauthorized: Array<{ id: string; error: string; status?: string }> = [];

  for (const distributorId of distributorIds) {
    const check = await checkDistributorAuthorization(brandId, distributorId);
    if (check.authorized) {
      authorized.push(distributorId);
    } else {
      unauthorized.push({
        id: distributorId,
        error: check.error || 'Authorization failed',
        status: check.status,
      });
    }
  }

  return { authorized, unauthorized };
}