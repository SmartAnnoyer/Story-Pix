import { Controller, ForbiddenException, Get, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../decorators/current-user.decorator';
import { Roles, RequirePermissions } from '../decorators';
import { Role } from '../common/enums';
import { AuthenticatedUser } from '../common/interfaces';
import { UsageService } from '../subscriptions/usage.service';
import { SubscriptionLimitGuard } from '../guards/subscription-limit.guard';

@Controller('studio/subscription')
@Roles(Role.STUDIO_ADMIN)
export class StudioSubscriptionController {
  constructor(private readonly usageService: UsageService) {}

  @Get('current')
  @RequirePermissions('subscription:read')
  getCurrentPlan(@CurrentUser() user: AuthenticatedUser) {
    if (!user.studioId) throw new ForbiddenException('Studio context required');
    return this.usageService.getUsageSummary(user.studioId);
  }

  @Get('upgrades')
  @RequirePermissions('subscription:read')
  getUpgradeOptions(@CurrentUser() user: AuthenticatedUser) {
    if (!user.studioId) throw new ForbiddenException('Studio context required');
    return this.usageService.getUpgradeOptions(user.studioId);
  }

  @Get('validate')
  @UseGuards(SubscriptionLimitGuard)
  @RequirePermissions('subscription:read')
  validateSubscription(@CurrentUser() user: AuthenticatedUser) {
    return { valid: true, studioId: user.studioId };
  }
}
