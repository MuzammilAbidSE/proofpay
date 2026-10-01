import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(action: string, entityType: string, entityId: string, actorAddr?: string, metadata?: Record<string, unknown>) {
    await this.prisma.auditLog.create({
      data: { action, entityType, entityId, actorAddr, metadata: metadata as any },
    });
  }
}
