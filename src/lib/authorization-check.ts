import { prisma } from './prisma';

export interface AuthorizationStatus {
  isAuthorized: boolean;
  authorizedBrands: string[];
  message?: string;
}

/**
 * Check if a Service Center is authorized by any brand
 */
export async function checkServiceCenterAuthorization(serviceCenterUserId: string): Promise<AuthorizationStatus> {
  try {
    const authorizations = await prisma.brandAuthorizedServiceCenter.findMany({
      where: {
        serviceCenterUserId,
        status: 'Active'
      },
      include: {
        brand: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    const authorizedBrands = authorizations.map(auth => auth.brand.name);

    return {
      isAuthorized: authorizations.length > 0,
      authorizedBrands,
      message: authorizations.length === 0 
        ? 'You are not authorized by any brand to send shipments. Please request brand access first.'
        : `Authorized by ${authorizations.length} brand(s): ${authorizedBrands.join(', ')}`
    };
  } catch (error) {
    console.error('Error checking service center authorization:', error);
    return {
      isAuthorized: false,
      authorizedBrands: [],
      message: 'Error checking authorization status'
    };
  }
}

/**
 * Check if a Distributor is authorized by any brand
 */
export async function checkDistributorAuthorization(distributorUserId: string): Promise<AuthorizationStatus> {
  try {
    const authorizations = await prisma.brandAuthorizedDistributor.findMany({
      where: {
        distributorUserId,
        status: 'Active'
      },
      include: {
        brand: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    const authorizedBrands = authorizations.map(auth => auth.brand.name);

    return {
      isAuthorized: authorizations.length > 0,
      authorizedBrands,
      message: authorizations.length === 0 
        ? 'You are not authorized by any brand to send shipments. Please request brand access first.'
        : `Authorized by ${authorizations.length} brand(s): ${authorizedBrands.join(', ')}`
    };
  } catch (error) {
    console.error('Error checking distributor authorization:', error);
    return {
      isAuthorized: false,
      authorizedBrands: [],
      message: 'Error checking authorization status'
    };
  }
}

/**
 * Check authorization for any user based on their role
 */
export async function checkUserAuthorization(userId: string, userRole: string): Promise<AuthorizationStatus> {
  switch (userRole) {
    case 'SERVICE_CENTER':
      return checkServiceCenterAuthorization(userId);
    case 'DISTRIBUTOR':
      return checkDistributorAuthorization(userId);
    case 'BRAND':
    case 'SUPER_ADMIN':
    case 'CUSTOMER':
      // These roles don't need brand authorization for shipments
      return {
        isAuthorized: true,
        authorizedBrands: [],
        message: 'Full access granted'
      };
    default:
      return {
        isAuthorized: false,
        authorizedBrands: [],
        message: 'Unknown user role'
      };
  }
}