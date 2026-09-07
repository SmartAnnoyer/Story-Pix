import { useMemo, useState } from 'react';
import { Alert, Input, Select, Tabs, message } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import { AlbumTable } from '@/features/albums/components/AlbumTable';
import { useAlbumActionMutation, useAlbumsQuery } from '@/hooks/useAlbumQueries';
import { useStudioPackSummaryQuery } from '@/hooks/usePackQueries';
import { AlbumStatus } from '@/types/album.types';
import { ROUTES } from '@/routes/paths';
import { getErrorMessage } from '@/api/client';
import '../DashboardPage.css';

export const AlbumsListPage = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<AlbumStatus | undefined>();
  const [activeTab, setActiveTab] = useState<'all' | 'archived'>('all');
  const { data: packs } = useStudioPackSummaryQuery();

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
  const canCreateAlbum = (packs?.remainingAlbumCredits ?? 0) > 0;

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
    <div className="studio-home">
      <header className="studio-home__hero">
        <p className="studio-home__eyebrow">Studio</p>
        <h1>Albums</h1>
        <p className="studio-home__lede">
          Each album uses 1 pack credit. Credits left: {packs?.remainingAlbumCredits ?? '—'}. Guest
          plays are counted per mapped photo (see album details), not as a studio monthly total.
        </p>
        <div className="studio-home__actions">
          <button
            type="button"
            className="studio-home__btn studio-home__btn--primary"
            disabled={!canCreateAlbum}
            onClick={() => navigate(ROUTES.ALBUM_CREATE)}
          >
            {canCreateAlbum ? 'New album' : 'No credits left'}
          </button>
          <Link className="studio-home__btn studio-home__btn--ghost" to={ROUTES.DASHBOARD}>
            Home
          </Link>
        </div>
      </header>

      {!canCreateAlbum ? (
        <Alert
          className="!mb-4"
          type="warning"
          showIcon
          message="Album creation blocked"
          description="Your pack credits are used up. Ask Story-PIX admin to enable Mini, Standard, or a Bundle. Current pack status is on Home."
        />
      ) : null}

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
