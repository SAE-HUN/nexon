import { Injectable, Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Event, EventDocument } from './schemas/event.schema';
import { CreateEventDto } from './dto/create-event.dto';
import { ListEventQuery } from './dto/list-event.query';
import { Reward, RewardDocument } from './schemas/reward.schema';
import { EventReward, EventRewardDocument } from './schemas/event-reward.schema';
import { CreateEventRewardDto } from './dto/create-event-reward.dto';
import { RewardRequest, RewardRequestDocument, RewardRequestStatus } from './schemas/reward-request.schema';
import { CreateRewardRequestDto } from './dto/create-reward-request.dto';
import { RpcException } from '@nestjs/microservices';
import { ListRewardRequestQuery } from './dto/list-reward-request.query';
import { RejectRewardRequestDto } from './dto/reject-reward-request.dto';
import { ResultRewardRequestDto } from './dto/result-reward-request.dto';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { ListEventRewardQuery } from './dto/list-event-reward.query';
import { ListRewardQuery } from './dto/list-reward.query';

@Injectable()
export class EventService {
  constructor(
    @InjectModel(Event.name) private readonly eventModel: Model<EventDocument>,
    @InjectModel(Reward.name) private readonly rewardModel: Model<RewardDocument>,
    @InjectModel(EventReward.name) private readonly eventRewardModel: Model<EventRewardDocument>,
    @InjectModel(RewardRequest.name) private readonly rewardRequestModel: Model<RewardRequestDocument>,
    @Inject('GAME_SERVICE') private readonly gameClient: ClientProxy,
  ) {}

  // ===== Event =====
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

  // ===== Event-Reward =====
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

  // ===== Reward =====
  async listRewards(query: ListRewardQuery): Promise<{
    total: number;
    page: number;
    pageSize: number;
    data: Reward[];
  }> {
    const { type, page, pageSize } = query;
    const findQuery: any = {};
    if (type) findQuery.type = type;
    
    const sortBy = 'createdAt';
    const sortOrder = query.sortOrder === 'asc' ? 1 : -1;
    const skip = (page - 1) * pageSize;
    const [data, total] = await Promise.all([
      this.rewardModel
        .find(findQuery)
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(pageSize)
        .exec(),
      this.rewardModel.countDocuments(findQuery),
    ]);
    return {
      total,
      page,
      pageSize,
      data,
    };
  }

  // ===== Reward-Request =====
  async createRewardRequest(dto: CreateRewardRequestDto): Promise<RewardRequest> {
    const { eventId, rewardId, userId } = dto;
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

  async listRewardRequests(query: ListRewardRequestQuery): Promise<{
    total: number;
    page: number;
    pageSize: number;
    data: RewardRequest[];
  }> {
    const { userId, eventId, rewardId, status, page, pageSize } = query;
    const findQuery: any = {};
    if (userId) findQuery.userId = userId;
    if (eventId) findQuery.event = eventId;
    if (rewardId) findQuery.reward = rewardId;
    if (status) findQuery.status = status;
    
    const sortBy = 'createdAt';
    const sortOrder = query.sortOrder === 'asc' ? 1 : -1;
    const skip = (page - 1) * pageSize;
    const [data, total] = await Promise.all([
      this.rewardRequestModel
        .find(findQuery)
        .populate(Event.name.toLowerCase())
        .populate(Reward.name.toLowerCase())
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(pageSize)
        .exec(),
      this.rewardRequestModel.countDocuments(findQuery),
    ]);
    return {
      total,
      page,
      pageSize,
      data,
    };
  }

  async approveRewardRequest(rewardRequestId: string): Promise<RewardRequest> {
    const updated = await this.rewardRequestModel.findOneAndUpdate(
      { _id: rewardRequestId, status: RewardRequestStatus.PENDING },
      { status: RewardRequestStatus.APPROVED },
      { new: true }
    )
      .populate(Event.name.toLowerCase())
      .populate(Reward.name.toLowerCase());
    if (!updated) {
      const exists = await this.rewardRequestModel.exists({ _id: rewardRequestId });
      if (!exists) {
        throw new RpcException('RewardRequest not found');
      }
      throw new RpcException('Only PENDING requests can be approved');
    }
    
    const eventReward = updated.reward;
    const reward = eventReward.reward;
    const type = reward.type;
    const name = reward.name;
    const qty = eventReward.qty;
    // await firstValueFrom(this.gameClient.send(reward.cmd, {
    //   userId: updated.userId,
    //   eventId: updated.event._id,
    //   rewardId: reward._id,
    //   type,
    //   name,
    //   qty,
    //   processing: { cmd: 'event.reward-request.process', payload: {
    //     rewardRequestId: updated._id,
    //   } },
    //   callback: { cmd: 'event.reward-request.result', payload: {
    //     rewardRequestId: updated._id,
    //   } },
    // }));
    return updated;
  }

  async rejectRewardRequest(dto: RejectRewardRequestDto): Promise<RewardRequest> {
    const { rewardRequestId, reason } = dto;
    const updated = await this.rewardRequestModel.findOneAndUpdate(
      { _id: rewardRequestId, status: RewardRequestStatus.PENDING },
      { status: RewardRequestStatus.REJECTED, reason },
      { new: true }
    );
    if (!updated) {
      // Check if the request exists at all for better error message
      const exists = await this.rewardRequestModel.exists({ _id: rewardRequestId });
      if (!exists) {
        throw new RpcException('RewardRequest not found');
      }
      throw new RpcException('Only PENDING requests can be rejected');
    }
    return updated;
  }

  async processRewardRequest(rewardRequestId: string): Promise<RewardRequest> {
    const updated = await this.rewardRequestModel.findOneAndUpdate(
      { _id: rewardRequestId, status: RewardRequestStatus.APPROVED },
      { status: RewardRequestStatus.PROCESSING },
      { new: true }
    );
    if (!updated) {
      const exists = await this.rewardRequestModel.exists({ _id: rewardRequestId });
      if (!exists) {
        throw new RpcException('RewardRequest not found');
      }
      throw new RpcException('Only APPROVED requests can be processed');
    }
    return updated;
  }

  async handleRewardRequestResult(dto: ResultRewardRequestDto): Promise<RewardRequest> {
    const { rewardRequestId, status, reason } = dto;
    let update: Partial<RewardRequest> = {};
    if (status === 'SUCCESS') {
      update = { status: RewardRequestStatus.SUCCESS, reason: null };
    } else if (status === 'FAILED') {
      update = { status: RewardRequestStatus.FAILED, reason: reason || 'Unknown failure' };
    } else {
      throw new RpcException('Invalid status');
    }
    const updated = await this.rewardRequestModel.findOneAndUpdate(
      { _id: rewardRequestId, status: RewardRequestStatus.PROCESSING },
      update,
      { new: true }
    );
    if (!updated) {
      const exists = await this.rewardRequestModel.exists({ _id: rewardRequestId });
      if (!exists) {
        throw new RpcException('RewardRequest not found');
      }
      throw new RpcException('Only PROCESSING requests can be updated');
    }
    return updated;
  }
}
