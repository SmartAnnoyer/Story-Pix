import { Controller, Get } from '@nestjs/common';
import { Roles, RequirePermissions } from '../decorators';
import { Role } from '../common/enums';
import { StudiosService } from '../studios/studios.service';

@Controller('admin/dashboard')
@Roles(Role.SUPER_ADMIN)
@RequirePermissions('platform:studios:read')
export class AdminDashboardController {
  constructor(private readonly studiosService: StudiosService) {}

  @Get()
  getDashboard() {
    return this.studiosService.getDashboardStats();
  }
}
