import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Event, EventDocument } from './schemas/event.schema';
import { CreateEventDto } from './dto/create-event.dto';
import { ListEventQuery } from './dto/list-event.query';
import { Reward, RewardDocument } from './schemas/reward.schema';
import { EventReward, EventRewardDocument } from './schemas/event-reward.schema';
import { CreateEventRewardDto } from './dto/create-event-reward.dto';
import { ListEventRewardQuery } from './dto/list-event-reward.query';
import { RewardRequest, RewardRequestDocument, RewardRequestStatus } from './schemas/reward-request.schema';
import { CreateRewardRequestDto } from './dto/create-reward-request.dto';
import { RpcException } from '@nestjs/microservices';
import { ListRewardRequestQuery } from './dto/list-reward-request.query';

@Injectable()
export class EventService {
  constructor(
    @InjectModel(Event.name) private readonly eventModel: Model<EventDocument>,
    @InjectModel(Reward.name) private readonly rewardModel: Model<RewardDocument>,
    @InjectModel(EventReward.name) private readonly eventRewardModel: Model<EventRewardDocument>,
    @InjectModel(RewardRequest.name) private readonly rewardRequestModel: Model<RewardRequestDocument>,
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

  async findEventById(eventId: string): Promise<any> {
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

  async createEventReward(createEventRewardDto: CreateEventRewardDto): Promise<EventReward> {
    const { eventId, rewardId, qty } = createEventRewardDto;
    const exists = await this.eventRewardModel.findOne({ event: eventId, reward: rewardId });
    if (exists) throw new Error('This reward is already linked to the event.');

    const event = await this.eventModel.findById(eventId);
    if (!event) throw new Error('Event does not exist.');

    const reward = await this.rewardModel.findById(rewardId);
    if (!reward) throw new Error('Reward does not exist.');

    const eventReward = new this.eventRewardModel({ event: eventId, reward: rewardId, qty });
    return eventReward.save();
  }

  /**
   * Create a new reward request for a user
   */
  async createRewardRequest(createRewardRequestDto: CreateRewardRequestDto): Promise<RewardRequest> {
    const { eventId, rewardId, userId } = createRewardRequestDto;
    // 1. Check event exists
    const event = await this.eventModel.findById(eventId);
    if (!event) throw new RpcException('Event not found');

    // 2. Check event-reward exists
    const eventReward = await this.eventRewardModel.findById(rewardId);
    if (!eventReward) throw new RpcException('EventReward not found');

    // 3. Check duplicate request
    const exists = await this.rewardRequestModel.findOne({ event: eventId, reward: rewardId, userId });
    if (exists) throw new RpcException('Duplicate reward request');

    // 4. Create reward request
    const rewardRequest = new this.rewardRequestModel({
      event: eventId,
      reward: rewardId,
      userId,
      status: RewardRequestStatus.PENDING,
      reason: null,
    });
    return rewardRequest.save();
  }

  /**
   * List reward requests by query
   */
  async listRewardRequests(query: ListRewardRequestQuery): Promise<RewardRequest[]> {
    const findQuery: any = {};
    if (query.userId) findQuery.userId = query.userId;
    if (query.eventId) findQuery.event = query.eventId;
    if (query.rewardId) findQuery.reward = query.rewardId;
    if (query.status) findQuery.status = query.status;
    return this.rewardRequestModel
      .find(findQuery)
      .populate('event')
      .populate('reward')
      .exec();
  }
}
