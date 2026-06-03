import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { Roles, RequirePermissions } from '../decorators';
import { Role } from '../common/enums';
import { PlanService } from '../plans/plans.service';
import { CreatePlanDto, UpdatePlanDto } from '../plans/dto/plan.dto';

@Controller('admin/plans')
@Roles(Role.SUPER_ADMIN)
@RequirePermissions('platform:plans:read')
export class AdminPlansController {
  constructor(private readonly planService: PlanService) {}

  @Get()
  findAll() {
    return this.planService.findAll(true);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.planService.findById(id);
  }

  @Post()
  @RequirePermissions('platform:plans:write')
  create(@Body() dto: CreatePlanDto) {
    return this.planService.create(dto);
  }

  @Patch(':id')
  @RequirePermissions('platform:plans:write')
  update(@Param('id') id: string, @Body() dto: UpdatePlanDto) {
    return this.planService.update(id, dto);
  }

  @Post(':id/activate')
  @RequirePermissions('platform:plans:write')
  activate(@Param('id') id: string) {
    return this.planService.activate(id);
  }

  @Post(':id/deactivate')
  @RequirePermissions('platform:plans:write')
  deactivate(@Param('id') id: string) {
    return this.planService.deactivate(id);
  }
}
