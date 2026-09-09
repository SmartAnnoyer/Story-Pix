import { Spin } from 'antd';
import './LoadingSpinner.css';

interface LoadingSpinnerProps {
  /** Full viewport (auth bootstrap, redirects). Default fills the dashboard content area. */
  fullScreen?: boolean;
  /** Smaller centered block for widgets embedded in a page. */
  compact?: boolean;
  tip?: string;
}

export const LoadingSpinner = ({
  fullScreen = false,
  compact = false,
  tip = 'Loading…',
}: LoadingSpinnerProps) => {
  const className = [
    'loading-spinner',
    fullScreen ? 'loading-spinner--fullscreen' : '',
    compact ? 'loading-spinner--compact' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={className} role="status" aria-live="polite" aria-label={tip}>
      <Spin size="large" tip={tip}>
        <div className="loading-spinner__slot" />
      </Spin>
    </div>
  );
};
