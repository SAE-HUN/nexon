import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { EventReward, EventRewardDocument } from './schema/event-reward.schema';

@Injectable()
export class EventRewardRepository {
  constructor(
    @InjectModel(EventReward.name)
    private readonly eventRewardModel: Model<EventRewardDocument>,
  ) {}

  async findWithRewardPopulate(query: any): Promise<EventReward[]> {
    return this.eventRewardModel.find(query).populate('reward').exec();
  }

  async create(eventId: string, rewardId: string, qty: number): Promise<EventReward> {
    const eventReward = new this.eventRewardModel({ event: eventId, reward: rewardId, qty });
    return eventReward.save();
  }

  async findOne(query: any): Promise<EventReward | null> {
    return this.eventRewardModel.findOne(query).exec();
  }

  async findWithPopulateAndPaging(query: any, sortBy: string, sortOrder: 1 | -1, skip: number, limit: number): Promise<EventReward[]> {
    return this.eventRewardModel
      .find(query)
      .populate('event')
      .populate('reward')
      .sort({ [sortBy]: sortOrder } as any)
      .skip(skip)
      .limit(limit)
      .exec();
  }

  async count(query: any): Promise<number> {
    return this.eventRewardModel.countDocuments(query);
  }

  async findById(id: string): Promise<EventReward | null> {
    return this.eventRewardModel.findById(id).exec();
  }

  async exists(filter: any): Promise<boolean> {
    return !!(await this.eventRewardModel.exists(filter));
  }

  async findIds(query: any): Promise<{ _id: any }[]> {
    return this.eventRewardModel.find(query).select('_id').exec();
  }
} 