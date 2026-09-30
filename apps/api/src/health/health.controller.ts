import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  // Volontairement sans dépendance externe : répond tant que le process est vivant.
  @Get()
  check(): { status: 'ok' } {
    return { status: 'ok' };
  }
}
