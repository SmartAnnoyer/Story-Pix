import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { MediaStatus, MediaType } from '../../common/enums';

export class InitiateUploadDto {
  @IsMongoId()
  albumId!: string;

  @IsEnum(MediaType)
  mediaType!: MediaType;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  originalFileName!: string;

  @IsString()
  @IsNotEmpty()
  mimeType!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  fileSize!: number;
}

export class ConfirmUploadDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  width?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  height?: number;

  @IsOptional()
  @Type(() => Number)
  @Min(0)
  duration?: number;
}

export enum MediaSortField {
  CREATED_AT = 'createdAt',
  FILE_NAME = 'fileName',
  FILE_SIZE = 'fileSize',
}

export enum MediaSortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export class QueryMediaDto {
  @IsOptional()
  @IsMongoId()
  albumId?: string;

  @IsOptional()
  @IsEnum(MediaType)
  mediaType?: MediaType;

  @IsOptional()
  @IsEnum(MediaStatus)
  status?: MediaStatus;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 50;

  @IsOptional()
  @IsEnum(MediaSortField)
  sortBy?: MediaSortField = MediaSortField.CREATED_AT;

  @IsOptional()
  @IsEnum(MediaSortOrder)
  sortOrder?: MediaSortOrder = MediaSortOrder.DESC;
}
