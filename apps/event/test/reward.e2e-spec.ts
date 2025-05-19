jest.setTimeout(30000);

import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { createTestContext, TestContext } from './bootstrap';

describe('Reward', () => {
  let ctx: TestContext;
  let client: ClientProxy;

  beforeAll(async () => {
    ctx = await createTestContext();
    client = ctx.client;
  });

  beforeEach(async () => {
    await ctx.models.Reward.deleteMany({});
  });

  afterAll(async () => {
    await ctx.stop();
    Date.now = ctx.realDateNow;
  });

  it('should list with pagination and filter', async () => {
    const rewards = Array.from({ length: 15 }).map((_, i) => ({
      name: `Reward ${i + 1}`,
      description: `Desc ${i + 1}`,
      cmd: 'give_item',
      type: i % 2 === 0 ? 'item' : 'point',
    }));
    for (const reward of rewards) {
      await ctx.models.Reward.create(reward);
    }

    const resAll: any = await firstValueFrom(
      client.send({ cmd: 'event.reward.list' }, {}),
    );
    expect(resAll).toHaveProperty('data');
    expect(resAll.data.length).toBe(15);

    const resPage: any = await firstValueFrom(
      client.send({ cmd: 'event.reward.list' }, { page: 2, pageSize: 5 }),
    );
    expect(resPage).toHaveProperty('data');
    expect(resPage.data.length).toBe(5);
    expect(resPage.page).toBe(2);
    expect(resPage).toHaveProperty('pageSize');
    expect(resPage.pageSize).toBe(5);
    expect(resPage.data.length).toBe(5);

    const resFilter: any = await firstValueFrom(
      client.send({ cmd: 'event.reward.list' }, { type: 'item' }),
    );
    expect(resFilter).toHaveProperty('data');
    expect(resFilter.data.every((r: any) => r.type === 'item')).toBe(true);

    const resSort: any = await firstValueFrom(
      client.send({ cmd: 'event.reward.list' }, { sortOrder: 'asc' }),
    );
    expect(resSort).toHaveProperty('data');
    expect(resSort.data[0].name).toBe('Reward 1');
  });
});
