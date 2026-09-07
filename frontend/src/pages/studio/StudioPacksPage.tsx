import { Card, Progress, Table, Tag, Typography } from 'antd';
import { useStudioPackHistoryQuery, useStudioPackSummaryQuery } from '@/hooks/usePackQueries';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import type { PackLedgerAction } from '@/types/pack.types';

const { Title, Paragraph, Text } = Typography;

export const StudioPacksPage = () => {
  const { data: summary, isLoading } = useStudioPackSummaryQuery();
  const { data: history } = useStudioPackHistoryQuery();

  if (isLoading || !summary) return <LoadingSpinner />;

  const usedPct =
    summary.totalAssignedCredits > 0
      ? Math.round((summary.usedCredits / summary.totalAssignedCredits) * 100)
      : 0;

  return (
    <div>
      <Title level={3} className="!mb-1">
        Album packs
      </Title>
      <Paragraph type="secondary" className="!mb-6">
        Each credit = one client album. Every mapped photo includes 1,000 guest plays.
      </Paragraph>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card>
          <Text type="secondary">Credits left</Text>
          <div className="text-2xl font-semibold">{summary.remainingAlbumCredits}</div>
        </Card>
        <Card>
          <Text type="secondary">Used</Text>
          <div className="text-2xl font-semibold">{summary.usedCredits}</div>
        </Card>
        <Card>
          <Text type="secondary">Total assigned</Text>
          <div className="text-2xl font-semibold">{summary.totalAssignedCredits}</div>
          <Progress percent={usedPct} size="small" className="mt-2" />
        </Card>
      </div>

      <Card title="Your pack credits" className="mb-6">
        <Table
          rowKey="id"
          pagination={false}
          dataSource={summary.credits}
          columns={[
            { title: 'Pack', dataIndex: 'packName' },
            { title: 'Photos max', dataIndex: 'maxMappings' },
            {
              title: 'Plays / photo',
              dataIndex: 'scansPerMapping',
              render: (v: number) => (v ?? 1000).toLocaleString('en-IN'),
            },
            {
              title: 'Remaining',
              dataIndex: 'remainingCredits',
              render: (v: number, row) => `${v} / ${row.totalCredits}`,
            },
            {
              title: 'Status',
              render: (_, row) =>
                row.remainingCredits > 0 ? (
                  <Tag color="success">Available</Tag>
                ) : (
                  <Tag>Used up</Tag>
                ),
            },
          ]}
          locale={{ emptyText: 'No packs enabled yet. Contact Story-PIX admin.' }}
        />
      </Card>

      <Card title="Recent activity">
        <Table
          rowKey="id"
          pagination={false}
          dataSource={history?.items ?? []}
          columns={[
            {
              title: 'When',
              dataIndex: 'createdAt',
              render: (v: string | null) => (v ? new Date(v).toLocaleString() : '—'),
            },
            { title: 'Pack', dataIndex: 'packName' },
            {
              title: 'Action',
              dataIndex: 'action',
              render: (action: PackLedgerAction) => <Tag>{action}</Tag>,
            },
            { title: 'Qty', dataIndex: 'quantity' },
          ]}
        />
      </Card>
    </div>
  );
};
