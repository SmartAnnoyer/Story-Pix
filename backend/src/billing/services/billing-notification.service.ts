import { Injectable } from '@nestjs/common';
import { BillingNotificationType } from '../../common/enums';
import { NotificationOrchestratorService } from '../../notifications/services/notification-orchestrator.service';
import { LoggerService } from '../../shared/services/logger.service';

@Injectable()
export class BillingNotificationService {
  constructor(
    private readonly orchestrator: NotificationOrchestratorService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(BillingNotificationService.name);
  }

  async emit(
    type: BillingNotificationType,
    studioId: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    this.logger.log(`Billing notification: ${type} for studio ${studioId}`);
    await this.orchestrator.handleLegacyBillingEvent(type, studioId, metadata);
  }
}
