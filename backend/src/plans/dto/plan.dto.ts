import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { PlanCode } from '../../common/enums';

export class CreatePlanDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  name!: string;

  @IsEnum(PlanCode)
  code!: PlanCode;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsNumber()
  @Min(0)
  monthlyPrice!: number;

  @IsNumber()
  @Min(0)
  yearlyPrice!: number;

  @IsInt()
  maxAlbums!: number;

  @IsInt()
  @Min(1)
  maxPhotosPerAlbum!: number;

  @IsInt()
  @Min(1)
  maxVideosPerAlbum!: number;

  @IsNumber()
  @Min(0)
  storageLimitGB!: number;

  @IsInt()
  monthlyScanLimit!: number;

  @IsInt()
  @Min(1)
  maxUsers!: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  features?: string[];
}

export class UpdatePlanDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  monthlyPrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  yearlyPrice?: number;

  @IsOptional()
  @IsInt()
  maxAlbums?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxPhotosPerAlbum?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxVideosPerAlbum?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  storageLimitGB?: number;

  @IsOptional()
  @IsInt()
  monthlyScanLimit?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxUsers?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  features?: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
