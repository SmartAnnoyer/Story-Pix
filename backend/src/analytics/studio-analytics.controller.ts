import {
  Controller,
  ForbiddenException,
  Get,
  Param,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { CurrentUser } from '../decorators/current-user.decorator';
import { RequirePermissions, Roles } from '../decorators';
import { Role } from '../common/enums';
import { AuthenticatedUser } from '../common/interfaces';
import { AnalyticsAggregationService } from './analytics-aggregation.service';
import { AnalyticsExportService } from './analytics-export.service';
import {
  AlbumInsightsQueryDto,
  AnalyticsExportQueryDto,
  AnalyticsReportQueryDto,
  StudioAnalyticsQueryDto,
} from './dto/analytics.dto';

@Controller('analytics/studio')
@Roles(Role.STUDIO_ADMIN, Role.STUDIO_STAFF)
export class StudioAnalyticsController {
  constructor(
    private readonly aggregationService: AnalyticsAggregationService,
    private readonly exportService: AnalyticsExportService,
  ) {}

  private assertStudioId(user: AuthenticatedUser): string {
    if (!user.studioId) {
      throw new ForbiddenException('Studio context required');
    }
    return user.studioId;
  }

  @Get('dashboard')
  @RequirePermissions('analytics:read')
  getDashboard(@CurrentUser() user: AuthenticatedUser, @Query() query: StudioAnalyticsQueryDto) {
    return this.aggregationService.getStudioDashboard(this.assertStudioId(user), query);
  }

  @Get('reports')
  @RequirePermissions('analytics:read')
  getReports(@CurrentUser() user: AuthenticatedUser, @Query() query: AnalyticsReportQueryDto) {
    return this.aggregationService.getStudioReport(this.assertStudioId(user), query);
  }

  @Get('albums/:albumId/insights')
  @RequirePermissions('analytics:read')
  getAlbumInsights(
    @CurrentUser() user: AuthenticatedUser,
    @Param('albumId') albumId: string,
    @Query() query: AlbumInsightsQueryDto,
  ) {
    return this.aggregationService.getAlbumInsights(this.assertStudioId(user), albumId, query);
  }

  @Get('export')
  @RequirePermissions('analytics:read')
  async exportReport(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: AnalyticsExportQueryDto,
    @Res() res: Response,
  ) {
    const rows = await this.aggregationService.getExportRows(this.assertStudioId(user), query);
    const file = this.exportService.export(rows, query.format);
    const filename = `studio-analytics-${Date.now()}.${file.extension}`;

    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(file.content);
  }
}
