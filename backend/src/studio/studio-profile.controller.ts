import { Body, Controller, ForbiddenException, Get, Patch, Post } from '@nestjs/common';
import { CurrentUser } from '../decorators/current-user.decorator';
import { Roles, RequirePermissions } from '../decorators';
import { Role } from '../common/enums';
import { AuthenticatedUser } from '../common/interfaces';
import { StudiosService } from '../studios/studios.service';
import { LogoUploadRequestDto, UpdateStudioProfileDto } from '../studios/dto/studio.dto';

@Controller('studio')
@Roles(Role.STUDIO_ADMIN)
export class StudioProfileController {
  constructor(private readonly studiosService: StudiosService) {}

  private assertStudioId(user: AuthenticatedUser): string {
    if (!user.studioId) {
      throw new ForbiddenException('Studio context required');
    }
    return user.studioId;
  }

  @Get('profile')
  @RequirePermissions('studio:read')
  getProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.studiosService.findByStudioIdForUser(this.assertStudioId(user));
  }

  @Patch('profile')
  @RequirePermissions('studio:write')
  updateProfile(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateStudioProfileDto) {
    return this.studiosService.updateProfile(this.assertStudioId(user), dto);
  }

  @Get('usage')
  @RequirePermissions('studio:read')
  getUsage(@CurrentUser() user: AuthenticatedUser) {
    return this.studiosService.getUsage(this.assertStudioId(user));
  }

  @Post('profile/logo/presign')
  @RequirePermissions('studio:write')
  requestLogoUpload(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: LogoUploadRequestDto,
  ) {
    return this.studiosService.requestLogoUpload(this.assertStudioId(user), dto);
  }

  @Patch('profile/logo')
  @RequirePermissions('studio:write')
  confirmLogo(@CurrentUser() user: AuthenticatedUser, @Body('logoUrl') logoUrl: string) {
    return this.studiosService.confirmLogo(this.assertStudioId(user), logoUrl);
  }
}
