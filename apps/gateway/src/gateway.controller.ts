import { Controller, Get, UseGuards } from '@nestjs/common';
import { GatewayService } from './gateway.service';
import { AuthGuard } from '@nestjs/passport';

@Controller()
export class GatewayController {
  constructor(private readonly gatewayService: GatewayService) {}

  @UseGuards(AuthGuard('jwt'))
  @Get()
  getHello(): string {
    return this.gatewayService.getHello();
  }

  @Get('health')
  healthCheck(): string {
    return 'OK';
  }
}
