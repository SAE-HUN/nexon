import { Controller, Get, Post, Body, Patch, UseGuards, Query, Param } from '@nestjs/common';
import { GatewayService } from './gateway.service';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from './roles.decorator';
import { RolesGuard } from './roles.guard';
import { CreateEventDto } from '../../event/src/dto/create-event.dto';
import { ListEventQuery } from '../../event/src/dto/list-event.query';
import { CreateEventRewardDto } from '../../event/src/dto/create-event-reward.dto';
import { CreateRewardRequestDto } from '../../event/src/dto/create-reward-request.dto';
import { ListRewardRequestQuery } from '../../event/src/dto/list-reward-request.query';
import { LoginDto } from '../../auth/src/dto/login.dto';
import { ChangeUserRoleDto } from '../../auth/src/dto/change-user-role.dto';
import { CreateUserDto } from '../../auth/src/dto/create-user.dto';
import { ApiBearerAuth, ApiOperation, ApiBody, ApiResponse } from '@nestjs/swagger';
import { RejectRewardRequestDto } from '../../event/src/dto/reject-reward-request.dto';
import { ListRewardQuery } from '../../event/src/dto/list-reward.query';
import { ListEventRewardQuery } from '../../event/src/dto/list-event-reward.query';

@ApiBearerAuth()
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
  async signUp(@Body() signUpDto: CreateUserDto) {
    return this.gatewayService.proxyToAuth('auth.user.signup', signUpDto);
  }

  @Post('auth/login')
  async login(@Body() loginDto: LoginDto) {
    return this.gatewayService.proxyToAuth('auth.user.login', loginDto);
  }

  @Patch('auth/change-role')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  async changeUserRole(@Body() changeUserRoleDto: ChangeUserRoleDto) {
    return this.gatewayService.proxyToAuth('auth.user.change-role', changeUserRoleDto);
  }

  @Post('event')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN', 'OPERATOR')
  async createEvent(@Body() createEventDto: CreateEventDto) {
    return this.gatewayService.proxyToEvent('event.event.create', createEventDto);
  }

  @Get('event')
  @UseGuards(AuthGuard('jwt'))
  async listEvents(@Query() query: ListEventQuery) {
    return this.gatewayService.proxyToEvent('event.event.list', query);
  }

  @Get('event/:eventId')
  @UseGuards(AuthGuard('jwt'))
  async getEventDetail(@Param('eventId') eventId: string) {
    return this.gatewayService.proxyToEvent('event.event.get', eventId);
  }

  @Post('event-reward')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN', 'OPERATOR')
  async createEventReward(
    @Body() dto: CreateEventRewardDto
  ) {
    return this.gatewayService.proxyToEvent('event.event-reward.create', dto);
  }

  @Post('reward-request')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('USER')
  async createRewardRequest(@Body() dto: CreateRewardRequestDto) {
    return this.gatewayService.proxyToEvent('event.reward-request.create', dto);
  }

  @Get('reward-request')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  async listRewardRequests(@Query() query: ListRewardRequestQuery) {
    return this.gatewayService.proxyToEvent('event.reward-request.list', query);
  }

  @Patch('reward-request/reject')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN', 'OPERATOR', 'AUDITOR')
  async rejectRewardRequest(@Body() dto: RejectRewardRequestDto) {
    return this.gatewayService.proxyToEvent('event.reward-request.reject', dto);
  }

  @Patch('reward-request/approve')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN', 'OPERATOR', 'AUDITOR')
  async approveRewardRequest(@Body('rewardRequestId') rewardRequestId: string) {
    return this.gatewayService.proxyToEvent('event.reward-request.approve', rewardRequestId);
  }

  @Get('reward')
  @UseGuards(AuthGuard('jwt'))
  async listRewards(@Query() query: ListRewardQuery) {
    return this.gatewayService.proxyToEvent('event.reward.list', query);
  }

  @Get('event-reward')
  @UseGuards(AuthGuard('jwt'))
  async listEventRewards(@Query() query: ListEventRewardQuery) {
    return this.gatewayService.proxyToEvent('event.event-reward.list', query);
  }
}
