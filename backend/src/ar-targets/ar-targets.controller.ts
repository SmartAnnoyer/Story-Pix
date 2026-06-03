import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../decorators/current-user.decorator';
import { RequirePermissions, Roles } from '../decorators';
import { Role } from '../common/enums';
import { AuthenticatedUser } from '../common/interfaces';
import { ArTargetsService } from './ar-targets.service';
import { CreateArTargetDto, QueryArTargetsDto, UpdateArTargetDto } from './dto/ar-target.dto';

@Controller('ar-targets')
@Roles(Role.STUDIO_ADMIN, Role.STUDIO_STAFF)
export class ArTargetsController {
  constructor(private readonly arTargetsService: ArTargetsService) {}

  private assertStudioId(user: AuthenticatedUser): string {
    if (!user.studioId) {
      throw new ForbiddenException('Studio context required');
    }
    return user.studioId;
  }

  @Get()
  @RequirePermissions('ar:read')
  findAll(@CurrentUser() user: AuthenticatedUser, @Query() query: QueryArTargetsDto) {
    return this.arTargetsService.findAll(this.assertStudioId(user), query);
  }

  @Get(':id')
  @RequirePermissions('ar:read')
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.arTargetsService.findById(this.assertStudioId(user), id);
  }

  @Post()
  @RequirePermissions('ar:write')
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateArTargetDto) {
    return this.arTargetsService.create(this.assertStudioId(user), dto);
  }

  @Patch(':id')
  @RequirePermissions('ar:write')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateArTargetDto,
  ) {
    return this.arTargetsService.update(this.assertStudioId(user), id, dto);
  }

  @Delete(':id')
  @RequirePermissions('ar:write')
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.arTargetsService.softDelete(this.assertStudioId(user), id);
  }

  @Post(':id/publish')
  @RequirePermissions('ar:write')
  publish(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.arTargetsService.publish(this.assertStudioId(user), id);
  }

  @Post(':id/archive')
  @RequirePermissions('ar:write')
  archive(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.arTargetsService.archive(this.assertStudioId(user), id);
  }
}
