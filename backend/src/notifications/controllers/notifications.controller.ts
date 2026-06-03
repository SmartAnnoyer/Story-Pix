import { Controller, ForbiddenException, Get, Param, Patch, Query } from '@nestjs/common';
import { CurrentUser } from '../../decorators/current-user.decorator';
import { Roles, RequirePermissions } from '../../decorators';
import { Role } from '../../common/enums';
import { AuthenticatedUser } from '../../common/interfaces';
import { NotificationService } from '../services/notification.service';
import { NotificationQueryDto } from '../dto/notifications.dto';

@Controller('notifications')
@Roles(Role.STUDIO_ADMIN, Role.STUDIO_STAFF)
export class NotificationsController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  @RequirePermissions('notifications:read')
  findAll(@CurrentUser() user: AuthenticatedUser, @Query() query: NotificationQueryDto) {
    if (!user.userId) throw new ForbiddenException('User context required');
    return this.notificationService.findForUser(
      user.userId,
      user.studioId,
      query.page,
      query.limit,
    );
  }

  @Get('unread')
  @RequirePermissions('notifications:read')
  findUnread(@CurrentUser() user: AuthenticatedUser) {
    if (!user.userId) throw new ForbiddenException('User context required');
    return this.notificationService.findUnread(user.userId, user.studioId);
  }

  @Patch(':id/read')
  @RequirePermissions('notifications:write')
  markRead(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    if (!user.userId) throw new ForbiddenException('User context required');
    return this.notificationService.markRead(id, user.userId);
  }
}
