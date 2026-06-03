import { DomainEventType } from '../../common/enums';

export interface DomainEventPayload {
  eventType: DomainEventType;
  studioId?: string;
  userId?: string;
  recipientEmail?: string;
  metadata?: Record<string, unknown>;
}

export interface DomainEventHandler {
  handle(event: DomainEventPayload): Promise<void>;
}

export const DOMAIN_EVENT_HANDLERS = Symbol('DOMAIN_EVENT_HANDLERS');
