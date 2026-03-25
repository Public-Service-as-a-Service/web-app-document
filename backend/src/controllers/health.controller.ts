import { Controller, Get } from 'routing-controllers';

@Controller()
export class HealthController {
  @Get('/health/up')
  async up() {
    return { status: 'OK' };
  }
}
