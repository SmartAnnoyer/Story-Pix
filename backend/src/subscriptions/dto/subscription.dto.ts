import { IsEnum, IsInt, IsMongoId, IsOptional, Min } from 'class-validator';
import { BillingCycle } from '../../common/enums';

export class AssignPlanDto {
  @IsMongoId()
  studioId!: string;

  @IsMongoId()
  planId!: string;

  @IsEnum(BillingCycle)
  billingCycle!: BillingCycle;
}

export class ChangePlanDto {
  @IsMongoId()
  planId!: string;

  @IsOptional()
  @IsEnum(BillingCycle)
  billingCycle?: BillingCycle;
}

export class ExtendSubscriptionDto {
  @IsInt()
  @Min(1)
  extendDays!: number;
}

export class QuerySubscriptionsDto {
  @IsOptional()
  page?: number;

  @IsOptional()
  limit?: number;

  @IsOptional()
  @IsMongoId()
  studioId?: string;
}
