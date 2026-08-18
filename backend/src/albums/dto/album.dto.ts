import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { AlbumStatus } from '../../common/enums';

export class CreateAlbumDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  albumName!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  customerName!: string;

  @IsOptional()
  @IsString()
  coverImage?: string;
}

export class UpdateAlbumDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  albumName?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  customerName?: string;

  @IsOptional()
  @IsString()
  coverImage?: string;
}

export enum AlbumSortField {
  CREATED_AT = 'createdAt',
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
  @IsEnum(AlbumSortField)
  sortBy?: AlbumSortField = AlbumSortField.CREATED_AT;

  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder?: SortOrder = SortOrder.DESC;

  @IsOptional()
  @Type(() => Number)
  recentLimit?: number;
}
