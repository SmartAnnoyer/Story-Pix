import { useEffect, useMemo, useRef, useState } from 'react';
import { QRCode, message } from 'antd';
import './AlbumViewerQrCard.css';

interface AlbumViewerQrCardProps {
  albumName: string;
  viewerUrl: string;
  published: boolean;
  arScanFileReady?: boolean;
  progress?: number;
  buildMessage?: string | null;
  buildStartedAt?: string | null;
  failed?: boolean;
  onRetry?: () => void;
  retrying?: boolean;
}

const WAIT_TIPS = [
  'Preparing landmarks so printed photos unlock video.',
  'This build happens once — guests won’t wait for it.',
  'QR appears the moment the scan file is ready.',
];

const formatElapsed = (startedAt: string | null | undefined) => {
  if (!startedAt) return null;
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${String(seconds % 60).padStart(2, '0')}s`;
};

export const AlbumViewerQrCard = ({
  albumName,
  viewerUrl,
  published,
  arScanFileReady = false,
  progress = 0,
  buildMessage,
  buildStartedAt,
  failed = false,
  onRetry,
  retrying = false,
}: AlbumViewerQrCardProps) => {
  const qrWrapRef = useRef<HTMLDivElement>(null);
  const [tipIndex, setTipIndex] = useState(0);
  const [elapsed, setElapsed] = useState(() => formatElapsed(buildStartedAt));
  const showQr = published && arScanFileReady;
  const clamped = useMemo(() => Math.max(4, Math.min(99, Math.round(progress || 0))), [progress]);

  useEffect(() => {
    if (showQr || !published || failed) return undefined;
    const timer = window.setInterval(() => {
      setTipIndex((current) => (current + 1) % WAIT_TIPS.length);
      setElapsed(formatElapsed(buildStartedAt));
    }, 3200);
    return () => window.clearInterval(timer);
  }, [showQr, published, failed, buildStartedAt]);

  const downloadQr = () => {
    const canvas = qrWrapRef.current?.querySelector('canvas');
    if (!canvas) {
      message.error('QR code is not ready yet');
      return;
    }

    const link = document.createElement('a');
    link.download = `${albumName.replace(/\s+/g, '-').toLowerCase()}-storypix-qr.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    message.success('QR code downloaded');
  };

  return (
    <section className="album-qr">
      <div className="album-qr__head">
        <h2>Client QR</h2>
      </div>

      {!published ? (
        <p className="album-qr__muted">Share the album to unlock the QR here.</p>
      ) : failed ? (
        <div className="album-qr__center">
          <strong className="album-qr__warn">Scan file build failed</strong>
          <p className="album-qr__muted">Retry after fixing the issue.</p>
          {onRetry ? (
            <button
              type="button"
              className="album-qr__btn album-qr__btn--ghost"
              disabled={retrying}
              onClick={onRetry}
            >
              {retrying ? 'Retrying…' : 'Retry build'}
            </button>
          ) : null}
        </div>
      ) : !arScanFileReady ? (
        <div className="album-qr__center">
          <div className="album-qr__pulse" aria-hidden>
            <span />
          </div>
          <div className="album-qr__meter" aria-hidden>
            <i style={{ width: `${clamped}%` }} />
          </div>
          <strong>{buildMessage ?? 'Building scan file…'}</strong>
          <p className="album-qr__muted">{WAIT_TIPS[tipIndex]}</p>
          <p className="album-qr__meta">
            {clamped}%{elapsed ? ` · ${elapsed}` : ''}
          </p>
        </div>
      ) : (
        <>
          <div ref={qrWrapRef} className="album-qr__code">
            <QRCode value={viewerUrl} size={196} bordered={false} errorLevel="M" />
          </div>
          <p className="album-qr__link">{viewerUrl}</p>
          <button
            type="button"
            className="album-qr__btn album-qr__btn--primary"
            onClick={downloadQr}
            disabled={!showQr}
          >
            Download QR
          </button>
        </>
      )}
    </section>
  );
};
