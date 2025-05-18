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
    return await this.rewardRequestService.createRewardRequest(dto);
  }

  @MessagePattern({ cmd: 'event.reward-request.list' })
  async listRewardRequests(@Payload() query: ListRewardRequestQuery) {
    return await this.rewardRequestService.listRewardRequests(query);
  }

  @MessagePattern({ cmd: 'event.reward-request.approve' })
  async approveRewardRequest(@Payload() rewardRequestId: string) {
    return await this.rewardRequestService.approveRewardRequest(rewardRequestId);
  }

  @MessagePattern({ cmd: 'event.reward-request.reject' })
  async rejectRewardRequest(@Payload() dto: RejectRewardRequestDto) {
    return await this.rewardRequestService.rejectRewardRequest(dto);
  }

  @MessagePattern({ cmd: 'event.reward-request.process' })
  async processRewardRequest(@Payload() rewardRequestId: string) {
    return await this.rewardRequestService.processRewardRequest(rewardRequestId);
  }

  @MessagePattern({ cmd: 'event.reward-request.result' })
  async handleRewardRequestResult(@Payload() dto: ResultRewardRequestDto) {
    return await this.rewardRequestService.handleRewardRequestResult(dto);
  }
} 