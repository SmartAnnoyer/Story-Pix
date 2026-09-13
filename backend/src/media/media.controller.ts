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
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Readable } from 'stream';
import { CurrentUser } from '../decorators/current-user.decorator';
import { RequirePermissions, Roles } from '../decorators';
import { Role } from '../common/enums';
import { AuthenticatedUser } from '../common/interfaces';
import { MediaService } from './media.service';
import {
  ConfirmUploadDto,
  InitiateUploadDto,
  QueryMediaDto,
  SetMediaThumbnailDto,
  UpdateMediaDto,
} from './dto/media.dto';

const parseByteRange = (
  header: string | undefined,
  size: number,
): { start: number; end: number } | null => {
  if (!header || size <= 0) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match) return null;

  const start = match[1] ? Number.parseInt(match[1], 10) : 0;
  let end = match[2] ? Number.parseInt(match[2], 10) : size - 1;
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
  if (start >= size) return null;
  end = Math.min(end, size - 1);
  if (end < start) return null;
  return { start, end };
};

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
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const studioId = this.assertStudioId(user);
    const asset = await this.mediaService.resolveOriginalPreviewAsset(studioId, id);
    const totalSize = asset.sizeBytes;
    const range = parseByteRange(req.headers.range, totalSize);
    const stream = await this.mediaService.openOriginalPreviewStream(
      studioId,
      id,
      range ?? undefined,
    );

    res.setHeader('Content-Type', stream.contentType || asset.contentType);
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'private, max-age=300');

    if (range && totalSize > 0) {
      const chunkSize = range.end - range.start + 1;
      res.status(206);
      res.setHeader('Content-Range', `bytes ${range.start}-${range.end}/${totalSize}`);
      res.setHeader('Content-Length', String(stream.contentLength || chunkSize));
    } else if (stream.contentLength > 0) {
      res.setHeader('Content-Length', String(stream.contentLength));
    } else if (totalSize > 0) {
      res.setHeader('Content-Length', String(totalSize));
    }

    const body = stream.body;
    if (body instanceof Readable) {
      body.pipe(res);
      return;
    }

    Readable.fromWeb(body as never).pipe(res);
  }

  @Patch(':id/thumbnail')
  @RequirePermissions('media:write')
  setThumbnail(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: SetMediaThumbnailDto,
  ) {
    return this.mediaService.setMediaThumbnail(this.assertStudioId(user), id, dto.thumbnailBase64);
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
