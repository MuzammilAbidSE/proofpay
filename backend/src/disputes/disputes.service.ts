import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class DisputesService {
  constructor(private readonly prisma: PrismaService) {}

  async addEvidence(milestoneId: string, submittedByAddr: string, note?: string, fileHash?: string) {
    const milestone = await this.prisma.milestone.findUnique({ where: { id: milestoneId } });
    if (!milestone) throw new NotFoundException("Milestone not found");

    const dispute = await this.prisma.dispute.upsert({
      where: { escrowId_milestoneId: { escrowId: milestone.escrowId, milestoneId: milestone.id } },
      update: {},
      create: { escrowId: milestone.escrowId, milestoneId: milestone.id, openedByAddr: submittedByAddr },
    });

    return this.prisma.disputeEvidence.create({
      data: { disputeId: dispute.id, submittedByAddr, note, fileHash },
    });
  }

  async findByEscrow(escrowId: string) {
    return this.prisma.dispute.findMany({
      where: { escrowId },
      include: { evidence: true, milestone: true },
    });
  }
}
