import { Controller, Get, Inject, UseGuards } from '@nestjs/common';
import { GatewayService } from './gateway.service';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from './roles.decorator';
import { ClientProxy } from '@nestjs/microservices';
import { RolesGuard } from './roles.guard';

@Controller()
export class GatewayController {
  constructor(
    private readonly gatewayService: GatewayService,
    @Inject('AUTH_SERVICE') private readonly authClient: ClientProxy,
    @Inject('EVENT_SERVICE') private readonly eventClient: ClientProxy,
  ) {}

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  @Get()
  getHello(): string {
    return this.gatewayService.getHello();
  }

  @Get('health')
  healthCheck(): string {
    return 'OK';
  }

  @Get('auth/ping')
  async pingAuth() {
    return this.authClient.send('ping', {});
  }

  @Get('event/ping')
  async pingEvent() {
    return this.eventClient.send('ping', {});
  }
}
