import { useState } from 'react';
import { Tabs, Typography } from 'antd';
import { useJobsQuery, useFailedJobsQuery } from '@/hooks/useNotificationQueries';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Table, Tag } from 'antd';

const { Title, Paragraph } = Typography;

export const JobMonitoringPage = () => {
  const [page, setPage] = useState(1);
  const { data: jobs, isLoading } = useJobsQuery({ page, limit: 20 });
  const { data: failedJobs, isLoading: failedLoading } = useFailedJobsQuery({ page, limit: 20 });

  if (isLoading && !jobs) return <LoadingSpinner />;

  const columns = [
    { title: 'Queue', dataIndex: 'queueName' },
    { title: 'Type', dataIndex: 'jobType', render: (value: string | null) => value ?? '—' },
    {
      title: 'Status',
      dataIndex: 'status',
      render: (value: string) => <Tag>{value}</Tag>,
    },
    { title: 'Attempts', render: (_: unknown, row: { attempts: number; maxAttempts: number }) => `${row.attempts}/${row.maxAttempts}` },
    { title: 'Error', dataIndex: 'errorMessage', render: (value: string | null) => value ?? '—' },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      render: (value: string | null) => (value ? new Date(value).toLocaleString() : '—'),
    },
  ];

  return (
    <div>
      <Title level={3} className="!mb-1">
        Job Monitoring
      </Title>
      <Paragraph type="secondary" className="!mb-6">
        Monitor BullMQ background jobs, retries, and dead-letter failures.
      </Paragraph>

      <Tabs
        items={[
          {
            key: 'all',
            label: 'All Jobs',
            children: (
              <Table
                rowKey="id"
                loading={isLoading}
                columns={columns}
                dataSource={jobs?.items ?? []}
                scroll={{ x: true }}
                pagination={{
                  current: page,
                  pageSize: 20,
                  total: jobs?.pagination.total ?? 0,
                  onChange: setPage,
                }}
              />
            ),
          },
          {
            key: 'failed',
            label: 'Failed Jobs',
            children: (
              <Table
                rowKey="id"
                loading={failedLoading}
                columns={columns}
                dataSource={failedJobs?.items ?? []}
                scroll={{ x: true }}
              />
            ),
          },
        ]}
      />
    </div>
  );
};
