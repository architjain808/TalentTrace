import { Controller, Get } from '@nestjs/common';

/**
 * Simple health check endpoint — useful for deployment liveness probes
 * and to confirm the server is running during development.
 */
@Controller('health')
export class HealthController {
  @Get()
  check() {
    return {
      status: 'ok',
      service: 'talenttrace-payment-backend',
      timestamp: new Date().toISOString(),
    };
  }
}
