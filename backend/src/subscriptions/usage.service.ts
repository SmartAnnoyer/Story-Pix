import { Injectable } from '@nestjs/common';
import { PlanService } from '../plans/plans.service';
import { PlanDocument } from '../plans/schemas/plan.schema';
import { SubscriptionService } from './subscription.service';
import { UNLIMITED, UsageSummary } from './interfaces/usage.interface';

@Injectable()
export class UsageService {
  constructor(
    private readonly subscriptionService: SubscriptionService,
    private readonly planService: PlanService,
  ) {}

  async getUsageSummary(studioId: string): Promise<UsageSummary> {
    const subscription = await this.subscriptionService.getActiveByStudioId(studioId);
    const plan = subscription.planId as unknown as PlanDocument;

    const limits = {
      maxAlbums: plan.maxAlbums,
      maxPhotosPerAlbum: plan.maxPhotosPerAlbum,
      maxVideosPerAlbum: plan.maxVideosPerAlbum,
      storageLimitGB: plan.storageLimitGB,
      monthlyScanLimit: plan.monthlyScanLimit,
      maxUsers: plan.maxUsers,
    };

    const usage = {
      storageUsedGB: subscription.storageUsedGB,
      scanUsage: subscription.scanUsage,
      albumCount: subscription.albumCount,
      userCount: subscription.userCount,
    };

    return {
      plan: {
        id: plan._id.toString(),
        name: plan.name,
        code: plan.code,
        monthlyPrice: plan.monthlyPrice,
        yearlyPrice: plan.yearlyPrice,
        features: plan.features,
      },
      subscription: {
        id: subscription._id.toString(),
        status: subscription.status,
        billingCycle: subscription.billingCycle,
        startDate: subscription.startDate,
        endDate: subscription.endDate ?? null,
        autoRenew: subscription.autoRenew,
      },
      limits,
      usage,
      remaining: {
        storageGB: this.remaining(usage.storageUsedGB, limits.storageLimitGB),
        scans: this.remaining(usage.scanUsage, limits.monthlyScanLimit),
        albums: this.remaining(usage.albumCount, limits.maxAlbums),
        users: this.remaining(usage.userCount, limits.maxUsers),
      },
      percentages: {
        storage: this.percent(usage.storageUsedGB, limits.storageLimitGB),
        scans: this.percent(usage.scanUsage, limits.monthlyScanLimit),
        albums: this.percent(usage.albumCount, limits.maxAlbums),
        users: this.percent(usage.userCount, limits.maxUsers),
      },
    };
  }

  async getUpgradeOptions(studioId: string) {
    const summary = await this.getUsageSummary(studioId);
    const allPlans = await this.planService.findAll(false);
    const currentPrice = summary.plan.monthlyPrice;

    return allPlans.filter((plan) => plan.monthlyPrice > currentPrice);
  }

  async incrementScanUsage(studioId: string, count = 1) {
    const subscription = await this.subscriptionService.getActiveByStudioId(studioId);
    subscription.scanUsage += count;
    await subscription.save();
    await this.subscriptionService.syncStudioFromSubscription(subscription);
    return subscription.scanUsage;
  }

  async incrementStorageUsage(studioId: string, gb: number) {
    const subscription = await this.subscriptionService.getActiveByStudioId(studioId);
    subscription.storageUsedGB += gb;
    await subscription.save();
    await this.subscriptionService.syncStudioFromSubscription(subscription);
    return subscription.storageUsedGB;
  }

  async decrementStorageUsage(studioId: string, gb: number) {
    const subscription = await this.subscriptionService.getActiveByStudioId(studioId);
    subscription.storageUsedGB = Math.max(0, subscription.storageUsedGB - gb);
    await subscription.save();
    await this.subscriptionService.syncStudioFromSubscription(subscription);
    return subscription.storageUsedGB;
  }

  async incrementAlbumCount(studioId: string) {
    const subscription = await this.subscriptionService.getActiveByStudioId(studioId);
    subscription.albumCount += 1;
    await subscription.save();
    await this.subscriptionService.syncStudioFromSubscription(subscription);
    return subscription.albumCount;
  }

  async decrementAlbumCount(studioId: string) {
    const subscription = await this.subscriptionService.getActiveByStudioId(studioId);
    subscription.albumCount = Math.max(0, subscription.albumCount - 1);
    await subscription.save();
    await this.subscriptionService.syncStudioFromSubscription(subscription);
    return subscription.albumCount;
  }

  async incrementUserCount(studioId: string) {
    const subscription = await this.subscriptionService.getActiveByStudioId(studioId);
    subscription.userCount += 1;
    await subscription.save();
    return subscription.userCount;
  }

  private remaining(used: number, limit: number): number | null {
    if (limit === UNLIMITED || this.planService.isUnlimited(limit)) return null;
    return Math.max(0, limit - used);
  }

  private percent(used: number, limit: number): number {
    if (limit === UNLIMITED || this.planService.isUnlimited(limit)) return 0;
    if (!limit) return 100;
    return Math.min(100, Math.round((used / limit) * 100));
  }
}
