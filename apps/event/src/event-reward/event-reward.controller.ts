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
    try {
      const result = await this.eventRewardService.createEventReward(dto);
      return { success: true, data: result };
    } catch (error) {
      throw new RpcException(error.message || '이벤트-보상 연결 실패');
    }
  }

  @MessagePattern({ cmd: 'event.event-reward.list' })
  async listEventRewards(@Payload() query: ListEventRewardQuery) {
    try {
      const result = await this.eventRewardService.listEventRewards(query);
      return { success: true, ...result };
    } catch (error) {
      throw new RpcException(error.message || 'EventReward list fetch failed');
    }
  }
} 