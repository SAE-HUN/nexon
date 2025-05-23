import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { EventRewardRepository } from '../event-reward/event-reward.repository';
import { EventService } from '../event/event.service';
import { CreateRewardRequestDto } from './dto/create-reward-request.dto';
import { ListRewardRequestQuery } from './dto/list-reward-request.dto';
import { RejectRewardRequestDto } from './dto/reject-reward-request.dto';
import { ResultRewardRequestDto } from './dto/result-reward-request.dto';
import { RewardRequestRepository } from './reward-request.repository';
import {
  RewardRequest,
  RewardRequestStatus,
} from './schema/reward-request.schema';

@Injectable()
export class RewardRequestService {
  constructor(
    private readonly rewardRequestRepository: RewardRequestRepository,
    private readonly eventRewardRepository: EventRewardRepository,
    private readonly eventService: EventService,
    @Inject('GAME_SERVICE') private readonly gameClient: ClientProxy,
  ) {}

  async createRewardRequest(
    dto: CreateRewardRequestDto,
  ): Promise<RewardRequest> {
    const { eventRewardId, userId } = dto;
    const eventReward =
      await this.eventRewardRepository.findById(eventRewardId);
    if (!eventReward)
      throw new RpcException({ message: 'EventReward not found', status: 404 });
    const exists = await this.rewardRequestRepository.exists({
      eventReward: eventRewardId,
      userId,
    });
    if (exists)
      throw new RpcException({
        message: 'Duplicate reward request',
        status: 400,
      });
    const eventId = eventReward.event.toString();
    const conditionResult = await this.eventService.checkUserEventCondition(
      eventId,
      userId,
    );
    if (!conditionResult.success) {
      throw new RpcException({
        message: 'Event condition not met',
        detail: conditionResult.detail,
        status: 400,
      });
    }

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
    const {
      userId,
      eventId,
      rewardId,
      status,
      sortOrder = 'desc',
      page = 1,
      pageSize = 20,
    } = query;
    const findQuery: any = {};
    if (userId) findQuery.userId = userId;
    if (status) findQuery.status = status;

    let eventRewardIds: string[] | undefined = undefined;
    if (eventId || rewardId) {
      const eventRewardQuery: any = {};
      if (eventId) eventRewardQuery.event = eventId;
      if (rewardId) eventRewardQuery.reward = rewardId;
      const eventRewards =
        await this.eventRewardRepository.findIds(eventRewardQuery);
      eventRewardIds = eventRewards.map((er) => er._id.toString());
      if (eventRewardIds.length === 0) {
        return {
          total: 0,
          page,
          pageSize,
          data: [],
        };
      }
      findQuery.eventReward = { $in: eventRewardIds };
    }
    const sortBy = 'createdAt';
    const order = sortOrder === 'asc' ? 1 : -1;
    const skip = (page - 1) * pageSize;
    const [data, total] = await Promise.all([
      this.rewardRequestRepository.findWithPopulate(
        findQuery,
        sortBy,
        order,
        skip,
        pageSize,
      ),
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
    const updated =
      await this.rewardRequestRepository.findOneAndUpdateWithPopulate(
        { _id: rewardRequestId, status: RewardRequestStatus.PENDING },
        { status: RewardRequestStatus.APPROVED },
        { new: true },
        [
          {
            path: 'eventReward',
            populate: [{ path: 'event' }, { path: 'reward' }],
          },
        ],
      );
    if (!updated) {
      const exists = await this.rewardRequestRepository.exists({
        _id: rewardRequestId,
      });
      if (!exists) {
        throw new RpcException({
          message: 'RewardRequest not found',
          status: 404,
        });
      }
      throw new RpcException({
        message: 'Only PENDING requests can be approved',
        status: 400,
      });
    }

    const eventReward = updated.eventReward;
    const reward = eventReward.reward;
    const type = reward.type;
    const name = reward.name;
    const qty = eventReward.qty;
    await firstValueFrom(
      this.gameClient.send(reward.cmd, {
        userId: updated.userId,
        eventId: eventReward.event._id,
        rewardId: reward._id,
        type,
        name,
        qty,
        processing: {
          cmd: 'event.reward-request.process',
          payload: updated._id,
        },
        callback: {
          cmd: 'event.reward-request.result',
          payload: {
            rewardRequestId: updated._id,
          },
        },
      }),
    );

    return updated;
  }

  async rejectRewardRequest(
    dto: RejectRewardRequestDto,
  ): Promise<RewardRequest> {
    const { rewardRequestId, reason } = dto;
    const updated = await this.rewardRequestRepository.findOneAndUpdate(
      { _id: rewardRequestId, status: RewardRequestStatus.PENDING },
      { status: RewardRequestStatus.REJECTED, reason },
      { new: true },
    );
    if (!updated) {
      const exists = await this.rewardRequestRepository.exists({
        _id: rewardRequestId,
      });
      if (!exists) {
        throw new RpcException({
          message: 'RewardRequest not found',
          status: 400,
        });
      }
      throw new RpcException({
        message: 'Only PENDING requests can be rejected',
        status: 400,
      });
    }
    return updated;
  }

  async processRewardRequest(rewardRequestId: string): Promise<RewardRequest> {
    const updated = await this.rewardRequestRepository.findOneAndUpdate(
      { _id: rewardRequestId, status: RewardRequestStatus.APPROVED },
      { status: RewardRequestStatus.PROCESSING },
      { new: true },
    );
    if (!updated) {
      const exists = await this.rewardRequestRepository.exists({
        _id: rewardRequestId,
      });
      if (!exists) {
        throw new RpcException({
          message: 'RewardRequest not found',
          status: 400,
        });
      }
      throw new RpcException({
        message: 'Only APPROVED requests can be processed',
        status: 400,
      });
    }
    return updated;
  }

  async handleRewardRequestResult(
    dto: ResultRewardRequestDto,
  ): Promise<RewardRequest> {
    const { rewardRequestId, status, reason } = dto;
    let update: Partial<RewardRequest> = {};
    const filter: any = { _id: rewardRequestId };
    if (status === 'SUCCESS') {
      update = { status: RewardRequestStatus.SUCCESS, reason: null };
      filter.status = RewardRequestStatus.PROCESSING;
    } else if (status === 'FAILED') {
      update = {
        status: RewardRequestStatus.FAILED,
        reason: reason || 'Unknown failure',
      };
      filter.status = {
        $in: [RewardRequestStatus.PROCESSING, RewardRequestStatus.APPROVED],
      };
    } else {
      throw new RpcException({ message: 'Invalid status', status: 400 });
    }
    const updated = await this.rewardRequestRepository.findOneAndUpdate(
      filter,
      update,
      { new: true },
    );
    if (!updated) {
      const exists = await this.rewardRequestRepository.exists({
        _id: rewardRequestId,
      });
      if (!exists) {
        throw new RpcException({
          message: 'RewardRequest not found',
          status: 400,
        });
      }
      throw new RpcException({
        message: 'Only PROCESSING requests can be updated',
        status: 400,
      });
    }
    return updated;
  }
}
