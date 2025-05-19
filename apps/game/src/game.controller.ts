import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { GameService } from './game.service';

@Controller()
export class GameController {
  constructor(private readonly gameService: GameService) {}

  @MessagePattern('game.hello')
  getHello(): string {
    return 'Hello, World!';
  }

  @MessagePattern('game.reward.process')
  async handleRewardProcess(
    @Payload()
    data: {
      userId: string;
      eventId: string;
      rewardId: string;
      type: string;
      name: string;
      qty: number;
      processing: { cmd: string; payload: any };
      callback: { cmd: string; payload: any };
    },
  ) {
    return this.gameService.processRewardRequest(data);
  }

  @MessagePattern('game.user-action.get')
  async getUserAction(@Payload() data: { userId: string; field: string }) {
    return this.gameService.getUserAction(data);
  }
}
