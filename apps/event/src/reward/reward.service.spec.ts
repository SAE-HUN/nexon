import { Test, TestingModule } from '@nestjs/testing';
import { RewardRepository } from './reward.repository';
import { RewardService } from './reward.service';

const mockRewardRepository = () => ({
  find: jest.fn(),
  count: jest.fn(),
  exists: jest.fn(),
  create: jest.fn(),
});

describe('RewardService', () => {
  let service: RewardService;
  let rewardRepository: ReturnType<typeof mockRewardRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RewardService,
        { provide: RewardRepository, useFactory: mockRewardRepository },
      ],
    }).compile();

    service = module.get<RewardService>(RewardService);
    rewardRepository = module.get(RewardRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('listRewards', () => {
    it('should return paginated list with no type filter', async () => {
      const query = { page: 1, pageSize: 10 };
      const mockData = [{ _id: 'r1' }, { _id: 'r2' }];
      rewardRepository.find.mockResolvedValue(mockData);
      rewardRepository.count.mockResolvedValue(2);
      const result = await service.listRewards(query);
      expect(rewardRepository.find).toHaveBeenCalledWith(
        {},
        'createdAt',
        -1,
        0,
        10,
      );
      expect(rewardRepository.count).toHaveBeenCalledWith({});
      expect(result).toEqual({
        total: 2,
        page: 1,
        pageSize: 10,
        data: mockData,
      });
    });

    it('should filter by type', async () => {
      const query = { type: 'item', page: 2, pageSize: 5, sortOrder: 'asc' };
      const mockData = [{ _id: 'r3' }];
      rewardRepository.find.mockResolvedValue(mockData);
      rewardRepository.count.mockResolvedValue(1);
      const result = await service.listRewards(query);
      expect(rewardRepository.find).toHaveBeenCalledWith(
        { type: 'item' },
        'createdAt',
        1,
        5,
        5,
      );
      expect(rewardRepository.count).toHaveBeenCalledWith({ type: 'item' });
      expect(result).toEqual({
        total: 1,
        page: 2,
        pageSize: 5,
        data: mockData,
      });
    });
  });

  describe('createReward', () => {
    it('should create reward when not duplicate', async () => {
      const dto = {
        type: 'item',
        name: 'Reward1',
        description: 'desc',
        cmd: 'cmd',
      };
      rewardRepository.exists.mockResolvedValue(false);
      const created = { _id: 'id', ...dto };
      rewardRepository.create.mockResolvedValue(created);
      const result = await service.createReward(dto);
      expect(rewardRepository.exists).toHaveBeenCalledWith({
        type: 'item',
        name: 'Reward1',
      });
      expect(rewardRepository.create).toHaveBeenCalledWith(dto);
      expect(result).toBe(created);
    });

    it('should throw if duplicate reward', async () => {
      const dto = {
        type: 'item',
        name: 'Reward1',
        description: 'desc',
        cmd: 'cmd',
      };
      rewardRepository.exists.mockResolvedValue(true);
      await expect(service.createReward(dto)).rejects.toMatchObject({
        message: 'Duplicate reward',
      });
    });
  });
});
