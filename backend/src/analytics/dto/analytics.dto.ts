import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsMongoId,
  IsOptional,
  IsString,
} from 'class-validator';
import { AnalyticsEventType, AnalyticsExportFormat } from '../../common/enums';

export class AnalyticsDateRangeDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}

export class StudioAnalyticsQueryDto extends AnalyticsDateRangeDto {
  @IsOptional()
  @IsMongoId()
  albumId?: string;

  @IsOptional()
  @IsEnum(AnalyticsEventType)
  eventType?: AnalyticsEventType;
}

export class PlatformAnalyticsQueryDto extends AnalyticsDateRangeDto {
  @IsOptional()
  @IsMongoId()
  studioId?: string;

  @IsOptional()
  @IsMongoId()
  albumId?: string;

  @IsOptional()
  @IsEnum(AnalyticsEventType)
  eventType?: AnalyticsEventType;
}

export class AnalyticsExportQueryDto extends StudioAnalyticsQueryDto {
  @IsOptional()
  @IsEnum(AnalyticsExportFormat)
  format?: AnalyticsExportFormat;
}

export class PlatformAnalyticsExportQueryDto extends PlatformAnalyticsQueryDto {
  @IsOptional()
  @IsEnum(AnalyticsExportFormat)
  format?: AnalyticsExportFormat;
}

export class AlbumInsightsQueryDto extends AnalyticsDateRangeDto {}

export class AnalyticsReportQueryDto extends StudioAnalyticsQueryDto {
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  limit?: number;
}
