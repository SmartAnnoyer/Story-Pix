import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { Roles, RequirePermissions } from '../../decorators';
import { Role, JobLogStatus } from '../../common/enums';
import { EmailTemplateService } from '../services/email-template.service';
import { JobLogService } from '../services/job-log.service';
import { NotificationService } from '../services/notification.service';
import {
  AdminNotificationQueryDto,
  CreateEmailTemplateDto,
  JobQueryDto,
  PreviewEmailTemplateDto,
} from '../dto/notifications.dto';
import { NotificationType } from '../../common/enums';

@Controller('admin')
@Roles(Role.SUPER_ADMIN)
export class AdminNotificationsController {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly jobLogService: JobLogService,
    private readonly emailTemplateService: EmailTemplateService,
  ) {}

  @Get('notifications')
  @RequirePermissions('platform:notifications:read')
  getNotifications(@Query() query: AdminNotificationQueryDto) {
    return this.notificationService.findAllAdmin(query.page, query.limit, {
      status: query.notificationStatus,
      type: query.type,
    });
  }

  @Get('jobs')
  @RequirePermissions('platform:jobs:read')
  getJobs(@Query() query: JobQueryDto) {
    return this.jobLogService.findAll(query.page, query.limit);
  }

  @Get('jobs/failed')
  @RequirePermissions('platform:jobs:read')
  getFailedJobs(@Query() query: JobQueryDto) {
    return this.jobLogService.findFailed(query.page, query.limit);
  }

  @Get('email-templates')
  @RequirePermissions('platform:email-templates:read')
  getEmailTemplates() {
    return this.emailTemplateService.findAll(false);
  }

  @Post('email-templates')
  @RequirePermissions('platform:email-templates:write')
  createEmailTemplate(@Body() dto: CreateEmailTemplateDto) {
    return this.emailTemplateService.create(dto);
  }

  @Post('email-templates/preview')
  @RequirePermissions('platform:email-templates:read')
  async previewTemplate(@Body() dto: PreviewEmailTemplateDto & { notificationType: NotificationType }) {
    const template = await this.emailTemplateService.findByNotificationType(dto.notificationType);
    return this.emailTemplateService.render(template, dto.variables ?? {});
  }
}
