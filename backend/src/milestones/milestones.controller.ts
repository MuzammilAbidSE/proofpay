import { Body, Controller, Param, Post, Req, UseGuards } from "@nestjs/common";
import { MilestonesService } from "./milestones.service";
import { SyncTxDto } from "../blockchain/dto/sync-tx.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";

@UseGuards(JwtAuthGuard)
@Controller("milestones")
export class MilestonesController {
  constructor(private readonly milestones: MilestonesService) {}

  @Post(":id/submit")
  submit(@Param("id") id: string, @Body() dto: SyncTxDto, @Req() req: any) {
    return this.milestones.submitFromTx(id, dto.txHash, req.user?.address);
  }

  @Post(":id/approve")
  approve(@Param("id") id: string, @Body() dto: SyncTxDto, @Req() req: any) {
    return this.milestones.approveFromTx(id, dto.txHash, req.user?.address);
  }

  @Post(":id/dispute")
  dispute(@Param("id") id: string, @Body() dto: SyncTxDto, @Req() req: any) {
    return this.milestones.disputeFromTx(id, dto.txHash, req.user?.address);
  }

  @Post(":id/release")
  release(@Param("id") id: string, @Body() dto: SyncTxDto, @Req() req: any) {
    return this.milestones.releaseFromTx(id, dto.txHash, req.user?.address);
  }

  @Post(":id/refund")
  refund(@Param("id") id: string, @Body() dto: SyncTxDto, @Req() req: any) {
    return this.milestones.refundFromTx(id, dto.txHash, req.user?.address);
  }
}
