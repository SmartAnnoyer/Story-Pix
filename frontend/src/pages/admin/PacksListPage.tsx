import { Button, Table, Tag, Typography } from 'antd';
import { HistoryOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAdminPacksQuery } from '@/hooks/usePackQueries';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ROUTES } from '@/routes/paths';
import type { AlbumPack } from '@/types/pack.types';

const { Title, Paragraph } = Typography;

const tierColor: Record<string, string> = {
  minimal: 'default',
  standard: 'blue',
  professional: 'purple',
  volume: 'gold',
};

export const PacksListPage = () => {
  const navigate = useNavigate();
  const { data: packs, isLoading } = useAdminPacksQuery();

  if (isLoading) return <LoadingSpinner />;

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Title level={3} className="!mb-1">
            Album packs
          </Title>
          <Paragraph type="secondary" className="!mb-0">
            Sell by album size (photos) and multi-album bundles for busy shops. Every photo always
            includes 1,000 guest plays — not an upsell.
          </Paragraph>
        </div>
        <Button icon={<HistoryOutlined />} onClick={() => navigate(ROUTES.PACK_LEDGER)}>
          Pack history
        </Button>
      </div>

      <Table
        rowKey="id"
        scroll={{ x: 960 }}
        dataSource={packs ?? []}
        columns={[
          { title: 'Name', dataIndex: 'name' },
          {
            title: 'Tier',
            dataIndex: 'tier',
            render: (tier: string) => <Tag color={tierColor[tier] ?? 'default'}>{tier}</Tag>,
          },
          { title: 'Photos max', dataIndex: 'maxMappings' },
          {
            title: 'Plays / photo',
            dataIndex: 'scansPerMapping',
            render: (v: number) => (v ?? 1000).toLocaleString('en-IN'),
          },
          { title: 'Albums in pack', dataIndex: 'albumsIncluded' },
          {
            title: 'Price',
            dataIndex: 'unitPriceInr',
            render: (v: number) => `₹${v.toLocaleString('en-IN')}`,
          },
          {
            title: 'Status',
            dataIndex: 'isActive',
            render: (active: boolean) => (
              <Tag color={active ? 'success' : 'default'}>{active ? 'Active' : 'Off'}</Tag>
            ),
          },
          {
            title: 'Features',
            dataIndex: 'features',
            render: (features: string[]) => features?.slice(0, 2).join(' · ') ?? '',
          },
        ]}
        expandable={{
          expandedRowRender: (pack: AlbumPack) => (
            <Paragraph type="secondary" className="!mb-0">
              {pack.description}
              {pack.features?.length ? ` — ${pack.features.join(' · ')}` : ''}
            </Paragraph>
          ),
        }}
      />
    </div>
  );
};
