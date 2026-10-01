import { Body, Controller, Get, Param, ParseIntPipe, Post, Req, UseGuards } from "@nestjs/common";
import { EscrowsService } from "./escrows.service";
import { MilestonesService } from "../milestones/milestones.service";
import { SyncTxDto } from "../blockchain/dto/sync-tx.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";

@Controller("escrows")
export class EscrowsController {
  constructor(
    private readonly escrows: EscrowsService,
    private readonly milestones: MilestonesService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() dto: SyncTxDto, @Req() req: any) {
    return this.escrows.createFromTx(dto.txHash, req.user?.address);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  listMine(@Req() req: any) {
    return this.escrows.listForUser(req.user.address);
  }

  @Get(":onChainId")
  findOne(@Param("onChainId", ParseIntPipe) onChainId: number) {
    return this.escrows.findByOnChainId(onChainId);
  }

  @Get(":onChainId/transactions")
  transactions(@Param("onChainId", ParseIntPipe) onChainId: number) {
    return this.escrows.listTransactions(onChainId);
  }

  @Get(":onChainId/audit-logs")
  auditLogs(@Param("onChainId", ParseIntPipe) onChainId: number) {
    return this.escrows.listAuditLogs(onChainId);
  }

  @UseGuards(JwtAuthGuard)
  @Post(":onChainId/milestones")
  addMilestone(@Param("onChainId", ParseIntPipe) onChainId: number, @Body() dto: SyncTxDto, @Req() req: any) {
    return this.milestones.addFromTx(onChainId, dto.txHash, req.user?.address);
  }
}
