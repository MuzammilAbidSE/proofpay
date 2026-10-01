import { Inject, Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { EventLog } from "ethers";
import Redis from "ioredis";
import { PrismaService } from "../prisma/prisma.service";
import { ContractService } from "../blockchain/contract.service";
import { REDIS_CLIENT } from "../redis/redis.module";
import { EscrowsService } from "../escrows/escrows.service";
import { MilestonesService } from "../milestones/milestones.service";

const LAST_BLOCK_KEY = "indexer:lastBlock";

/**
 * Reconstructs off-chain application state from on-chain events, delegating
 * to the same EscrowsService/MilestonesService sync methods the API uses
 * so there is exactly one place that turns a decoded event into a DB write.
 * The contract is the source of truth; this service only ever mirrors it.
 */
@Injectable()
export class IndexerService implements OnModuleInit {
  private readonly logger = new Logger(IndexerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly chain: ContractService,
    private readonly escrows: EscrowsService,
    private readonly milestones: MilestonesService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async onModuleInit() {
    if (!this.chain.address) {
      this.logger.warn("CONTRACT_ADDRESS not set, indexer disabled");
      return;
    }

    await this.catchUp();
    this.chain.contract.on("*", (event) => this.handleEvent(event.log ?? event));
  }

  private async catchUp() {
    const stored = await this.redis.get(LAST_BLOCK_KEY);
    const fromBlock = stored ? Number(stored) + 1 : 0;
    const latest = await this.chain.provider.getBlockNumber();
    if (fromBlock > latest) return;

    const logs = await this.chain.contract.queryFilter("*", fromBlock, latest);
    for (const log of logs) {
      await this.handleEvent(log as EventLog);
    }
    await this.redis.set(LAST_BLOCK_KEY, latest);
  }

  private async handleEvent(log: EventLog) {
    if (!("fragment" in log) || !log.fragment) return;
    const eventName = log.fragment.name;
    const args = Object.fromEntries(
      log.fragment.inputs.map((input, i) => [input.name, this.serializeArg(log.args[i])]),
    );

    const existing = await this.prisma.blockchainEvent.findUnique({
      where: { txHash_logIndex: { txHash: log.transactionHash, logIndex: log.index } },
    });
    if (existing) return;

    await this.prisma.blockchainEvent.create({
      data: {
        contractAddress: this.chain.address,
        eventName,
        blockNumber: log.blockNumber,
        txHash: log.transactionHash,
        logIndex: log.index,
        args: args as any,
      },
    });

    try {
      await this.applyEvent(eventName, args as any);
    } catch (error) {
      this.logger.error(`Failed to apply ${eventName} from ${log.transactionHash}`, error as Error);
    }
    await this.redis.set(LAST_BLOCK_KEY, log.blockNumber);
  }

  private serializeArg(value: unknown): unknown {
    return typeof value === "bigint" ? value.toString() : value;
  }

  private async applyEvent(eventName: string, args: Record<string, any>) {
    switch (eventName) {
      case "EscrowCreated":
        await this.escrows.syncCreated(args as any);
        break;
      case "MilestoneAdded":
        await this.milestones.syncAdded(args as any);
        break;
      case "MilestoneSubmitted":
        await this.milestones.syncSubmitted(args as any);
        break;
      case "MilestoneApproved":
        await this.milestones.syncApproved(args as any);
        break;
      case "PaymentReleased":
        await this.milestones.syncReleased(args as any);
        break;
      case "DisputeOpened":
        await this.milestones.syncDisputed(args as any);
        break;
      case "Refunded":
        await this.milestones.syncRefunded(args as any);
        break;
      default:
        break;
    }
  }
}
