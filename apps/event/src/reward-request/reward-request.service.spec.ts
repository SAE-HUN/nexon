import { Test, TestingModule } from '@nestjs/testing';
import { of } from 'rxjs';
import { EventRewardRepository } from '../event-reward/event-reward.repository';
import { EventService } from '../event/event.service';
import { RewardResultStatus } from './dto/result-reward-request.dto';
import { RewardRequestRepository } from './reward-request.repository';
import { RewardRequestService } from './reward-request.service';

const mockRewardRequestRepository = () => ({
  create: jest.fn(),
  exists: jest.fn(),
  findWithPopulate: jest.fn(),
  count: jest.fn(),
  findOneAndUpdateWithPopulate: jest.fn(),
  findOneAndUpdate: jest.fn(),
});
const mockEventRewardRepository = () => ({
  findById: jest.fn(),
  findIds: jest.fn(),
});
const mockEventService = () => ({
  checkUserEventCondition: jest.fn(),
});
const mockGameClient = () => ({
  send: jest.fn(),
});

describe('RewardRequestService', () => {
  let service: RewardRequestService;
  let rewardRequestRepository: ReturnType<typeof mockRewardRequestRepository>;
  let eventRewardRepository: ReturnType<typeof mockEventRewardRepository>;
  let eventService: ReturnType<typeof mockEventService>;
  let gameClient: ReturnType<typeof mockGameClient>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RewardRequestService,
        {
          provide: RewardRequestRepository,
          useFactory: mockRewardRequestRepository,
        },
        {
          provide: EventRewardRepository,
          useFactory: mockEventRewardRepository,
        },
        { provide: EventService, useFactory: mockEventService },
        { provide: 'GAME_SERVICE', useFactory: mockGameClient },
      ],
    }).compile();

    service = module.get<RewardRequestService>(RewardRequestService);
    rewardRequestRepository = module.get(RewardRequestRepository);
    eventRewardRepository = module.get(EventRewardRepository);
    eventService = module.get(EventService);
    gameClient = module.get('GAME_SERVICE');
    gameClient.send.mockImplementation(() => of({}));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createRewardRequest', () => {
    it('should create a reward request when conditions are met', async () => {
      const dto = { eventRewardId: 'eventRewardId1', userId: 'user1' };
      const eventReward = { event: { toString: () => 'event1' } };
      eventRewardRepository.findById.mockResolvedValue(eventReward);
      rewardRequestRepository.exists.mockResolvedValue(false);
      eventService.checkUserEventCondition.mockResolvedValue({ success: true });
      const createdRequest = {
        _id: 'rewardRequestId1',
        ...dto,
        status: 'PENDING',
        reason: null,
      };
      rewardRequestRepository.create.mockResolvedValue(createdRequest);
      const result = await service.createRewardRequest(dto);
      expect(eventRewardRepository.findById).toHaveBeenCalledWith(
        'eventRewardId1',
      );
      expect(rewardRequestRepository.exists).toHaveBeenCalledWith({
        eventReward: 'eventRewardId1',
        userId: 'user1',
      });
      expect(eventService.checkUserEventCondition).toHaveBeenCalledWith(
        'event1',
        'user1',
      );
      expect(rewardRequestRepository.create).toHaveBeenCalledWith({
        eventReward: 'eventRewardId1',
        userId: 'user1',
        status: 'PENDING',
        reason: null,
      });
      expect(result).toEqual(createdRequest);
    });

    it('should throw if event reward does not exist', async () => {
      const dto = { eventRewardId: 'notfound', userId: 'user1' };
      eventRewardRepository.findById.mockResolvedValue(null);
      await expect(service.createRewardRequest(dto)).rejects.toThrow(
        'EventReward not found',
      );
    });

    it('should throw if duplicate request', async () => {
      const dto = { eventRewardId: 'eventRewardId1', userId: 'user1' };
      eventRewardRepository.findById.mockResolvedValue({
        event: { toString: () => 'event1' },
      });
      rewardRequestRepository.exists.mockResolvedValue(true);
      await expect(service.createRewardRequest(dto)).rejects.toThrow(
        'Duplicate reward request',
      );
    });

    it('should throw if event condition is not met', async () => {
      const dto = { eventRewardId: 'eventRewardId1', userId: 'user1' };
      eventRewardRepository.findById.mockResolvedValue({
        event: { toString: () => 'event1' },
      });
      rewardRequestRepository.exists.mockResolvedValue(false);
      eventService.checkUserEventCondition.mockResolvedValue({
        success: false,
        detail: 'not met',
      });
      await expect(service.createRewardRequest(dto)).rejects.toThrow(
        'Event condition not met',
      );
    });
  });

  describe('listRewardRequests', () => {
    it('should return list when userId and status are provided', async () => {
      const query = {
        userId: 'user1',
        status: 'PENDING',
        page: 1,
        pageSize: 10,
      };
      const mockData = [{ _id: 'r1' }, { _id: 'r2' }];
      rewardRequestRepository.findWithPopulate.mockResolvedValue(mockData);
      rewardRequestRepository.count.mockResolvedValue(2);
      const result = await service.listRewardRequests(query);
      expect(result).toEqual({
        total: 2,
        page: 1,
        pageSize: 10,
        data: mockData,
      });
      expect(rewardRequestRepository.findWithPopulate).toHaveBeenCalled();
      expect(rewardRequestRepository.count).toHaveBeenCalled();
      expect(eventRewardRepository.findIds).not.toHaveBeenCalled();
    });

    it('should call eventRewardRepository.findIds when eventId and rewardId are provided', async () => {
      const query = {
        eventId: 'event1',
        rewardId: 'reward1',
        page: 1,
        pageSize: 10,
      };
      const eventRewardIds = [{ _id: 'er1' }, { _id: 'er2' }];
      eventRewardRepository.findIds.mockResolvedValue(eventRewardIds);
      rewardRequestRepository.findWithPopulate.mockResolvedValue([
        { _id: 'r1' },
      ]);
      rewardRequestRepository.count.mockResolvedValue(1);
      const result = await service.listRewardRequests(query);
      expect(eventRewardRepository.findIds).toHaveBeenCalledWith({
        event: 'event1',
        reward: 'reward1',
      });
      expect(rewardRequestRepository.findWithPopulate).toHaveBeenCalledWith(
        { eventReward: { $in: ['er1', 'er2'] } },
        'createdAt',
        -1,
        0,
        10,
      );
      expect(result).toEqual({
        total: 1,
        page: 1,
        pageSize: 10,
        data: [{ _id: 'r1' }],
      });
    });

    it('should return empty list if no eventReward found for eventId/rewardId', async () => {
      const query = { eventId: 'event1', page: 1, pageSize: 10 };
      eventRewardRepository.findIds.mockResolvedValue([]);
      const result = await service.listRewardRequests(query);
      expect(result).toEqual({ total: 0, page: 1, pageSize: 10, data: [] });
    });
  });

  describe('approveRewardRequest', () => {
    it('should approve and call gameClient.send and return result', async () => {
      const rewardRequestId = 'rr1';
      const updated = {
        _id: rewardRequestId,
        userId: 'user1',
        eventReward: {
          event: { _id: 'event1' },
          reward: {
            _id: 'reward1',
            type: 'point',
            name: 'point',
            cmd: 'reward.cmd',
          },
          qty: 10,
        },
        status: 'APPROVED',
      };
      rewardRequestRepository.findOneAndUpdateWithPopulate.mockResolvedValue(
        updated,
      );
      gameClient.send.mockImplementation(() => of({}));
      const result = await service.approveRewardRequest(rewardRequestId);
      expect(
        rewardRequestRepository.findOneAndUpdateWithPopulate,
      ).toHaveBeenCalled();
      expect(gameClient.send).toHaveBeenCalled();
      expect(result).toBe(updated);
    });

    it('should throw if reward request does not exist', async () => {
      rewardRequestRepository.findOneAndUpdateWithPopulate.mockResolvedValue(
        null,
      );
      rewardRequestRepository.exists.mockResolvedValue(false);
      await expect(service.approveRewardRequest('notfound')).rejects.toThrow(
        'RewardRequest not found',
      );
    });

    it('should throw if not in PENDING status', async () => {
      rewardRequestRepository.findOneAndUpdateWithPopulate.mockResolvedValue(
        null,
      );
      rewardRequestRepository.exists.mockResolvedValue(true);
      await expect(service.approveRewardRequest('notpending')).rejects.toThrow(
        'Only PENDING requests can be approved',
      );
    });
  });

  describe('rejectRewardRequest', () => {
    it('should reject and return result', async () => {
      const dto = { rewardRequestId: 'rr1', reason: 'reason' };
      const updated = { _id: 'rr1', status: 'REJECTED', reason: 'reason' };
      rewardRequestRepository.findOneAndUpdate.mockResolvedValue(updated);
      const result = await service.rejectRewardRequest(dto);
      expect(rewardRequestRepository.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: 'rr1', status: 'PENDING' },
        { status: 'REJECTED', reason: 'reason' },
        { new: true },
      );
      expect(result).toBe(updated);
    });

    it('should throw if reward request does not exist', async () => {
      rewardRequestRepository.findOneAndUpdate.mockResolvedValue(null);
      rewardRequestRepository.exists.mockResolvedValue(false);
      await expect(
        service.rejectRewardRequest({
          rewardRequestId: 'notfound',
          reason: 'reason',
        }),
      ).rejects.toThrow('RewardRequest not found');
    });

    it('should throw if not in PENDING status', async () => {
      rewardRequestRepository.findOneAndUpdate.mockResolvedValue(null);
      rewardRequestRepository.exists.mockResolvedValue(true);
      await expect(
        service.rejectRewardRequest({
          rewardRequestId: 'notpending',
          reason: 'reason',
        }),
      ).rejects.toThrow('Only PENDING requests can be rejected');
    });
  });

  describe('processRewardRequest', () => {
    it('should change status from APPROVED to PROCESSING', async () => {
      const updated = { _id: 'rr1', status: 'PROCESSING' };
      rewardRequestRepository.findOneAndUpdate.mockResolvedValue(updated);
      const result = await service.processRewardRequest('rr1');
      expect(rewardRequestRepository.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: 'rr1', status: 'APPROVED' },
        { status: 'PROCESSING' },
        { new: true },
      );
      expect(result).toBe(updated);
    });

    it('should throw if reward request does not exist', async () => {
      rewardRequestRepository.findOneAndUpdate.mockResolvedValue(null);
      rewardRequestRepository.exists.mockResolvedValue(false);
      await expect(service.processRewardRequest('notfound')).rejects.toThrow(
        'RewardRequest not found',
      );
    });

    it('should throw if not in APPROVED status', async () => {
      rewardRequestRepository.findOneAndUpdate.mockResolvedValue(null);
      rewardRequestRepository.exists.mockResolvedValue(true);
      await expect(service.processRewardRequest('notapproved')).rejects.toThrow(
        'Only APPROVED requests can be processed',
      );
    });
  });

  describe('handleRewardRequestResult', () => {
    it('should change status from PROCESSING to SUCCESS when status is SUCCESS', async () => {
      const dto = {
        rewardRequestId: 'rr1',
        status: RewardResultStatus.SUCCESS,
      };
      const updated = { _id: 'rr1', status: 'SUCCESS', reason: null };
      rewardRequestRepository.findOneAndUpdate.mockResolvedValue(updated);
      const result = await service.handleRewardRequestResult(dto);
      expect(rewardRequestRepository.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: 'rr1', status: 'PROCESSING' },
        { status: 'SUCCESS', reason: null },
        { new: true },
      );
      expect(result).toBe(updated);
    });

    it('should change status to FAILED when status is FAILED', async () => {
      const dto = {
        rewardRequestId: 'rr1',
        status: RewardResultStatus.FAILED,
        reason: 'fail',
      };
      const updated = { _id: 'rr1', status: 'FAILED', reason: 'fail' };
      rewardRequestRepository.findOneAndUpdate.mockResolvedValue(updated);
      const result = await service.handleRewardRequestResult(dto);
      expect(rewardRequestRepository.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: 'rr1', status: { $in: ['PROCESSING', 'APPROVED'] } },
        { status: 'FAILED', reason: 'fail' },
        { new: true },
      );
      expect(result).toBe(updated);
    });

    it('should throw if reward request does not exist', async () => {
      rewardRequestRepository.findOneAndUpdate.mockResolvedValue(null);
      rewardRequestRepository.exists.mockResolvedValue(false);
      await expect(
        service.handleRewardRequestResult({
          rewardRequestId: 'notfound',
          status: RewardResultStatus.SUCCESS,
        }),
      ).rejects.toThrow('RewardRequest not found');
    });

    it('should throw if not in PROCESSING/APPROVED status', async () => {
      rewardRequestRepository.findOneAndUpdate.mockResolvedValue(null);
      rewardRequestRepository.exists.mockResolvedValue(true);
      await expect(
        service.handleRewardRequestResult({
          rewardRequestId: 'notprocessing',
          status: RewardResultStatus.SUCCESS,
        }),
      ).rejects.toThrow('Only PROCESSING requests can be updated');
    });

    it('should throw if status is invalid', async () => {
      await expect(
        service.handleRewardRequestResult({
          rewardRequestId: 'rr1',
          status: 'INVALID' as any,
        }),
      ).rejects.toThrow('Invalid status');
    });
  });
});
