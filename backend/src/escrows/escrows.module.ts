import { Module } from "@nestjs/common";
import { EscrowsService } from "./escrows.service";
import { EscrowsController } from "./escrows.controller";
import { UsersModule } from "../users/users.module";
import { BlockchainModule } from "../blockchain/blockchain.module";
import { AuditModule } from "../audit/audit.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { MilestonesModule } from "../milestones/milestones.module";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [UsersModule, BlockchainModule, AuditModule, NotificationsModule, MilestonesModule, AuthModule],
  controllers: [EscrowsController],
  providers: [EscrowsService],
  exports: [EscrowsService],
})
export class EscrowsModule {}
