import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsInt,
  IsMongoId,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import {
  IsStrongPassword,
  PASSWORD_VALIDATION_MESSAGE,
} from '../../common/validators/password.validator';
import { MAX_SCAN_RENEWAL_BLOCKS } from '../../common/constants/pack.constants';

@ValidatorConstraint({ name: 'MatchPasswords', async: false })
class MatchPasswordsConstraint implements ValidatorConstraintInterface {
  validate(confirmPassword: string, args: ValidationArguments) {
    const obj = args.object as { password?: string };
    return confirmPassword === obj.password;
  }

  defaultMessage() {
    return 'Passwords do not match';
  }
}

export class CartItemDto {
  @IsMongoId()
  packId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity!: number;
}

export class QuoteCartDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CartItemDto)
  items!: CartItemDto[];

  @IsOptional()
  @IsString()
  couponCode?: string;
}

export class CreateSignupOrderDto {
  @IsEmail()
  email!: string;

  @IsStrongPassword({ message: PASSWORD_VALIDATION_MESSAGE })
  password!: string;

  @IsString()
  @Validate(MatchPasswordsConstraint)
  confirmPassword!: string;

  @IsOptional()
  @IsString()
  studioName?: string;

  @IsOptional()
  @IsString()
  ownerName?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CartItemDto)
  items!: CartItemDto[];

  @IsOptional()
  @IsString()
  couponCode?: string;
}

export class CreateRechargeOrderDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CartItemDto)
  items!: CartItemDto[];

  @IsOptional()
  @IsString()
  couponCode?: string;
}

export class ScanRenewalDto {
  @IsMongoId()
  albumId!: string;

  /** Photos to renew; omit or leave empty for every live photo in the album. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(500)
  @IsMongoId({ each: true })
  arTargetIds?: string[];

  /** Number of +1000-play blocks per photo. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_SCAN_RENEWAL_BLOCKS)
  blocks?: number;
}

export class VerifyCheckoutPaymentDto {
  @IsString()
  razorpayOrderId!: string;

  @IsString()
  razorpayPaymentId!: string;

  @IsString()
  razorpaySignature!: string;
}
