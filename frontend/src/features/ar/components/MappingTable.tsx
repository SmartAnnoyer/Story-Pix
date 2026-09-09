import { useMemo, useState } from 'react';
import { Popconfirm } from 'antd';
import type { ArTarget } from '@/types/ar-target.types';
import { ArTargetStatus } from '@/types/ar-target.types';
import { MediaType } from '@/types/media.types';
import { MappingMediaThumb } from '@/features/media/components/MappingMediaThumb';
import './MappingCards.css';

const statusLabels: Record<ArTargetStatus, string> = {
  [ArTargetStatus.DRAFT]: 'Saved',
  [ArTargetStatus.ACTIVE]: 'Live',
  [ArTargetStatus.ARCHIVED]: 'Hidden',
};

interface MappingTableProps {
  items: ArTarget[];
  loading?: boolean;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void | Promise<void>;
  onArchive: (id: string) => void;
  /** Advanced: show per-photo hide control. Sharing the album turns links on. */
  showAdvancedControls?: boolean;
}

export const MappingTable = ({
  items,
  loading,
  onEdit,
  onDelete,
  onArchive,
  showAdvancedControls = false,
}: MappingTableProps) => {
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [removingIds, setRemovingIds] = useState<Set<string>>(() => new Set());

  const visibleItems = useMemo(
    () => items.filter((item) => !removingIds.has(item.id)),
    [items, removingIds],
  );

  if (loading && items.length === 0) {
    return <p className="mapping-cards__loading">Loading links…</p>;
  }

  if (!loading && visibleItems.length === 0) {
    return (
      <p className="mapping-cards__empty">
        No links yet. Connect a printed photo to the video that should play on it.
      </p>
    );
  }

  return (
    <div className="mapping-cards">
      {visibleItems.map((record) => {
        const used = record.scanUsage ?? 0;
        const limit = record.scanLimit ?? 1000;
        const over = Boolean(record.scansExhausted || used >= limit);
        const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
        const canEdit =
          record.status === ArTargetStatus.DRAFT || record.status === ArTargetStatus.ACTIVE;
        const deleting = pendingDeleteId === record.id;

        return (
          <article key={record.id} className="mapping-card">
            <div className="mapping-card__pair">
              <div className="mapping-card__media">
                <MappingMediaThumb media={record.photo} mediaType={MediaType.PHOTO} />
                <span>Photo</span>
              </div>
              <div className="mapping-card__arrow" aria-hidden>
                →
              </div>
              <div className="mapping-card__media">
                <MappingMediaThumb media={record.video} mediaType={MediaType.VIDEO} />
                <span>Video</span>
              </div>
              <span className={`mapping-card__status mapping-card__status--${record.status}`}>
                {statusLabels[record.status]}
              </span>
            </div>

            <h2 className="mapping-card__name">{record.targetName}</h2>
            <p className="mapping-card__files">
              {record.photo?.originalFileName ?? 'Photo'} →{' '}
              {record.video?.originalFileName ?? 'Video'}
            </p>

            <div className="mapping-card__plays">
              <div className="mapping-card__plays-row">
                <span>Guest views</span>
                <strong className={over ? 'mapping-card__plays--over' : undefined}>
                  {used.toLocaleString('en-IN')} / {limit.toLocaleString('en-IN')}
                  {over ? ' · Over' : ''}
                </strong>
              </div>
              <div
                className={`mapping-card__meter${over ? ' mapping-card__meter--over' : ''}`}
                aria-hidden
              >
                <i style={{ width: `${pct}%` }} />
              </div>
            </div>

            <div className="mapping-card__actions">
              {canEdit ? (
                <button
                  type="button"
                  className="mapping-card__btn mapping-card__btn--primary"
                  onClick={() => onEdit(record.id)}
                >
                  Edit
                </button>
              ) : null}
              {showAdvancedControls && record.status === ArTargetStatus.ACTIVE ? (
                <button
                  type="button"
                  className="mapping-card__btn mapping-card__btn--ghost"
                  onClick={() => onArchive(record.id)}
                >
                  Hide from guests
                </button>
              ) : null}
              <Popconfirm
                open={pendingDeleteId === record.id}
                title="Remove this photo → video?"
                description={
                  record.status === ArTargetStatus.ACTIVE
                    ? 'Guests will no longer unlock this video from that print.'
                    : 'This cannot be undone.'
                }
                okText="Delete"
                okButtonProps={{ danger: true, loading: deleting }}
                cancelText="Cancel"
                onOpenChange={(open) => {
                  if (!open && !deleting) setPendingDeleteId(null);
                  if (open) setPendingDeleteId(record.id);
                }}
                onConfirm={async () => {
                  setRemovingIds((current) => new Set(current).add(record.id));
                  setPendingDeleteId(null);
                  try {
                    await onDelete(record.id);
                  } catch {
                    setRemovingIds((current) => {
                      const next = new Set(current);
                      next.delete(record.id);
                      return next;
                    });
                  }
                }}
              >
                <button type="button" className="mapping-card__btn mapping-card__btn--danger">
                  Delete
                </button>
              </Popconfirm>
            </div>
          </article>
        );
      })}
    </div>
  );
};
