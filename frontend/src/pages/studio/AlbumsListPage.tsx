import { useMemo, useState } from 'react';
import { Alert, message } from 'antd';
import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { AlbumTable } from '@/features/albums/components/AlbumTable';
import { useAlbumActionMutation, useAlbumsQuery } from '@/hooks/useAlbumQueries';
import { useStudioPackSummaryQuery } from '@/hooks/usePackQueries';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ROUTES } from '@/routes/paths';
import { getErrorMessage } from '@/api/client';
import '../DashboardPage.css';
import './AlbumsListPage.css';

export const AlbumsListPage = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const { data: packs, isLoading: packsLoading } = useStudioPackSummaryQuery();

  const queryParams = useMemo(
    () => ({
      page,
      limit,
      search: search || undefined,
    }),
    [page, limit, search],
  );

  const { data, isLoading } = useAlbumsQuery(queryParams);
  const actionMutation = useAlbumActionMutation();
  const packsReady = !packsLoading && packs != null;
  const mappingsLeft = packs?.remainingMappingSlots ?? packs?.remainingAlbumCredits ?? 0;
  const mappingsTotal = packs?.grantedMappingSlots ?? packs?.totalAssignedCredits ?? 0;
  const albumTotal = data?.pagination.total ?? 0;
  const showSearch = albumTotal > 5 || Boolean(search) || Boolean(searchInput.trim());
  const canCreate = packsReady && mappingsLeft > 0;
  const outOfPhotos = packsReady && mappingsLeft <= 0;

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

  if (packsLoading && !packs) {
    return <LoadingSpinner />;
  }

  return (
    <div className="studio-home albums-page">
      <header className="albums-page__hero">
        <span
          className={`albums-page__credits${outOfPhotos ? ' albums-page__credits--warn' : ''}`}
          aria-live="polite"
        >
          <strong>{mappingsLeft}</strong>
          <span>left of {mappingsTotal}</span>
        </span>
        <button
          type="button"
          className="studio-home__btn studio-home__btn--primary albums-page__create-btn"
          disabled={!canCreate}
          onClick={() => navigate(ROUTES.ALBUM_CREATE)}
        >
          <PlusOutlined aria-hidden />
          Create album
        </button>
      </header>

      {outOfPhotos ? (
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

      {showSearch ? (
        <div className="albums-page__toolbar">
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
        </div>
      ) : null}

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
          onArchive={handleArchive}
          onDelete={handleDelete}
        />
      </div>
    </div>
  );
};
