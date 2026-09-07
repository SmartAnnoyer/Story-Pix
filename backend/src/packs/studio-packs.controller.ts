import { Controller, Get } from '@nestjs/common';
import { CurrentUser, RequirePermissions, Roles } from '../decorators';
import { Role } from '../common/enums';
import type { AuthenticatedUser } from '../common/interfaces';
import { PacksService } from './packs.service';

@Controller('studio/packs')
@Roles(Role.STUDIO_ADMIN, Role.STUDIO_STAFF)
export class StudioPacksController {
  constructor(private readonly packsService: PacksService) {}

  @Get('catalog')
  @RequirePermissions('album:read')
  catalog() {
    return this.packsService.findAll(false);
  }

  @Get('summary')
  @RequirePermissions('album:read')
  summary(@CurrentUser() user: AuthenticatedUser) {
    return this.packsService.getStudioPackSummary(user.studioId!);
  }

  @Get('credits')
  @RequirePermissions('album:read')
  credits(@CurrentUser() user: AuthenticatedUser) {
    return this.packsService.listStudioCredits(user.studioId!);
  }

  @Get('history')
  @RequirePermissions('album:read')
  history(@CurrentUser() user: AuthenticatedUser) {
    return this.packsService.listLedger({ studioId: user.studioId!, limit: 50 });
  }
}
