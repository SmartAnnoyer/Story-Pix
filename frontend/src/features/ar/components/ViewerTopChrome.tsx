import { BrandLogo } from '@/components/BrandLogo';
import './ViewerTopChrome.css';

interface ViewerTopChromeProps {
  soundOn: boolean;
  onToggleMute: () => void;
  onToggleExpand?: () => void;
  expanded?: boolean;
  showActions?: boolean;
}

export const ViewerTopChrome = ({
  soundOn,
  onToggleMute,
  onToggleExpand,
  expanded = false,
  showActions = true,
}: ViewerTopChromeProps) => {
  return (
    <div className="viewer-top-chrome">
      <div className="viewer-top-chrome__brand">
        <BrandLogo variant="nav" height={42} className="viewer-top-chrome__logo" />
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

          {onToggleExpand ? (
            <button
              type="button"
              className="viewer-top-chrome__btn"
              aria-label={expanded ? 'Exit fullscreen' : 'Expand fullscreen'}
              onClick={onToggleExpand}
            >
              {expanded ? (
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden>
                  <path d="M8 16H5v3h3v2H3v-5h2v0zm13 0h-3v3h-3v2h5v-5h1zm-8-8V5h3V3H8v5h2zm8 0V3h-5v2h3v3h2z" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden>
                  <path d="M3 3h7v2H5v5H3V3zm18 0v7h-2V5h-5V3h7zM3 21v-7h2v5h5v2H3zm18 0h-7v-2h5v-5h2v7z" />
                </svg>
              )}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};
