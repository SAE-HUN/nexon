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

@Injectable()
export class EventService {
  constructor(
    @InjectModel(Event.name) private readonly eventModel: Model<EventDocument>,
    @InjectModel(Reward.name) private readonly rewardModel: Model<RewardDocument>,
    @InjectModel(EventReward.name) private readonly eventRewardModel: Model<EventRewardDocument>,
    @InjectModel(RewardRequest.name) private readonly rewardRequestModel: Model<RewardRequestDocument>,
    @Inject('GAME_SERVICE') private readonly gameClient: ClientProxy,
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

  /**
   * Rejects a pending reward request atomically using findOneAndUpdate.
   * @param dto RejectRewardRequestDto
   * @returns Updated RewardRequest document
   */
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

  /**
   * @param rewardRequestId string
   * @returns Updated RewardRequest document
   */
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

  /**
   * Handles the result of a reward request (success/failure) from external system.
   * Only updates if current status is PROCESSING (idempotent).
   * @param dto ResultRewardRequestDto
   * @returns Updated RewardRequest document
   */
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

  /**
   * Approves a pending reward request atomically using findOneAndUpdate.
   * @param rewardRequestId string
   * @returns Updated RewardRequest document
   */
  async approveRewardRequest(rewardRequestId: string): Promise<RewardRequest> {
    const session = await this.rewardRequestModel.db.startSession();
    session.startTransaction();
    try {
      const updated = await this.rewardRequestModel.findOneAndUpdate(
        { _id: rewardRequestId, status: RewardRequestStatus.PENDING },
        { status: RewardRequestStatus.APPROVED },
        { new: true, session }
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
      await session.commitTransaction();
      return updated;
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  }
}
