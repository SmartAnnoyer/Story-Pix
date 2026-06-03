import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, PipelineStage, Types } from 'mongoose';
import {
  AnalyticsEventType,
  AnalyticsSummaryPeriod,
  AnalyticsSummaryScope,
  MediaType,
  StudioStatus,
} from '../common/enums';
import { Album, AlbumDocument } from '../albums/schemas/album.schema';
import { Media, MediaDocument } from '../media/schemas/media.schema';
import { Studio, StudioDocument } from '../studios/schemas/studio.schema';
import { AnalyticsSummaryService } from './analytics-summary.service';
import { ScanLog, ScanLogDocument } from './schemas/scan-log.schema';
import { parseDateRange, startOfDay } from './utils/analytics.util';
import {
  AlbumInsightsQueryDto,
  AnalyticsReportQueryDto,
  PlatformAnalyticsQueryDto,
  StudioAnalyticsQueryDto,
} from './dto/analytics.dto';

@Injectable()
export class AnalyticsAggregationService {
  constructor(
    @InjectModel(ScanLog.name) private readonly scanLogModel: Model<ScanLogDocument>,
    @InjectModel(Album.name) private readonly albumModel: Model<AlbumDocument>,
    @InjectModel(Media.name) private readonly mediaModel: Model<MediaDocument>,
    @InjectModel(Studio.name) private readonly studioModel: Model<StudioDocument>,
    private readonly summaryService: AnalyticsSummaryService,
  ) {}

  async getStudioDashboard(studioId: string, query: StudioAnalyticsQueryDto) {
    const { from, to } = parseDateRange(query.from, query.to);
    const [widgets, dailyScans, monthlyScans, albumActivity, videoPlays, popularAlbums] =
      await Promise.all([
        this.getStudioWidgetCounts(studioId),
        this.getDailySeries(studioId, from, to, [
          AnalyticsEventType.SCAN_SUCCESS,
          AnalyticsEventType.SCAN_FAILED,
        ]),
        this.getMonthlySeries(studioId, from, to, AnalyticsEventType.SCAN_SUCCESS),
        this.getEventSeries(studioId, from, to, [
          AnalyticsEventType.ALBUM_CREATED,
          AnalyticsEventType.ALBUM_PUBLISHED,
          AnalyticsEventType.ALBUM_ARCHIVED,
        ]),
        this.getEventSeries(studioId, from, to, [
          AnalyticsEventType.VIDEO_STARTED,
          AnalyticsEventType.VIDEO_COMPLETED,
        ]),
        this.getTopAlbums(studioId, from, to, 5),
      ]);

    return {
      widgets,
      charts: {
        dailyScans,
        monthlyScans,
        albumActivity,
        videoPlays,
      },
      popularAlbums,
      dateRange: { from, to },
    };
  }

  async getPlatformDashboard(query: PlatformAnalyticsQueryDto) {
    const { from, to } = parseDateRange(query.from, query.to);
    const notDeleted = { deletedAt: null };

    const [studioCounts, albumCount, storageAgg, scanAgg, studioGrowth, subscriptionGrowth, usageTrends] =
      await Promise.all([
        Promise.all([
          this.studioModel.countDocuments(notDeleted).exec(),
          this.studioModel.countDocuments({ ...notDeleted, status: StudioStatus.ACTIVE }).exec(),
        ]),
        this.albumModel.countDocuments({ ...notDeleted }).exec(),
        this.studioModel
          .aggregate([
            { $match: notDeleted },
            { $group: { _id: null, totalStorageUsedGB: { $sum: '$storageUsedGB' } } },
          ])
          .exec(),
        this.scanLogModel
          .aggregate([
            {
              $match: {
                timestamp: { $gte: from, $lte: to },
                eventType: AnalyticsEventType.SCAN_SUCCESS,
              },
            },
            { $group: { _id: null, total: { $sum: 1 } } },
          ])
          .exec(),
        this.getPlatformGrowthSeries(from, to),
        this.getSubscriptionGrowthSeries(from, to),
        this.getPlatformUsageTrends(from, to),
      ]);

    const [totalStudios, activeStudios] = studioCounts;
    const storage = storageAgg[0]?.totalStorageUsedGB ?? 0;
    const totalScans = scanAgg[0]?.total ?? 0;

    return {
      widgets: {
        totalStudios,
        activeStudios,
        monthlyGrowth: studioGrowth.at(-1)?.count ?? 0,
        totalAlbums: albumCount,
        totalScans,
        platformStorageUsageGB: storage,
      },
      charts: {
        studioGrowth,
        subscriptionGrowth,
        usageTrends,
      },
      dateRange: { from, to },
    };
  }

