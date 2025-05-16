import { Controller } from '@nestjs/common';
import { EventService } from './event.service';
import { MessagePattern, Payload, RpcException } from '@nestjs/microservices';
import { CreateEventDto } from './dto/create-event.dto';
import { ListEventQuery } from './dto/list-event.query';
import { CreateEventRewardDto } from './dto/create-event-reward.dto';

@Controller()
export class EventController {
  constructor(
    private readonly eventService: EventService,
  ) {}

  @MessagePattern({ cmd: 'event_create' })
  async createEvent(@Payload() createEventDto: CreateEventDto) {
    try {
      const event = await this.eventService.createEvent(createEventDto);
      return { success: true, data: event };
    } catch (error) {
      throw new RpcException(error.message || 'Event creation failed');
    }
  }

  @MessagePattern({ cmd: 'event_list' })
  async listEvents(@Payload() listEventQuery: ListEventQuery) {
    try {
      const result = await this.eventService.findAllEvents(listEventQuery);
      return { success: true, ...result };
    } catch (error) {
      throw new RpcException(error.message || 'Event list fetch failed');
    }
  }

  @MessagePattern({ cmd: 'event_detail' })
  async getEventDetail(@Payload() eventId: string) {
    try {
      const event = await this.eventService.findEventById(eventId);
      if (!event) {
        throw new RpcException('Event not found');
      }
      return { success: true, data: event };
    } catch (error) {
      throw new RpcException(error.message || 'Event detail fetch failed');
    }
  }

  @MessagePattern({ cmd: 'event_reward_create' })
  async createEventReward(@Payload() dto: CreateEventRewardDto) {
    try {
      const result = await this.eventService.createEventReward(dto);
      return { success: true, data: result };
    } catch (error) {
      throw new RpcException(error.message || '이벤트-보상 연결 실패');
    }
  }
}
