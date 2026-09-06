import { createPortal } from 'react-dom';
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
  if (typeof document === 'undefined') return null;

  // Portal above TargetFrameVideo (body z-index ~10050) so mute/expand stay visible.
  return createPortal(
    <div className="viewer-top-chrome viewer-top-chrome--portal">
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
              <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden>
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1-3.29-2.5-4.03v8.05c1.5-.74 2.5-2.26 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden>
                <path d="M16.5 12c0-1.77-1-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3 3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4 9.91 6.09 12 8.18V4z" />
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
                <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden>
                  <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden>
                  <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
                </svg>
              )}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>,
    document.body,
  );
};
