import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { AlbumStatus, EventType } from '../../common/enums';

export class CreateAlbumDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  albumName!: string;

  @IsEnum(EventType)
  eventType!: EventType;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  customerName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  customerPhone?: string;

  @IsOptional()
  @IsEmail()
  customerEmail?: string;

  @IsDateString()
  eventDate!: string;

  @IsOptional()
  @IsString()
  coverImage?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
}

export class UpdateAlbumDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  albumName?: string;

  @IsOptional()
  @IsEnum(EventType)
  eventType?: EventType;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  customerName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  customerPhone?: string;

  @IsOptional()
  @IsEmail()
  customerEmail?: string;

  @IsOptional()
  @IsDateString()
  eventDate?: string;

  @IsOptional()
  @IsString()
  coverImage?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
}

export enum AlbumSortField {
  CREATED_AT = 'createdAt',
  EVENT_DATE = 'eventDate',
  ALBUM_NAME = 'albumName',
}

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export class QueryAlbumsDto {
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
  limit?: number = 20;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(AlbumStatus)
  status?: AlbumStatus;

  @IsOptional()
  @IsEnum(EventType)
  eventType?: EventType;

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @IsOptional()
  @IsEnum(AlbumSortField)
  sortBy?: AlbumSortField = AlbumSortField.CREATED_AT;

  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder?: SortOrder = SortOrder.DESC;

  @IsOptional()
  @Type(() => Number)
  recentLimit?: number;
}
