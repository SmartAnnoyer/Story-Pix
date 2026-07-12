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
  UseGuards,
} from '@nestjs/common';
import { Public, RequirePermissions, Roles } from '../decorators';
import { CheckLimit } from '../decorators/check-limit.decorator';
import { CurrentUser } from '../decorators/current-user.decorator';
import { Role, LimitType } from '../common/enums';
import { AuthenticatedUser } from '../common/interfaces';
import { SubscriptionLimitGuard } from '../guards/subscription-limit.guard';
import { AlbumsService } from '../albums/albums.service';
import { CreateAlbumDto, QueryAlbumsDto, UpdateAlbumDto } from '../albums/dto/album.dto';
import { MediaService } from '../media/media.service';
import { QueryMediaDto } from '../media/dto/media.dto';
import { ArTargetsService } from '../ar-targets/ar-targets.service';
import { QueryArTargetsDto } from '../ar-targets/dto/ar-target.dto';

@Controller('albums')
export class AlbumsController {
  constructor(
    private readonly albumsService: AlbumsService,
    private readonly mediaService: MediaService,
    private readonly arTargetsService: ArTargetsService,
  ) {}

  private assertStudioId(user: AuthenticatedUser): string {
    if (!user.studioId) {
      throw new ForbiddenException('Studio context required');
    }
    return user.studioId;
  }

  @Get('public/:slug')
  @Public()
  findPublic(@Param('slug') slug: string) {
    return this.albumsService.findPublicBySlug(slug);
  }

  @Get()
  @Roles(Role.STUDIO_ADMIN, Role.STUDIO_STAFF)
  @RequirePermissions('album:read')
  findAll(@CurrentUser() user: AuthenticatedUser, @Query() query: QueryAlbumsDto) {
    return this.albumsService.findAll(this.assertStudioId(user), query);
  }

  @Get('recent')
  @Roles(Role.STUDIO_ADMIN, Role.STUDIO_STAFF)
  @RequirePermissions('album:read')
  findRecent(@CurrentUser() user: AuthenticatedUser, @Query('limit') limit?: number) {
    return this.albumsService.findRecent(this.assertStudioId(user), limit ? Number(limit) : 5);
  }

  @Get(':albumId/media')
  @Roles(Role.STUDIO_ADMIN, Role.STUDIO_STAFF)
  @RequirePermissions('media:read')
  findAlbumMedia(
    @CurrentUser() user: AuthenticatedUser,
    @Param('albumId') albumId: string,
    @Query() query: QueryMediaDto,
  ) {
    return this.mediaService.findByAlbum(this.assertStudioId(user), albumId, query);
  }

  @Get(':albumId/ar-targets')
  @Roles(Role.STUDIO_ADMIN, Role.STUDIO_STAFF)
  @RequirePermissions('ar:read')
  findAlbumArTargets(
    @CurrentUser() user: AuthenticatedUser,
    @Param('albumId') albumId: string,
    @Query() query: QueryArTargetsDto,
  ) {
    return this.arTargetsService.findByAlbum(this.assertStudioId(user), albumId, query);
  }

  @Get(':id')
  @Roles(Role.STUDIO_ADMIN, Role.STUDIO_STAFF)
  @RequirePermissions('album:read')
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.albumsService.findById(this.assertStudioId(user), id);
  }

  @Post()
  @Roles(Role.STUDIO_ADMIN, Role.STUDIO_STAFF)
  @RequirePermissions('album:write')
  @UseGuards(SubscriptionLimitGuard)
  @CheckLimit(LimitType.ALBUM)
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateAlbumDto) {
    return this.albumsService.create(this.assertStudioId(user), user.userId, dto);
  }

  @Patch(':id')
  @Roles(Role.STUDIO_ADMIN, Role.STUDIO_STAFF)
  @RequirePermissions('album:write')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateAlbumDto,
  ) {
    return this.albumsService.update(this.assertStudioId(user), id, dto);
  }

  @Delete(':id')
  @Roles(Role.STUDIO_ADMIN, Role.STUDIO_STAFF)
  @RequirePermissions('album:write')
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.albumsService.softDelete(this.assertStudioId(user), id);
  }

  @Post(':id/publish')
  @Roles(Role.STUDIO_ADMIN, Role.STUDIO_STAFF)
  @RequirePermissions('album:write')
  publish(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.albumsService.publish(this.assertStudioId(user), id);
  }

  @Post(':id/unpublish')
  @Roles(Role.STUDIO_ADMIN, Role.STUDIO_STAFF)
  @RequirePermissions('album:write')
  unpublish(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.albumsService.unpublish(this.assertStudioId(user), id);
  }

  @Post(':id/archive')
  @Roles(Role.STUDIO_ADMIN, Role.STUDIO_STAFF)
  @RequirePermissions('album:write')
  archive(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.albumsService.archive(this.assertStudioId(user), id);
  }

  @Post(':id/rebuild-ar-scan-file')
  @Roles(Role.STUDIO_ADMIN, Role.STUDIO_STAFF)
  @RequirePermissions('album:write')
  rebuildArScanFile(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.albumsService.rebuildArScanFile(this.assertStudioId(user), id);
  }
}
