import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button, Form, Input, InputNumber, Modal, Switch, Table, Tag, message } from 'antd';
import { getErrorMessage } from '@/api/client';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import {
  useAdminCouponsQuery,
  useCreateCouponMutation,
  useToggleCouponMutation,
} from '@/hooks/useCouponQueries';
import { useAdminPacksQuery, usePackLedgerQuery } from '@/hooks/usePackQueries';
import type { Coupon } from '@/types/coupon.types';
import type { AlbumPack, PackLedgerAction } from '@/types/pack.types';
import './AdminCatalogPage.css';

type CatalogTab = 'packs' | 'coupons' | 'history';

const TABS: { key: CatalogTab; label: string }[] = [
  { key: 'packs', label: 'Packs' },
  { key: 'coupons', label: 'Coupons' },
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
  purchase: 'purple',
  consume: 'blue',
  revoke: 'red',
};

function parseTab(value: string | null): CatalogTab {
  if (value === 'history' || value === 'coupons') return value;
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
        <h1>Packs & coupons</h1>
        <p className="catalog-page__lede">
          Manage living-photo packs and signup coupon codes for discounts.
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
        {tab === 'coupons' ? <CouponsTab /> : null}
        {tab === 'history' ? <HistoryTab /> : null}
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
        Mini / Standard / bundles add photo-mapping slots to a studio pool. Albums are unlimited.
        Every mapped photo gets 1,000 plays.
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
          { title: 'Photos / unit', dataIndex: 'maxMappings' },
          {
            title: 'Plays / photo',
            dataIndex: 'scansPerMapping',
            render: (v: number) => (v ?? 1000).toLocaleString('en-IN'),
          },
          {
            title: 'Mapping slots',
            render: (_: unknown, pack: AlbumPack) => pack.maxMappings * pack.albumsIncluded,
          },
          {
            title: 'List price',
            dataIndex: 'unitPriceInr',
            render: (v: number) => `₹${v.toLocaleString('en-IN')}`,
          },
          {
            title: 'Status',
            dataIndex: 'isActive',
            render: (active: boolean) => (
              <span
                className={`catalog-page__badge${active ? ' catalog-page__badge--on' : ' catalog-page__badge--off'}`}
              >
                {active ? 'Active' : 'Off'}
              </span>
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

const CouponsTab = () => {
  const { data: coupons, isLoading } = useAdminCouponsQuery();
  const createMutation = useCreateCouponMutation();
  const toggleMutation = useToggleCouponMutation();
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();

  if (isLoading) return <LoadingSpinner />;

  const onCreate = async (values: {
    code: string;
    discountPercent: number;
    maxUses?: number | null;
    note?: string;
  }) => {
    try {
      await createMutation.mutateAsync({
        code: values.code,
        discountPercent: values.discountPercent,
        maxUses: values.maxUses || null,
        note: values.note || null,
        isActive: true,
      });
      message.success('Coupon created');
      setOpen(false);
      form.resetFields();
    } catch (err) {
      message.error(getErrorMessage(err, 'Unable to create coupon'));
    }
  };

  return (
    <>
      <div className="catalog-page__coupon-toolbar">
        <p className="catalog-page__hint">
          Optional codes for signup. Guests enter a code at checkout to get a % off.
        </p>
        <Button type="primary" className="sp-btn-gradient" onClick={() => setOpen(true)}>
          New coupon
        </Button>
      </div>

      <Table
        rowKey="id"
        scroll={{ x: 880 }}
        dataSource={coupons ?? []}
        pagination={false}
        locale={{ emptyText: 'No coupons yet' }}
        columns={[
          {
            title: 'Code',
            dataIndex: 'code',
            render: (code: string) => <span className="catalog-page__coupon-code">{code}</span>,
          },
          {
            title: 'Discount',
            dataIndex: 'discountPercent',
            render: (v: number) => `${v}% off`,
          },
          {
            title: 'Used',
            render: (_: unknown, row: Coupon) =>
              row.maxUses != null ? `${row.usedCount} / ${row.maxUses}` : `${row.usedCount}`,
          },
          {
            title: 'Status',
            dataIndex: 'isActive',
            render: (active: boolean) => (
              <span
                className={`catalog-page__badge${active ? ' catalog-page__badge--on' : ' catalog-page__badge--off'}`}
              >
                {active ? 'Active' : 'Off'}
              </span>
            ),
          },
          {
            title: 'Note',
            dataIndex: 'note',
            render: (v: string | null) => v || '—',
          },
          {
            title: '',
            key: 'actions',
            render: (_: unknown, row: Coupon) => (
              <Switch
                className="catalog-page__switch"
                checked={row.isActive}
                loading={toggleMutation.isPending}
                onChange={(checked) => {
                  void toggleMutation
                    .mutateAsync({ id: row.id, active: checked })
                    .then(() => message.success(checked ? 'Coupon on' : 'Coupon off'))
                    .catch((err) => message.error(getErrorMessage(err, 'Update failed')));
                }}
              />
            ),
          },
        ]}
      />

      <Modal
        title="New coupon"
        open={open}
        onCancel={() => setOpen(false)}
        footer={null}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          className="catalog-page__coupon-form"
          onFinish={(values) => void onCreate(values)}
          requiredMark={false}
        >
          <Form.Item
            name="code"
            label="Code"
            rules={[
              { required: true, message: 'Enter a code' },
              { min: 3, message: 'At least 3 characters' },
            ]}
          >
            <Input placeholder="WELCOME10" maxLength={32} style={{ textTransform: 'uppercase' }} />
          </Form.Item>
          <Form.Item
            name="discountPercent"
            label="Discount %"
            rules={[{ required: true, message: 'Enter discount %' }]}
          >
            <InputNumber min={1} max={100} className="!w-full" placeholder="10" />
          </Form.Item>
          <Form.Item name="maxUses" label="Max uses (optional)">
            <InputNumber min={1} className="!w-full" placeholder="Unlimited" />
          </Form.Item>
          <Form.Item name="note" label="Note (optional)">
            <Input placeholder="Launch offer" maxLength={200} />
          </Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            block
            loading={createMutation.isPending}
            className="sp-btn-gradient"
          >
            Create coupon
          </Button>
        </Form>
      </Modal>
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
