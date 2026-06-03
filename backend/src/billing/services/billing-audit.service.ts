import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BillingAuditLog, BillingAuditLogDocument } from '../schemas/billing-audit-log.schema';
import { LoggerService } from '../../shared/services/logger.service';

export interface AuditLogInput {
  action: string;
  studioId?: string;
  subscriptionId?: string;
  paymentId?: string;
  invoiceId?: string;
  actorId?: string;
  actorRole?: string;
  metadata?: Record<string, unknown>;
  ipHash?: string;
}

@Injectable()
export class BillingAuditService {
  constructor(
    @InjectModel(BillingAuditLog.name)
    private readonly auditModel: Model<BillingAuditLogDocument>,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(BillingAuditService.name);
  }

  async log(input: AuditLogInput): Promise<void> {
    await this.auditModel.create(input);
    this.logger.log(`Billing audit: ${input.action} studio=${input.studioId ?? 'n/a'}`);
  }
}
