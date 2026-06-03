import { Controller, Get, Param, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { RequirePermissions, Roles } from '../decorators';
import { Role } from '../common/enums';
import { AnalyticsAggregationService } from './analytics-aggregation.service';
import { AnalyticsExportService } from './analytics-export.service';
import {
  AnalyticsReportQueryDto,
  PlatformAnalyticsExportQueryDto,
  PlatformAnalyticsQueryDto,
} from './dto/analytics.dto';

@Controller('analytics/platform')
@Roles(Role.SUPER_ADMIN)
@RequirePermissions('platform:*')
export class PlatformAnalyticsController {
  constructor(
    private readonly aggregationService: AnalyticsAggregationService,
    private readonly exportService: AnalyticsExportService,
  ) {}

  @Get('dashboard')
  getDashboard(@Query() query: PlatformAnalyticsQueryDto) {
    return this.aggregationService.getPlatformDashboard(query);
  }

  @Get('reports')
  getReports(@Query() query: AnalyticsReportQueryDto & PlatformAnalyticsQueryDto) {
    return this.aggregationService.getPlatformReport(query);
  }

  @Get('studios/:studioId')
  getStudioAnalytics(@Param('studioId') studioId: string, @Query() query: PlatformAnalyticsQueryDto) {
    return this.aggregationService.getStudioInsights(studioId, query);
  }

  @Get('export')
  async exportReport(@Query() query: PlatformAnalyticsExportQueryDto, @Res() res: Response) {
    const rows = await this.aggregationService.getExportRows(null, query);
    const file = this.exportService.export(rows, query.format);
    const filename = `platform-analytics-${Date.now()}.${file.extension}`;

    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(file.content);
  }
}
