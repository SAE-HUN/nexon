import { Injectable } from '@nestjs/common';
import { EventRepository } from './event.repository';
import { CreateEventDto } from './dto/create-event.dto';
import { ListEventQuery } from './dto/list-event.query';
import { RpcException } from '@nestjs/microservices';

@Injectable()
export class EventService {
  constructor(
    private readonly eventRepository: EventRepository,
  ) {}

  async createEvent(createEventDto: CreateEventDto) {
    return await this.eventRepository.create(createEventDto);
  }

  async listEvents(query: ListEventQuery) {
    const { isActive, startedAt, endedAt, page, pageSize, sortBy, sortOrder } = query;
    const findQuery: any = {};
    if (isActive !== undefined) {
      findQuery.isActive = isActive;
    }
    if (startedAt) {
      findQuery.startedAt = { $gte: new Date(startedAt) };
    }
    if (endedAt) {
      findQuery.endedAt = { $lte: new Date(endedAt) };
    }
    const order = sortOrder === 'asc' ? 1 : -1;
    const skip = (page - 1) * pageSize;
    const [data, total] = await Promise.all([
      this.eventRepository.find(findQuery, sortBy, order, skip, pageSize),
      this.eventRepository.count(findQuery),
    ]);
    return {
      total,
      page,
      pageSize,
      data,
    };
  }

  async getEventDetail(eventId: string) {
    const event = await this.eventRepository.findById(eventId);
    if (!event) throw new RpcException({ message: 'Event not found', status: 404 });
    return event;
  }
}