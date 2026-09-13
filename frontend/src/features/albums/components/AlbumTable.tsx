import { useState } from 'react';
import { DeleteOutlined, EditOutlined, FolderOpenOutlined, InboxOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import type { Album } from '@/types/album.types';
import { AlbumStatus } from '@/types/album.types';
import { albumStatusLabel } from '@/features/albums/utils/studio-labels';
import { ConfirmModal } from '@/components/ConfirmModal';
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

type PendingAction =
  | { type: 'archive'; id: string; name: string }
  | { type: 'delete'; id: string; name: string; published: boolean }
  | null;

export const AlbumTable = ({
  albums,
  loading,
  pagination,
  onPageChange,
  onArchive,
  onDelete,
}: AlbumTableProps) => {
  const navigate = useNavigate();
  const [pending, setPending] = useState<PendingAction>(null);
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
                <h2 className="album-card__name">{album.albumName}</h2>
                <p className="album-card__client">{album.customerName}</p>
              </button>
              <span className={statusClass(album.status)}>{albumStatusLabel(album.status)}</span>
            </div>

            <button
              type="button"
              className="album-card__meta"
              onClick={() => navigate(ROUTES.ALBUM_DETAILS.replace(':id', album.id))}
              aria-label={`Open ${album.albumName}`}
            >
              <div>
                <span>Name</span>
                <strong>{album.customerName || '—'}</strong>
              </div>
              <div>
                <span>Created</span>
                <strong>
                  {album.createdAt ? new Date(album.createdAt).toLocaleDateString('en-IN') : '—'}
                </strong>
              </div>
            </button>

            <div className="album-card__actions">
              <button
                type="button"
                className="album-card__btn album-card__btn--ghost"
                onClick={() => navigate(ROUTES.ALBUM_DETAILS.replace(':id', album.id))}
              >
                <FolderOpenOutlined aria-hidden />
                Open
              </button>
              <button
                type="button"
                className="album-card__btn album-card__btn--ghost"
                onClick={() => navigate(ROUTES.ALBUM_EDIT.replace(':id', album.id))}
              >
                <EditOutlined aria-hidden />
                Edit
              </button>
              {onArchive && album.status !== AlbumStatus.ARCHIVED ? (
                <button
                  type="button"
                  className="album-card__btn album-card__btn--ghost"
                  onClick={() =>
                    setPending({ type: 'archive', id: album.id, name: album.albumName })
                  }
                >
                  <InboxOutlined aria-hidden />
                  Archive
                </button>
              ) : null}
              {onDelete ? (
                <button
                  type="button"
                  className="album-card__btn album-card__btn--danger"
                  onClick={() =>
                    setPending({
                      type: 'delete',
                      id: album.id,
                      name: album.albumName,
                      published: album.status === AlbumStatus.PUBLISHED,
                    })
                  }
                >
                  <DeleteOutlined aria-hidden />
                  Delete
                </button>
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

      <ConfirmModal
        open={pending?.type === 'archive'}
        title="Archive this album?"
        description={
          pending?.type === 'archive'
            ? `"${pending.name}" will stop working for guests. You can still find it under Archived.`
            : undefined
        }
        confirmLabel="Archive"
        onCancel={() => setPending(null)}
        onConfirm={() => {
          if (pending?.type === 'archive') onArchive?.(pending.id);
          setPending(null);
        }}
      />

      <ConfirmModal
        open={pending?.type === 'delete'}
        title="Delete this album?"
        description={
          pending?.type === 'delete'
            ? pending.published
              ? `"${pending.name}" will be unpublished and removed from your list.`
              : `"${pending.name}" will be permanently removed from your list.`
            : undefined
        }
        confirmLabel="Delete"
        tone="danger"
        onCancel={() => setPending(null)}
        onConfirm={() => {
          if (pending?.type === 'delete') onDelete?.(pending.id);
          setPending(null);
        }}
      />
    </div>
  );
};
