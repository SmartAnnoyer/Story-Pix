import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { Roles, RequirePermissions } from '../decorators';
import { Role } from '../common/enums';
import { PaginationQueryDto } from '../common/dto/pagination.dto';
import { SubscriptionService } from '../subscriptions/subscription.service';
import { UsageService } from '../subscriptions/usage.service';
import { AssignPlanDto, ChangePlanDto, ExtendSubscriptionDto } from '../subscriptions/dto/subscription.dto';

@Controller('admin/subscriptions')
@Roles(Role.SUPER_ADMIN)
@RequirePermissions('platform:subscriptions:read')
export class AdminSubscriptionsController {
  constructor(
    private readonly subscriptionService: SubscriptionService,
    private readonly usageService: UsageService,
  ) {}

  @Get()
  findAll(@Query() query: PaginationQueryDto & { studioId?: string }) {
    return this.subscriptionService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.subscriptionService.findById(id);
  }

  @Get(':id/usage')
  async getUsage(@Param('id') id: string) {
    const subscription = await this.subscriptionService.findById(id);
    return this.usageService.getUsageSummary(subscription.studioId);
  }

  @Post('assign')
  @RequirePermissions('platform:subscriptions:write')
  assign(@Body() dto: AssignPlanDto) {
    return this.subscriptionService.assignPlan(dto);
  }

  @Post('studio/:studioId/upgrade')
  @RequirePermissions('platform:subscriptions:write')
  upgrade(@Param('studioId') studioId: string, @Body() dto: ChangePlanDto) {
    return this.subscriptionService.upgrade(studioId, dto);
  }

  @Post('studio/:studioId/downgrade')
  @RequirePermissions('platform:subscriptions:write')
  downgrade(@Param('studioId') studioId: string, @Body() dto: ChangePlanDto) {
    return this.subscriptionService.downgrade(studioId, dto);
  }

  @Post(':id/cancel')
  @RequirePermissions('platform:subscriptions:write')
  cancel(@Param('id') id: string) {
    return this.subscriptionService.cancel(id);
  }

  @Post(':id/suspend')
  @RequirePermissions('platform:subscriptions:write')
  suspend(@Param('id') id: string) {
    return this.subscriptionService.suspend(id);
  }

  @Post(':id/activate')
  @RequirePermissions('platform:subscriptions:write')
  activate(@Param('id') id: string) {
    return this.subscriptionService.activate(id);
  }

  @Post(':id/extend')
  @RequirePermissions('platform:subscriptions:write')
  extend(@Param('id') id: string, @Body() dto: ExtendSubscriptionDto) {
    return this.subscriptionService.extend(id, dto.extendDays);
  }
}
