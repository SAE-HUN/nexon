import { Injectable, Inject } from '@nestjs/common';
import { RewardRequestRepository } from './reward-request.repository';
import { EventRewardRepository } from '../event-reward/event-reward.repository';
import { RewardRequest, RewardRequestStatus } from './schema/reward-request.schema';
import { CreateRewardRequestDto } from './dto/create-reward-request.dto';
import { ListRewardRequestQuery } from './dto/list-reward-request.query';
import { RejectRewardRequestDto } from './dto/reject-reward-request.dto';
import { ResultRewardRequestDto } from './dto/result-reward-request.dto';
import { RpcException } from '@nestjs/microservices';
import { ClientProxy } from '@nestjs/microservices';

@Injectable()
export class RewardRequestService {
  constructor(
    private readonly rewardRequestRepository: RewardRequestRepository,
    private readonly eventRewardRepository: EventRewardRepository,
    @Inject('GAME_SERVICE') private readonly gameClient: ClientProxy,
  ) {}

  async createRewardRequest(dto: CreateRewardRequestDto): Promise<RewardRequest> {
    const { eventRewardId, userId } = dto;
    const eventReward = await this.eventRewardRepository.findById(eventRewardId);
    if (!eventReward) throw new RpcException('EventReward not found');
    const exists = await this.rewardRequestRepository.findOne({ eventReward: eventRewardId, userId });
    if (exists) throw new RpcException('Duplicate reward request');
    return this.rewardRequestRepository.create({
      eventReward: eventRewardId as any,
      userId,
      status: RewardRequestStatus.PENDING,
      reason: null,
    });
  }

  async listRewardRequests(query: ListRewardRequestQuery): Promise<{
    total: number;
    page: number;
    pageSize: number;
    data: RewardRequest[];
  }> {
    const { userId, eventRewardId, status, page, pageSize, sortOrder } = query;
    const findQuery: any = {};
    if (userId) findQuery.userId = userId;
    if (eventRewardId) findQuery.eventReward = eventRewardId;
    if (status) findQuery.status = status;
    const sortBy = 'createdAt';
    const order = sortOrder === 'asc' ? 1 : -1;
    const skip = (page - 1) * pageSize;
    const [data, total] = await Promise.all([
      this.rewardRequestRepository.find(findQuery, sortBy, order, skip, pageSize),
      this.rewardRequestRepository.count(findQuery),
    ]);
    return {
      total,
      page,
      pageSize,
      data,
    };
  }

  async approveRewardRequest(rewardRequestId: string): Promise<RewardRequest> {
    const updated = await this.rewardRequestRepository.findOneAndUpdateWithPopulate(
      { _id: rewardRequestId, status: RewardRequestStatus.PENDING },
      { status: RewardRequestStatus.APPROVED },
      { new: true },
      ['eventReward']
    );
    if (!updated) {
      const exists = await this.rewardRequestRepository.exists({ _id: rewardRequestId });
      if (!exists) {
        throw new RpcException('RewardRequest not found');
      }
      throw new RpcException('Only PENDING requests can be approved');
    }
    const eventReward = updated.eventReward;
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
    const updated = await this.rewardRequestRepository.findOneAndUpdate(
      { _id: rewardRequestId, status: RewardRequestStatus.PENDING },
      { status: RewardRequestStatus.REJECTED, reason },
      { new: true }
    );
    if (!updated) {
      const exists = await this.rewardRequestRepository.exists({ _id: rewardRequestId });
      if (!exists) {
        throw new RpcException('RewardRequest not found');
      }
      throw new RpcException('Only PENDING requests can be rejected');
    }
    return updated;
  }

  async processRewardRequest(rewardRequestId: string): Promise<RewardRequest> {
    const updated = await this.rewardRequestRepository.findOneAndUpdate(
      { _id: rewardRequestId, status: RewardRequestStatus.APPROVED },
      { status: RewardRequestStatus.PROCESSING },
      { new: true }
    );
    if (!updated) {
      const exists = await this.rewardRequestRepository.exists({ _id: rewardRequestId });
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
    const updated = await this.rewardRequestRepository.findOneAndUpdate(
      { _id: rewardRequestId, status: RewardRequestStatus.PROCESSING },
      update,
      { new: true }
    );
    if (!updated) {
      const exists = await this.rewardRequestRepository.exists({ _id: rewardRequestId });
      if (!exists) {
        throw new RpcException('RewardRequest not found');
      }
      throw new RpcException('Only PROCESSING requests can be updated');
    }
    return updated;
  }
} 