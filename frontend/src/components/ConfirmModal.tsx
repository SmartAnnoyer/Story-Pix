import { createPortal } from 'react-dom';
import { BrandLogo } from '@/components/BrandLogo';
import './ConfirmModal.css';

export type ConfirmModalTone = 'default' | 'danger';

export type ConfirmModalProps = {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ConfirmModalTone;
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
};

export const ConfirmModal = ({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'default',
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) => {
  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div className="sp-confirm" role="presentation" onClick={onCancel}>
      <div
        className={`sp-confirm__card sp-confirm__card--${tone}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="sp-confirm-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sp-confirm__brand">
          <BrandLogo variant="icon" height={40} />
        </div>
        <h2 id="sp-confirm-title" className="sp-confirm__title">
          {title}
        </h2>
        {description ? <p className="sp-confirm__desc">{description}</p> : null}
        <div className="sp-confirm__actions">
          <button
            type="button"
            className="sp-confirm__btn sp-confirm__btn--ghost"
            onClick={onCancel}
            disabled={loading}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`sp-confirm__btn sp-confirm__btn--solid${
              tone === 'danger' ? ' sp-confirm__btn--danger' : ''
            }`}
            onClick={() => void onConfirm()}
            disabled={loading}
          >
            {loading ? 'Working…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};
