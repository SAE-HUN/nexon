import { Controller } from '@nestjs/common';
import { EventService } from './event.service';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { CreateEventDto } from './dto/create-event.dto';
import { ListEventQuery } from './dto/list-event.dto';

@Controller()
export class EventController {
  constructor(private readonly eventService: EventService) {}

  @MessagePattern({ cmd: 'event.hello' })
  async getHello() {
    return 'Hello, World!';
  }

  @MessagePattern({ cmd: 'event.event.create' })
  async createEvent(@Payload() dto: CreateEventDto) {
    return await this.eventService.createEvent(dto);
  }

  @MessagePattern({ cmd: 'event.event.list' })
  async listEvents(@Payload() query: ListEventQuery) {
    return await this.eventService.listEvents(query);
  }

  @MessagePattern({ cmd: 'event.event.get' })
  async getEventDetail(@Payload() eventId: string) {
    return await this.eventService.getEventDetail(eventId);
  }

  @MessagePattern({ cmd: 'event.event.check-condition' })
  async checkUserEventCondition(
    @Payload() payload: { eventId: string; userId: string },
  ) {
    return await this.eventService.checkUserEventCondition(
      payload.eventId,
      payload.userId,
    );
  }
}
