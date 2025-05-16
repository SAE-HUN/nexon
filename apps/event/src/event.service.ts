import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Event, EventDocument } from './schemas/event.schema';
import { CreateEventDto } from './dto/create-event.dto';
import { ListEventDto } from './dto/list-event.dto';

@Injectable()
export class EventService {
  constructor(
    @InjectModel(Event.name) private readonly eventModel: Model<EventDocument>,
  ) {}

  async createEvent(createEventDto: CreateEventDto): Promise<Event> {
    const createdEvent = new this.eventModel(createEventDto);
    return createdEvent.save();
  }

  async findAllEvents(listEventDto: ListEventDto): Promise<{
    total: number;
    page: number;
    pageSize: number;
    data: Event[];
  }> {
    const query: any = {};
    if (listEventDto.isActive !== undefined) {
      query.isActive = listEventDto.isActive;
    }
    if (listEventDto.startedAt) {
      query.startedAt = { $gte: new Date(listEventDto.startedAt) };
    }
    if (listEventDto.endedAt) {
      query.endedAt = { $lte: new Date(listEventDto.endedAt) };
    }
    const skip = (listEventDto.page - 1) * listEventDto.pageSize;
    const [data, total] = await Promise.all([
      this.eventModel
        .find(query)
        .sort({ [listEventDto.sortBy]: listEventDto.sortOrder === 'asc' ? 1 : -1 })
        .skip(skip)
        .limit(listEventDto.pageSize)
        .exec(),
      this.eventModel.countDocuments(query),
    ]);
    return {
      total,
      page: listEventDto.page,
      pageSize: listEventDto.pageSize,
      data,
    };
  }

  async findEventById(eventId: string): Promise<Event | null> {
    return this.eventModel.findById(eventId).exec();
  }
}
