import { Injectable } from '@nestjs/common';
import { DomainEventPayload } from '../interfaces/domain-event.interface';
import { NotificationOrchestratorService } from './notification-orchestrator.service';
import { LoggerService } from '../../shared/services/logger.service';

@Injectable()
export class EventBusService {
  constructor(
    private readonly orchestrator: NotificationOrchestratorService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(EventBusService.name);
  }

  async publish(event: DomainEventPayload) {
    this.logger.log(`Domain event published: ${event.eventType}`);
    try {
      await this.orchestrator.handleDomainEvent(event);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown notification error';
      this.logger.error(`Notification handling failed for ${event.eventType}: ${message}`);
    }
  }
}
