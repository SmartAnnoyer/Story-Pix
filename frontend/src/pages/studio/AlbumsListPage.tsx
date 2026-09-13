import { useMemo, useState } from 'react';
import { Alert, message } from 'antd';
import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { AlbumTable } from '@/features/albums/components/AlbumTable';
import { useAlbumActionMutation, useAlbumsQuery } from '@/hooks/useAlbumQueries';
import { useStudioPackSummaryQuery } from '@/hooks/usePackQueries';
import { AlbumStatus } from '@/types/album.types';
import { albumStatusFilterLabel } from '@/features/albums/utils/studio-labels';
import { ROUTES } from '@/routes/paths';
import { getErrorMessage } from '@/api/client';
import '../DashboardPage.css';
import './AlbumsListPage.css';

type AlbumFilter = 'all' | AlbumStatus.DRAFT | AlbumStatus.PUBLISHED | AlbumStatus.ARCHIVED;

const FILTERS: { label: string; value: AlbumFilter }[] = [
  { label: 'All', value: 'all' },
  { label: albumStatusFilterLabel(AlbumStatus.DRAFT), value: AlbumStatus.DRAFT },
  { label: albumStatusFilterLabel(AlbumStatus.PUBLISHED), value: AlbumStatus.PUBLISHED },
  { label: albumStatusFilterLabel(AlbumStatus.ARCHIVED), value: AlbumStatus.ARCHIVED },
];

export const AlbumsListPage = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<AlbumFilter>('all');
  const { data: packs } = useStudioPackSummaryQuery();

  const queryParams = useMemo(
    () => ({
      page,
      limit,
      search: search || undefined,
      status: filter === 'all' ? undefined : filter,
    }),
    [page, limit, search, filter],
  );

  const { data, isLoading } = useAlbumsQuery(queryParams);
  const actionMutation = useAlbumActionMutation();
  const mappingsLeft = packs?.remainingMappingSlots ?? packs?.remainingAlbumCredits ?? 0;
  const mappingsTotal = packs?.grantedMappingSlots ?? packs?.totalAssignedCredits ?? 0;
  const albumTotal = data?.pagination.total ?? 0;
  const showSearch = albumTotal > 5 || Boolean(search) || Boolean(searchInput.trim());
  const showArchive = filter !== AlbumStatus.ARCHIVED;
  const canCreate = mappingsLeft > 0;

  const applySearch = () => {
    setSearch(searchInput.trim());
    setPage(1);
  };

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
    <div className="studio-home albums-page">
      <header className="studio-home__hero albums-page__hero">
        <h1>Albums</h1>
        <div className="albums-page__create-row">
          <button
            type="button"
            className="studio-home__btn studio-home__btn--primary albums-page__create-btn"
            disabled={!canCreate}
            onClick={() => navigate(ROUTES.ALBUM_CREATE)}
          >
            <PlusOutlined aria-hidden />
            Create album
          </button>
          <span className="albums-page__mappings">
            Mappings left{' '}
            <strong>
              {mappingsLeft}/{mappingsTotal}
            </strong>
          </span>
        </div>
      </header>

      {mappingsLeft <= 0 ? (
        <Alert
          className="!mb-4 albums-page__alert"
          type="warning"
          showIcon
          message="No photos left"
          action={
            <button
              type="button"
              className="sp-btn-gradient"
              onClick={() => navigate(ROUTES.STUDIO_PACKS)}
            >
              Buy packs
            </button>
          }
        />
      ) : null}

      <div className="albums-page__toolbar">
        {showSearch ? (
          <div className="albums-page__search">
            <input
              type="search"
              placeholder="Search for album"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') applySearch();
              }}
              aria-label="Search for album"
            />
            <button
              type="button"
              className="albums-page__search-btn"
              onClick={applySearch}
              aria-label="Search"
            >
              <SearchOutlined aria-hidden />
            </button>
          </div>
        ) : null}
        <div className="albums-page__filters" role="group" aria-label="Album status">
          {FILTERS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`albums-page__chip${filter === option.value ? ' albums-page__chip--on' : ''}`}
              onClick={() => {
                setFilter(option.value);
                setPage(1);
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="albums-page__list">
        <AlbumTable
          albums={data?.items ?? []}
          loading={isLoading}
          pagination={{
            page,
            limit,
            total: albumTotal,
          }}
          onPageChange={(p, ps) => {
            setPage(p);
            setLimit(ps);
          }}
          onArchive={showArchive ? handleArchive : undefined}
          onDelete={handleDelete}
        />
      </div>
    </div>
  );
};
