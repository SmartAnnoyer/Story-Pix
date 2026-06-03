import { Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { AnalyticsReportRow } from '@/types/analytics.types';

interface AnalyticsReportTableProps {
  items: AnalyticsReportRow[];
  loading?: boolean;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    onChange: (page: number, pageSize: number) => void;
  };
}

export const AnalyticsReportTable = ({ items, loading, pagination }: AnalyticsReportTableProps) => {
  const columns: ColumnsType<AnalyticsReportRow> = [
    {
      title: 'Timestamp',
      dataIndex: 'timestamp',
      key: 'timestamp',
      render: (value: string) => new Date(value).toLocaleString(),
    },
    { title: 'Event', dataIndex: 'eventType', key: 'eventType' },
    { title: 'Album', dataIndex: 'albumId', key: 'albumId', render: (value) => value ?? '—' },
    { title: 'Device', dataIndex: 'deviceType', key: 'deviceType', render: (value) => value ?? '—' },
    { title: 'Browser', dataIndex: 'browser', key: 'browser', render: (value) => value ?? '—' },
    { title: 'Session', dataIndex: 'sessionId', key: 'sessionId', render: (value) => value ?? '—' },
  ];

  return (
    <Table
      rowKey="id"
      columns={columns}
      dataSource={items}
      loading={loading}
      scroll={{ x: true }}
      pagination={
        pagination
          ? {
              current: pagination.page,
              pageSize: pagination.limit,
              total: pagination.total,
              onChange: pagination.onChange,
            }
          : false
      }
    />
  );
};
