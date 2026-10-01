import { Body, Controller, Get, Param, Post, Req, UseGuards } from "@nestjs/common";
import { DisputesService } from "./disputes.service";
import { SubmitEvidenceDto } from "./dto/submit-evidence.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";

@Controller("disputes")
export class DisputesController {
  constructor(private readonly disputes: DisputesService) {}

  @UseGuards(JwtAuthGuard)
  @Post("milestones/:milestoneId/evidence")
  addEvidence(@Param("milestoneId") milestoneId: string, @Body() dto: SubmitEvidenceDto, @Req() req: any) {
    return this.disputes.addEvidence(milestoneId, req.user.address, dto.note, dto.fileHash);
  }

  @Get("escrows/:escrowId")
  findByEscrow(@Param("escrowId") escrowId: string) {
    return this.disputes.findByEscrow(escrowId);
  }
}
