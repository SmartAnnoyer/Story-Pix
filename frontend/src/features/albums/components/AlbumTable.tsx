import { Popconfirm } from 'antd';
import { useNavigate } from 'react-router-dom';
import type { Album } from '@/types/album.types';
import { AlbumStatus } from '@/types/album.types';
import { ROUTES } from '@/routes/paths';
import './AlbumCards.css';

interface AlbumTableProps {
  albums: Album[];
  loading?: boolean;
  pagination: { page: number; limit: number; total: number };
  onPageChange: (page: number, pageSize: number) => void;
  onArchive?: (id: string) => void;
  onDelete?: (id: string) => void;
}

function statusClass(status: AlbumStatus): string {
  return `album-card__status album-card__status--${status}`;
}

function statusLabel(status: AlbumStatus): string {
  if (status === AlbumStatus.PUBLISHED) return 'Published';
  if (status === AlbumStatus.ARCHIVED) return 'Archived';
  return 'Draft';
}

export const AlbumTable = ({
  albums,
  loading,
  pagination,
  onPageChange,
  onArchive,
  onDelete,
}: AlbumTableProps) => {
  const navigate = useNavigate();
  const totalPages = Math.max(1, Math.ceil(pagination.total / pagination.limit));
  const canPrev = pagination.page > 1;
  const canNext = pagination.page < totalPages;

  if (loading && albums.length === 0) {
    return <p className="albums-grid__loading">Loading albums…</p>;
  }

  if (!loading && albums.length === 0) {
    return <p className="albums-grid__empty">No albums match these filters.</p>;
  }

  return (
    <div className="albums-grid-wrap">
      <div className="albums-grid">
        {albums.map((album) => (
          <article key={album.id} className="album-card">
            <div className="album-card__top">
              <button
                type="button"
                className="album-card__open"
                onClick={() => navigate(ROUTES.ALBUM_DETAILS.replace(':id', album.id))}
              >
                <span className="album-card__code">{album.albumCode}</span>
                <h2 className="album-card__name">{album.albumName}</h2>
                <p className="album-card__client">{album.customerName}</p>
              </button>
              <span className={statusClass(album.status)}>{statusLabel(album.status)}</span>
            </div>

            <div className="album-card__meta">
              <div>
                <span>Photos capacity</span>
                <strong>Up to {album.maxMappings}</strong>
              </div>
              <div>
                <span>Guest plays used</span>
                <strong>
                  {(album.scanUsage ?? 0).toLocaleString('en-IN')} /{' '}
                  {(
                    album.scanLimit ?? album.maxMappings * (album.scansPerMapping ?? 1000)
                  ).toLocaleString('en-IN')}
                </strong>
              </div>
              <div>
                <span>Created</span>
                <strong>
                  {album.createdAt ? new Date(album.createdAt).toLocaleDateString('en-IN') : '—'}
                </strong>
              </div>
            </div>

            <div className="album-card__actions">
              <button
                type="button"
                className="album-card__btn album-card__btn--ghost"
                onClick={() => navigate(ROUTES.ALBUM_DETAILS.replace(':id', album.id))}
              >
                Open
              </button>
              <button
                type="button"
                className="album-card__btn album-card__btn--ghost"
                onClick={() => navigate(ROUTES.ALBUM_EDIT.replace(':id', album.id))}
              >
                Edit
              </button>
              {onArchive && album.status !== AlbumStatus.ARCHIVED ? (
                <Popconfirm
                  title="Archive this album?"
                  description="Guests will no longer be able to open it by scanning the QR. You can still find it under Archived."
                  okText="Archive"
                  onConfirm={() => onArchive(album.id)}
                >
                  <button type="button" className="album-card__btn album-card__btn--ghost">
                    Archive
                  </button>
                </Popconfirm>
              ) : null}
              {onDelete ? (
                <Popconfirm
                  title="Delete this album?"
                  description={
                    album.status === AlbumStatus.PUBLISHED
                      ? 'It will be unpublished and removed from your list.'
                      : 'This permanently removes the album from your list.'
                  }
                  okText="Delete"
                  okButtonProps={{ danger: true }}
                  onConfirm={() => onDelete(album.id)}
                >
                  <button type="button" className="album-card__btn album-card__btn--danger">
                    Delete
                  </button>
                </Popconfirm>
              ) : null}
            </div>
          </article>
        ))}
      </div>

      {pagination.total > pagination.limit ? (
        <div className="albums-grid__pager">
          <span>
            Page {pagination.page} of {totalPages}
          </span>
          <div className="albums-grid__pager-btns">
            <button
              type="button"
              className="album-card__btn album-card__btn--ghost"
              disabled={!canPrev}
              onClick={() => onPageChange(pagination.page - 1, pagination.limit)}
            >
              Previous
            </button>
            <button
              type="button"
              className="album-card__btn album-card__btn--ghost"
              disabled={!canNext}
              onClick={() => onPageChange(pagination.page + 1, pagination.limit)}
            >
              Next
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
};
