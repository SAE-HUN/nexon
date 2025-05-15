import { Controller, Get, UseGuards } from '@nestjs/common';
import { GatewayService } from './gateway.service';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from './roles.decorator';

@Controller()
export class GatewayController {
  constructor(private readonly gatewayService: GatewayService) {}

  @UseGuards(AuthGuard('jwt'))
  @Roles('ADMIN')
  @Get()
  getHello(): string {
    return this.gatewayService.getHello();
  }

  @Get('health')
  healthCheck(): string {
    return 'OK';
  }
}
