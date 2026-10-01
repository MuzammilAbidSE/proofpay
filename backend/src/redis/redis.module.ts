import { Global, Module } from "@nestjs/common";
import Redis from "ioredis";
import { ConfigService } from "@nestjs/config";

export const REDIS_CLIENT = "REDIS_CLIENT";

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => new Redis(config.get<string>("REDIS_URL")!),
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}