  async getStudioInsights(studioId: string, query: PlatformAnalyticsQueryDto) {
    const { from, to } = parseDateRange(query.from, query.to);
    const studio = await this.studioModel.findOne({ _id: studioId, deletedAt: null }).exec();
    if (!studio) throw new NotFoundException('Studio not found');

    const metrics = await this.getAlbumInsightMetrics(studioId, undefined, from, to);
    const topAlbums = await this.getTopAlbums(studioId, from, to, 10);

    return {
      studio: {
        id: studio._id.toString(),
        studioName: studio.studioName,
        status: studio.status,
      },
      metrics,
      topAlbums,
      dateRange: { from, to },
    };
  }

  async getAlbumInsights(studioId: string, albumId: string, query: AlbumInsightsQueryDto) {
    const album = await this.albumModel
      .findOne({ _id: albumId, studioId, deletedAt: null })
      .exec();
    if (!album) throw new NotFoundException('Album not found');

    const { from, to } = parseDateRange(query.from, query.to);
    const metrics = await this.getAlbumInsightMetrics(studioId, albumId, from, to);
    const topPhotos = await this.getTopPhotos(studioId, albumId, from, to, 10);

    return {
      album: {
        id: album._id.toString(),
        albumName: album.albumName,
        slug: album.slug,
      },
      metrics,
      topPhotos,
      dateRange: { from, to },
    };
  }

