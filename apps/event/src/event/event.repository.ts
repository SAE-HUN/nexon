import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Event, EventDocument } from './schema/event.schema';
import { CreateEventDto } from './dto/create-event.dto';

@Injectable()
export class EventRepository {
  constructor(
    @InjectModel(Event.name)
    private readonly eventModel: Model<EventDocument>,
  ) {}

  async create(createEventDto: CreateEventDto): Promise<Event> {
    const createdEvent = new this.eventModel(createEventDto);
    return createdEvent.save();
  }

  async find(
    query: any,
    sortBy: string,
    sortOrder: 1 | -1,
    skip: number,
    limit: number,
  ): Promise<Event[]> {
    return this.eventModel
      .find(query)
      .sort({ [sortBy]: sortOrder } as any)
      .skip(skip)
      .limit(limit)
      .exec();
  }

  async count(query: any): Promise<number> {
    return this.eventModel.countDocuments(query);
  }

  async findById(eventId: string): Promise<Event | null> {
    return this.eventModel.findById(eventId).exec();
  }

  async exists(filter: any): Promise<boolean> {
    return !!(await this.eventModel.exists(filter));
  }
}
