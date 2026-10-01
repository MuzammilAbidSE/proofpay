import { Controller, Get, Param } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Controller("blockchain")
export class BlockchainController {
  constructor(private readonly prisma: PrismaService) {}

  @Get("events/:escrowId")
  async eventsForEscrow(@Param("escrowId") escrowOnChainId: string) {
    return this.prisma.blockchainEvent.findMany({
      where: {
        args: { path: ["escrowId"], equals: escrowOnChainId },
      },
      orderBy: { blockNumber: "asc" },
    });
  }
}
