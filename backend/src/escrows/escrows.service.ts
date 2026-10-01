import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { UsersService } from "../users/users.service";
import { ContractService } from "../blockchain/contract.service";
import { AuditService } from "../audit/audit.service";
import { NotificationsService } from "../notifications/notifications.service";

@Injectable()
export class EscrowsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
    private readonly chain: ContractService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  /** Idempotent: safe to call from both the API (immediate sync) and the indexer (background sync). */
  async syncCreated(args: { escrowId: string; client: string; freelancer: string; arbitrator: string }) {
    const client = await this.users.findOrCreateByAddress(args.client);
    const freelancer = await this.users.findOrCreateByAddress(args.freelancer);

    return this.prisma.escrow.upsert({
      where: { onChainId: Number(args.escrowId) },
      update: {},
      create: {
        onChainId: Number(args.escrowId),
        contractAddress: this.chain.address,
        clientId: client.id,
        freelancerId: freelancer.id,
        arbitratorAddr: args.arbitrator.toLowerCase(),
      },
    });
  }

  async createFromTx(txHash: string, actorAddr?: string) {
    const { args, blockNumber, from } = await this.chain.getConfirmedEvent(txHash, "EscrowCreated");
    const escrow = await this.syncCreated(args as any);

    await this.prisma.blockchainTransaction.upsert({
      where: { txHash },
      update: { status: "CONFIRMED", blockNumber },
      create: { txHash, blockNumber, type: "CREATE_ESCROW", status: "CONFIRMED", fromAddress: from, escrowId: escrow.id },
    });

    await this.audit.log("escrow.created", "Escrow", escrow.id, actorAddr, { txHash });
    this.notifications.notify("escrow.created", { escrowId: escrow.onChainId });
    return this.findByOnChainId(escrow.onChainId);
  }

  async findByOnChainId(onChainId: number) {
    const escrow = await this.prisma.escrow.findUnique({
      where: { onChainId },
      include: { milestones: true, client: true, freelancer: true },
    });
    if (!escrow) throw new NotFoundException("Escrow not found");
    return escrow;
  }

  /** Escrows where the wallet is the client, the freelancer, or the designated arbitrator. */
  async listForUser(address: string) {
    const user = await this.users.findOrCreateByAddress(address);
    return this.prisma.escrow.findMany({
      where: {
        OR: [{ clientId: user.id }, { freelancerId: user.id }, { arbitratorAddr: address.toLowerCase() }],
      },
      include: { milestones: true, client: true, freelancer: true },
      orderBy: { createdAt: "desc" },
    });
  }

  async listTransactions(onChainId: number) {
    const escrow = await this.findByOnChainId(onChainId);
    return this.prisma.blockchainTransaction.findMany({
      where: { escrowId: escrow.id },
      orderBy: { createdAt: "asc" },
    });
  }

  /** Audit trail for the escrow itself plus every one of its milestones. */
  async listAuditLogs(onChainId: number) {
    const escrow = await this.findByOnChainId(onChainId);
    const entityIds = [escrow.id, ...escrow.milestones.map((m) => m.id)];
    return this.prisma.auditLog.findMany({
      where: { entityId: { in: entityIds } },
      orderBy: { createdAt: "asc" },
    });
  }
}
