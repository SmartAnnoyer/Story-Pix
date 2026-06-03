import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { Model } from 'mongoose';
import { AnalyticsEventType } from '../common/enums';
import { AnalyticsSummaryService } from './analytics-summary.service';
import { ScanLog, ScanLogDocument } from './schemas/scan-log.schema';
import { hashIpAddress, parseUserAgent } from './utils/analytics.util';

export interface RecordAnalyticsEventInput {
  studioId: string;
  eventType: AnalyticsEventType;
  albumId?: string;
  arTargetId?: string;
  albumSlug?: string;
  targetIndex?: number;
  userAgent?: string;
  browser?: string;
  deviceType?: string;
  operatingSystem?: string;
  country?: string;
  city?: string;
  ipAddress?: string;
  sessionId?: string;
  metadata?: Record<string, unknown>;
  timestamp?: Date;
}

@Injectable()
export class AnalyticsIngestionService {
  constructor(
    @InjectModel(ScanLog.name) private readonly scanLogModel: Model<ScanLogDocument>,
    private readonly summaryService: AnalyticsSummaryService,
    private readonly configService: ConfigService,
  ) {}

  async recordEvent(input: RecordAnalyticsEventInput) {
    const parsed = parseUserAgent(input.userAgent);
    const log = await this.scanLogModel.create({
      studioId: input.studioId,
      albumId: input.albumId ?? null,
      arTargetId: input.arTargetId ?? null,
      eventType: input.eventType,
      userAgent: input.userAgent ?? null,
      browser: input.browser ?? parsed.browser,
      deviceType: input.deviceType ?? parsed.deviceType,
      operatingSystem: input.operatingSystem ?? parsed.operatingSystem,
      country: input.country ?? null,
      city: input.city ?? null,
      ipHash: hashIpAddress(input.ipAddress, this.configService),
      sessionId: input.sessionId ?? null,
      albumSlug: input.albumSlug ?? null,
      targetIndex: input.targetIndex ?? null,
      metadata: input.metadata ?? null,
      timestamp: input.timestamp ?? new Date(),
    });

    await this.summaryService.incrementFromEvent({
      studioId: input.studioId,
      albumId: input.albumId,
      arTargetId: input.arTargetId,
      eventType: input.eventType,
      sessionId: input.sessionId,
    });

    return {
      id: log._id.toString(),
      eventType: log.eventType,
      timestamp: log.timestamp,
    };
  }

  async recordEvents(inputs: RecordAnalyticsEventInput[]) {
    return Promise.all(inputs.map((input) => this.recordEvent(input)));
  }
}
