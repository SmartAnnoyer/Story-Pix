import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsMongoId,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ArTargetStatus } from '../../common/enums';

export enum ArTargetSortField {
  CREATED_AT = 'createdAt',
  TARGET_NAME = 'targetName',
  TARGET_INDEX = 'targetIndex',
  STATUS = 'status',
}

export enum ArTargetSortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export class CreateArTargetDto {
  @IsMongoId()
  albumId!: string;

  @IsMongoId()
  photoMediaId!: string;

  @IsMongoId()
  videoMediaId!: string;

  @IsString()
  @MaxLength(120)
  targetName!: string;
}

export class UpdateArTargetDto {
  @IsOptional()
  @IsMongoId()
  photoMediaId?: string;

  @IsOptional()
  @IsMongoId()
  videoMediaId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  targetName?: string;
}

export class QueryArTargetsDto {
  @IsOptional()
  @IsMongoId()
  albumId?: string;

  @IsOptional()
  @IsEnum(ArTargetStatus)
  status?: ArTargetStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsEnum(ArTargetSortField)
  sortBy?: ArTargetSortField;

  @IsOptional()
  @IsEnum(ArTargetSortOrder)
  sortOrder?: ArTargetSortOrder;
}
