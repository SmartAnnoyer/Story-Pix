import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Roles, RequirePermissions, TenantScoped } from '../decorators';
import { Role } from '../common/enums';
import { PaginationQueryDto } from '../common/dto/pagination.dto';
import { StudiosService } from '../studios/studios.service';
import { CreateStudioDto, UpdateStudioDto } from '../studios/dto/studio.dto';

@Controller('admin/studios')
@Roles(Role.SUPER_ADMIN)
@RequirePermissions('platform:studios:read')
export class AdminStudiosController {
  constructor(private readonly studiosService: StudiosService) {}

  @Get()
  findAll(@Query() query: PaginationQueryDto) {
    return this.studiosService.findAll(query);
  }

  @Post()
  @RequirePermissions('platform:studios:write')
  create(@Body() dto: CreateStudioDto) {
    return this.studiosService.create(dto);
  }

  @Get(':id')
  @TenantScoped()
  findOne(@Param('id') id: string) {
    return this.studiosService.findById(id);
  }

  @Patch(':id')
  @RequirePermissions('platform:studios:write')
  @TenantScoped()
  update(@Param('id') id: string, @Body() dto: UpdateStudioDto) {
    return this.studiosService.update(id, dto);
  }

  @Post(':id/suspend')
  @RequirePermissions('platform:studios:write')
  suspend(@Param('id') id: string) {
    return this.studiosService.suspend(id);
  }

  @Post(':id/activate')
  @RequirePermissions('platform:studios:write')
  activate(@Param('id') id: string) {
    return this.studiosService.activate(id);
  }

  @Post(':id/reset-admin-password')
  @RequirePermissions('platform:studios:write')
  resetAdminPassword(@Param('id') id: string) {
    return this.studiosService.resetAdminPassword(id);
  }

  @Delete(':id')
  @RequirePermissions('platform:studios:write')
  remove(@Param('id') id: string) {
    return this.studiosService.softDelete(id);
  }
}
