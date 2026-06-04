import { Body, Controller, Get, Param, Post, Req, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { Public } from '../decorators';
import { parseCorsOrigins } from '../bootstrap/cors.middleware';
import { ViewerService } from './viewer.service';
import { RecordViewerEventDto } from './dto/viewer.dto';

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
    if (origin && allowed.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Vary', 'Origin');
    }
  }

  @Get('public/:albumSlug/manifest')
  @Public()
  getManifest(@Param('albumSlug') albumSlug: string) {
    return this.viewerService.getPublicManifest(albumSlug);
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
