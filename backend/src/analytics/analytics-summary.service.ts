import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { Model, Types } from 'mongoose';
import {
  AnalyticsEventType,
  AnalyticsSummaryPeriod,
  AnalyticsSummaryScope,
} from '../common/enums';
import { AnalyticsSummary, AnalyticsSummaryDocument } from './schemas/analytics-summary.schema';
import { startOfDay, startOfMonth } from './utils/analytics.util';

interface SummaryIncrementInput {
  studioId?: string;
  albumId?: string;
  eventType: AnalyticsEventType;
  sessionId?: string | null;
  arTargetId?: string | null;
}

@Injectable()
export class AnalyticsSummaryService {
  constructor(
    @InjectModel(AnalyticsSummary.name)
    private readonly summaryModel: Model<AnalyticsSummaryDocument>,
  ) {}

  async incrementFromEvent(input: SummaryIncrementInput) {
    const now = new Date();
    const increments = this.buildIncrements(input.eventType);
    if (!Object.keys(increments).length) return;

    const updates = [
      this.applyIncrement(AnalyticsSummaryScope.PLATFORM, null, null, now, increments, input),
      input.studioId
        ? this.applyIncrement(
            AnalyticsSummaryScope.STUDIO,
            input.studioId,
            null,
            now,
            increments,
            input,
          )
        : Promise.resolve(),
      input.studioId && input.albumId
        ? this.applyIncrement(
            AnalyticsSummaryScope.ALBUM,
            input.studioId,
            input.albumId,
            now,
            increments,
            input,
          )
        : Promise.resolve(),
    ];

    await Promise.all(updates);
  }

  async getSummaries(
    scope: AnalyticsSummaryScope,
    period: AnalyticsSummaryPeriod,
    periodStarts: Date[],
    studioId?: string,
    albumId?: string,
  ) {
    const filter: Record<string, unknown> = { scope, period, periodStart: { $in: periodStarts } };
    if (studioId) filter.studioId = new Types.ObjectId(studioId);
    if (albumId) filter.albumId = new Types.ObjectId(albumId);
    if (scope === AnalyticsSummaryScope.PLATFORM) {
      filter.studioId = null;
      filter.albumId = null;
    }

    return this.summaryModel.find(filter).sort({ periodStart: 1 }).lean().exec();
  }

  private buildIncrements(eventType: AnalyticsEventType): Record<string, number> {
    switch (eventType) {
      case AnalyticsEventType.ALBUM_VIEWED:
      case AnalyticsEventType.VIEWER_OPENED:
        return { totalViews: 1 };
      case AnalyticsEventType.SCAN_ATTEMPT:
        return { totalScans: 1 };
      case AnalyticsEventType.SCAN_SUCCESS:
        return { totalScans: 1, successfulScans: 1 };
      case AnalyticsEventType.SCAN_FAILED:
        return { totalScans: 1, failedScans: 1 };
      case AnalyticsEventType.VIDEO_STARTED:
        return { videosPlayed: 1 };
      case AnalyticsEventType.VIDEO_COMPLETED:
        return { videosCompleted: 1 };
      case AnalyticsEventType.ALBUM_CREATED:
        return { albumsCreated: 1 };
      case AnalyticsEventType.ALBUM_PUBLISHED:
        return { albumsPublished: 1 };
      case AnalyticsEventType.PHOTO_UPLOADED:
        return { photosUploaded: 1 };
      case AnalyticsEventType.VIDEO_UPLOADED:
        return { videosUploaded: 1 };
      default:
        return {};
    }
  }

  private async applyIncrement(
    scope: AnalyticsSummaryScope,
    studioId: string | null,
    albumId: string | null,
    now: Date,
    increments: Record<string, number>,
    input: SummaryIncrementInput,
  ) {
    const dailyStart = startOfDay(now);
    const monthlyStart = startOfMonth(now);

    await Promise.all([
      this.upsertSummary(scope, studioId, albumId, AnalyticsSummaryPeriod.DAILY, dailyStart, increments, input),
      this.upsertSummary(scope, studioId, albumId, AnalyticsSummaryPeriod.MONTHLY, monthlyStart, increments, input),
    ]);
  }

  private async upsertSummary(
    scope: AnalyticsSummaryScope,
    studioId: string | null,
    albumId: string | null,
    period: AnalyticsSummaryPeriod,
    periodStart: Date,
    increments: Record<string, number>,
    input: SummaryIncrementInput,
  ) {
    const inc: Record<string, number> = { ...increments };
    if (input.sessionId && this.isVisitorEvent(input.eventType)) {
      inc.uniqueVisitors = 1;
    }

    const update: Record<string, unknown> = {
      $inc: inc,
      $set: { updatedAt: new Date() },
    };

    if (input.albumId && input.eventType === AnalyticsEventType.ALBUM_VIEWED) {
      update.$push = {
        topAlbums: {
          $each: [{ albumId: input.albumId, count: 1 }],
          $slice: -20,
        },
      };
    }

    if (input.arTargetId && input.eventType === AnalyticsEventType.SCAN_SUCCESS) {
      update.$push = {
        topPhotos: {
          $each: [{ arTargetId: input.arTargetId, count: 1 }],
          $slice: -20,
        },
      };
    }

    await this.summaryModel.updateOne(
      {
        scope,
        studioId: studioId ? new Types.ObjectId(studioId) : null,
        albumId: albumId ? new Types.ObjectId(albumId) : null,
        period,
        periodStart,
      },
      update,
      { upsert: true },
    );
  }

  private isVisitorEvent(eventType: AnalyticsEventType) {
    return [
      AnalyticsEventType.VIEWER_OPENED,
      AnalyticsEventType.ALBUM_VIEWED,
    ].includes(eventType);
  }
}
