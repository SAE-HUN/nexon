import { NestFactory } from '@nestjs/core';
import { GatewayModule } from './gateway.module';
import { CommonExceptionFilter } from './common-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(GatewayModule);
  app.useGlobalFilters(new CommonExceptionFilter());
  await app.listen(process.env.port ?? 3000);
}
bootstrap();
