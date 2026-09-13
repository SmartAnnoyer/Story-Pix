import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { QRCode, message } from 'antd';
import { CopyOutlined, ShareAltOutlined } from '@ant-design/icons';
import { canvasWithWhiteBackground, shareQrPayload } from '../utils/qr-export';
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

export type AlbumViewerQrCardHandle = {
  share: () => Promise<void>;
  canShare: boolean;
};

const WAIT_TIPS = [
  'Getting the album ready so phones unlock video from the print.',
  'This happens once on our side — guests won’t wait for it.',
  'When this finishes, print or send the QR.',
];

const formatElapsed = (startedAt: string | null | undefined) => {
  if (!startedAt) return null;
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${String(seconds % 60).padStart(2, '0')}s`;
};

export const AlbumViewerQrCard = forwardRef<AlbumViewerQrCardHandle, AlbumViewerQrCardProps>(
  (
    {
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
    },
    ref,
  ) => {
    const qrWrapRef = useRef<HTMLDivElement>(null);
    const [tipIndex, setTipIndex] = useState(0);
    const [elapsed, setElapsed] = useState(() => formatElapsed(buildStartedAt));
    const [sharing, setSharing] = useState(false);
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

    const getQrCanvas = () => qrWrapRef.current?.querySelector('canvas') ?? null;

    const downloadQr = () => {
      const canvas = getQrCanvas();
      if (!canvas) {
        message.error('QR code is not ready yet');
        return;
      }

      const white = canvasWithWhiteBackground(canvas);
      const link = document.createElement('a');
      link.download = `${albumName.replace(/\s+/g, '-').toLowerCase()}-storypix-qr.png`;
      link.href = white.toDataURL('image/png');
      link.click();
      message.success('QR code downloaded');
    };

    const copyLink = async () => {
      try {
        await navigator.clipboard.writeText(viewerUrl);
        message.success('Link copied');
      } catch {
        try {
          const input = document.createElement('input');
          input.value = viewerUrl;
          document.body.appendChild(input);
          input.select();
          document.execCommand('copy');
          input.remove();
          message.success('Link copied');
        } catch {
          message.error('Could not copy link');
        }
      }
    };

    const shareQr = async () => {
      if (!showQr) {
        message.info('QR is not ready to share yet');
        return;
      }
      setSharing(true);
      try {
        const result = await shareQrPayload({
          canvas: getQrCanvas(),
          albumName,
          viewerUrl,
        });
        message.success(result === 'shared' ? 'Shared' : 'Link copied');
      } catch (error) {
        if ((error as Error)?.name !== 'AbortError') {
          message.error('Could not share');
        }
      } finally {
        setSharing(false);
      }
    };

    useImperativeHandle(
      ref,
      () => ({
        share: shareQr,
        canShare: showQr,
      }),
      // eslint-disable-next-line react-hooks/exhaustive-deps -- shareQr closes over latest showQr/viewerUrl
      [showQr, albumName, viewerUrl],
    );

    return (
      <section className="album-qr">
        <div className="album-qr__head">
          <h2>Client QR</h2>
        </div>

        {!published ? (
          <p className="album-qr__muted">Share with your client to unlock the QR here.</p>
        ) : failed ? (
          <div className="album-qr__center">
            <strong className="album-qr__warn">Couldn’t finish setup</strong>
            <p className="album-qr__muted">Try again — usually a few minutes.</p>
            {onRetry ? (
              <button
                type="button"
                className="album-qr__btn album-qr__btn--ghost"
                disabled={retrying}
                onClick={onRetry}
              >
                {retrying ? 'Trying again…' : 'Try again'}
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
            <strong>{buildMessage ?? 'Getting album ready for phones…'}</strong>
            <p className="album-qr__muted">{WAIT_TIPS[tipIndex]}</p>
            <p className="album-qr__meta">
              {clamped}%{elapsed ? ` · ${elapsed}` : ''}
            </p>
          </div>
        ) : (
          <>
            <div ref={qrWrapRef} className="album-qr__code">
              <QRCode
                value={viewerUrl}
                size={196}
                bordered={false}
                errorLevel="M"
                color="#000000"
                bgColor="#FFFFFF"
              />
            </div>
            <div className="album-qr__link-row">
              <p className="album-qr__link">{viewerUrl}</p>
              <button
                type="button"
                className="album-qr__copy"
                onClick={() => void copyLink()}
                aria-label="Copy link"
                title="Copy link"
              >
                <CopyOutlined />
              </button>
            </div>
            <div className="album-qr__actions">
              <button
                type="button"
                className="album-qr__btn album-qr__btn--primary"
                onClick={() => void shareQr()}
                disabled={!showQr || sharing}
              >
                <ShareAltOutlined aria-hidden />
                {sharing ? 'Sharing…' : 'Share QR'}
              </button>
              <button
                type="button"
                className="album-qr__btn album-qr__btn--ghost"
                onClick={downloadQr}
                disabled={!showQr}
              >
                Download QR
              </button>
            </div>
          </>
        )}
      </section>
    );
  },
);

AlbumViewerQrCard.displayName = 'AlbumViewerQrCard';
