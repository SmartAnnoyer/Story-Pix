import { createHash } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { AnalyticsEventType, ScanEventType } from '../../common/enums';

export interface ParsedUserAgent {
  browser: string | null;
  deviceType: string | null;
  operatingSystem: string | null;
}

export function parseUserAgent(userAgent?: string | null): ParsedUserAgent {
  if (!userAgent) {
    return { browser: null, deviceType: null, operatingSystem: null };
  }

  const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(userAgent);
  const browserMatch = userAgent.match(/(Chrome|Safari|Firefox|Edg|Opera)\/[\d.]+/);
  let operatingSystem: string | null = null;

  if (/Windows/i.test(userAgent)) operatingSystem = 'Windows';
  else if (/Mac OS X/i.test(userAgent)) operatingSystem = 'macOS';
  else if (/Android/i.test(userAgent)) operatingSystem = 'Android';
  else if (/iPhone|iPad|iPod/i.test(userAgent)) operatingSystem = 'iOS';
  else if (/Linux/i.test(userAgent)) operatingSystem = 'Linux';

  return {
    browser: browserMatch?.[0] ?? null,
    deviceType: isMobile ? 'mobile' : 'desktop',
    operatingSystem,
  };
}

export function hashIpAddress(ip: string | undefined, configService: ConfigService): string | null {
  if (!ip) return null;
  const salt = configService.get<string>('analytics.ipSalt') ?? 'storypix-analytics';
  const normalized = ip.replace(/^::ffff:/, '').trim();
  if (!normalized) return null;
  return createHash('sha256').update(`${salt}:${normalized}`).digest('hex');
}

export function mapLegacyScanEventType(eventType: ScanEventType): AnalyticsEventType {
  switch (eventType) {
    case ScanEventType.VIEWER_OPEN:
      return AnalyticsEventType.VIEWER_OPENED;
    case ScanEventType.SCAN_SUCCESS:
      return AnalyticsEventType.SCAN_SUCCESS;
    case ScanEventType.SCAN_FAILED:
      return AnalyticsEventType.SCAN_FAILED;
    case ScanEventType.VIDEO_PLAY:
      return AnalyticsEventType.VIDEO_STARTED;
    default:
      return AnalyticsEventType.VIEWER_OPENED;
  }
}

export function startOfDay(date: Date): Date {
  const value = new Date(date);
  value.setUTCHours(0, 0, 0, 0);
  return value;
}

export function startOfMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

export function parseDateRange(from?: string, to?: string): { from: Date; to: Date } {
  const toDate = to ? new Date(to) : new Date();
  const fromDate = from ? new Date(from) : new Date(toDate.getTime() - 30 * 24 * 60 * 60 * 1000);
  toDate.setUTCHours(23, 59, 59, 999);
  fromDate.setUTCHours(0, 0, 0, 0);
  return { from: fromDate, to: toDate };
}
