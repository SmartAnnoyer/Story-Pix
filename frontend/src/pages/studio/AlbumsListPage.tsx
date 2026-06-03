import { useMemo, useState } from 'react';
import { Button, DatePicker, Input, Select, Tabs, Typography, message } from 'antd';
import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { AlbumTable } from '@/features/albums/components/AlbumTable';
import { useAlbumActionMutation, useAlbumsQuery } from '@/hooks/useAlbumQueries';
import { AlbumStatus, EVENT_TYPE_LABELS, EventType } from '@/types/album.types';
import { ROUTES } from '@/routes/paths';

const { Title, Paragraph } = Typography;
const { RangePicker } = DatePicker;

export const AlbumsListPage = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<AlbumStatus | undefined>();
  const [eventType, setEventType] = useState<EventType | undefined>();
  const [dateRange, setDateRange] = useState<[string, string] | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'archived'>('all');

  const queryParams = useMemo(
    () => ({
      page,
      limit,
      search: search || undefined,
      status: activeTab === 'archived' ? AlbumStatus.ARCHIVED : status,
      eventType,
      dateFrom: dateRange?.[0],
      dateTo: dateRange?.[1],
    }),
    [page, limit, search, status, eventType, dateRange, activeTab],
  );

  const { data, isLoading } = useAlbumsQuery(queryParams);
  const actionMutation = useAlbumActionMutation();

  const handleArchive = async (id: string) => {
    await actionMutation.mutateAsync({ id, action: 'archive' });
    message.success('Album archived');
  };

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Title level={3} className="!mb-1">
            Albums
          </Title>
          <Paragraph type="secondary" className="!mb-0">
            Manage event albums for your studio.
          </Paragraph>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate(ROUTES.ALBUM_CREATE)}>
          Create Album
        </Button>
      </div>

      <Tabs
        activeKey={activeTab}
        onChange={(key) => {
          setActiveTab(key as 'all' | 'archived');
          setPage(1);
        }}
        items={[
          { key: 'all', label: 'All Albums' },
          { key: 'archived', label: 'Archive' },
        ]}
        className="mb-4"
      />

      <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Input
          prefix={<SearchOutlined />}
          placeholder="Search albums or customers"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          allowClear
        />
        {activeTab === 'all' ? (
          <Select
            placeholder="Status"
            allowClear
            value={status}
            onChange={(value) => {
              setStatus(value);
              setPage(1);
            }}
            options={[
              { label: 'Draft', value: AlbumStatus.DRAFT },
              { label: 'Published', value: AlbumStatus.PUBLISHED },
            ]}
          />
        ) : null}
        <Select
          placeholder="Event Type"
          allowClear
          value={eventType}
          onChange={(value) => {
            setEventType(value);
            setPage(1);
          }}
          options={Object.values(EventType).map((value) => ({
            label: EVENT_TYPE_LABELS[value],
            value,
          }))}
        />
        <RangePicker
          className="w-full"
          onChange={(dates) => {
            setDateRange(
              dates?.[0] && dates?.[1]
                ? [dates[0].format('YYYY-MM-DD'), dates[1].format('YYYY-MM-DD')]
                : null,
            );
            setPage(1);
          }}
        />
      </div>

      <AlbumTable
        albums={data?.items ?? []}
        loading={isLoading}
        pagination={{
          page,
          limit,
          total: data?.pagination.total ?? 0,
        }}
        onPageChange={(p, ps) => {
          setPage(p);
          setLimit(ps);
        }}
        onArchive={activeTab === 'all' ? handleArchive : undefined}
      />
    </div>
  );
};
