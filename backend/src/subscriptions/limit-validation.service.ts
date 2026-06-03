import { ForbiddenException, Injectable } from '@nestjs/common';
import { PlanService } from '../plans/plans.service';
import { PlanDocument } from '../plans/schemas/plan.schema';
import { SubscriptionService } from './subscription.service';
import { UNLIMITED } from './interfaces/usage.interface';

@Injectable()
export class LimitValidationService {
  constructor(
    private readonly subscriptionService: SubscriptionService,
    private readonly planService: PlanService,
  ) {}

  async checkAlbumLimit(studioId: string): Promise<void> {
    const { subscription, plan } = await this.getContext(studioId);
    if (this.isWithinLimit(subscription.albumCount + 1, plan.maxAlbums)) return;
    throw new ForbiddenException({
      code: 'PLAN_LIMIT_EXCEEDED',
      message: 'Album limit reached for your current plan',
      details: { limit: plan.maxAlbums, used: subscription.albumCount },
    });
  }

  async checkStorageLimit(studioId: string, additionalGB = 0): Promise<void> {
    const { subscription, plan } = await this.getContext(studioId);
    const projected = subscription.storageUsedGB + additionalGB;
    if (this.isWithinLimit(projected, plan.storageLimitGB)) return;
    throw new ForbiddenException({
      code: 'PLAN_LIMIT_EXCEEDED',
      message: 'Storage limit exceeded for your current plan',
      details: { limit: plan.storageLimitGB, used: subscription.storageUsedGB, requested: additionalGB },
    });
  }

  async checkScanLimit(studioId: string, additionalScans = 1): Promise<void> {
    const { subscription, plan } = await this.getContext(studioId);
    const projected = subscription.scanUsage + additionalScans;
    if (this.isWithinLimit(projected, plan.monthlyScanLimit)) return;
    throw new ForbiddenException({
      code: 'PLAN_LIMIT_EXCEEDED',
      message: 'Monthly scan limit reached for your current plan',
      details: { limit: plan.monthlyScanLimit, used: subscription.scanUsage },
    });
  }

  async checkUserLimit(studioId: string): Promise<void> {
    const { subscription, plan } = await this.getContext(studioId);
    if (this.isWithinLimit(subscription.userCount + 1, plan.maxUsers)) return;
    throw new ForbiddenException({
      code: 'PLAN_LIMIT_EXCEEDED',
      message: 'User limit reached for your current plan',
      details: { limit: plan.maxUsers, used: subscription.userCount },
    });
  }

  private async getContext(studioId: string) {
    const subscription = await this.subscriptionService.assertSubscriptionActive(studioId);
    const plan = subscription.planId as unknown as PlanDocument;
    return { subscription, plan };
  }

  private isWithinLimit(used: number, limit: number): boolean {
    if (limit === UNLIMITED || this.planService.isUnlimited(limit)) return true;
    return used <= limit;
  }
}
