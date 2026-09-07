import { Popconfirm } from 'antd';
import type { ArTarget } from '@/types/ar-target.types';
import { ArTargetStatus } from '@/types/ar-target.types';
import { MediaType } from '@/types/media.types';
import { MappingMediaThumb } from '@/features/media/components/MappingMediaThumb';
import './MappingCards.css';

const statusLabels: Record<ArTargetStatus, string> = {
  [ArTargetStatus.DRAFT]: 'Saved',
  [ArTargetStatus.ACTIVE]: 'Live',
  [ArTargetStatus.ARCHIVED]: 'Off',
};

interface MappingTableProps {
  items: ArTarget[];
  loading?: boolean;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onPublish: (id: string) => void;
  onArchive: (id: string) => void;
}

export const MappingTable = ({
  items,
  loading,
  onEdit,
  onDelete,
  onPublish,
  onArchive,
}: MappingTableProps) => {
  if (loading && items.length === 0) {
    return <p className="mapping-cards__loading">Loading mappings…</p>;
  }

  if (!loading && items.length === 0) {
    return (
      <p className="mapping-cards__empty">
        No mappings yet. Link a printed photo to the video that should play on it.
      </p>
    );
  }

  return (
    <div className="mapping-cards">
      {items.map((record) => {
        const used = record.scanUsage ?? 0;
        const limit = record.scanLimit ?? 1000;
        const over = Boolean(record.scansExhausted || used >= limit);
        const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;

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
                <span>Guest plays</span>
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
              {record.status === ArTargetStatus.DRAFT ? (
                <>
                  <button
                    type="button"
                    className="mapping-card__btn mapping-card__btn--ghost"
                    onClick={() => onEdit(record.id)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="mapping-card__btn mapping-card__btn--primary"
                    onClick={() => onPublish(record.id)}
                  >
                    Turn on
                  </button>
                </>
              ) : null}
              {record.status === ArTargetStatus.ACTIVE ? (
                <button
                  type="button"
                  className="mapping-card__btn mapping-card__btn--ghost"
                  onClick={() => onArchive(record.id)}
                >
                  Turn off
                </button>
              ) : null}
              <Popconfirm
                title="Remove this photo → video?"
                description={
                  record.status === ArTargetStatus.ACTIVE
                    ? 'Guests will no longer unlock this video from that print.'
                    : 'This cannot be undone.'
                }
                okText="Delete"
                okButtonProps={{ danger: true }}
                onConfirm={() => onDelete(record.id)}
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
