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
    <div className="viewer-top-chrome viewer-top-chrome--in-viewer">
      <div className="viewer-top-chrome__brand">
        <BrandLogo variant="nav" height={42} className="viewer-top-chrome__logo" />
      </div>

      {showActions ? (
        <div className="viewer-top-chrome__actions" role="toolbar" aria-label="Playback controls">
          <button
            type="button"
            className={`viewer-top-chrome__btn${soundOn ? '' : ' viewer-top-chrome__btn--muted'}`}
            aria-label={soundOn ? 'Mute' : 'Unmute'}
            aria-pressed={!soundOn}
            onClick={onToggleMute}
          >
            <span className="viewer-top-chrome__btn-glow" aria-hidden />
            {soundOn ? (
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden>
                <path d="M3 9v6h4l5 5V4L7 9H3z" />
                <path
                  d="M16.5 12a3.5 3.5 0 0 0-1.8-3.05v6.1A3.5 3.5 0 0 0 16.5 12zm2.5 0c0 2.5-1.4 4.67-3.5 5.74v2.06A7.5 7.5 0 0 0 21.5 12 7.5 7.5 0 0 0 15.5 4.2v2.06A5.5 5.5 0 0 1 19 12z"
                  opacity="0.95"
                />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden>
                <path d="M3 9v6h4l5 5V4L7 9H3z" />
                <path d="M16.2 12.7 19 15.5l1.4-1.4-2.8-2.8 2.8-2.8L19 7.1l-2.8 2.8-2.8-2.8-1.4 1.4 2.8 2.8-2.8 2.8 1.4 1.4 2.8-2.8z" />
              </svg>
            )}
          </button>

          {onToggleExpand ? (
            <button
              type="button"
              className={`viewer-top-chrome__btn${expanded ? ' viewer-top-chrome__btn--active' : ''}`}
              aria-label={expanded ? 'Exit fullscreen' : 'Expand fullscreen'}
              aria-pressed={expanded}
              onClick={onToggleExpand}
            >
              <span className="viewer-top-chrome__btn-glow" aria-hidden />
              {expanded ? (
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden>
                  <path d="M9 3H3v6h2V5h4V3zm12 0h-6v2h4v4h2V3zM5 15H3v6h6v-2H5v-4zm16 0h-2v4h-4v2h6v-6z" />
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
