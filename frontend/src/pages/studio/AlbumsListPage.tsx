import { useMemo, useState } from 'react';
import { Button, Input, Select, Tabs, Typography, message } from 'antd';
import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { AlbumTable } from '@/features/albums/components/AlbumTable';
import { useAlbumActionMutation, useAlbumsQuery } from '@/hooks/useAlbumQueries';
import { AlbumStatus } from '@/types/album.types';
import { ROUTES } from '@/routes/paths';
import { getErrorMessage } from '@/api/client';

const { Title, Paragraph } = Typography;

export const AlbumsListPage = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<AlbumStatus | undefined>();
  const [activeTab, setActiveTab] = useState<'all' | 'archived'>('all');

  const queryParams = useMemo(
    () => ({
      page,
      limit,
      search: search || undefined,
      status: activeTab === 'archived' ? AlbumStatus.ARCHIVED : status,
    }),
    [page, limit, search, status, activeTab],
  );

  const { data, isLoading } = useAlbumsQuery(queryParams);
  const actionMutation = useAlbumActionMutation();

  const handleArchive = async (id: string) => {
    try {
      await actionMutation.mutateAsync({ id, action: 'archive' });
      message.success('Album archived');
    } catch (error) {
      message.error(getErrorMessage(error, 'Archive failed'));
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await actionMutation.mutateAsync({ id, action: 'delete' });
      message.success('Album deleted');
    } catch (error) {
      message.error(getErrorMessage(error, 'Delete failed'));
    }
  };

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Title level={3} className="!mb-1">
            Albums
          </Title>
          <Paragraph type="secondary" className="!mb-0">
            Each album is one client delivery: photos, mapping, then QR.
          </Paragraph>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          block
          className="md:!w-auto"
          onClick={() => navigate(ROUTES.ALBUM_CREATE)}
        >
          New album
        </Button>
      </div>

      <Tabs
        activeKey={activeTab}
        onChange={(key) => {
          setActiveTab(key as 'all' | 'archived');
          setPage(1);
        }}
        items={[
          { key: 'all', label: 'Albums' },
          { key: 'archived', label: 'Archived' },
        ]}
        className="mb-4"
      />

      <div className="mb-4 grid gap-3 md:grid-cols-2">
        <Input
          prefix={<SearchOutlined />}
          placeholder="Search by name"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          allowClear
        />
        {activeTab === 'all' ? (
          <Select
            placeholder="Draft or published"
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
        onDelete={handleDelete}
      />
    </div>
  );
};
