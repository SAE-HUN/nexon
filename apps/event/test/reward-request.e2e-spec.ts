jest.setTimeout(30000);

import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { createTestContext, TestContext } from './bootstrap';

describe('RewardRequest', () => {
  let ctx: TestContext;
  let client: ClientProxy;

  beforeAll(async () => {
    ctx = await createTestContext();
    client = ctx.client;
  });

  beforeEach(async () => {
    await ctx.models.RewardRequest.deleteMany({});
    await ctx.models.EventReward.deleteMany({});
    await ctx.models.Event.deleteMany({});
    await ctx.models.Reward.deleteMany({});
  });

  afterAll(async () => {
    await ctx.stop();
    Date.now = ctx.realDateNow;
  });

  describe('Create', () => {
    it('should create', async () => {
      const { eventRewardId, userId } = await createTestEventRewardAndUser();
      const dto = { eventRewardId, userId };
      const res: any = await firstValueFrom(
        client.send({ cmd: 'event.reward-request.create' }, dto),
      );
      expect(res).toHaveProperty('eventReward');
      expect(res.eventReward).toBe(eventRewardId);
      expect(res).toHaveProperty('userId');
      expect(res.userId).toBe(userId);
    });

    it('should prevent duplicate', async () => {
      const { eventRewardId, userId } = await createTestEventRewardAndUser();
      const dto = { eventRewardId, userId };
      await firstValueFrom(
        client.send({ cmd: 'event.reward-request.create' }, dto),
      );
      await expect(
        firstValueFrom(
          client.send({ cmd: 'event.reward-request.create' }, dto),
        ),
      ).rejects.toMatchObject({ message: 'Duplicate reward request' });
    });

    it('should fail if eventReward does not exist', async () => {
      const userId = '000000000000000000000000';
      const dto = { eventRewardId: '000000000000000000000000', userId };
      await expect(
        firstValueFrom(
          client.send({ cmd: 'event.reward-request.create' }, dto),
        ),
      ).rejects.toMatchObject({ message: 'EventReward not found' });
    });
  });

  describe('List', () => {
    it('should list by userId', async () => {
      const { eventRewardId, userId } = await createTestEventRewardAndUser();
      const dto = { eventRewardId, userId };
      await firstValueFrom(
        client.send({ cmd: 'event.reward-request.create' }, dto),
      );
      const query = { userId };
      const res: any = await firstValueFrom(
        client.send({ cmd: 'event.reward-request.list' }, query),
      );
      expect(res).toHaveProperty('data');
      expect(res.data.length).toBe(1);
      expect(res.data[0].userId).toBe(userId);
      expect(res.data[0]).toHaveProperty('status');
      expect(res.data[0].status).toBe('PENDING');
      expect(res.data[0]).toHaveProperty('eventReward');
      expect(res.data[0].eventReward).toHaveProperty('event');
      expect(res.data[0].eventReward).toHaveProperty('reward');
      expect(res.data[0].eventReward.event).toHaveProperty('title');
      expect(res.data[0].eventReward.reward).toHaveProperty('name');
    });

    it('should list by eventId, rewardId, userId, status', async () => {
      const { eventId, eventRewardId } = await createTestEventRewardAndUser(
        'item',
        'RewardRequest Reward',
      );
      const userId = '000000000000000000000000';
      const {
        eventId: eventId2,
        rewardId: rewardId2,
        eventRewardId: eventRewardId2,
      } = await createTestEventRewardAndUser('item', 'RewardRequest Reward2');
      const userId2 = '000000000000000000000001';
      await firstValueFrom(
        client.send(
          { cmd: 'event.reward-request.create' },
          { eventRewardId, userId },
        ),
      );
      await firstValueFrom(
        client.send(
          { cmd: 'event.reward-request.create' },
          { eventRewardId: eventRewardId2, userId: userId2 },
        ),
      );
      await firstValueFrom(
        client.send(
          { cmd: 'event.reward-request.create' },
          { eventRewardId: eventRewardId2, userId },
        ),
      );

      let res = await firstValueFrom(
        client.send(
          { cmd: 'event.reward-request.list' },
          { eventId, userId, status: 'PENDING' },
        ),
      );
      expect(res.data.length).toBe(1);
      expect(res.data[0].userId).toBe(userId);
      res = await firstValueFrom(
        client.send(
          { cmd: 'event.reward-request.list' },
          { rewardId: rewardId2, userId, status: 'PENDING' },
        ),
      );
      expect(res.data.length).toBe(1);
      expect(res.data[0].userId).toBe(userId);
      res = await firstValueFrom(
        client.send(
          { cmd: 'event.reward-request.list' },
          {
            eventId: eventId2,
            rewardId: rewardId2,
            userId,
            status: 'PENDING',
          },
        ),
      );
      expect(res.data.length).toBe(1);
      expect(res.data[0].userId).toBe(userId);
      res = await firstValueFrom(
        client.send(
          { cmd: 'event.reward-request.list' },
          {
            eventId: '000000000000000000000000',
            userId,
            status: 'PENDING',
          },
        ),
      );
      expect(res.data.length).toBe(0);
    });
  });

  describe('Reject', () => {
    it('should reject pending', async () => {
      const { eventRewardId, userId } = await createTestEventRewardAndUser();
      const createDto = { eventRewardId, userId };
      const createRes: any = await firstValueFrom(
        client.send({ cmd: 'event.reward-request.create' }, createDto),
      );
      const rewardRequestId = createRes._id;

      const rejectDto = { rewardRequestId, reason: '조건 미달' };
      const rejectRes: any = await firstValueFrom(
        client.send({ cmd: 'event.reward-request.reject' }, rejectDto),
      );
      expect(rejectRes).toHaveProperty('status');
      expect(rejectRes.status).toBe('REJECTED');
      expect(rejectRes).toHaveProperty('reason');
      expect(rejectRes.reason).toBe('조건 미달');
    });

    it('should not reject non-pending', async () => {
      const { eventRewardId, userId } = await createTestEventRewardAndUser();

      const createDto = { eventRewardId, userId };
      const createRes: any = await firstValueFrom(
        client.send({ cmd: 'event.reward-request.create' }, createDto),
      );
      const rewardRequestId = createRes._id;
      await firstValueFrom(
        client.send(
          { cmd: 'event.reward-request.reject' },
          { rewardRequestId, reason: '이미 거절됨' },
        ),
      );
      const rejectDto = { rewardRequestId, reason: '이미 거절됨' };
      await expect(
        firstValueFrom(
          client.send({ cmd: 'event.reward-request.reject' }, rejectDto),
        ),
      ).rejects.toMatchObject({
        message: 'Only PENDING requests can be rejected',
      });
      const updated = await ctx.models.RewardRequest.findById(rewardRequestId);
      expect(updated.status).toBe('REJECTED');
    });

    it('should fail to reject non-existent', async () => {
      const rejectDto = {
        rewardRequestId: '000000000000000000000000',
        reason: '존재하지 않음',
      };
      await expect(
        firstValueFrom(
          client.send({ cmd: 'event.reward-request.reject' }, rejectDto),
        ),
      ).rejects.toMatchObject({ message: 'RewardRequest not found' });
    });
  });

  describe('Approve', () => {
    it('should approve pending', async () => {
      const { eventRewardId, userId } = await createTestEventRewardAndUser();
      const createDto = { eventRewardId, userId };
      const createRes: any = await firstValueFrom(
        client.send({ cmd: 'event.reward-request.create' }, createDto),
      );
      const rewardRequestId = createRes._id;
      const approveRes: any = await firstValueFrom(
        client.send({ cmd: 'event.reward-request.approve' }, rewardRequestId),
      );
      expect(approveRes).toHaveProperty('status');
      expect(approveRes.status).toBe('APPROVED');
      const updated = await ctx.models.RewardRequest.findById(rewardRequestId);
      expect(updated.status).toBe('APPROVED');
    });

    it('should fail to approve non-existent', async () => {
      await expect(
        firstValueFrom(
          client.send(
            { cmd: 'event.reward-request.approve' },
            '000000000000000000000000',
          ),
        ),
      ).rejects.toMatchObject({ message: 'RewardRequest not found' });
    });

    it('should fail to approve non-pending', async () => {
      const { eventRewardId, userId } = await createTestEventRewardAndUser();
      const createDto = { eventRewardId, userId };
      const createRes: any = await firstValueFrom(
        client.send({ cmd: 'event.reward-request.create' }, createDto),
      );
      const rewardRequestId = createRes._id;
      await firstValueFrom(
        client.send({ cmd: 'event.reward-request.approve' }, rewardRequestId),
      );
      await expect(
        firstValueFrom(
          client.send({ cmd: 'event.reward-request.approve' }, rewardRequestId),
        ),
      ).rejects.toMatchObject({
        message: 'Only PENDING requests can be approved',
      });
    });
  });

  describe('Process', () => {
    it('should process approved to processing', async () => {
      const { eventRewardId, userId } = await createTestEventRewardAndUser();
      const createDto = { eventRewardId, userId };
      const createRes: any = await firstValueFrom(
        client.send({ cmd: 'event.reward-request.create' }, createDto),
      );
      const rewardRequestId = createRes._id;

      await firstValueFrom(
        client.send({ cmd: 'event.reward-request.approve' }, rewardRequestId),
      );

      const processRes: any = await firstValueFrom(
        client.send({ cmd: 'event.reward-request.process' }, rewardRequestId),
      );
      expect(processRes).toHaveProperty('status');
      expect(processRes.status).toBe('PROCESSING');
    });

    it('should fail to process non-approved', async () => {
      const { eventRewardId, userId } = await createTestEventRewardAndUser();
      const createDto = { eventRewardId, userId };
      const createRes: any = await firstValueFrom(
        client.send({ cmd: 'event.reward-request.create' }, createDto),
      );
      const rewardRequestId = createRes._id;

      await expect(
        firstValueFrom(
          client.send({ cmd: 'event.reward-request.process' }, rewardRequestId),
        ),
      ).rejects.toMatchObject({
        message: 'Only APPROVED requests can be processed',
      });
    });

    it('should fail to process non-existent', async () => {
      await expect(
        firstValueFrom(
          client.send(
            { cmd: 'event.reward-request.process' },
            '000000000000000000000000',
          ),
        ),
      ).rejects.toMatchObject({ message: 'RewardRequest not found' });
    });
  });

  describe('Result', () => {
    it('should update to SUCCESS via result', async () => {
      const { eventRewardId, userId } = await createTestEventRewardAndUser();
      const createDto = { eventRewardId, userId };
      const createRes: any = await firstValueFrom(
        client.send({ cmd: 'event.reward-request.create' }, createDto),
      );
      const rewardRequestId = createRes._id;
      await firstValueFrom(
        client.send({ cmd: 'event.reward-request.approve' }, rewardRequestId),
      );
      const processRes: any = await firstValueFrom(
        client.send({ cmd: 'event.reward-request.process' }, rewardRequestId),
      );
      expect(processRes).toHaveProperty('status');
      expect(processRes.status).toBe('PROCESSING');
      const resultDto = { rewardRequestId, status: 'SUCCESS' };
      const resultRes: any = await firstValueFrom(
        client.send({ cmd: 'event.reward-request.result' }, resultDto),
      );
      expect(resultRes).toHaveProperty('status');
      expect(resultRes.status).toBe('SUCCESS');
      const updated = await ctx.models.RewardRequest.findById(rewardRequestId);
      expect(updated.status).toBe('SUCCESS');
    });

    it('should update to FAILED via result', async () => {
      const { eventRewardId, userId } = await createTestEventRewardAndUser();
      const createDto = { eventRewardId, userId };
      const createRes: any = await firstValueFrom(
        client.send({ cmd: 'event.reward-request.create' }, createDto),
      );
      const rewardRequestId = createRes._id;
      await firstValueFrom(
        client.send({ cmd: 'event.reward-request.approve' }, rewardRequestId),
      );
      await firstValueFrom(
        client.send({ cmd: 'event.reward-request.process' }, rewardRequestId),
      );
      const resultDto = {
        rewardRequestId,
        status: 'FAILED',
        reason: '지급 실패',
      };
      const resultRes: any = await firstValueFrom(
        client.send({ cmd: 'event.reward-request.result' }, resultDto),
      );
      expect(resultRes).toHaveProperty('status');
      expect(resultRes.status).toBe('FAILED');
      expect(resultRes).toHaveProperty('reason');
      expect(resultRes.reason).toBe('지급 실패');
      const updated = await ctx.models.RewardRequest.findById(rewardRequestId);
      expect(updated.status).toBe('FAILED');
      expect(updated.reason).toBe('지급 실패');
    });

    it('should fail result on non-processing', async () => {
      const { eventRewardId, userId } = await createTestEventRewardAndUser();
      const createDto = { eventRewardId, userId };
      const createRes: any = await firstValueFrom(
        client.send({ cmd: 'event.reward-request.create' }, createDto),
      );
      const rewardRequestId = createRes._id;
      const resultDto = { rewardRequestId, status: 'SUCCESS' };
      await expect(
        firstValueFrom(
          client.send({ cmd: 'event.reward-request.result' }, resultDto),
        ),
      ).rejects.toMatchObject({
        message: 'Only PROCESSING requests can be updated',
      });
    });

    it('should fail result on non-existent', async () => {
      const resultDto = {
        rewardRequestId: '000000000000000000000000',
        status: 'SUCCESS',
      };
      await expect(
        firstValueFrom(
          client.send({ cmd: 'event.reward-request.result' }, resultDto),
        ),
      ).rejects.toMatchObject({ message: 'RewardRequest not found' });
    });

    it('should fail result on invalid status', async () => {
      const { eventRewardId, userId } = await createTestEventRewardAndUser();
      const createDto = { eventRewardId, userId };
      const createRes: any = await firstValueFrom(
        client.send({ cmd: 'event.reward-request.create' }, createDto),
      );
      const rewardRequestId = createRes._id;
      await firstValueFrom(
        client.send({ cmd: 'event.reward-request.approve' }, rewardRequestId),
      );
      await firstValueFrom(
        client.send({ cmd: 'event.reward-request.process' }, rewardRequestId),
      );
      const resultDto = { rewardRequestId, status: 'INVALID' };
      await expect(
        firstValueFrom(
          client.send({ cmd: 'event.reward-request.result' }, resultDto),
        ),
      ).rejects.toMatchObject(expect.anything());
    });
  });

  async function createTestEventRewardAndUser(
    rewardType: string = 'item',
    rewardName: string = 'RewardRequest Reward',
  ) {
    const eventDto = {
      title: 'RewardRequest Event',
      description: 'Event for reward request',
      startedAt: '2024-01-01T00:00:00.000Z',
      endedAt: '2024-01-31T23:59:59.999Z',
      isActive: true,
      condition: {
        op: '>=',
        cmd: 'get_login_days',
        field: 'loginDays',
        value: 7,
      },
    };
    const eventRes: any = await firstValueFrom(
      client.send({ cmd: 'event.event.create' }, eventDto),
    );
    const eventId = eventRes._id;

    const rewardData = {
      name: rewardName,
      description: 'Reward for reward request',
      cmd: 'give_item',
      type: rewardType,
    };
    const reward = await ctx.models.Reward.create(rewardData);
    const rewardId = reward._id.toString();

    const eventRewardDto = { eventId, rewardId, qty: 1 };
    const eventRewardRes: any = await firstValueFrom(
      client.send({ cmd: 'event.event-reward.create' }, eventRewardDto),
    );
    const eventRewardId = eventRewardRes._id;

    const userId = '000000000000000000000001';
    return { eventId, rewardId, eventRewardId, userId };
  }
});