  async getStudioReport(studioId: string, query: AnalyticsReportQueryDto) {
    const { from, to } = parseDateRange(query.from, query.to);
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const skip = (page - 1) * limit;
    const filter = this.buildLogFilter(studioId, from, to, query.albumId, query.eventType);

    const [items, total] = await Promise.all([
      this.scanLogModel.find(filter).sort({ timestamp: -1 }).skip(skip).limit(limit).lean().exec(),
      this.scanLogModel.countDocuments(filter).exec(),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      items: items.map((item) => ({
        id: item._id.toString(),
        studioId: item.studioId.toString(),
        albumId: item.albumId?.toString() ?? null,
        arTargetId: item.arTargetId?.toString() ?? null,
        eventType: item.eventType,
        browser: item.browser,
        deviceType: item.deviceType,
        operatingSystem: item.operatingSystem,
        country: item.country,
        city: item.city,
        sessionId: item.sessionId,
        timestamp: item.timestamp,
      })),
      pagination: { page, limit, total, totalPages, hasMore: page < totalPages },
      dateRange: { from, to },
    };
  }

  async getPlatformReport(query: PlatformAnalyticsQueryDto & { page?: number; limit?: number }) {
    const { from, to } = parseDateRange(query.from, query.to);
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {
      timestamp: { $gte: from, $lte: to },
    };
    if (query.studioId) filter.studioId = new Types.ObjectId(query.studioId);
    if (query.albumId) filter.albumId = new Types.ObjectId(query.albumId);
    if (query.eventType) filter.eventType = query.eventType;

    const [items, total] = await Promise.all([
      this.scanLogModel.find(filter).sort({ timestamp: -1 }).skip(skip).limit(limit).lean().exec(),
      this.scanLogModel.countDocuments(filter).exec(),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      items: items.map((item) => ({
        id: item._id.toString(),
        studioId: item.studioId.toString(),
        albumId: item.albumId?.toString() ?? null,
        arTargetId: item.arTargetId?.toString() ?? null,
        eventType: item.eventType,
        browser: item.browser,
        deviceType: item.deviceType,
        operatingSystem: item.operatingSystem,
        country: item.country,
        city: item.city,
        sessionId: item.sessionId,
        timestamp: item.timestamp,
      })),
      pagination: { page, limit, total, totalPages, hasMore: page < totalPages },
      dateRange: { from, to },
    };
  }

  async getExportRows(
    studioId: string | null,
    query: PlatformAnalyticsQueryDto,
  ) {
    const { from, to } = parseDateRange(query.from, query.to);
    const filter: Record<string, unknown> = { timestamp: { $gte: from, $lte: to } };
    if (studioId) filter.studioId = new Types.ObjectId(studioId);
    if (query.studioId) filter.studioId = new Types.ObjectId(query.studioId);
    if (query.albumId) filter.albumId = new Types.ObjectId(query.albumId);
    if (query.eventType) filter.eventType = query.eventType;

    const items = await this.scanLogModel
      .find(filter)
      .sort({ timestamp: -1 })
      .limit(10000)
      .lean()
      .exec();

    return items.map((item) => ({
      timestamp: item.timestamp.toISOString(),
      studioId: item.studioId.toString(),
      albumId: item.albumId?.toString() ?? '',
      arTargetId: item.arTargetId?.toString() ?? '',
      eventType: item.eventType,
      browser: item.browser ?? '',
      deviceType: item.deviceType ?? '',
      operatingSystem: item.operatingSystem ?? '',
      country: item.country ?? '',
      city: item.city ?? '',
      sessionId: item.sessionId ?? '',
    }));
  }

  private async getStudioWidgetCounts(studioId: string) {
    const studioObjectId = new Types.ObjectId(studioId);
    const [albums, photos, videos, scanAgg, monthlyScans, studio] = await Promise.all([
      this.albumModel.countDocuments({ studioId: studioObjectId, deletedAt: null }).exec(),
      this.mediaModel
        .countDocuments({ studioId: studioObjectId, mediaType: MediaType.PHOTO, deletedAt: null })
        .exec(),
      this.mediaModel
        .countDocuments({ studioId: studioObjectId, mediaType: MediaType.VIDEO, deletedAt: null })
        .exec(),
      this.scanLogModel
        .aggregate([
          { $match: { studioId: studioObjectId, eventType: AnalyticsEventType.SCAN_SUCCESS } },
          { $group: { _id: null, total: { $sum: 1 } } },
        ])
        .exec(),
      this.scanLogModel
        .aggregate([
          {
            $match: {
              studioId: studioObjectId,
              eventType: AnalyticsEventType.SCAN_SUCCESS,
              timestamp: { $gte: startOfDay(new Date()) },
            },
          },
          { $group: { _id: null, total: { $sum: 1 } } },
        ])
        .exec(),
      this.studioModel.findById(studioId).select('storageUsedGB monthlyScanUsage').lean().exec(),
    ]);

    return {
      totalAlbums: albums,
      totalPhotos: photos,
      totalVideos: videos,
      totalScans: scanAgg[0]?.total ?? 0,
      monthlyScans: monthlyScans[0]?.total ?? studio?.monthlyScanUsage ?? 0,
      storageUsageGB: studio?.storageUsedGB ?? 0,
    };
  }

  private async getAlbumInsightMetrics(
    studioId: string,
    albumId: string | undefined,
    from: Date,
    to: Date,
  ) {
    const match: Record<string, unknown> = {
      studioId: new Types.ObjectId(studioId),
      timestamp: { $gte: from, $lte: to },
    };
    if (albumId) match.albumId = new Types.ObjectId(albumId);

    const [views, uniqueVisitors, scans, videosPlayed] = await Promise.all([
      this.countEvents(match, [AnalyticsEventType.ALBUM_VIEWED, AnalyticsEventType.VIEWER_OPENED]),
      this.countUniqueSessions(match, [
        AnalyticsEventType.ALBUM_VIEWED,
        AnalyticsEventType.VIEWER_OPENED,
      ]),
      this.countScanBreakdown(match),
      this.countEvents(match, [AnalyticsEventType.VIDEO_STARTED]),
    ]);

    return {
      totalViews: views,
      uniqueVisitors,
      totalScans: scans.total,
      successfulScans: scans.successful,
      failedScans: scans.failed,
      videosPlayed,
    };
  }

  private async countEvents(match: Record<string, unknown>, eventTypes: AnalyticsEventType[]) {
    const result = await this.scanLogModel
      .aggregate([
        { $match: { ...match, eventType: { $in: eventTypes } } },
        { $group: { _id: null, total: { $sum: 1 } } },
      ])
      .exec();
    return result[0]?.total ?? 0;
  }

  private async countUniqueSessions(match: Record<string, unknown>, eventTypes: AnalyticsEventType[]) {
    const result = await this.scanLogModel
      .aggregate([
        { $match: { ...match, eventType: { $in: eventTypes }, sessionId: { $ne: null } } },
        { $group: { _id: '$sessionId' } },
        { $count: 'total' },
      ])
      .exec();
    return result[0]?.total ?? 0;
  }

  private async countScanBreakdown(match: Record<string, unknown>) {
    const result = await this.scanLogModel
      .aggregate([
        {
          $match: {
            ...match,
            eventType: {
              $in: [
                AnalyticsEventType.SCAN_ATTEMPT,
                AnalyticsEventType.SCAN_SUCCESS,
                AnalyticsEventType.SCAN_FAILED,
              ],
            },
          },
        },
        {
          $group: {
            _id: '$eventType',
            total: { $sum: 1 },
          },
        },
      ])
      .exec();

    const map = new Map(result.map((row) => [row._id, row.total]));
    const successful = map.get(AnalyticsEventType.SCAN_SUCCESS) ?? 0;
    const failed = map.get(AnalyticsEventType.SCAN_FAILED) ?? 0;
    const attempts = map.get(AnalyticsEventType.SCAN_ATTEMPT) ?? 0;

    return {
      total: successful + failed + attempts,
      successful,
      failed,
    };
  }

  private async getDailySeries(
    studioId: string,
    from: Date,
    to: Date,
    eventTypes: AnalyticsEventType[],
  ) {
    return this.scanLogModel
      .aggregate(this.buildDailyPipeline(studioId, from, to, eventTypes))
      .exec();
  }

  private async getMonthlySeries(
    studioId: string,
    from: Date,
    to: Date,
    eventType: AnalyticsEventType,
  ) {
    return this.scanLogModel
      .aggregate([
        {
          $match: {
            studioId: new Types.ObjectId(studioId),
            timestamp: { $gte: from, $lte: to },
            eventType,
          },
        },
        {
          $group: {
            _id: {
              year: { $year: '$timestamp' },
              month: { $month: '$timestamp' },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
        {
          $project: {
            _id: 0,
            label: {
              $concat: [
                { $toString: '$_id.year' },
                '-',
                {
                  $cond: [
                    { $lt: ['$_id.month', 10] },
                    { $concat: ['0', { $toString: '$_id.month' }] },
                    { $toString: '$_id.month' },
                  ],
                },
              ],
            },
            count: 1,
          },
        },
      ])
      .exec();
  }

  private async getEventSeries(
    studioId: string,
    from: Date,
    to: Date,
    eventTypes: AnalyticsEventType[],
  ) {
    const rows = await this.scanLogModel
      .aggregate([
        {
          $match: {
            studioId: new Types.ObjectId(studioId),
            timestamp: { $gte: from, $lte: to },
            eventType: { $in: eventTypes },
          },
        },
        {
          $group: {
            _id: {
              date: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
              eventType: '$eventType',
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { '_id.date': 1 } },
      ])
      .exec();

    return rows.map((row) => ({
      date: row._id.date,
      eventType: row._id.eventType,
      count: row.count,
    }));
  }

  private buildDailyPipeline(
    studioId: string,
    from: Date,
    to: Date,
    eventTypes: AnalyticsEventType[],
  ): PipelineStage[] {
    return [
      {
        $match: {
          studioId: new Types.ObjectId(studioId),
          timestamp: { $gte: from, $lte: to },
          eventType: { $in: eventTypes },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, date: '$_id', count: 1 } },
    ];
  }

  private async getTopAlbums(studioId: string, from: Date, to: Date, limit: number) {
    const rows = await this.scanLogModel
      .aggregate([
        {
          $match: {
            studioId: new Types.ObjectId(studioId),
            timestamp: { $gte: from, $lte: to },
            albumId: { $ne: null },
            eventType: {
              $in: [AnalyticsEventType.ALBUM_VIEWED, AnalyticsEventType.VIEWER_OPENED],
            },
          },
        },
        { $group: { _id: '$albumId', views: { $sum: 1 } } },
        { $sort: { views: -1 } },
        { $limit: limit },
      ])
      .exec();

    const albums = await this.albumModel
      .find({ _id: { $in: rows.map((row) => row._id) } })
      .select('albumName slug')
      .lean()
      .exec();
    const albumMap = new Map(albums.map((album) => [album._id.toString(), album]));

    return rows.map((row) => ({
      albumId: row._id.toString(),
      albumName: albumMap.get(row._id.toString())?.albumName ?? 'Unknown',
      slug: albumMap.get(row._id.toString())?.slug ?? null,
      views: row.views,
    }));
  }

  private async getTopPhotos(
    studioId: string,
    albumId: string,
    from: Date,
    to: Date,
    limit: number,
  ) {
    const rows = await this.scanLogModel
      .aggregate([
        {
          $match: {
            studioId: new Types.ObjectId(studioId),
            albumId: new Types.ObjectId(albumId),
            timestamp: { $gte: from, $lte: to },
            arTargetId: { $ne: null },
            eventType: AnalyticsEventType.SCAN_SUCCESS,
          },
        },
        { $group: { _id: '$arTargetId', scans: { $sum: 1 } } },
        { $sort: { scans: -1 } },
        { $limit: limit },
      ])
      .exec();

    return rows.map((row) => ({
      arTargetId: row._id.toString(),
      scans: row.scans,
    }));
  }

  private async getPlatformGrowthSeries(from: Date, to: Date) {
    return this.studioModel
      .aggregate([
        { $match: { deletedAt: null, createdAt: { $gte: from, $lte: to } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
        { $project: { _id: 0, date: '$_id', count: 1 } },
      ])
      .exec();
  }

  private async getSubscriptionGrowthSeries(from: Date, to: Date) {
    return this.scanLogModel
      .aggregate([
        {
          $match: {
            timestamp: { $gte: from, $lte: to },
            eventType: {
              $in: [
                AnalyticsEventType.PLAN_ASSIGNED,
                AnalyticsEventType.PLAN_UPGRADED,
                AnalyticsEventType.PLAN_DOWNGRADED,
              ],
            },
          },
        },
        {
          $group: {
            _id: {
              date: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
              eventType: '$eventType',
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { '_id.date': 1 } },
        {
          $project: {
            _id: 0,
            date: '$_id.date',
            eventType: '$_id.eventType',
            count: 1,
          },
        },
      ])
      .exec();
  }

  private async getPlatformUsageTrends(from: Date, to: Date) {
    return this.scanLogModel
      .aggregate([
        { $match: { timestamp: { $gte: from, $lte: to } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
            events: { $sum: 1 },
            scans: {
              $sum: {
                $cond: [{ $eq: ['$eventType', AnalyticsEventType.SCAN_SUCCESS] }, 1, 0],
              },
            },
          },
        },
        { $sort: { _id: 1 } },
        { $project: { _id: 0, date: '$_id', events: 1, scans: 1 } },
      ])
      .exec();
  }

  private buildLogFilter(
    studioId: string,
    from: Date,
    to: Date,
    albumId?: string,
    eventType?: AnalyticsEventType,
  ) {
    const filter: Record<string, unknown> = {
      studioId: new Types.ObjectId(studioId),
      timestamp: { $gte: from, $lte: to },
    };
    if (albumId) filter.albumId = new Types.ObjectId(albumId);
    if (eventType) filter.eventType = eventType;
    return filter;
  }
}
