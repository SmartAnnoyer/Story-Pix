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
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { CurrentUser } from '../decorators/current-user.decorator';
import { RequirePermissions, Roles } from '../decorators';
import { Role } from '../common/enums';
import { AuthenticatedUser } from '../common/interfaces';
import { MediaService } from './media.service';
import {
  ConfirmUploadDto,
  InitiateUploadDto,
  QueryMediaDto,
  UpdateMediaDto,
} from './dto/media.dto';

@Controller('media')
@Roles(Role.STUDIO_ADMIN, Role.STUDIO_STAFF)
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  private assertStudioId(user: AuthenticatedUser): string {
    if (!user.studioId) {
      throw new ForbiddenException('Studio context required');
    }
    return user.studioId;
  }

  @Post('upload')
  @RequirePermissions('media:write')
  initiateUpload(@CurrentUser() user: AuthenticatedUser, @Body() dto: InitiateUploadDto) {
    return this.mediaService.initiateUpload(this.assertStudioId(user), user.userId, dto);
  }

  @Post(':id/confirm')
  @RequirePermissions('media:write')
  confirmUpload(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: ConfirmUploadDto,
  ) {
    return this.mediaService.confirmUpload(this.assertStudioId(user), id, dto);
  }

  @Post(':id/retry')
  @RequirePermissions('media:write')
  retryUpload(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.mediaService.retryUpload(this.assertStudioId(user), id);
  }

  @Post(':id/cancel')
  @RequirePermissions('media:write')
  cancelUpload(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.mediaService.cancelUpload(this.assertStudioId(user), id);
  }

  @Get()
  @RequirePermissions('media:read')
  findAll(@CurrentUser() user: AuthenticatedUser, @Query() query: QueryMediaDto) {
    return this.mediaService.findAll(this.assertStudioId(user), query);
  }

  @Get(':id/thumbnail')
  @RequirePermissions('media:read')
  async getThumbnail(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const { buffer, contentType } = await this.mediaService.getPreviewBuffer(
      this.assertStudioId(user),
      id,
      'thumbnail',
    );
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'private, max-age=300');
    res.send(buffer);
  }

  @Get(':id/preview')
  @RequirePermissions('media:read')
  async getPreview(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const { buffer, contentType } = await this.mediaService.getPreviewBuffer(
      this.assertStudioId(user),
      id,
      'original',
    );
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'private, max-age=300');
    res.send(buffer);
  }

  @Get(':id')
  @RequirePermissions('media:read')
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.mediaService.findById(this.assertStudioId(user), id);
  }

  @Patch(':id')
  @RequirePermissions('media:write')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateMediaDto,
  ) {
    return this.mediaService.updateDisplayName(this.assertStudioId(user), id, dto);
  }

  @Delete(':id')
  @RequirePermissions('media:write')
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.mediaService.softDelete(this.assertStudioId(user), id);
  }
}
