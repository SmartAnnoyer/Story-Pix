import { Popconfirm } from 'antd';
import type { Studio } from '@/types/studio.types';
import { StudioStatus } from '@/types/studio.types';
import { formatStorageGb, formatStorageUsage } from '@/utils/format-storage';
import '@/pages/admin/StudiosListPage.css';

interface StudioTableProps {
  studios: Studio[];
  loading?: boolean;
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
  onPageChange: (page: number, pageSize: number) => void;
  onSuspend: (id: string) => void;
  onActivate: (id: string) => void;
  onDelete: (id: string) => void;
  onOpen: (id: string) => void;
  onEdit: (id: string) => void;
}

function storagePercent(used: number, limit: number): number {
  if (!limit || limit <= 0) return 0;
  return Math.min(100, Math.round((used / limit) * 100));
}

function statusClass(status: StudioStatus): string {
  return `studios-page__status studios-page__status--${status}`;
}

export const StudioTable = ({
  studios,
  loading,
  pagination,
  onPageChange,
  onSuspend,
  onActivate,
  onDelete,
  onOpen,
  onEdit,
}: StudioTableProps) => {
  const totalPages = Math.max(1, Math.ceil(pagination.total / pagination.limit));
  const canPrev = pagination.page > 1;
  const canNext = pagination.page < totalPages;

  if (loading && studios.length === 0) {
    return <p className="studios-page__loading">Loading studios…</p>;
  }

  if (!loading && studios.length === 0) {
    return <p className="studios-page__empty">No studios match these filters.</p>;
  }

  return (
    <div>
      <div className="studios-grid">
        {studios.map((studio) => {
          const pct = storagePercent(studio.storageUsedGB, studio.storageLimitGB);
          const canActivate =
            studio.status === StudioStatus.SUSPENDED || studio.status === StudioStatus.EXPIRED;

          return (
            <article key={studio.id} className="studio-card">
              <div className="studio-card__top">
                <button
                  type="button"
                  className="studio-card__open"
                  onClick={() => onOpen(studio.id)}
                >
                  <span className="studio-card__code">{studio.studioCode}</span>
                  <h2 className="studio-card__name">{studio.studioName}</h2>
                  <p className="studio-card__owner">{studio.ownerName}</p>
                </button>
                <span className={statusClass(studio.status)}>{studio.status}</span>
              </div>

              <div className="studio-card__meta">
                <div>
                  <span>Email</span>
                  <strong>{studio.email}</strong>
                </div>
                <div>
                  <span>Scans</span>
                  <strong>
                    {studio.monthlyScanUsage.toLocaleString('en-IN')} /{' '}
                    {studio.monthlyScanLimit.toLocaleString('en-IN')}
                  </strong>
                </div>
              </div>

              <div className="studio-card__storage">
                <div className="studio-card__storage-row">
                  <span>Storage</span>
                  <strong>{formatStorageUsage(studio.storageUsedGB, studio.storageLimitGB)}</strong>
                </div>
                <div className="studio-card__meter" aria-hidden>
                  <i style={{ width: `${pct}%` }} />
                </div>
                <div className="studio-card__storage-row">
                  <span>{pct}% used</span>
                  <span>{formatStorageGb(studio.storageUsedGB)} GB</span>
                </div>
              </div>

              <div className="studio-card__actions">
                <button
                  type="button"
                  className="studios-page__btn studios-page__btn--ghost studios-page__btn--sm"
                  onClick={() => onOpen(studio.id)}
                >
                  Open
                </button>
                <button
                  type="button"
                  className="studios-page__btn studios-page__btn--ghost studios-page__btn--sm"
                  onClick={() => onEdit(studio.id)}
                >
                  Edit
                </button>
                {canActivate ? (
                  <button
                    type="button"
                    className="studios-page__btn studios-page__btn--ghost studios-page__btn--sm"
                    onClick={() => onActivate(studio.id)}
                  >
                    Activate
                  </button>
                ) : (
                  <button
                    type="button"
                    className="studios-page__btn studios-page__btn--ghost studios-page__btn--sm"
                    onClick={() => onSuspend(studio.id)}
                  >
                    Suspend
                  </button>
                )}
                <Popconfirm title="Delete this studio?" onConfirm={() => onDelete(studio.id)}>
                  <button
                    type="button"
                    className="studios-page__btn studios-page__btn--danger studios-page__btn--sm"
                  >
                    Delete
                  </button>
                </Popconfirm>
              </div>
            </article>
          );
        })}
      </div>

      {pagination.total > pagination.limit ? (
        <div className="studios-page__pager">
          <span>
            Page {pagination.page} of {totalPages}
          </span>
          <div className="studios-page__pager-btns">
            <button
              type="button"
              className="studios-page__btn studios-page__btn--ghost studios-page__btn--sm"
              disabled={!canPrev}
              onClick={() => onPageChange(pagination.page - 1, pagination.limit)}
            >
              Previous
            </button>
            <button
              type="button"
              className="studios-page__btn studios-page__btn--ghost studios-page__btn--sm"
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
