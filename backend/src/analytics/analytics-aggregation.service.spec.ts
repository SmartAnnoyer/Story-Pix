import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { AnalyticsAggregationService } from './analytics-aggregation.service';
import { AnalyticsSummaryService } from './analytics-summary.service';

describe('AnalyticsAggregationService', () => {
  let service: AnalyticsAggregationService;

  const scanLogModel = { aggregate: jest.fn(), find: jest.fn(), countDocuments: jest.fn() };
  const albumModel = { countDocuments: jest.fn(), find: jest.fn() };
  const mediaModel = { countDocuments: jest.fn() };
  const studioModel = { countDocuments: jest.fn(), findById: jest.fn(), aggregate: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();

    scanLogModel.aggregate.mockReturnValue({ exec: jest.fn().mockResolvedValue([]) });
    albumModel.countDocuments.mockReturnValue({ exec: jest.fn().mockResolvedValue(2) });
    mediaModel.countDocuments.mockReturnValue({ exec: jest.fn().mockResolvedValue(5) });
    studioModel.countDocuments.mockReturnValue({ exec: jest.fn().mockResolvedValue(1) });
    studioModel.findById.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue({ storageUsedGB: 1.5, monthlyScanUsage: 3 }),
        }),
      }),
    });
    studioModel.aggregate.mockReturnValue({ exec: jest.fn().mockResolvedValue([]) });
    albumModel.find.mockReturnValue({ select: jest.fn().mockReturnValue({ lean: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue([]) }) }) });
    scanLogModel.find.mockReturnValue({ sort: jest.fn().mockReturnValue({ skip: jest.fn().mockReturnValue({ limit: jest.fn().mockReturnValue({ lean: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue([]) }) }) }) }) });
    scanLogModel.countDocuments.mockReturnValue({ exec: jest.fn().mockResolvedValue(0) });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsAggregationService,
        { provide: getModelToken('ScanLog'), useValue: scanLogModel },
        { provide: getModelToken('Album'), useValue: albumModel },
        { provide: getModelToken('Media'), useValue: mediaModel },
        { provide: getModelToken('Studio'), useValue: studioModel },
        { provide: AnalyticsSummaryService, useValue: { getSummaries: jest.fn() } },
      ],
    }).compile();

    service = module.get(AnalyticsAggregationService);
  });

  it('returns studio dashboard widgets', async () => {
    const dashboard = await service.getStudioDashboard('507f1f77bcf86cd799439011', {});

    expect(dashboard.widgets.totalAlbums).toBe(2);
    expect(dashboard.widgets.totalPhotos).toBe(5);
    expect(dashboard.charts).toBeDefined();
  });
});
