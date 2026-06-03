import {
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  IsNumber,
} from 'class-validator';
import { BillingCycle } from '../../common/enums';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

export class CreateOrderDto {
  @IsMongoId()
  planId!: string;

  @IsEnum(BillingCycle)
  billingCycle!: BillingCycle;
}

export class VerifyPaymentDto {
  @IsString()
  @IsNotEmpty()
  razorpayOrderId!: string;

  @IsString()
  @IsNotEmpty()
  razorpayPaymentId!: string;

  @IsString()
  @IsNotEmpty()
  razorpaySignature!: string;
}

export class ChangeBillingPlanDto {
  @IsMongoId()
  planId!: string;

  @IsOptional()
  @IsEnum(BillingCycle)
  billingCycle?: BillingCycle;
}

export class BillingHistoryQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  paymentStatus?: string;

  @IsOptional()
  @IsMongoId()
  studioId?: string;
}

export class RevenueQueryDto {
  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsString()
  to?: string;
}

export class RefundPaymentDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @IsOptional()
  @IsString()
  reason?: string;
}
