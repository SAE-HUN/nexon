import { Controller } from '@nestjs/common';
import { MessagePattern, Payload, RpcException } from '@nestjs/microservices';
import { EventRewardService } from './event-reward.service';
import { CreateEventRewardDto } from './dto/create-event-reward.dto';
import { ListEventRewardQuery } from './dto/list-event-reward.query';

@Controller()
export class EventRewardController {
  constructor(private readonly eventRewardService: EventRewardService) {}

  @MessagePattern({ cmd: 'event.event-reward.create' })
  async createEventReward(@Payload() dto: CreateEventRewardDto) {
    return await this.eventRewardService.createEventReward(dto);
  }

  @MessagePattern({ cmd: 'event.event-reward.list' })
  async listEventRewards(@Payload() query: ListEventRewardQuery) {
    return await this.eventRewardService.listEventRewards(query);
  }
} 