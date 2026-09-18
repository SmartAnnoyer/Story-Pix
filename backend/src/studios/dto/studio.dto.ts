import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Validate,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { StudioStatus } from '../../common/enums';
import { IsStrongPassword } from '../../common/validators/password.validator';

@ValidatorConstraint({ name: 'MatchStudioPasswords', async: false })
class MatchStudioPasswordsConstraint implements ValidatorConstraintInterface {
  validate(confirmPassword: string, args: ValidationArguments) {
    const obj = args.object as CreateStudioDto;
    return confirmPassword === obj.password;
  }

  defaultMessage() {
    return 'Passwords do not match';
  }
}

export class CreateStudioDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  studioName!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  ownerName!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  address?: string;

  @IsOptional()
  @IsUrl({}, { message: 'website must be a valid URL' })
  website?: string;

  @IsEmail()
  adminEmail!: string;

  @IsString()
  @IsStrongPassword()
  password!: string;

  @IsString()
  @IsNotEmpty()
  @Validate(MatchStudioPasswordsConstraint)
  confirmPassword!: string;
}

export class UpdateStudioDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  studioName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  ownerName?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  address?: string;

  @IsOptional()
  @IsUrl({}, { message: 'website must be a valid URL' })
  website?: string;

  @IsOptional()
  @IsString()
  logo?: string;

  @IsOptional()
  @IsEnum(StudioStatus)
  status?: StudioStatus;
}

export class UpdateStudioProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  studioName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  ownerName?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  address?: string;

  @IsOptional()
  @IsUrl({}, { message: 'website must be a valid URL' })
  website?: string;

  @IsOptional()
  @IsString()
  logo?: string;
}

export class LogoUploadRequestDto {
  @IsString()
  @IsNotEmpty()
  contentType!: string;

  @IsOptional()
  @IsString()
  fileName?: string;
}

export class QueryStudiosDto {
  @IsOptional()
  page?: number;

  @IsOptional()
  limit?: number;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(StudioStatus)
  status?: StudioStatus;
}
