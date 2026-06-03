import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { NotificationType } from '../../common/enums';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

export class NotificationQueryDto extends PaginationQueryDto {}

export class AdminNotificationQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  notificationStatus?: string;

  @IsOptional()
  @IsString()
  type?: string;
}

export class JobQueryDto extends PaginationQueryDto {}

export class CreateEmailTemplateDto {
  @IsString()
  @IsNotEmpty()
  key!: string;

  @IsEnum(NotificationType)
  notificationType!: NotificationType;

  @IsString()
  @IsNotEmpty()
  subject!: string;

  @IsString()
  @IsNotEmpty()
  htmlBody!: string;

  @IsString()
  @IsNotEmpty()
  textBody!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  variables?: string[];
}

export class PreviewEmailTemplateDto {
  @IsOptional()
  variables?: Record<string, string>;
}
