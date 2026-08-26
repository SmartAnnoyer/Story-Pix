import type { ReactNode } from 'react';
import './ScanHowTo.css';

interface ScanHowToProps {
  photo?: ReactNode;
  variant?: 'hero' | 'mini';
  label?: string;
  subtitle?: string;
  showLabel?: boolean;
}

export const ScanHowTo = ({
  photo,
  variant = 'hero',
  label = 'Point camera at your photo',
  subtitle = 'Printed photo in frame → story plays',
  showLabel = true,
}: ScanHowToProps) => {
  return (
    <div className={`scan-howto scan-howto--${variant}`} aria-hidden>
      {showLabel ? (
        <div className="scan-howto__hint">
          <span className="scan-howto__hint-icon" aria-hidden>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none">
              <path
                d="M4.5 8.5h2.1l1.2-2h8.4l1.2 2H19.5A1.5 1.5 0 0 1 21 10v8a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18v-8a1.5 1.5 0 0 1 1.5-1.5Z"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinejoin="round"
              />
              <circle cx="12" cy="14" r="3.2" stroke="currentColor" strokeWidth="1.7" />
            </svg>
          </span>
          <span className="scan-howto__hint-copy">
            <span className="scan-howto__hint-title">{label}</span>
            {variant === 'hero' ? <span className="scan-howto__hint-sub">{subtitle}</span> : null}
          </span>
        </div>
      ) : null}

      <div className="scan-howto__stage">
        <div className="scan-howto__print">
          {photo ?? <span className="scan-howto__print-fallback" />}
        </div>

        <div className="scan-howto__phone">
          <span className="scan-howto__phone-notch" />
          <span className="scan-howto__phone-lens" />
        </div>

        <div className="scan-howto__frame">
          <span className="scan-howto__corner scan-howto__corner--tl" />
          <span className="scan-howto__corner scan-howto__corner--tr" />
          <span className="scan-howto__corner scan-howto__corner--bl" />
          <span className="scan-howto__corner scan-howto__corner--br" />
          <div className="scan-howto__scanline" />
        </div>
      </div>
    </div>
  );
};
