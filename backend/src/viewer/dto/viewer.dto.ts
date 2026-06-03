import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsMongoId,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { AnalyticsEventType, ScanEventType } from '../../common/enums';

const ViewerAnalyticsEventType = [
  ...Object.values(ScanEventType),
  AnalyticsEventType.VIEWER_OPENED,
  AnalyticsEventType.CAMERA_PERMISSION_GRANTED,
  AnalyticsEventType.CAMERA_PERMISSION_DENIED,
  AnalyticsEventType.SCAN_ATTEMPT,
  AnalyticsEventType.SCAN_SUCCESS,
  AnalyticsEventType.SCAN_FAILED,
  AnalyticsEventType.VIDEO_STARTED,
  AnalyticsEventType.VIDEO_COMPLETED,
  AnalyticsEventType.ALBUM_VIEWED,
] as const;

export class RecordViewerEventDto {
  @IsEnum(ViewerAnalyticsEventType)
  eventType!: (typeof ViewerAnalyticsEventType)[number];

  @IsOptional()
  @IsMongoId()
  arTargetId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  targetIndex?: number;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  deviceType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  browser?: string;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  userAgent?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  sessionId?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
