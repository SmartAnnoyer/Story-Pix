import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsInt,
  IsMongoId,
  IsOptional,
  IsString,
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
}

export class VerifyCheckoutPaymentDto {
  @IsString()
  razorpayOrderId!: string;

  @IsString()
  razorpayPaymentId!: string;

  @IsString()
  razorpaySignature!: string;
}
