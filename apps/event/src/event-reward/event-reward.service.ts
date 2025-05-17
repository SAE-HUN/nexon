import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { EventReward, EventRewardDocument } from './schema/event-reward.schema';
import { Event, EventDocument } from '../event/schema/event.schema';
import { Reward, RewardDocument } from '../reward/schema/reward.schema';
import { CreateEventRewardDto } from './dto/create-event-reward.dto';
import { ListEventRewardQuery } from './dto/list-event-reward.query';

@Injectable()
export class EventRewardService {
  constructor(
    @InjectModel(EventReward.name) private readonly eventRewardModel: Model<EventRewardDocument>,
    @InjectModel(Event.name) private readonly eventModel: Model<EventDocument>,
    @InjectModel(Reward.name) private readonly rewardModel: Model<RewardDocument>,
  ) {}

  async createEventReward(dto: CreateEventRewardDto): Promise<EventReward> {
    const { eventId, rewardId, qty } = dto;
    const exists = await this.eventRewardModel.findOne({ event: eventId, reward: rewardId });
    if (exists) throw new Error('This reward is already linked to the event.');
    const event = await this.eventModel.findById(eventId);
    if (!event) throw new Error('Event does not exist.');
    const reward = await this.rewardModel.findById(rewardId);
    if (!reward) throw new Error('Reward does not exist.');
    const eventReward = new this.eventRewardModel({ event: eventId, reward: rewardId, qty });
    return eventReward.save();
  }

  async listEventRewards(query: ListEventRewardQuery): Promise<{
    total: number;
    page: number;
    pageSize: number;
    data: EventReward[];
  }> {
    const { eventId, rewardId, page, pageSize } = query;
    const findQuery: any = {};
    if (eventId) findQuery.event = eventId;
    if (rewardId) findQuery.reward = rewardId;
    const sortBy = 'createdAt';
    const sortOrder = query.sortOrder === 'asc' ? 1 : -1;
    const skip = (page - 1) * pageSize;
    const [data, total] = await Promise.all([
      this.eventRewardModel
        .find(findQuery)
        .populate('event')
        .populate('reward')
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(pageSize)
        .exec(),
      this.eventRewardModel.countDocuments(findQuery),
    ]);
    return {
      total,
      page,
      pageSize,
      data,
    };
  }
} 