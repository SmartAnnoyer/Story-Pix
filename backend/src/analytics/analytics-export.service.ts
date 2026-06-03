import { Injectable } from '@nestjs/common';
import { AnalyticsExportFormat } from '../common/enums';

type ExportRow = Record<string, string | number>;

@Injectable()
export class AnalyticsExportService {
  buildCsv(rows: ExportRow[]): { content: string; mimeType: string; extension: string } {
    if (!rows.length) {
      return {
        content: 'timestamp,studioId,albumId,arTargetId,eventType,browser,deviceType,operatingSystem,country,city,sessionId\n',
        mimeType: 'text/csv; charset=utf-8',
        extension: 'csv',
      };
    }

    const headers = Object.keys(rows[0]);
    const lines = [
      headers.join(','),
      ...rows.map((row) =>
        headers
          .map((header) => this.escapeCsvValue(String(row[header] ?? '')))
          .join(','),
      ),
    ];

    return {
      content: `\uFEFF${lines.join('\n')}`,
      mimeType: 'text/csv; charset=utf-8',
      extension: 'csv',
    };
  }

  buildExcel(rows: ExportRow[]): { content: string; mimeType: string; extension: string } {
    const csv = this.buildCsv(rows);
    return {
      content: csv.content,
      mimeType: 'application/vnd.ms-excel; charset=utf-8',
      extension: 'xlsx',
    };
  }

  export(rows: ExportRow[], format: AnalyticsExportFormat = AnalyticsExportFormat.CSV) {
    if (format === AnalyticsExportFormat.XLSX) {
      return this.buildExcel(rows);
    }
    return this.buildCsv(rows);
  }

  private escapeCsvValue(value: string) {
    if (/[",\n]/.test(value)) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }
}
