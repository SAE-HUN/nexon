jest.setTimeout(30000);

import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { createTestContext, TestContext } from './bootstrap';

describe('EventReward', () => {
  let ctx: TestContext;
  let client: ClientProxy;

  beforeAll(async () => {
    ctx = await createTestContext();
    client = ctx.client;
  });

  beforeEach(async () => {
    await ctx.models.EventReward.deleteMany({});
    await ctx.models.Event.deleteMany({});
    await ctx.models.Reward.deleteMany({});
  });

  afterAll(async () => {
    await ctx.stop();
  });

  it('should link reward to event', async () => {
    const { eventId, rewardId } = await createTestEventAndReward();

    const eventRewardDto = {
      eventId,
      rewardId,
      qty: 5,
    };
    const linkRes: any = await firstValueFrom(
      client.send({ cmd: 'event.event-reward.create' }, eventRewardDto),
    );
    expect(linkRes).toHaveProperty('event');
    expect(linkRes.event).toBe(eventId);
    expect(linkRes).toHaveProperty('reward');
    expect(linkRes.reward).toBe(rewardId);
    expect(linkRes).toHaveProperty('qty');
    expect(linkRes.qty).toBe(5);
  });

  it('should prevent duplication', async () => {
    const { eventId, rewardId } = await createTestEventAndReward();

    const eventRewardDto = {
      eventId,
      rewardId,
      qty: 5,
    };
    await firstValueFrom(
      client.send({ cmd: 'event.event-reward.create' }, eventRewardDto),
    );

    await expect(
      firstValueFrom(
        client.send({ cmd: 'event.event-reward.create' }, eventRewardDto),
      ),
    ).rejects.toMatchObject({
      message: 'This reward is already linked to the event.',
    });
  });

  it('should fail if event does not exist', async () => {
    const reward = await ctx.models.Reward.create({
      name: 'R',
      description: 'D',
      cmd: 'cmd',
      type: 'item',
    });
    const eventRewardDto = {
      eventId: '000000000000000000000000',
      rewardId: reward._id.toString(),
      qty: 1,
    };
    await expect(
      firstValueFrom(
        client.send({ cmd: 'event.event-reward.create' }, eventRewardDto),
      ),
    ).rejects.toMatchObject({ message: 'Event does not exist.' });
  });

  it('should fail if reward does not exist', async () => {
    const eventDto = {
      title: 'Event',
      description: 'D',
      startedAt: '2024-01-01T00:00:00.000Z',
      endedAt: '2024-01-02T00:00:00.000Z',
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
    const eventRewardDto = {
      eventId,
      rewardId: '000000000000000000000000',
      qty: 1,
    };
    await expect(
      firstValueFrom(
        client.send({ cmd: 'event.event-reward.create' }, eventRewardDto),
      ),
    ).rejects.toMatchObject({ message: 'Reward does not exist.' });
  });

  it('should list with pagination and filter', async () => {
    const eventDto = {
      title: 'Event for EventReward',
      description: 'desc',
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
    const event = eventRes._id;

    const rewards = await Promise.all(
      Array.from({ length: 8 }).map((_, i) =>
        ctx.models.Reward.create({
          name: `ER${i + 1}`,
          description: 'desc',
          cmd: 'give',
          type: 'item',
        }),
      ),
    );
    for (let i = 0; i < rewards.length; i++) {
      await firstValueFrom(
        client.send(
          {
            cmd: 'event.event-reward.create',
          },
          {
            eventId: event,
            rewardId: rewards[i]._id,
            qty: i + 1,
          },
        ),
      );
    }
    const resAll: any = await firstValueFrom(
      client.send({ cmd: 'event.event-reward.list' }, {}),
    );
    expect(resAll).toHaveProperty('data');
    expect(resAll.data.length).toBe(8);

    const resPage: any = await firstValueFrom(
      client.send({ cmd: 'event.event-reward.list' }, { page: 2, pageSize: 3 }),
    );
    expect(resPage).toHaveProperty('page');
    expect(resPage.page).toBe(2);
    expect(resPage).toHaveProperty('pageSize');
    expect(resPage.pageSize).toBe(3);
    expect(resPage.data.length).toBe(3);

    const resFilter: any = await firstValueFrom(
      client.send(
        { cmd: 'event.event-reward.list' },
        { eventId: event.toString() },
      ),
    );
    expect(resFilter).toHaveProperty('data');
    expect(
      resFilter.data.every(
        (er: any) =>
          er.event.toString() === event.toString() ||
          er.event._id?.toString() === event.toString(),
      ),
    ).toBe(true);
  });

  async function createTestEventAndReward() {
    const eventDto = {
      title: 'Reward Test Event',
      description: 'Event with rewards',
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
      name: 'Test Reward',
      description: 'Reward Description',
      cmd: 'give_item',
      type: 'item',
    };
    const reward = await ctx.models.Reward.create(rewardData);
    const rewardId = reward._id.toString();

    return { eventId, rewardId };
  }
});
