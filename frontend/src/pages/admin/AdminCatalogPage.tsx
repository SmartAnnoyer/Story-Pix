import { useSearchParams } from 'react-router-dom';
import { Table, Tag } from 'antd';
import { useAdminPacksQuery, usePackLedgerQuery } from '@/hooks/usePackQueries';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import type { AlbumPack, PackLedgerAction } from '@/types/pack.types';
import './AdminCatalogPage.css';

type CatalogTab = 'packs' | 'history';

const TABS: { key: CatalogTab; label: string }[] = [
  { key: 'packs', label: 'Album packs' },
  { key: 'history', label: 'History' },
];

const tierColor: Record<string, string> = {
  minimal: 'default',
  standard: 'blue',
  professional: 'purple',
  volume: 'gold',
};

const actionColor: Record<PackLedgerAction, string> = {
  assign: 'green',
  consume: 'blue',
  revoke: 'red',
};

function parseTab(value: string | null): CatalogTab {
  return value === 'history' ? 'history' : 'packs';
}

export const AdminCatalogPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = parseTab(searchParams.get('tab'));

  const setTab = (next: CatalogTab) => {
    setSearchParams(next === 'packs' ? {} : { tab: next }, { replace: true });
  };

  return (
    <div className="catalog-page">
      <header className="catalog-page__hero">
        <div className="catalog-page__hero-glow" aria-hidden />
        <p className="catalog-page__eyebrow">Catalog</p>
        <h1>Album packs</h1>
        <p className="catalog-page__lede">
          Pack catalog and credit history. Enable packs on a studio after offline payment.
        </p>
      </header>

      <nav className="catalog-page__tabs" aria-label="Catalog sections">
        {TABS.map((item) => (
          <button
            key={item.key}
            type="button"
            className={`catalog-page__tab${tab === item.key ? ' catalog-page__tab--on' : ''}`}
            onClick={() => setTab(item.key)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <section className="catalog-page__panel">
        {tab === 'packs' ? <PacksTab /> : <HistoryTab />}
      </section>
    </div>
  );
};

const PacksTab = () => {
  const { data: packs, isLoading } = useAdminPacksQuery();
  if (isLoading) return <LoadingSpinner />;

  return (
    <>
      <p className="catalog-page__hint">
        Mini / Standard set photos per album. Bundles add multiple album credits. Every mapped photo
        gets 1,000 plays.
      </p>
      <Table
        rowKey="id"
        scroll={{ x: 960 }}
        dataSource={packs ?? []}
        pagination={false}
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
            title: 'List price',
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
        ]}
        expandable={{
          expandedRowRender: (pack: AlbumPack) => (
            <p className="catalog-page__expand">
              {pack.description}
              {pack.features?.length ? ` — ${pack.features.join(' · ')}` : ''}
            </p>
          ),
        }}
      />
    </>
  );
};

const HistoryTab = () => {
  const { data, isLoading } = usePackLedgerQuery();
  if (isLoading) return <LoadingSpinner />;

  return (
    <>
      <p className="catalog-page__hint">Assignments and album consumption across studios.</p>
      <Table
        rowKey="id"
        scroll={{ x: 900 }}
        dataSource={data?.items ?? []}
        pagination={false}
        columns={[
          {
            title: 'When',
            dataIndex: 'createdAt',
            render: (v: string | null) => (v ? new Date(v).toLocaleString() : '—'),
          },
          {
            title: 'Studio',
            key: 'studio',
            render: (_, row) => row.studioName ?? row.studioCode ?? row.studioId,
          },
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
        ]}
      />
    </>
  );
};
