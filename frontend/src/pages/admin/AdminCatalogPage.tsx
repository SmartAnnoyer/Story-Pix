import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Space, Table, Tag, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useAdminPacksQuery, usePackLedgerQuery } from '@/hooks/usePackQueries';
import {
  usePlansQuery,
  useSubscriptionsQuery,
  useSubscriptionActionMutation,
  useTogglePlanMutation,
} from '@/hooks/useSubscriptionQueries';
import { SubscriptionStatusBadge } from '@/features/subscriptions/components/SubscriptionStatusBadge';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ROUTES } from '@/routes/paths';
import type { AlbumPack, PackLedgerAction } from '@/types/pack.types';
import { SubscriptionStatus, type Plan, type Subscription } from '@/types/subscription.types';
import './AdminCatalogPage.css';

type CatalogTab = 'packs' | 'history' | 'plans' | 'subscriptions';

const TABS: { key: CatalogTab; label: string }[] = [
  { key: 'packs', label: 'Album packs' },
  { key: 'history', label: 'History' },
  { key: 'plans', label: 'Plans' },
  { key: 'subscriptions', label: 'Subscriptions' },
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

const canActivate = (status: SubscriptionStatus) =>
  status === SubscriptionStatus.SUSPENDED ||
  status === SubscriptionStatus.EXPIRED ||
  status === SubscriptionStatus.CANCELLED;

const canSuspend = (status: SubscriptionStatus) =>
  status === SubscriptionStatus.ACTIVE || status === SubscriptionStatus.TRIAL;

function parseTab(value: string | null): CatalogTab {
  if (value === 'history' || value === 'plans' || value === 'subscriptions') return value;
  return 'packs';
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
        <h1>Packs &amp; access</h1>
        <p className="catalog-page__lede">
          Album packs, credit history, plans, and studio subscriptions in one place.
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
        {tab === 'packs' ? <PacksTab /> : null}
        {tab === 'history' ? <HistoryTab /> : null}
        {tab === 'plans' ? <PlansTab /> : null}
        {tab === 'subscriptions' ? <SubscriptionsTab /> : null}
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
        Enable packs from a studio’s details page. Studios can’t create albums when credits hit
        zero. Each mapped photo gets 1,000 plays.
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
      />
    </>
  );
};

const PlansTab = () => {
  const navigate = useNavigate();
  const { data: plans, isLoading } = usePlansQuery();
  const toggleMutation = useTogglePlanMutation();
  if (isLoading) return <LoadingSpinner />;

  return (
    <>
      <div className="catalog-page__toolbar">
        <p className="catalog-page__hint">
          Storage and scan limits templates. Assign from a studio or subscription.
        </p>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate(ROUTES.PLAN_CREATE)}>
          Create plan
        </Button>
      </div>
      <Table
        rowKey="id"
        scroll={{ x: 900 }}
        dataSource={plans ?? []}
        pagination={false}
        columns={[
          { title: 'Name', dataIndex: 'name' },
          { title: 'Code', dataIndex: 'code' },
          { title: 'Monthly list', dataIndex: 'monthlyPrice', render: (v: number) => `₹${v}` },
          { title: 'Storage (GB)', dataIndex: 'storageLimitGB' },
          {
            title: 'Scans/mo',
            dataIndex: 'monthlyScanLimit',
            render: (v: number) => (v < 0 ? '∞' : v),
          },
          {
            title: 'Status',
            dataIndex: 'isActive',
            render: (active: boolean) => (active ? 'Active' : 'Inactive'),
          },
          {
            title: 'Actions',
            key: 'actions',
            render: (_: unknown, record: Plan) => (
              <Space size={0} wrap>
                <Button
                  type="link"
                  onClick={() => navigate(ROUTES.PLAN_DETAILS.replace(':id', record.id))}
                >
                  View
                </Button>
                <Button
                  type="link"
                  onClick={() => navigate(ROUTES.PLAN_EDIT.replace(':id', record.id))}
                >
                  Edit
                </Button>
                <Button
                  type="link"
                  onClick={async () => {
                    await toggleMutation.mutateAsync({ id: record.id, active: !record.isActive });
                    message.success(record.isActive ? 'Plan deactivated' : 'Plan activated');
                  }}
                >
                  {record.isActive ? 'Deactivate' : 'Activate'}
                </Button>
              </Space>
            ),
          },
        ]}
      />
    </>
  );
};

const SubscriptionsTab = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const params = useMemo(() => ({ page, limit }), [page, limit]);
  const { data, isLoading } = useSubscriptionsQuery(params);
  const actionMutation = useSubscriptionActionMutation();
  if (isLoading) return <LoadingSpinner />;

  return (
    <>
      <p className="catalog-page__hint">
        Activate or suspend studio access. Change plans from Manage.
      </p>
      <Table
        rowKey="id"
        scroll={{ x: 1100 }}
        dataSource={data?.items ?? []}
        pagination={{
          current: page,
          pageSize: limit,
          total: data?.pagination.total ?? 0,
          onChange: (p, ps) => {
            setPage(p);
            setLimit(ps);
          },
        }}
        columns={[
          {
            title: 'Studio',
            key: 'studio',
            render: (_: unknown, record: Subscription) =>
              record.studio?.studioName ?? record.studioId,
          },
          {
            title: 'Plan',
            key: 'plan',
            render: (_: unknown, r: Subscription) => r.plan?.name ?? r.planId,
          },
          {
            title: 'Status',
            dataIndex: 'status',
            render: (status: Subscription['status']) => <SubscriptionStatusBadge status={status} />,
          },
          { title: 'Cycle', dataIndex: 'billingCycle' },
          {
            title: 'End date',
            dataIndex: 'endDate',
            render: (v: string | null) => (v ? new Date(v).toLocaleDateString() : '—'),
          },
          {
            title: 'Actions',
            key: 'actions',
            fixed: 'right',
            width: 280,
            render: (_: unknown, record: Subscription) => (
              <Space size={0} wrap>
                <Button
                  type="link"
                  onClick={() => navigate(ROUTES.SUBSCRIPTION_DETAILS.replace(':id', record.id))}
                >
                  Manage
                </Button>
                {canActivate(record.status) ? (
                  <Button
                    type="link"
                    onClick={async () => {
                      await actionMutation.mutateAsync({ action: 'activate', id: record.id });
                      message.success('Subscription activated');
                    }}
                  >
                    Activate
                  </Button>
                ) : null}
                {canSuspend(record.status) ? (
                  <Button
                    type="link"
                    onClick={async () => {
                      await actionMutation.mutateAsync({ action: 'suspend', id: record.id });
                      message.success('Subscription suspended');
                    }}
                  >
                    Suspend
                  </Button>
                ) : null}
              </Space>
            ),
          },
        ]}
      />
      <p className="catalog-page__hint catalog-page__hint--foot">
        Need a studio? <Link to={ROUTES.STUDIOS}>Open Studios</Link> to assign packs or change
        status.
      </p>
    </>
  );
};
