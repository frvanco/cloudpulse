import {
  Controller,
  Get,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(private readonly prisma: PrismaService) {}

  // Liveness : volontairement sans dépendance externe, répond tant que le
  // process est vivant.
  @Get()
  check(): { status: 'ok'; revision?: string } {
    return { status: 'ok', revision: currentRevision() };
  }

  // Readiness : vérifie la base, sans appeler Twelve Data (ni quota consommé,
  // ni dépendance à un tiers). Utilisé par le test de fumée du pipeline.
  @Get('ready')
  async ready(): Promise<{
    status: 'ok';
    database: 'ok';
    revision?: string;
  }> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch (error) {
      this.logger.error(`Database unreachable: ${String(error)}`);
      throw new ServiceUnavailableException('Database unreachable');
    }
    return { status: 'ok', database: 'ok', revision: currentRevision() };
  }
}

// Révision Cloud Run qui a servi la requête (absente en local) : rend visible
// la répartition du trafic pendant un déploiement canary.
function currentRevision(): string | undefined {
  return process.env.K_REVISION;
}
