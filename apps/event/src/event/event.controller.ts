import { Controller } from '@nestjs/common';
import { EventService } from './event.service';
import { MessagePattern, Payload, RpcException } from '@nestjs/microservices';
import { CreateEventDto } from './dto/create-event.dto';
import { ListEventQuery } from './dto/list-event.query';

@Controller()
export class EventController {
  constructor(
    private readonly eventService: EventService,
  ) {}

  @MessagePattern({ cmd: 'event.event.create' })
  async createEvent(@Payload() dto: CreateEventDto) {
    try {
      const event = await this.eventService.createEvent(dto);
      return { success: true, data: event };
    } catch (error) {
      throw new RpcException(error.message || 'Event creation failed');
    }
  }

  @MessagePattern({ cmd: 'event.event.list' })
  async listEvents(@Payload() query: ListEventQuery) {
    try {
      const result = await this.eventService.listEvents(query);
      return { success: true, ...result };
    } catch (error) {
      throw new RpcException(error.message || 'Event list fetch failed');
    }
  }

  @MessagePattern({ cmd: 'event.event.get' })
  async getEventDetail(@Payload() eventId: string) {
    try {
      const event = await this.eventService.getEventDetail(eventId);
      return { success: true, data: event };
    } catch (error) {
      throw new RpcException(error.message || 'Event detail fetch failed');
    }
  }
}
