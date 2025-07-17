import { prisma } from '@/lib/prisma';

export interface HealthCheckConfig {
  enableConsoleLogging: boolean;
  enableDetailedReporting: boolean;
  alertThresholds: {
    orphanedRecords: number;
    brandsWithoutPartners: number;
  };
}

export const defaultHealthCheckConfig: HealthCheckConfig = {
  enableConsoleLogging: true,
  enableDetailedReporting: true,
  alertThresholds: {
    orphanedRecords: 5,
    brandsWithoutPartners: 3
  }
};

export class SystemHealthChecker {
  private config: HealthCheckConfig;

  constructor(config: HealthCheckConfig = defaultHealthCheckConfig) {
    this.config = config;
  }

  private log(message: string, level: 'info' | 'warn' | 'error' = 'info') {
    if (!this.config.enableConsoleLogging) return;

    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [HEALTH-CHECK]`;

    switch (level) {
      case 'error':
        console.error(`${prefix} ❌ ${message}`);
        break;
      case 'warn':
        console.warn(`${prefix} ⚠️  ${message}`);
        break;
      default:
        console.log(`${prefix} ℹ️  ${message}`);
    }
  }

  async checkDatabaseConnectivity(): Promise<{ status: 'pass' | 'fail'; details: any }> {
    try {
      await prisma.$queryRaw`SELECT 1`;
      this.log('Database connectivity check passed');
      return { status: 'pass', details: { message: 'Database connection successful' } };
    } catch (error) {
      this.log(`Database connectivity check failed: ${error}`, 'error');
      return { 
        status: 'fail', 
        details: { 
          error: error instanceof Error ? error.message : 'Unknown database error' 
        } 
      };
    }
  }

  async checkAuthorizedNetworkIntegrity(): Promise<{ status: 'pass' | 'fail'; details: any }> {
    try {
      // Check for referential integrity
      const serviceCenterIssues = await prisma.$queryRaw`
        SELECT basc.id, basc.brand_id, basc.service_center_user_id
        FROM "brand_authorized_service_centers" basc
        LEFT JOIN "users" u ON basc.service_center_user_id = u.id
        WHERE u.id IS NULL OR u.role != 'SERVICE_CENTER'
      `;

      const distributorIssues = await prisma.$queryRaw`
        SELECT bad.id, bad.brand_id, bad.distributor_user_id
        FROM "brand_authorized_distributors" bad
        LEFT JOIN "users" u ON bad.distributor_user_id = u.id
        WHERE u.id IS NULL OR u.role != 'DISTRIBUTOR'
      `;

      const issues = [];
      if (Array.isArray(serviceCenterIssues) && serviceCenterIssues.length > 0) {
        issues.push(`${serviceCenterIssues.length} invalid service center authorizations`);
      }
      if (Array.isArray(distributorIssues) && distributorIssues.length > 0) {
        issues.push(`${distributorIssues.length} invalid distributor authorizations`);
      }

      const status = issues.length === 0 ? 'pass' : 'fail';
      
      if (status === 'fail') {
        this.log(`Authorized network integrity issues: ${issues.join(', ')}`, 'error');
      } else {
        this.log('Authorized network integrity check passed');
      }

      return {
        status,
        details: {
          issues,
          serviceCenterIssues: Array.isArray(serviceCenterIssues) ? serviceCenterIssues.length : 0,
          distributorIssues: Array.isArray(distributorIssues) ? distributorIssues.length : 0
        }
      };

    } catch (error) {
      this.log(`Authorized network integrity check failed: ${error}`, 'error');
      return {
        status: 'fail',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  async checkShipmentFormDataConsistency(): Promise<{ status: 'pass' | 'fail'; details: any }> {
    try {
      // Check if all brands have consistent data for shipment forms
      const brands = await prisma.user.findMany({
        where: { role: 'BRAND' },
        select: { id: true, name: true }
      });

      const inconsistencies = [];

      for (const brand of brands) {
        // Check if authorized partners exist and are valid
        const serviceCenters = await prisma.brandAuthorizedServiceCenter.findMany({
          where: { brandId: brand.id, status: 'Active' },
          include: { serviceCenter: true }
        });

        const distributors = await prisma.brandAuthorizedDistributor.findMany({
          where: { brandId: brand.id, status: 'Active' },
          include: { distributor: true }
        });

        // Check for null references
        const invalidSC = serviceCenters.filter(sc => !sc.serviceCenter);
        const invalidDist = distributors.filter(d => !d.distributor);

        if (invalidSC.length > 0 || invalidDist.length > 0) {
          inconsistencies.push({
            brandId: brand.id,
            brandName: brand.name,
            invalidServiceCenters: invalidSC.length,
            invalidDistributors: invalidDist.length
          });
        }
      }

      const status = inconsistencies.length === 0 ? 'pass' : 'fail';
      
      if (status === 'fail') {
        this.log(`Shipment form data inconsistencies found for ${inconsistencies.length} brands`, 'error');
      } else {
        this.log('Shipment form data consistency check passed');
      }

      return {
        status,
        details: {
          brandsChecked: brands.length,
          inconsistencies
        }
      };

    } catch (error) {
      this.log(`Shipment form data consistency check failed: ${error}`, 'error');
      return {
        status: 'fail',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  async identifyBrandsWithoutPartners(): Promise<{ status: 'pass' | 'warning'; details: any }> {
    try {
      const brands = await prisma.user.findMany({
        where: { role: 'BRAND' },
        select: { id: true, name: true, email: true }
      });

      const brandsWithoutPartners = [];

      for (const brand of brands) {
        const [serviceCenterCount, distributorCount] = await Promise.all([
          prisma.brandAuthorizedServiceCenter.count({
            where: { brandId: brand.id, status: 'Active' }
          }),
          prisma.brandAuthorizedDistributor.count({
            where: { brandId: brand.id, status: 'Active' }
          })
        ]);

        if (serviceCenterCount === 0 && distributorCount === 0) {
          brandsWithoutPartners.push(brand);
          this.log(`Brand "${brand.name}" (${brand.email}) has no authorized partners`, 'warn');
        }
      }

      const status = brandsWithoutPartners.length >= this.config.alertThresholds.brandsWithoutPartners 
        ? 'warning' 
        : 'pass';

      if (brandsWithoutPartners.length > 0) {
        this.log(`Found ${brandsWithoutPartners.length} brands without authorized partners`, 'warn');
      } else {
        this.log('All brands have authorized partners');
      }

      return {
        status,
        details: {
          totalBrands: brands.length,
          brandsWithoutPartners: brandsWithoutPartners.length,
          affectedBrands: brandsWithoutPartners,
          threshold: this.config.alertThresholds.brandsWithoutPartners
        }
      };

    } catch (error) {
      this.log(`Brands without partners check failed: ${error}`, 'error');
      return {
        status: 'warning',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  async runFullHealthCheck() {
    this.log('Starting comprehensive system health check');
    
    const results = {
      timestamp: new Date().toISOString(),
      status: 'healthy' as 'healthy' | 'warning' | 'critical',
      checks: {
        databaseConnectivity: await this.checkDatabaseConnectivity(),
        authorizedNetworkIntegrity: await this.checkAuthorizedNetworkIntegrity(),
        shipmentFormDataConsistency: await this.checkShipmentFormDataConsistency(),
        brandsWithoutPartners: await this.identifyBrandsWithoutPartners()
      }
    };

    // Determine overall status
    const failedChecks = Object.values(results.checks).filter(check => check.status === 'fail').length;
    const warningChecks = Object.values(results.checks).filter(check => check.status === 'warning').length;

    if (failedChecks > 0) {
      results.status = 'critical';
      this.log(`Health check completed with CRITICAL status: ${failedChecks} failed checks`, 'error');
    } else if (warningChecks > 0) {
      results.status = 'warning';
      this.log(`Health check completed with WARNING status: ${warningChecks} warnings`, 'warn');
    } else {
      this.log('Health check completed successfully - all systems operational');
    }

    return results;
  }
}

// Utility function for quick health checks
export async function quickHealthCheck() {
  const checker = new SystemHealthChecker();
  return await checker.runFullHealthCheck();
}

// Utility function for silent health checks (no console logging)
export async function silentHealthCheck() {
  const checker = new SystemHealthChecker({
    ...defaultHealthCheckConfig,
    enableConsoleLogging: false
  });
  return await checker.runFullHealthCheck();
}