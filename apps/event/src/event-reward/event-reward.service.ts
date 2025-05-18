import { Injectable } from '@nestjs/common';
import { EventRewardRepository } from './event-reward.repository';
import { EventRepository } from '../event/event.repository';
import { CreateEventRewardDto } from './dto/create-event-reward.dto';
import { ListEventRewardQuery } from './dto/list-event-reward.query';
import { RewardRepository } from '../reward/reward.repository';

@Injectable()
export class EventRewardService {
  constructor(
    private readonly eventRewardRepository: EventRewardRepository,
    private readonly eventRepository: EventRepository,
    private readonly rewardRepository: RewardRepository,
  ) {}

  async createEventReward(dto: CreateEventRewardDto) {
    const { eventId, rewardId, qty } = dto;
    const exists = await this.eventRewardRepository.findOne({ event: eventId, reward: rewardId });
    if (exists) throw new Error('This reward is already linked to the event.');
    const event = await this.eventRepository.findById(eventId);
    if (!event) throw new Error('Event does not exist.');
    const reward = await this.rewardRepository.findById(rewardId);
    if (!reward) throw new Error('Reward does not exist.');
    return this.eventRewardRepository.create(eventId, rewardId, qty);
  }

  async listEventRewards(query: ListEventRewardQuery) {
    const { eventId, rewardId, page, pageSize, sortOrder } = query;
    const findQuery: any = {};
    if (eventId) findQuery.event = eventId;
    if (rewardId) findQuery.reward = rewardId;
    const sortBy = 'createdAt';
    const order = sortOrder === 'asc' ? 1 : -1;
    const skip = (page - 1) * pageSize;
    const [data, total] = await Promise.all([
      this.eventRewardRepository.findWithPopulateAndPaging(findQuery, sortBy, order, skip, pageSize),
      this.eventRewardRepository.count(findQuery),
    ]);
    return {
      total,
      page,
      pageSize,
      data,
    };
  }
} 