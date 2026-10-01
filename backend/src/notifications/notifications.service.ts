import { Injectable, Logger } from "@nestjs/common";

/**
 * ponytail: log-only stub, no notifications table exists in the schema
 * (section 10 of the spec doesn't list one) so nothing is persisted here.
 * Swap this for a real channel (email/websocket/push) when a UI needs it.
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  notify(event: string, payload: Record<string, unknown>) {
    this.logger.log(`[notify] ${event} ${JSON.stringify(payload)}`);
  }
}
