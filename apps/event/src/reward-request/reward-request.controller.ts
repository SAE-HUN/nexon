import { Controller } from '@nestjs/common';
import { MessagePattern, Payload, RpcException } from '@nestjs/microservices';
import { RewardRequestService } from './reward-request.service';
import { CreateRewardRequestDto } from './dto/create-reward-request.dto';
import { ListRewardRequestQuery } from './dto/list-reward-request.query';
import { RejectRewardRequestDto } from './dto/reject-reward-request.dto';
import { ResultRewardRequestDto } from './dto/result-reward-request.dto';

@Controller()
export class RewardRequestController {
  constructor(private readonly rewardRequestService: RewardRequestService) {}

  @MessagePattern({ cmd: 'event.reward-request.create' })
  async createRewardRequest(@Payload() dto: CreateRewardRequestDto) {
    try {
      const result = await this.rewardRequestService.createRewardRequest(dto);
      return { success: true, data: result };
    } catch (error) {
      throw new RpcException(error.message || 'Reward request failed');
    }
  }

  @MessagePattern({ cmd: 'event.reward-request.list' })
  async listRewardRequests(@Payload() query: ListRewardRequestQuery) {
    try {
      const result = await this.rewardRequestService.listRewardRequests(query);
      return { success: true, ...result };
    } catch (error) {
      throw new RpcException(error.message || 'Reward request list failed');
    }
  }

  @MessagePattern({ cmd: 'event.reward-request.approve' })
  async approveRewardRequest(@Payload() rewardRequestId: string) {
    try {
      const result = await this.rewardRequestService.approveRewardRequest(rewardRequestId);
      return { success: true, data: result };
    } catch (error) {
      throw new RpcException(error.message || 'Reward request approve failed');
    }
  }

  @MessagePattern({ cmd: 'event.reward-request.reject' })
  async rejectRewardRequest(@Payload() dto: RejectRewardRequestDto) {
    try {
      const result = await this.rewardRequestService.rejectRewardRequest(dto);
      return { success: true, data: result };
    } catch (error) {
      throw new RpcException(error.message || 'Reward request reject failed');
    }
  }

  @MessagePattern({ cmd: 'event.reward-request.process' })
  async processRewardRequest(@Payload() rewardRequestId: string) {
    try {
      const result = await this.rewardRequestService.processRewardRequest(rewardRequestId);
      return { success: true, data: result };
    } catch (error) {
      throw new RpcException(error.message || 'Reward request process failed');
    }
  }

  @MessagePattern({ cmd: 'event.reward-request.result' })
  async handleRewardRequestResult(@Payload() dto: ResultRewardRequestDto) {
    try {
      const result = await this.rewardRequestService.handleRewardRequestResult(dto);
      return { success: true, data: result };
    } catch (error) {
      throw new RpcException(error.message || 'Reward request result handling failed');
    }
  }
} 