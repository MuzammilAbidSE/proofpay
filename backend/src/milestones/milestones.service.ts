import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { ContractService } from "../blockchain/contract.service";
import { AuditService } from "../audit/audit.service";
import { NotificationsService } from "../notifications/notifications.service";
import { TransactionType } from "@prisma/client";

@Injectable()
export class MilestonesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly chain: ContractService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  private async escrowByOnChainId(onChainId: number) {
    const escrow = await this.prisma.escrow.findUnique({ where: { onChainId } });
    if (!escrow) throw new NotFoundException("Escrow not found");
    return escrow;
  }

  async syncAdded(args: { escrowId: string; milestoneId: string; amount: string }) {
    const escrow = await this.escrowByOnChainId(Number(args.escrowId));
    return this.prisma.milestone.upsert({
      where: { escrowId_onChainId: { escrowId: escrow.id, onChainId: Number(args.milestoneId) } },
      update: {},
      create: {
        escrowId: escrow.id,
        onChainId: Number(args.milestoneId),
        amountWei: args.amount,
      },
    });
  }

  async syncSubmitted(args: { escrowId: string; milestoneId: string; proofHash: string }) {
    return this.updateByOnChainIds(args.escrowId, args.milestoneId, {
      status: "SUBMITTED",
      proofHash: args.proofHash,
      submittedAt: new Date(),
    });
  }

  async syncApproved(args: { escrowId: string; milestoneId: string }) {
    return this.updateByOnChainIds(args.escrowId, args.milestoneId, { status: "APPROVED", approvedAt: new Date() });
  }

  async syncDisputed(args: { escrowId: string; milestoneId: string }) {
    return this.updateByOnChainIds(args.escrowId, args.milestoneId, { status: "DISPUTED" });
  }

  async syncReleased(args: { escrowId: string; milestoneId: string }) {
    const result = await this.updateByOnChainIds(args.escrowId, args.milestoneId, {
      status: "RELEASED",
      releasedAt: new Date(),
    });
    await this.resolveDisputeIfAny(args, "RELEASED_TO_FREELANCER");
    return result;
  }

  async syncRefunded(args: { escrowId: string; milestoneId: string }) {
    const result = await this.updateByOnChainIds(args.escrowId, args.milestoneId, { status: "REFUNDED" });
    await this.resolveDisputeIfAny(args, "REFUNDED_TO_CLIENT");
    return result;
  }

  private async resolveDisputeIfAny(
    args: { escrowId: string; milestoneId: string },
    resolution: "RELEASED_TO_FREELANCER" | "REFUNDED_TO_CLIENT",
  ) {
    const escrow = await this.escrowByOnChainId(Number(args.escrowId));
    const milestone = await this.prisma.milestone.findUnique({
      where: { escrowId_onChainId: { escrowId: escrow.id, onChainId: Number(args.milestoneId) } },
    });
    if (!milestone) return;

    await this.prisma.dispute.updateMany({
      where: { escrowId: escrow.id, milestoneId: milestone.id, resolution: null },
      data: { resolution, resolvedAt: new Date() },
    });
  }

  private async updateByOnChainIds(escrowOnChainId: string, milestoneOnChainId: string, data: Record<string, unknown>) {
    const escrow = await this.escrowByOnChainId(Number(escrowOnChainId));
    return this.prisma.milestone.updateMany({
      where: { escrowId: escrow.id, onChainId: Number(milestoneOnChainId) },
      data,
    });
  }

  private async milestoneOrThrow(id: string) {
    const milestone = await this.prisma.milestone.findUnique({ where: { id }, include: { escrow: true } });
    if (!milestone) throw new NotFoundException("Milestone not found");
    return milestone;
  }

  private assertTxMatches(milestone: { onChainId: number; escrow: { onChainId: number } }, args: { escrowId: string; milestoneId: string }) {
    if (Number(args.escrowId) !== milestone.escrow.onChainId || Number(args.milestoneId) !== milestone.onChainId) {
      throw new BadRequestException("Transaction does not correspond to this milestone");
    }
  }

  private async recordTx(
    txHash: string,
    blockNumber: number,
    from: string,
    type: TransactionType,
    escrowDbId: string,
    milestoneDbId: string,
  ) {
    await this.prisma.blockchainTransaction.upsert({
      where: { txHash },
      update: { status: "CONFIRMED", blockNumber },
      create: { txHash, blockNumber, type, status: "CONFIRMED", fromAddress: from, escrowId: escrowDbId, milestoneId: milestoneDbId },
    });
  }

  async addFromTx(escrowOnChainId: number, txHash: string, actorAddr?: string) {
    const { args, blockNumber, from } = await this.chain.getConfirmedEvent(txHash, "MilestoneAdded");
    if (Number((args as any).escrowId) !== escrowOnChainId) {
      throw new BadRequestException("Transaction does not correspond to this escrow");
    }
    const milestone = await this.syncAdded(args as any);
    const escrow = await this.escrowByOnChainId(escrowOnChainId);
    await this.recordTx(txHash, blockNumber, from, "ADD_MILESTONE", escrow.id, milestone.id);
    await this.audit.log("milestone.added", "Milestone", milestone.id, actorAddr, { txHash });
    return milestone;
  }

  async submitFromTx(milestoneId: string, txHash: string, actorAddr?: string) {
    const milestone = await this.milestoneOrThrow(milestoneId);
    const { args, blockNumber, from } = await this.chain.getConfirmedEvent(txHash, "MilestoneSubmitted");
    this.assertTxMatches(milestone, args as any);
    await this.syncSubmitted(args as any);
    await this.recordTx(txHash, blockNumber, from, "SUBMIT_MILESTONE", milestone.escrowId, milestone.id);
    await this.audit.log("milestone.submitted", "Milestone", milestone.id, actorAddr, { txHash });
    this.notifications.notify("milestone.submitted", { milestoneId });
    return this.milestoneOrThrow(milestoneId);
  }

  async approveFromTx(milestoneId: string, txHash: string, actorAddr?: string) {
    const milestone = await this.milestoneOrThrow(milestoneId);
    const { args, blockNumber, from } = await this.chain.getConfirmedEvent(txHash, "MilestoneApproved");
    this.assertTxMatches(milestone, args as any);
    await this.syncApproved(args as any);
    await this.recordTx(txHash, blockNumber, from, "APPROVE_MILESTONE", milestone.escrowId, milestone.id);
    await this.audit.log("milestone.approved", "Milestone", milestone.id, actorAddr, { txHash });
    this.notifications.notify("milestone.approved", { milestoneId });
    return this.milestoneOrThrow(milestoneId);
  }

  async disputeFromTx(milestoneId: string, txHash: string, actorAddr?: string) {
    const milestone = await this.milestoneOrThrow(milestoneId);
    const { args, blockNumber, from } = await this.chain.getConfirmedEvent(txHash, "DisputeOpened");
    this.assertTxMatches(milestone, args as any);
    await this.syncDisputed(args as any);
    await this.recordTx(txHash, blockNumber, from, "OPEN_DISPUTE", milestone.escrowId, milestone.id);
    await this.audit.log("milestone.disputed", "Milestone", milestone.id, actorAddr, { txHash });
    this.notifications.notify("milestone.disputed", { milestoneId });
    return this.milestoneOrThrow(milestoneId);
  }

  async releaseFromTx(milestoneId: string, txHash: string, actorAddr?: string) {
    const milestone = await this.milestoneOrThrow(milestoneId);
    const { args, blockNumber, from } = await this.chain.getConfirmedEvent(txHash, "PaymentReleased");
    this.assertTxMatches(milestone, args as any);
    await this.syncReleased(args as any);
    await this.recordTx(txHash, blockNumber, from, "RELEASE_PAYMENT", milestone.escrowId, milestone.id);
    await this.audit.log("milestone.released", "Milestone", milestone.id, actorAddr, { txHash });
    this.notifications.notify("milestone.released", { milestoneId });
    return this.milestoneOrThrow(milestoneId);
  }

  async refundFromTx(milestoneId: string, txHash: string, actorAddr?: string) {
    const milestone = await this.milestoneOrThrow(milestoneId);
    const { args, blockNumber, from } = await this.chain.getConfirmedEvent(txHash, "Refunded");
    this.assertTxMatches(milestone, args as any);
    await this.syncRefunded(args as any);
    await this.recordTx(txHash, blockNumber, from, "REFUND", milestone.escrowId, milestone.id);
    await this.audit.log("milestone.refunded", "Milestone", milestone.id, actorAddr, { txHash });
    this.notifications.notify("milestone.refunded", { milestoneId });
    return this.milestoneOrThrow(milestoneId);
  }
}
