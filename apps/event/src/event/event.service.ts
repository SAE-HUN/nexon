import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Event, EventDocument } from './schema/event.schema';
import { CreateEventDto } from './dto/create-event.dto';
import { ListEventQuery } from './dto/list-event.query';
import { EventReward } from '../event-reward/schema/event-reward.schema';
import { EventRewardDocument } from '../event-reward/schema/event-reward.schema';
import { Reward } from '../reward/schema/reward.schema';

@Injectable()
export class EventService {
  constructor(
    @InjectModel(Event.name) private readonly eventModel: Model<EventDocument>,
    @InjectModel(EventReward.name) private readonly eventRewardModel: Model<EventRewardDocument>,
  ) {}

  async createEvent(createEventDto: CreateEventDto): Promise<Event> {
    const createdEvent = new this.eventModel(createEventDto);
    return createdEvent.save();
  }

  async listEvents(query: ListEventQuery): Promise<{
    total: number;
    page: number;
    pageSize: number;
    data: Event[];
  }> {
    const { isActive, startedAt, endedAt, page, pageSize, sortBy } = query;
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
    const sortOrder = query.sortOrder === 'asc' ? 1 : -1;
    const skip = (page - 1) * pageSize;
    const [data, total] = await Promise.all([
      this.eventModel
        .find(findQuery)
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(pageSize)
        .exec(),
      this.eventModel.countDocuments(findQuery),
    ]);
    return {
      total,
      page,
      pageSize,
      data,
    };
  }

  async getEventDetail(eventId: string): Promise<any> {
    const event = await this.eventModel.findById(eventId).exec();
    if (!event) throw new Error('Event not found');
    
    const eventRewards = await this.eventRewardModel.find({ event: eventId }).populate(Reward.name.toLowerCase()).exec();
    const rewardsWithQty = eventRewards.map(er => {
      const rewardObj = (er.reward as any).toObject ? (er.reward as any).toObject() : er.reward;
      return {
        ...rewardObj,
        qty: er.qty
      };
    });
    return { ...event.toObject(), rewards: rewardsWithQty };
  }
}