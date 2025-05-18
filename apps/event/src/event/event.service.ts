import { Injectable } from '@nestjs/common';
import { EventRepository } from './event.repository';
import { CreateEventDto } from './dto/create-event.dto';
import { ListEventQuery } from './dto/list-event.query';

@Injectable()
export class EventService {
  constructor(
    private readonly eventRepository: EventRepository,
  ) {}

  async createEvent(createEventDto: CreateEventDto) {
    return this.eventRepository.create(createEventDto);
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
    if (!event) throw new Error('Event not found');
    return event;
  }
}