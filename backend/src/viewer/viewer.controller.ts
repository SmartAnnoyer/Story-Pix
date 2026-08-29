import { Body, Controller, Get, Param, Post, Req, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { Readable } from 'stream';
import { Public } from '../decorators';
import { parseCorsOrigins } from '../bootstrap/cors.middleware';
import { ViewerService } from './viewer.service';
import { RecordViewerEventDto } from './dto/viewer.dto';

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

@Controller('viewer')
export class ViewerController {
  constructor(
    private readonly viewerService: ViewerService,
    private readonly configService: ConfigService,
  ) {}

  private applyCors(req: Request, res: Response) {
    const allowed = parseCorsOrigins(
      this.configService.get<string>('app.corsOrigin', 'http://localhost:5173'),
    );
    const origin = req.headers.origin;
    // Public viewer assets are safe to expose cross-origin (QR opens on phones).
    if (origin && (allowed.includes(origin) || allowed.includes('*'))) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Accept-Ranges');
      res.setHeader('Vary', 'Origin');
      return;
    }

    if (origin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Accept-Ranges');
      res.setHeader('Vary', 'Origin');
    }
  }

  @Get('public/:albumSlug/manifest')
  @Public()
  getManifest(@Param('albumSlug') albumSlug: string) {
    return this.viewerService.getPublicManifest(albumSlug);
  }

  @Get('public/:albumSlug/mind-file')
  @Public()
  async getMindFile(
    @Param('albumSlug') albumSlug: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const { buffer, contentType } = await this.viewerService.getMindFileBuffer(albumSlug);
    this.applyCors(req, res);
    res.setHeader('Content-Type', contentType || 'application/octet-stream');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(buffer);
  }

  @Get('public/:albumSlug/targets/:targetId/tracking-image')
  @Public()
  async getTrackingImage(
    @Param('albumSlug') albumSlug: string,
    @Param('targetId') targetId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const { buffer, contentType } = await this.viewerService.getTrackingImageBuffer(
      albumSlug,
      targetId,
    );
    this.applyCors(req, res);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(buffer);
  }

  @Get('public/:albumSlug/targets/:targetId/mapping-video')
  @Public()
  async getMappingVideo(
    @Param('albumSlug') albumSlug: string,
    @Param('targetId') targetId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const asset = await this.viewerService.resolveMappingVideoAsset(albumSlug, targetId);
    this.applyCors(req, res);

    const totalSize = asset.sizeBytes;
    const range = parseByteRange(req.headers.range, totalSize);
    const stream = await this.viewerService.openMappingVideoStream(
      albumSlug,
      targetId,
      range ?? undefined,
    );

    res.setHeader('Content-Type', stream.contentType || asset.contentType || 'video/mp4');
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'public, max-age=3600');

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

  @Post('public/:albumSlug/events')
  @Public()
  recordEvent(
    @Param('albumSlug') albumSlug: string,
    @Body() dto: RecordViewerEventDto,
    @Req() req: Request,
  ) {
    return this.viewerService.recordEvent(albumSlug, dto, req);
  }
}
