import { Test, TestingModule } from '@nestjs/testing';
import { EventRepository } from '../event/event.repository';
import { RewardRepository } from '../reward/reward.repository';
import { EventRewardRepository } from './event-reward.repository';
import { EventRewardService } from './event-reward.service';

const mockEventRewardRepository = () => ({
  create: jest.fn(),
  exists: jest.fn(),
  findWithPopulateAndPaging: jest.fn(),
  count: jest.fn(),
});
const mockEventRepository = () => ({
  exists: jest.fn(),
});
const mockRewardRepository = () => ({
  exists: jest.fn(),
});

describe('EventRewardService', () => {
  let service: EventRewardService;
  let eventRewardRepository: ReturnType<typeof mockEventRewardRepository>;
  let eventRepository: ReturnType<typeof mockEventRepository>;
  let rewardRepository: ReturnType<typeof mockRewardRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventRewardService,
        {
          provide: EventRewardRepository,
          useFactory: mockEventRewardRepository,
        },
        { provide: EventRepository, useFactory: mockEventRepository },
        { provide: RewardRepository, useFactory: mockRewardRepository },
      ],
    }).compile();

    service = module.get<EventRewardService>(EventRewardService);
    eventRewardRepository = module.get(EventRewardRepository);
    eventRepository = module.get(EventRepository);
    rewardRepository = module.get(RewardRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createEventReward', () => {
    it('should create event reward when all conditions are met', async () => {
      const dto = { eventId: 'event1', rewardId: 'reward1', qty: 5 };
      eventRewardRepository.exists.mockResolvedValue(false);
      eventRepository.exists.mockResolvedValue(true);
      rewardRepository.exists.mockResolvedValue(true);
      const created = { _id: 'id', ...dto };
      eventRewardRepository.create.mockResolvedValue(created);
      const result = await service.createEventReward(dto);
      expect(eventRewardRepository.exists).toHaveBeenCalledWith({
        event: 'event1',
        reward: 'reward1',
      });
      expect(eventRepository.exists).toHaveBeenCalledWith({ _id: 'event1' });
      expect(rewardRepository.exists).toHaveBeenCalledWith({ _id: 'reward1' });
      expect(eventRewardRepository.create).toHaveBeenCalledWith(
        'event1',
        'reward1',
        5,
      );
      expect(result).toBe(created);
    });

    it('should throw if event reward already exists', async () => {
      const dto = { eventId: 'event1', rewardId: 'reward1', qty: 5 };
      eventRewardRepository.exists.mockResolvedValue(true);
      await expect(service.createEventReward(dto)).rejects.toMatchObject({
        message: 'This reward is already linked to the event.',
      });
    });

    it('should throw if event does not exist', async () => {
      const dto = { eventId: 'event1', rewardId: 'reward1', qty: 5 };
      eventRewardRepository.exists.mockResolvedValue(false);
      eventRepository.exists.mockResolvedValue(false);
      await expect(service.createEventReward(dto)).rejects.toMatchObject({
        message: 'Event does not exist.',
      });
    });

    it('should throw if reward does not exist', async () => {
      const dto = { eventId: 'event1', rewardId: 'reward1', qty: 5 };
      eventRewardRepository.exists.mockResolvedValue(false);
      eventRepository.exists.mockResolvedValue(true);
      rewardRepository.exists.mockResolvedValue(false);
      await expect(service.createEventReward(dto)).rejects.toMatchObject({
        message: 'Reward does not exist.',
      });
    });
  });

  describe('listEventRewards', () => {
    it('should return paginated list with no filters', async () => {
      const query = { page: 1, pageSize: 10 };
      const mockData = [{ _id: 'er1' }, { _id: 'er2' }];
      eventRewardRepository.findWithPopulateAndPaging.mockResolvedValue(
        mockData,
      );
      eventRewardRepository.count.mockResolvedValue(2);
      const result = await service.listEventRewards(query);
      expect(
        eventRewardRepository.findWithPopulateAndPaging,
      ).toHaveBeenCalledWith({}, 'createdAt', -1, 0, 10);
      expect(eventRewardRepository.count).toHaveBeenCalledWith({});
      expect(result).toEqual({
        total: 2,
        page: 1,
        pageSize: 10,
        data: mockData,
      });
    });

    it('should filter by eventId and rewardId', async () => {
      const query = {
        eventId: 'event1',
        rewardId: 'reward1',
        page: 2,
        pageSize: 5,
        sortOrder: 'asc',
      };
      const mockData = [{ _id: 'er3' }];
      eventRewardRepository.findWithPopulateAndPaging.mockResolvedValue(
        mockData,
      );
      eventRewardRepository.count.mockResolvedValue(1);
      const result = await service.listEventRewards(query);
      expect(
        eventRewardRepository.findWithPopulateAndPaging,
      ).toHaveBeenCalledWith(
        { event: 'event1', reward: 'reward1' },
        'createdAt',
        1,
        5,
        5,
      );
      expect(eventRewardRepository.count).toHaveBeenCalledWith({
        event: 'event1',
        reward: 'reward1',
      });
      expect(result).toEqual({
        total: 1,
        page: 2,
        pageSize: 5,
        data: mockData,
      });
    });
  });
});
