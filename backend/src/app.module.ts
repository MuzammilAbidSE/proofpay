import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "./prisma/prisma.module";
import { RedisModule } from "./redis/redis.module";
import { AuthModule } from "./auth/auth.module";
import { UsersModule } from "./users/users.module";
import { BlockchainModule } from "./blockchain/blockchain.module";
import { EscrowsModule } from "./escrows/escrows.module";
import { MilestonesModule } from "./milestones/milestones.module";
import { DisputesModule } from "./disputes/disputes.module";
import { AuditModule } from "./audit/audit.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { IndexerModule } from "./indexer/indexer.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    RedisModule,
    AuthModule,
    UsersModule,
    BlockchainModule,
    EscrowsModule,
    MilestonesModule,
    DisputesModule,
    AuditModule,
    NotificationsModule,
    IndexerModule,
  ],
})
export class AppModule {}
