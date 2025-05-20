import { Test, TestingModule } from '@nestjs/testing';
import { of, throwError } from 'rxjs';
import { EventRepository } from './event.repository';
import { EventService } from './event.service';
import { Condition } from './schema/event.schema';

const mockEventRepository = () => ({
  create: jest.fn(),
  find: jest.fn(),
  count: jest.fn(),
  findById: jest.fn(),
  exists: jest.fn(),
});
const mockGameClient = () => ({
  send: jest.fn(),
});

describe('EventService', () => {
  let service: EventService;
  let eventRepository: ReturnType<typeof mockEventRepository>;
  let gameClient: ReturnType<typeof mockGameClient>;
  let realDateNow: () => number;
  const fixedNowStr = '2023-11-15T06:13:20.000Z';
  const beforeStr = '2023-11-15T06:13:19.000Z';
  const afterStr = '2023-11-15T06:13:21.000Z';
  const muchAfterStr = '2023-11-15T06:13:30.000Z';
  const muchMoreAfterStr = '2023-11-15T06:13:40.000Z';

  beforeAll(() => {
    realDateNow = Date.now;
    jest
      .spyOn(global.Date, 'now')
      .mockImplementation(() => new Date(fixedNowStr).getTime());
  });

  afterAll(() => {
    Date.now = realDateNow;
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventService,
        { provide: EventRepository, useFactory: mockEventRepository },
        { provide: 'GAME_SERVICE', useFactory: mockGameClient },
      ],
    }).compile();

    service = module.get<EventService>(EventService);
    eventRepository = module.get(EventRepository);
    gameClient = module.get('GAME_SERVICE');
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createEvent', () => {
    it('should create event when condition is valid', async () => {
      const dto = {
        title: 'Event',
        description: 'desc',
        startedAt: new Date(fixedNowStr),
        endedAt: new Date(fixedNowStr),
        isActive: true,
        condition: {
          op: '>=',
          cmd: 'get_login_days',
          field: 'loginDays',
          value: 7,
        } as Condition,
      };
      jest
        .spyOn(service as any, 'validateConditionTree')
        .mockReturnValue({ valid: true });
      const created = { _id: 'id', ...dto };
      eventRepository.create.mockResolvedValue(created);
      const result = await service.createEvent(dto);
      expect(eventRepository.create).toHaveBeenCalledWith(dto);
      expect(result).toBe(created);
    });

    it('should throw if condition is invalid', async () => {
      const dto = {
        title: 'Event',
        description: 'desc',
        startedAt: new Date(fixedNowStr),
        endedAt: new Date(fixedNowStr),
        isActive: true,
        condition: { op: 'invalid' as any },
      };
      await expect(service.createEvent(dto)).rejects.toMatchObject({
        message: 'Invalid condition structure',
      });
    });
    it('should throw if condition is invalid structure', async () => {
      const dto = {
        title: 'Event',
        description: 'desc',
        startedAt: new Date(fixedNowStr),
        endedAt: new Date(fixedNowStr),
        isActive: true,
        condition: { op: 'AND' as any, children: [] },
      };
      await expect(service.createEvent(dto)).rejects.toMatchObject({
        message: 'Invalid condition structure',
      });
    });
    it('should throw if too many leaves', async () => {
      const dto = {
        title: 'Event',
        description: 'desc',
        startedAt: new Date(fixedNowStr),
        endedAt: new Date(fixedNowStr),
        isActive: true,
        condition: {
          op: 'AND',
          children: [
            { op: '>=', cmd: 'a', field: 'f', value: 1 },
            { op: '>=', cmd: 'b', field: 'g', value: 2 },
            { op: '>=', cmd: 'c', field: 'h', value: 3 },
            { op: '>=', cmd: 'd', field: 'i', value: 4 },
            { op: '>=', cmd: 'e', field: 'j', value: 5 },
          ],
        } as Condition,
      };
      await expect(service.createEvent(dto)).rejects.toMatchObject({
        message: 'Too many leaf conditions (max 4)',
      });
    });
    it('should throw if too deep', async () => {
      const dto = {
        title: 'Event',
        description: 'desc',
        startedAt: new Date(fixedNowStr),
        endedAt: new Date(fixedNowStr),
        isActive: true,
        condition: {
          op: 'AND',
          children: [
            {
              op: 'AND',
              children: [
                {
                  op: 'AND',
                  children: [
                    {
                      op: 'AND',
                      children: [{ op: '>=', cmd: 'a', field: 'f', value: 1 }],
                    },
                  ],
                },
              ],
            },
          ],
        } as Condition,
      };
      await expect(service.createEvent(dto)).rejects.toMatchObject({
        message: 'Invalid condition structure',
      });
    });
  });

  describe('listEvents', () => {
    it('should return paginated list with no filters', async () => {
      const query = { page: 1, pageSize: 10 };
      const mockData = [{ _id: 'e1' }, { _id: 'e2' }];
      eventRepository.find.mockResolvedValue(mockData);
      eventRepository.count.mockResolvedValue(2);
      const result = await service.listEvents(query);
      expect(eventRepository.find).toHaveBeenCalledWith(
        {},
        'startedAt',
        -1,
        0,
        10,
      );
      expect(eventRepository.count).toHaveBeenCalledWith({});
      expect(result).toEqual({
        total: 2,
        page: 1,
        pageSize: 10,
        data: mockData,
      });
    });

    it('should filter by isActive, startedAt, endedAt', async () => {
      const query = {
        isActive: true,
        startedAt: new Date(beforeStr) as any,
        endedAt: new Date(afterStr) as any,
        page: 2,
        pageSize: 5,
        sortOrder: 'asc',
      };
      const mockData = [{ _id: 'e3' }];
      eventRepository.find.mockResolvedValue(mockData);
      eventRepository.count.mockResolvedValue(1);
      const result = await service.listEvents(query);
      expect(eventRepository.find).toHaveBeenCalledWith(
        {
          isActive: true,
          startedAt: { $gte: new Date(beforeStr) },
          endedAt: { $lte: new Date(afterStr) },
        },
        'startedAt',
        1,
        5,
        5,
      );
      expect(eventRepository.count).toHaveBeenCalledWith({
        isActive: true,
        startedAt: { $gte: new Date(beforeStr) },
        endedAt: { $lte: new Date(afterStr) },
      });
      expect(result).toEqual({
        total: 1,
        page: 2,
        pageSize: 5,
        data: mockData,
      });
    });
  });

  describe('getEventDetail', () => {
    it('should return event detail if found', async () => {
      const event = { _id: 'e1', title: 'Event' };
      eventRepository.findById.mockResolvedValue(event);
      const result = await service.getEventDetail('e1');
      expect(eventRepository.findById).toHaveBeenCalledWith('e1');
      expect(result).toBe(event);
    });

    it('should throw if event not found', async () => {
      eventRepository.findById.mockResolvedValue(null);
      await expect(service.getEventDetail('notfound')).rejects.toMatchObject({
        message: 'Event not found',
      });
    });
  });

  describe('checkUserEventCondition', () => {
    it('should return success if event is active and condition met', async () => {
      const event = {
        _id: 'e1',
        isActive: true,
        startedAt: new Date(beforeStr),
        endedAt: new Date(afterStr),
        condition: { op: '>=' as any },
      };
      eventRepository.findById.mockResolvedValue(event);
      jest
        .spyOn(service as any, 'evalCondition')
        .mockResolvedValue({ success: true, detail: 'ok' });
      const result = await service.checkUserEventCondition('e1', 'u1');
      expect(result).toEqual({ success: true, detail: 'ok' });
    });

    it('should throw if event not found', async () => {
      eventRepository.findById.mockResolvedValue(null);
      await expect(
        service.checkUserEventCondition('notfound', 'u1'),
      ).rejects.toMatchObject({ message: 'Event not found' });
    });

    it('should return false if event is not active or not in progress', async () => {
      const event = {
        _id: 'e1',
        isActive: false,
        startedAt: new Date(beforeStr),
        endedAt: new Date(afterStr),
        condition: { op: '>=' as any },
      };
      eventRepository.findById.mockResolvedValue(event);
      const result = await service.checkUserEventCondition('e1', 'u1');
      expect(result.success).toBe(false);
      expect(result.detail).toHaveProperty('reason');
    });

    it('should return false if event is not in date range', async () => {
      const event = {
        _id: 'e1',
        isActive: true,
        startedAt: new Date(muchAfterStr),
        endedAt: new Date(muchMoreAfterStr),
        condition: { op: '>=' as any },
      };
      eventRepository.findById.mockResolvedValue(event);
      const result = await service.checkUserEventCondition('e1', 'u1');
      expect(result.success).toBe(false);
      expect(result.detail).toHaveProperty('reason');
    });

    describe('evalCondition', () => {
      const baseEvent = {
        _id: 'e1',
        isActive: true,
        startedAt: new Date(beforeStr),
        endedAt: new Date(afterStr),
      };
      it('should return success for >= leaf', async () => {
        eventRepository.findById.mockResolvedValue({
          ...baseEvent,
          condition: {
            op: '>=',
            cmd: 'get_login_days',
            field: 'loginDays',
            value: 7,
          },
        });
        gameClient.send = jest.fn().mockReturnValue(of(10));
        const result = await service.checkUserEventCondition('e1', 'u1');
        expect(result.success).toBe(true);
        expect(result.detail.userValue).toBe(10);
      });
      it('should return fail for == leaf', async () => {
        eventRepository.findById.mockResolvedValue({
          ...baseEvent,
          condition: {
            op: '==',
            cmd: 'get_login_days',
            field: 'loginDays',
            value: 7,
          },
        });
        gameClient.send = jest.fn().mockReturnValue(of(5));
        const result = await service.checkUserEventCondition('e1', 'u1');
        expect(result.success).toBe(false);
        expect(result.detail.userValue).toBe(5);
      });
      it('should return success for AND', async () => {
        eventRepository.findById.mockResolvedValue({
          ...baseEvent,
          condition: {
            op: 'AND',
            children: [
              { op: '>=', cmd: 'get_login_days', field: 'loginDays', value: 7 },
              { op: '>=', cmd: 'get_score', field: 'score', value: 15 },
            ],
          },
        });
        gameClient.send = jest
          .fn()
          .mockReturnValueOnce(of(10))
          .mockReturnValueOnce(of(20));
        const result = await service.checkUserEventCondition('e1', 'u1');
        expect(result.success).toBe(true);
        expect(result.detail.length).toBe(2);
      });
      it('should return success for OR', async () => {
        eventRepository.findById.mockResolvedValue({
          ...baseEvent,
          condition: {
            op: 'OR',
            children: [
              { op: '>=', cmd: 'get_login_days', field: 'loginDays', value: 7 },
              { op: '>=', cmd: 'get_score', field: 'score', value: 15 },
            ],
          },
        });
        gameClient.send = jest
          .fn()
          .mockReturnValueOnce(of(5))
          .mockReturnValueOnce(of(20));
        const result = await service.checkUserEventCondition('e1', 'u1');
        expect(result.success).toBe(true);
        expect(result.detail.length).toBe(2);
      });
      it('should return false for invalid op', async () => {
        eventRepository.findById.mockResolvedValue({
          ...baseEvent,
          condition: { op: 'INVALID' },
        });
        const result = await service.checkUserEventCondition('e1', 'u1');
        expect(result.success).toBe(false);
        expect(result.detail.error).toBe('Invalid op');
      });
      it('should throw on gameClient error', async () => {
        eventRepository.findById.mockResolvedValue({
          ...baseEvent,
          condition: {
            op: '>=',
            cmd: 'get_login_days',
            field: 'loginDays',
            value: 7,
          },
        });
        gameClient.send = jest
          .fn()
          .mockReturnValue(throwError(() => new Error('fail')));
        await expect(
          service.checkUserEventCondition('e1', 'u1'),
        ).rejects.toThrow('Game server error');
      });
    });
  });
});
