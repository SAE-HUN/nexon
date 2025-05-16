import { Controller, Get, Post, Body, Patch, UseGuards } from '@nestjs/common';
import { GatewayService } from './gateway.service';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from './roles.decorator';
import { RolesGuard } from './roles.guard';

@Controller()
export class GatewayController {
  constructor(
    private readonly gatewayService: GatewayService,
  ) {}
  
  @Get()
  getHello(): string {
    return this.gatewayService.getHello();
  }

  @Post('auth/signup')
  async signUp(@Body() body: any) {
    return this.gatewayService.proxy('auth_signup', body);
  }

  @Post('auth/login')
  async login(@Body() body: any) {
    return this.gatewayService.proxy('auth_login', body);
  }

  @Patch('auth/change-role')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  async changeUserRole(@Body() body: any) {
    return this.gatewayService.proxy('auth_change_role', body);
  }
}
