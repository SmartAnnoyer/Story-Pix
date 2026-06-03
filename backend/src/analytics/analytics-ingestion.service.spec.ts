import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { AnalyticsIngestionService } from './analytics-ingestion.service';
import { AnalyticsSummaryService } from './analytics-summary.service';
import { AnalyticsEventType } from '../common/enums';

describe('AnalyticsIngestionService', () => {
  let service: AnalyticsIngestionService;

  const scanLogModel = { create: jest.fn() };
  const summaryService = { incrementFromEvent: jest.fn() };

  beforeEach(async () => {
    scanLogModel.create.mockResolvedValue({
      _id: 'log1',
      eventType: AnalyticsEventType.VIEWER_OPENED,
      timestamp: new Date(),
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsIngestionService,
        { provide: getModelToken('ScanLog'), useValue: scanLogModel },
        { provide: AnalyticsSummaryService, useValue: summaryService },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('test-salt') },
        },
      ],
    }).compile();

    service = module.get(AnalyticsIngestionService);
  });

  it('records event and updates summaries', async () => {
    const result = await service.recordEvent({
      studioId: '507f1f77bcf86cd799439011',
      albumId: '507f1f77bcf86cd799439013',
      eventType: AnalyticsEventType.VIEWER_OPENED,
      ipAddress: '127.0.0.1',
      sessionId: 'session-1',
    });

    expect(result.id).toBe('log1');
    expect(scanLogModel.create).toHaveBeenCalled();
    expect(summaryService.incrementFromEvent).toHaveBeenCalled();
  });
});
