import { AnalyticsExportFormat } from '../common/enums';
import { AnalyticsExportService } from './analytics-export.service';

describe('AnalyticsExportService', () => {
  let service: AnalyticsExportService;

  beforeEach(() => {
    service = new AnalyticsExportService();
  });

  it('exports csv with headers', () => {
    const file = service.export(
      [
        {
          timestamp: '2026-05-30T00:00:00.000Z',
          studioId: 'studio1',
          albumId: 'album1',
          arTargetId: '',
          eventType: 'scan_success',
          browser: 'Chrome',
          deviceType: 'mobile',
          operatingSystem: 'Android',
          country: '',
          city: '',
          sessionId: 'sess1',
        },
      ],
      AnalyticsExportFormat.CSV,
    );

    expect(file.extension).toBe('csv');
    expect(file.content).toContain('timestamp,studioId');
    expect(file.content).toContain('scan_success');
  });

  it('exports excel-compatible content', () => {
    const file = service.export([], AnalyticsExportFormat.XLSX);
    expect(file.extension).toBe('xlsx');
    expect(file.mimeType).toContain('excel');
  });
});
