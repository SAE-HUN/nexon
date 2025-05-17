import { Injectable, Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RewardRequest, RewardRequestDocument, RewardRequestStatus } from './schema/reward-request.schema';
import { Event, EventDocument } from '../event/schema/event.schema';
import { EventReward, EventRewardDocument } from '../event-reward/schema/event-reward.schema';
import { Reward } from '../reward/schema/reward.schema';
import { CreateRewardRequestDto } from './dto/create-reward-request.dto';
import { ListRewardRequestQuery } from './dto/list-reward-request.query';
import { RejectRewardRequestDto } from './dto/reject-reward-request.dto';
import { ResultRewardRequestDto } from './dto/result-reward-request.dto';
import { RpcException } from '@nestjs/microservices';
import { ClientProxy } from '@nestjs/microservices';

@Injectable()
export class RewardRequestService {
  constructor(
    @InjectModel(RewardRequest.name) private readonly rewardRequestModel: Model<RewardRequestDocument>,
    @InjectModel(Event.name) private readonly eventModel: Model<EventDocument>,
    @InjectModel(EventReward.name) private readonly eventRewardModel: Model<EventRewardDocument>,
    @Inject('GAME_SERVICE') private readonly gameClient: ClientProxy,
  ) {}

  async createRewardRequest(dto: CreateRewardRequestDto): Promise<RewardRequest> {
    const { eventId, rewardId, userId } = dto;
    const event = await this.eventModel.findById(eventId);
    if (!event) throw new RpcException('Event not found');
    const eventReward = await this.eventRewardModel.findById(rewardId);
    if (!eventReward) throw new RpcException('EventReward not found');
    const exists = await this.rewardRequestModel.findOne({ event: eventId, reward: rewardId, userId });
    if (exists) throw new RpcException('Duplicate reward request');
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