import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { CreateEventRewardDto } from './dto/create-event-reward.dto';
import { ListEventRewardQuery } from './dto/list-event-reward.dto';
import { EventRewardService } from './event-reward.service';

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
