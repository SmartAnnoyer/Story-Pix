import { BrandLogo } from '@/components/BrandLogo';
import './ViewerTopChrome.css';

interface ViewerTopChromeProps {
  soundOn: boolean;
  onToggleMute: () => void;
  onDownload: () => void;
  canDownload?: boolean;
  showActions?: boolean;
}

export const ViewerTopChrome = ({
  soundOn,
  onToggleMute,
  onDownload,
  canDownload = false,
  showActions = true,
}: ViewerTopChromeProps) => {
  return (
    <div className="viewer-top-chrome">
      <div className="viewer-top-chrome__brand">
        <BrandLogo variant="full" height={42} className="viewer-top-chrome__logo" />
      </div>

      {showActions ? (
        <div className="viewer-top-chrome__actions">
          <button
            type="button"
            className="viewer-top-chrome__btn"
            aria-label={soundOn ? 'Mute' : 'Unmute'}
            onClick={onToggleMute}
          >
            {soundOn ? (
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden>
                <path d="M3 10v4h3.2L11 18.5V5.5L6.2 10H3zm11.5 2a3.5 3.5 0 0 0-2-3.15v6.3a3.5 3.5 0 0 0 2-3.15zm-2-7.05v1.55A6.01 6.01 0 0 1 17.5 12a6.01 6.01 0 0 1-5 5.5v1.55A7.52 7.52 0 0 0 19 12a7.52 7.52 0 0 0-6.5-7.05z" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden>
                <path d="M3 10v4h3.2L11 18.5V5.5L6.2 10H3zm15.9-5.1-1.4-1.4L15 9l-2.5 2.5v.1L15 14.1l2.5 2.5 1.4-1.4L16.4 12.7l2.5-2.5z" />
                <path d="M4.2 3.1 3 4.3 19.7 21l1.2-1.2z" />
              </svg>
            )}
          </button>

          <button
            type="button"
            className="viewer-top-chrome__btn"
            aria-label="Download video"
            disabled={!canDownload}
            onClick={onDownload}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden>
              <path d="M11 4h2v9.2l3.1-3.1 1.4 1.4L12 17.1 6.5 11.5l1.4-1.4L11 13.2V4zM5 19h14v2H5v-2z" />
            </svg>
          </button>
        </div>
      ) : null}
    </div>
  );
};
