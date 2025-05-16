import { Controller, Get } from '@nestjs/common';
import { EventService } from './event.service';
import { MessagePattern, Payload, RpcException } from '@nestjs/microservices';
import { CreateEventDto } from './dto/create-event.dto';
import { ListEventDto } from './dto/list-event.dto';

@Controller()
export class EventController {
  constructor(private readonly eventService: EventService) {}

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
  async listEvents(@Payload() listEventDto: ListEventDto) {
    try {
      const result = await this.eventService.findAllEvents(listEventDto);
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
}
