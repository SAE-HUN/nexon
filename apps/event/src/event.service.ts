import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Event, EventDocument } from './schemas/event.schema';
import { CreateEventDto } from './dto/create-event.dto';
import { ListEventQuery } from './dto/list-event.query';

@Injectable()
export class EventService {
  constructor(
    @InjectModel(Event.name) private readonly eventModel: Model<EventDocument>,
  ) {}

  async createEvent(createEventDto: CreateEventDto): Promise<Event> {
    const createdEvent = new this.eventModel(createEventDto);
    return createdEvent.save();
  }

  async findAllEvents(listEventQuery: ListEventQuery): Promise<{
    total: number;
    page: number;
    pageSize: number;
    data: Event[];
  }> {
    const query: any = {};
    if (listEventQuery.isActive !== undefined) {
      query.isActive = listEventQuery.isActive;
    }
    if (listEventQuery.startedAt) {
      query.startedAt = { $gte: new Date(listEventQuery.startedAt) };
    }
    if (listEventQuery.endedAt) {
      query.endedAt = { $lte: new Date(listEventQuery.endedAt) };
    }
    const page = listEventQuery.page && listEventQuery.page > 0 ? listEventQuery.page : 1;
    const pageSize = listEventQuery.pageSize && listEventQuery.pageSize > 0 && listEventQuery.pageSize <= 100 ? listEventQuery.pageSize : 20;
    const sortBy = listEventQuery.sortBy || 'startedAt';
    const sortOrder = listEventQuery.sortOrder === 'asc' ? 1 : -1;
    const skip = (page - 1) * pageSize;
    const [data, total] = await Promise.all([
      this.eventModel
        .find(query)
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(pageSize)
        .exec(),
      this.eventModel.countDocuments(query),
    ]);
    return {
      total,
      page,
      pageSize,
      data,
    };
  }

  async findEventById(eventId: string): Promise<Event | null> {
    return this.eventModel.findById(eventId).exec();
  }
}
