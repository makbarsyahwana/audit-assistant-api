import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export const createRedisClient = (configService: ConfigService): Redis => {
  const url = configService.get<string>('redis.url', 'redis://localhost:6379');
  return new Redis(url);
};

export const REDIS_CLIENT = 'REDIS_CLIENT';
