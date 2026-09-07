import { Table, Tag, Typography } from 'antd';
import { usePackLedgerQuery } from '@/hooks/usePackQueries';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import type { PackLedgerAction } from '@/types/pack.types';

const { Title, Paragraph } = Typography;

const actionColor: Record<PackLedgerAction, string> = {
  assign: 'green',
  consume: 'blue',
  revoke: 'red',
};

export const PackLedgerPage = () => {
  const { data, isLoading } = usePackLedgerQuery();

  if (isLoading) return <LoadingSpinner />;

  return (
    <div>
      <Title level={3} className="!mb-1">
        Pack history
      </Title>
      <Paragraph type="secondary" className="!mb-6">
        Assignments and album consumption across all studios.
      </Paragraph>

      <Table
        rowKey="id"
        scroll={{ x: 900 }}
        dataSource={data?.items ?? []}
        columns={[
          {
            title: 'When',
            dataIndex: 'createdAt',
            render: (v: string | null) => (v ? new Date(v).toLocaleString() : '—'),
          },
          { title: 'Studio', dataIndex: 'studioId', ellipsis: true },
          { title: 'Pack', dataIndex: 'packName' },
          {
            title: 'Action',
            dataIndex: 'action',
            render: (action: PackLedgerAction) => <Tag color={actionColor[action]}>{action}</Tag>,
          },
          { title: 'Qty', dataIndex: 'quantity' },
          {
            title: 'Amount',
            dataIndex: 'totalPriceInr',
            render: (v: number) => (v ? `₹${v.toLocaleString('en-IN')}` : '—'),
          },
          {
            title: 'Album',
            dataIndex: 'albumId',
            render: (v: string | null) => v ?? '—',
            ellipsis: true,
          },
        ]}
        pagination={false}
      />
    </div>
  );
};
