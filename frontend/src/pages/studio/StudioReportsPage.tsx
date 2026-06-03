import { useMemo, useState } from 'react';
import { Typography, message } from 'antd';
import {
  analyticsService,
  downloadAnalyticsExport,
} from '@/services/analytics.service';
import { useStudioAnalyticsReportsQuery } from '@/hooks/useAnalyticsQueries';
import { AnalyticsFilters } from '@/features/analytics/components/AnalyticsFilters';
import { AnalyticsReportTable } from '@/features/analytics/components/AnalyticsReportTable';
import { ExportButtons } from '@/features/analytics/components/ExportButtons';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { getErrorMessage } from '@/api/client';
import type { AnalyticsEventType } from '@/types/analytics.types';

const { Title, Paragraph } = Typography;

export const StudioReportsPage = () => {
  const [from, setFrom] = useState<string>();
  const [to, setTo] = useState<string>();
  const [eventType, setEventType] = useState<AnalyticsEventType>();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [exporting, setExporting] = useState(false);

  const params = useMemo(
    () => ({ from, to, eventType, page, limit }),
    [from, to, eventType, page, limit],
  );
  const { data, isLoading } = useStudioAnalyticsReportsQuery(params);

  const handleExport = async (format: 'csv' | 'xlsx') => {
    try {
      setExporting(true);
      const blob = await analyticsService.exportStudioReport({ from, to, eventType, format });
      downloadAnalyticsExport(blob, `studio-analytics.${format === 'csv' ? 'csv' : 'xlsx'}`);
    } catch (error) {
      message.error(getErrorMessage(error, 'Export failed'));
    } finally {
      setExporting(false);
    }
  };

  if (isLoading || !data) return <LoadingSpinner />;

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <Title level={3} className="!mb-1">
            Analytics Reports
          </Title>
          <Paragraph type="secondary">Filter scan logs and export date-range reports.</Paragraph>
        </div>
        <ExportButtons onExport={handleExport} loading={exporting} />
      </div>

      <AnalyticsFilters
        from={from}
        to={to}
        eventType={eventType}
        onDateChange={(nextFrom, nextTo) => {
          setPage(1);
          setFrom(nextFrom);
          setTo(nextTo);
        }}
        onEventTypeChange={(value) => {
          setPage(1);
          setEventType(value);
        }}
      />

      <AnalyticsReportTable
        items={data.items}
        pagination={{
          page: data.pagination.page,
          limit: data.pagination.limit,
          total: data.pagination.total,
          onChange: (nextPage, nextLimit) => {
            setPage(nextPage);
            setLimit(nextLimit);
          },
        }}
      />
    </div>
  );
};
