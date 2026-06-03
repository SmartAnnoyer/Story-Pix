import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Album, AlbumSchema } from '../albums/schemas/album.schema';
import { Media, MediaSchema } from '../media/schemas/media.schema';
import { Studio, StudioSchema } from '../studios/schemas/studio.schema';
import { AnalyticsAggregationService } from './analytics-aggregation.service';
import { AnalyticsExportService } from './analytics-export.service';
import { AnalyticsIngestionService } from './analytics-ingestion.service';
import { AnalyticsSummaryService } from './analytics-summary.service';
import { PlatformAnalyticsController } from './platform-analytics.controller';
import { StudioAnalyticsController } from './studio-analytics.controller';
import { AnalyticsSummary, AnalyticsSummarySchema } from './schemas/analytics-summary.schema';
import { ScanLog, ScanLogSchema } from './schemas/scan-log.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ScanLog.name, schema: ScanLogSchema },
      { name: AnalyticsSummary.name, schema: AnalyticsSummarySchema },
      { name: Album.name, schema: AlbumSchema },
      { name: Media.name, schema: MediaSchema },
      { name: Studio.name, schema: StudioSchema },
    ]),
  ],
  controllers: [StudioAnalyticsController, PlatformAnalyticsController],
  providers: [
    AnalyticsIngestionService,
    AnalyticsSummaryService,
    AnalyticsAggregationService,
    AnalyticsExportService,
  ],
  exports: [AnalyticsIngestionService, AnalyticsAggregationService, MongooseModule],
})
export class AnalyticsModule {}
