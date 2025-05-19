import { Injectable, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class GameService {
  constructor(
    @Inject('EVENT_SERVICE') private readonly eventClient: ClientProxy,
  ) {}

  getHello(): string {
    return 'Hello World!';
  }

  async sendCallback(
    callback: { cmd: string; payload: any },
    result: { status: string; reason?: string },
  ) {
    try {
      await new Promise((resolve) => setTimeout(resolve, 5000));
      await firstValueFrom(
        this.eventClient.send(
          { cmd: callback.cmd },
          { ...callback.payload, ...result },
        ),
      );
    } catch (err) {
      console.log(err);
    }
  }

  async processRewardRequest(data: {
    userId: string;
    eventId: string;
    rewardId: string;
    type: string;
    name: string;
    qty: number;
    processing: { cmd: string; payload: any };
    callback: { cmd: string; payload: any };
  }) {
    let processingResult: any;
    try {
      processingResult = await firstValueFrom(
        this.eventClient.send(
          { cmd: data.processing.cmd },
          data.processing.payload,
        ),
      );
    } catch (err) {
      const result = {
        status: 'FAILED',
        reason: 'Processing validation failed',
      };
      this.sendCallback(data.callback, result);
      return result;
    }

    const isFailed = Math.random() < 0.1;
    const result = isFailed
      ? { status: 'FAILED', reason: 'Miss' }
      : { status: 'SUCCESS' };
    this.sendCallback(data.callback, result);

    return {
      status: 'PROCESSING',
      message: 'Reward processing started',
    };
  }

  async getUserAction(data: { userId: string; field: string }) {
    return 7;
  }
}
