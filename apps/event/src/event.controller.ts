import { Controller } from '@nestjs/common';
import { EventService } from './event.service';
import { MessagePattern, Payload, RpcException } from '@nestjs/microservices';
import { CreateEventDto } from './dto/create-event.dto';
import { ListEventQuery } from './dto/list-event.query';
import { CreateEventRewardDto } from './dto/create-event-reward.dto';
import { CreateRewardRequestDto } from './dto/create-reward-request.dto';
import { ListRewardRequestQuery } from './dto/list-reward-request.query';
import { RejectRewardRequestDto } from './dto/reject-reward-request.dto';
import { ResultRewardRequestDto } from './dto/result-reward-request.dto';

@Controller()
export class EventController {
  constructor(
    private readonly eventService: EventService,
  ) {}

  @MessagePattern({ cmd: 'event.event.create' })
  async createEvent(@Payload() createEventDto: CreateEventDto) {
    try {
      const event = await this.eventService.createEvent(createEventDto);
      return { success: true, data: event };
    } catch (error) {
      throw new RpcException(error.message || 'Event creation failed');
    }
  }

  @MessagePattern({ cmd: 'event.event.list' })
  async listEvents(@Payload() listEventQuery: ListEventQuery) {
    try {
      const result = await this.eventService.findAllEvents(listEventQuery);
      return { success: true, ...result };
    } catch (error) {
      throw new RpcException(error.message || 'Event list fetch failed');
    }
  }

  @MessagePattern({ cmd: 'event.event.get' })
  async getEventDetail(@Payload() eventId: string) {
    try {
      const event = await this.eventService.findEventById(eventId);
      if (!event) {
        throw new RpcException('Event not found');
      }
      return { success: true, data: event };
    } catch (error) {
      throw new RpcException(error.message || 'Event detail fetch failed');
    }
  }

  @MessagePattern({ cmd: 'event.event-reward.create' })
  async createEventReward(@Payload() dto: CreateEventRewardDto) {
    try {
      const result = await this.eventService.createEventReward(dto);
      return { success: true, data: result };
    } catch (error) {
      throw new RpcException(error.message || '이벤트-보상 연결 실패');
    }
  }

  @MessagePattern({ cmd: 'event.reward-request.create' })
  async createRewardRequest(@Payload() dto: CreateRewardRequestDto) {
    try {
      const result = await this.eventService.createRewardRequest(dto);
      return { success: true, data: result };
    } catch (error) {
      throw new RpcException(error.message || 'Reward request failed');
    }
  }

  @MessagePattern({ cmd: 'event.reward-request.list' })
  async listRewardRequests(@Payload() query: ListRewardRequestQuery) {
    try {
      const result = await this.eventService.listRewardRequests(query);
      return { success: true, data: result };
    } catch (error) {
      throw new RpcException(error.message || 'Reward request list failed');
    }
  }

  @MessagePattern({ cmd: 'event.reward-request.reject' })
  async rejectRewardRequest(@Payload() dto: RejectRewardRequestDto) {
    try {
      const result = await this.eventService.rejectRewardRequest(dto);
      return { success: true, data: result };
    } catch (error) {
      throw new RpcException(error.message || 'Reward request reject failed');
    }
  }

  @MessagePattern({ cmd: 'event.reward-request.process' })
  async processRewardRequest(@Payload() rewardRequestId: string) {
    try {
      const result = await this.eventService.processRewardRequest(rewardRequestId);
      return { success: true, data: result };
    } catch (error) {
      throw new RpcException(error.message || 'Reward request process failed');
    }
  }

  @MessagePattern({ cmd: 'event.reward-request.result' })
  async handleRewardRequestResult(@Payload() dto: ResultRewardRequestDto) {
    try {
      const result = await this.eventService.handleRewardRequestResult(dto);
      return { success: true, data: result };
    } catch (error) {
      throw new RpcException(error.message || 'Reward request result handling failed');
    }
  }

  @MessagePattern({ cmd: 'event.reward-request.approve' })
  async approveRewardRequest(@Payload() rewardRequestId: string) {
    try {
      const result = await this.eventService.approveRewardRequest(rewardRequestId);
      return { success: true, data: result };
    } catch (error) {
      throw new RpcException(error.message || 'Reward request approve failed');
    }
  }
}
