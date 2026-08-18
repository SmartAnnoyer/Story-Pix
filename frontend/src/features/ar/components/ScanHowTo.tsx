import type { ReactNode } from 'react';
import './ScanHowTo.css';

interface ScanHowToProps {
  photo?: ReactNode;
  variant?: 'hero' | 'mini';
  label?: string;
  showLabel?: boolean;
}

export const ScanHowTo = ({
  photo,
  variant = 'hero',
  label = 'Point camera at your photo',
  showLabel = true,
}: ScanHowToProps) => {
  return (
    <div className={`scan-howto scan-howto--${variant}`} aria-hidden>
      {showLabel ? (
        <span className="scan-howto__pill">
          <i />
          {label}
        </span>
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
