import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../services/database.service';
import { SolanaService } from '../../services/solana.service';

@Injectable()
export class HealthService {
  constructor(
    private readonly db: DatabaseService,
    private readonly solana: SolanaService,
  ) {}

  async check() {
    const checks = await Promise.allSettled([
      this.checkDatabase(),
      this.checkSolana(),
      this.checkPrograms(),
    ]);

    const results = {
      database: checks[0].status === 'fulfilled' ? checks[0].value : 'down',
      solana: checks[1].status === 'fulfilled' ? checks[1].value : 'down',
      programs: checks[2].status === 'fulfilled' ? checks[2].value : 'down',
    };

    return {
      status: Object.values(results).every(r => r === 'up') ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      services: results,
    };
  }

  async readiness() {
    const checks = await Promise.allSettled([
      this.checkPrograms(),
      this.checkDatabaseMigrations(),
    ]);

    const programsDeployed = checks[0].status === 'fulfilled' ? checks[0].value : false;
    const dbMigrated = checks[1].status === 'fulfilled' ? checks[1].value : false;

    return {
      ready: programsDeployed && dbMigrated,
      timestamp: new Date().toISOString(),
      checks: {
        programs: programsDeployed,
        database: dbMigrated,
      },
    };
  }

  async liveness() {
    return {
      status: 'alive',
      timestamp: new Date().toISOString(),
    };
  }

  private async checkDatabase(): Promise<string> {
    try {
      await this.db.$queryRaw`SELECT 1`;
      return 'up';
    } catch (error) {
      console.error('Database health check failed:', error);
      return 'down';
    }
  }

  private async checkSolana(): Promise<string> {
    try {
      const version = await this.solana.connection.getVersion();
      return version ? 'up' : 'down';
    } catch (error) {
      console.error('Solana health check failed:', error);
      return 'down';
    }
  }

  private async checkPrograms(): Promise<boolean> {
    try {
      return await this.solana.checkProgramsDeployed();
    } catch (error) {
      console.error('Programs health check failed:', error);
      return false;
    }
  }

  private async checkDatabaseMigrations(): Promise<boolean> {
    try {
      // Check if migrations table exists and has been applied
      const result = await this.db.$queryRaw`
        SELECT COUNT(*) as count
        FROM _prisma_migrations
        WHERE migration_name LIKE '%initial%'
      `;
      return (result as any)[0]?.count > 0;
    } catch (error) {
      console.error('Database migrations check failed:', error);
      return false;
    }
  }
}