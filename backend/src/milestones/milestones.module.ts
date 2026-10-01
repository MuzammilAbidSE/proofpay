import { Module } from "@nestjs/common";
import { MilestonesService } from "./milestones.service";
import { MilestonesController } from "./milestones.controller";
import { BlockchainModule } from "../blockchain/blockchain.module";
import { AuditModule } from "../audit/audit.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [BlockchainModule, AuditModule, NotificationsModule, AuthModule],
  controllers: [MilestonesController],
  providers: [MilestonesService],
  exports: [MilestonesService],
})
export class MilestonesModule {}
