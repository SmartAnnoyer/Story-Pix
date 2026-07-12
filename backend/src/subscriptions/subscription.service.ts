import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { PaginatedResult, PaginationQueryDto } from '../common/dto/pagination.dto';
import {
  BillingCycle,
  PlanCode,
  StudioStatus,
  SubscriptionStatus,
  AnalyticsEventType,
} from '../common/enums';
import { AnalyticsIngestionService } from '../analytics/analytics-ingestion.service';
import {
  BILLING_PROVIDER,
  IBillingProvider,
} from '../billing/interfaces/billing-provider.interface';
import { PlanService } from '../plans/plans.service';
import { PlanDocument } from '../plans/schemas/plan.schema';
import { Studio, StudioDocument } from '../studios/schemas/studio.schema';
import { Subscription, SubscriptionDocument } from './schemas/subscription.schema';
import { AssignPlanDto, ChangePlanDto } from './dto/subscription.dto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SubscriptionService {
  constructor(
    @InjectModel(Subscription.name) private readonly subscriptionModel: Model<SubscriptionDocument>,
    @InjectModel(Studio.name) private readonly studioModel: Model<StudioDocument>,
    private readonly planService: PlanService,
    @Inject(BILLING_PROVIDER) private readonly billingProvider: IBillingProvider,
    private readonly configService: ConfigService,
    private readonly analyticsIngestionService: AnalyticsIngestionService,
  ) {}

  async findAll(query: PaginationQueryDto & { studioId?: string }): Promise<PaginatedResult<unknown>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;
    const filter: Record<string, unknown> = {};

    if (query.studioId) {
      filter.studioId = new Types.ObjectId(query.studioId);
    }

    const [items, total] = await Promise.all([
      this.subscriptionModel
        .find(filter)
        .populate('planId')
        .populate('studioId', 'studioName studioCode email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.subscriptionModel.countDocuments(filter).exec(),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      items: items.map((sub) => this.serialize(sub)),
      pagination: { page, limit, total, totalPages, hasMore: page < totalPages },
    };
  }

  async findById(id: string) {
    const subscription = await this.subscriptionModel
      .findById(id)
      .populate('planId')
      .populate('studioId', 'studioName studioCode email')
      .exec();

    if (!subscription) throw new NotFoundException('Subscription not found');
    return this.serialize(subscription);
  }

  async getActiveByStudioId(studioId: string) {
    const subscription = await this.subscriptionModel
      .findOne({
        studioId: new Types.ObjectId(studioId),
        status: { $in: [SubscriptionStatus.TRIAL, SubscriptionStatus.ACTIVE] },
      })
      .sort({ createdAt: -1 })
      .populate('planId')
      .exec();

    if (!subscription) throw new NotFoundException('Active subscription not found');
    return subscription;
  }

  async createTrialSubscription(studioId: string, studioEmail: string) {
    const starterPlan = await this.planService.findByCode(PlanCode.STARTER);
    return this.assignPlanInternal(studioId, starterPlan, BillingCycle.MONTHLY, SubscriptionStatus.TRIAL, studioEmail);
  }

  async assignPlan(dto: AssignPlanDto) {
    const studio = await this.studioModel.findById(dto.studioId).exec();
    if (!studio || studio.deletedAt) throw new NotFoundException('Studio not found');

    const plan = await this.planService.findDocumentById(dto.planId);
    if (!plan.isActive) throw new BadRequestException('Plan is not active');

    await this.deactivateCurrentSubscription(dto.studioId);

    const result = await this.assignPlanInternal(
      dto.studioId,
      plan,
      dto.billingCycle,
      SubscriptionStatus.ACTIVE,
      studio.email,
    );
    void this.trackSubscriptionEvent(dto.studioId, AnalyticsEventType.PLAN_ASSIGNED, {
      planId: plan._id.toString(),
    });
    return result;
  }

  async upgrade(studioId: string, dto: ChangePlanDto) {
    return this.changePlan(studioId, dto, 'upgrade');
  }

  async downgrade(studioId: string, dto: ChangePlanDto) {
    return this.changePlan(studioId, dto, 'downgrade');
  }

  async cancel(subscriptionId: string) {
    const subscription = await this.subscriptionModel.findById(subscriptionId).exec();
    if (!subscription) throw new NotFoundException('Subscription not found');

    subscription.status = SubscriptionStatus.CANCELLED;
    subscription.autoRenew = false;
    await subscription.save();

    if (subscription.externalBillingId) {
      await this.billingProvider.cancelSubscription(subscription.externalBillingId);
    }

    await this.syncStudioFromSubscription(subscription);
    return this.serialize(subscription);
  }

  async suspend(subscriptionId: string) {
    return this.setSubscriptionStatus(subscriptionId, SubscriptionStatus.SUSPENDED);
  }

  async activate(subscriptionId: string) {
    const subscription = await this.subscriptionModel.findById(subscriptionId).exec();
    if (!subscription) throw new NotFoundException('Subscription not found');

    if (
      subscription.status === SubscriptionStatus.ACTIVE ||
      subscription.status === SubscriptionStatus.TRIAL
    ) {
      throw new BadRequestException('Subscription is already active');
    }

    const studioId = this.getRefIdString(subscription.studioId);

    // Ensure only one active subscription per studio
    await this.deactivateCurrentSubscription(studioId);

    if (!subscription.endDate || subscription.endDate <= new Date()) {
      const endDate = new Date();
      if (subscription.billingCycle === BillingCycle.YEARLY) {
        endDate.setFullYear(endDate.getFullYear() + 1);
      } else {
        endDate.setMonth(endDate.getMonth() + 1);
      }
      subscription.endDate = endDate;
    }

    subscription.status = SubscriptionStatus.ACTIVE;
    subscription.autoRenew = true;
    await subscription.save();
    await this.syncStudioFromSubscription(subscription);

    void this.trackSubscriptionEvent(studioId, AnalyticsEventType.PLAN_ASSIGNED, {
      subscriptionId: subscription._id.toString(),
      reactivated: true,
    });

    return this.serialize(subscription);
  }

  async extend(subscriptionId: string, extendDays: number) {
    const subscription = await this.subscriptionModel.findById(subscriptionId).exec();
    if (!subscription) throw new NotFoundException('Subscription not found');

    const baseDate = subscription.endDate && subscription.endDate > new Date() ? subscription.endDate : new Date();
    subscription.endDate = new Date(baseDate.getTime() + extendDays * 24 * 60 * 60 * 1000);

    if (subscription.status === SubscriptionStatus.EXPIRED) {
      subscription.status = SubscriptionStatus.ACTIVE;
    }

    await subscription.save();
    await this.syncStudioFromSubscription(subscription);
    return this.serialize(subscription);
  }

  async assertSubscriptionActive(studioId: string) {
    const subscription = await this.getActiveByStudioId(studioId).catch(() => null);

    if (!subscription) {
      throw new ForbiddenException('No active subscription found for this studio');
    }

    if (subscription.endDate && subscription.endDate < new Date()) {
      subscription.status = SubscriptionStatus.EXPIRED;
      await subscription.save();
      await this.syncStudioFromSubscription(subscription);
      void this.trackSubscriptionEvent(studioId, AnalyticsEventType.PLAN_EXPIRED, {
        subscriptionId: subscription._id.toString(),
      });
      throw new ForbiddenException('Subscription has expired');
    }

    if (subscription.status === SubscriptionStatus.SUSPENDED) {
      throw new ForbiddenException('Subscription is suspended');
    }

    if (subscription.status === SubscriptionStatus.CANCELLED) {
      throw new ForbiddenException('Subscription is cancelled');
    }

    return subscription;
  }

  serialize(subscription: SubscriptionDocument) {
    const doc = subscription as SubscriptionDocument & { createdAt?: Date; updatedAt?: Date };
    const plan = this.getPopulatedPlan(subscription.planId);
    const studio = this.getPopulatedStudio(subscription.studioId);

    return {
      id: subscription._id.toString(),
      studioId: studio?._id.toString() ?? this.getRefIdString(subscription.studioId),
      studio: studio
        ? {
            id: studio._id.toString(),
            studioName: studio.studioName,
            studioCode: studio.studioCode,
            email: studio.email,
          }
        : null,
      planId: plan?._id.toString() ?? this.getRefIdString(subscription.planId),
      plan: plan ? this.planService.serialize(plan) : null,
      startDate: subscription.startDate,
      endDate: subscription.endDate ?? null,
      status: subscription.status,
      billingCycle: subscription.billingCycle,
      storageUsedGB: subscription.storageUsedGB,
      scanUsage: subscription.scanUsage,
      albumCount: subscription.albumCount,
      userCount: subscription.userCount,
      autoRenew: subscription.autoRenew,
      externalBillingId: subscription.externalBillingId ?? null,
      createdAt: doc.createdAt ?? null,
      updatedAt: doc.updatedAt ?? null,
    };
  }

  private async changePlan(studioId: string, dto: ChangePlanDto, _action: 'upgrade' | 'downgrade') {
    const newPlan = await this.planService.findDocumentById(dto.planId);
    if (!newPlan.isActive) throw new BadRequestException('Target plan is not active');

    const studio = await this.studioModel.findById(studioId).exec();
    if (!studio || studio.deletedAt) throw new NotFoundException('Studio not found');

    const current = await this.getActiveByStudioId(studioId).catch(() => null);

    if (!current) {
      // No active subscription — assign / replace plan directly
      return this.assignPlan({
        studioId,
        planId: dto.planId,
        billingCycle: dto.billingCycle ?? BillingCycle.MONTHLY,
      });
    }

    current.status = SubscriptionStatus.CANCELLED;
    current.autoRenew = false;
    await current.save();

    const result = await this.assignPlanInternal(
      studioId,
      newPlan,
      dto.billingCycle ?? current.billingCycle,
      SubscriptionStatus.ACTIVE,
      studio.email,
      {
        storageUsedGB: current.storageUsedGB,
        scanUsage: current.scanUsage,
        albumCount: current.albumCount,
        userCount: current.userCount,
      },
    );

    void this.trackSubscriptionEvent(
      studioId,
      _action === 'upgrade' ? AnalyticsEventType.PLAN_UPGRADED : AnalyticsEventType.PLAN_DOWNGRADED,
      { planId: newPlan._id.toString() },
    );

    return result;
  }

  private async assignPlanInternal(
    studioId: string,
    plan: PlanDocument,
    billingCycle: BillingCycle,
    status: SubscriptionStatus,
    customerEmail: string,
    carryOver?: {
      storageUsedGB: number;
      scanUsage: number;
      albumCount: number;
      userCount: number;
    },
  ) {
    const trialDays = this.configService.get<number>('studio.trialDurationDays', 14);
    const startDate = new Date();
    const endDate = new Date(startDate);

    if (status === SubscriptionStatus.TRIAL) {
      endDate.setDate(endDate.getDate() + trialDays);
    } else if (billingCycle === BillingCycle.YEARLY) {
      endDate.setFullYear(endDate.getFullYear() + 1);
    } else {
      endDate.setMonth(endDate.getMonth() + 1);
    }

    const billingResult = await this.billingProvider.createSubscription({
      studioId,
      planCode: plan.code,
      billingCycle,
      customerEmail,
    });

    const subscription = await this.subscriptionModel.create({
      studioId: new Types.ObjectId(studioId),
      planId: plan._id,
      startDate,
      endDate,
      status,
      billingCycle,
      storageUsedGB: carryOver?.storageUsedGB ?? 0,
      scanUsage: carryOver?.scanUsage ?? 0,
      albumCount: carryOver?.albumCount ?? 0,
      userCount: carryOver?.userCount ?? 1,
      autoRenew: status !== SubscriptionStatus.TRIAL,
      externalBillingId: billingResult.externalBillingId,
    });

    await this.syncStudioFromSubscription(subscription, plan);
    return this.serialize(await subscription.populate('planId'));
  }

  private async deactivateCurrentSubscription(studioId: string) {
    await this.subscriptionModel
      .updateMany(
        {
          studioId: new Types.ObjectId(studioId),
          status: { $in: [SubscriptionStatus.TRIAL, SubscriptionStatus.ACTIVE] },
        },
        { status: SubscriptionStatus.CANCELLED, autoRenew: false },
      )
      .exec();
  }

  private async setSubscriptionStatus(subscriptionId: string, status: SubscriptionStatus) {
    const subscription = await this.subscriptionModel.findById(subscriptionId).exec();
    if (!subscription) throw new NotFoundException('Subscription not found');

    subscription.status = status;
    await subscription.save();
    await this.syncStudioFromSubscription(subscription);
    return this.serialize(subscription);
  }

  async syncStudioFromSubscription(subscription: SubscriptionDocument, planDoc?: PlanDocument) {
    const plan = planDoc ?? (await this.resolvePlanDocument(subscription));

    const studioId = this.getPopulatedStudio(subscription.studioId)?._id ?? subscription.studioId;
    const studio = await this.studioModel.findById(studioId).exec();
    if (!studio) return;

    studio.planId = plan._id;
    studio.activeSubscriptionId = subscription._id;
    studio.subscriptionId = subscription._id.toString();
    studio.subscriptionStatus = subscription.status;
    studio.storageLimitGB = plan.storageLimitGB;
    studio.storageUsedGB = subscription.storageUsedGB;
    studio.monthlyScanLimit = plan.monthlyScanLimit;
    studio.monthlyScanUsage = subscription.scanUsage;

    if (subscription.status === SubscriptionStatus.TRIAL) {
      studio.status = StudioStatus.TRIAL;
    } else if (subscription.status === SubscriptionStatus.ACTIVE) {
      studio.status = StudioStatus.ACTIVE;
    } else if (subscription.status === SubscriptionStatus.EXPIRED) {
      studio.status = StudioStatus.EXPIRED;
    } else if (subscription.status === SubscriptionStatus.SUSPENDED) {
      studio.status = StudioStatus.SUSPENDED;
    }

    await studio.save();
  }

  private trackSubscriptionEvent(
    studioId: string,
    eventType: AnalyticsEventType,
    metadata?: Record<string, unknown>,
  ) {
    void this.analyticsIngestionService
      .recordEvent({ studioId, eventType, metadata })
      .catch(() => undefined);
  }

  private getPopulatedPlan(planId: unknown): PlanDocument | null {
    if (planId && typeof planId === 'object' && 'code' in planId && '_id' in planId) {
      return planId as PlanDocument;
    }
    return null;
  }

  private getPopulatedStudio(studioId: unknown): StudioDocument | null {
    if (studioId && typeof studioId === 'object' && 'studioCode' in studioId && '_id' in studioId) {
      return studioId as StudioDocument;
    }
    return null;
  }

  private getRefIdString(ref: Types.ObjectId | { toString(): string }): string {
    if (ref instanceof Types.ObjectId) {
      return ref.toString();
    }
    return ref.toString();
  }

  private async resolvePlanDocument(subscription: SubscriptionDocument): Promise<PlanDocument> {
    const populated = this.getPopulatedPlan(subscription.planId);
    if (populated) {
      return populated;
    }

    const planId =
      subscription.planId instanceof Types.ObjectId
        ? subscription.planId.toString()
        : this.getRefIdString(subscription.planId);

    return this.planService.findDocumentById(planId);
  }
}
