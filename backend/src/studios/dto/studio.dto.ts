import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';
import { StudioStatus } from '../../common/enums';

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
  @IsNotEmpty()
  @MaxLength(60)
  adminFirstName!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  adminLastName!: string;
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
