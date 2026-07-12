import { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Card, QRCode, Typography, message } from 'antd';

const { Paragraph, Text } = Typography;

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
  'We’re preparing landmarks so printed photos unlock video.',
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
    message.success('QR code downloaded — add it to your printed album');
  };

  return (
    <Card title="Customer QR code" className="mb-4">
      {!published ? (
        <>
          <Paragraph type="secondary" className="text-sm">
            Publish the album and wait for the AR scan file before the QR appears.
          </Paragraph>
          <Text type="warning" className="block text-xs">
            Album is not published yet.
          </Text>
        </>
      ) : failed ? (
        <div className="py-4 text-center">
          <Text type="danger" strong className="block">
            Scan file build failed
          </Text>
          <Paragraph type="secondary" className="mt-2 text-sm">
            Fix the issue and retry. QR stays hidden until the build succeeds.
          </Paragraph>
          {onRetry ? (
            <Button type="primary" danger loading={retrying} onClick={onRetry}>
              Retry build
            </Button>
          ) : null}
        </div>
      ) : !arScanFileReady ? (
        <div className="flex flex-col items-center gap-4 py-5 text-center">
          <div className="relative flex h-28 w-28 items-center justify-center">
            <div className="absolute inset-0 animate-pulse rounded-full bg-amber-100" />
            <div className="absolute inset-3 rounded-full border-2 border-dashed border-amber-400 animate-[spin_8s_linear_infinite]" />
            <div className="relative z-10 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-amber-800 shadow-sm">
              QR soon
            </div>
          </div>

          <div className="w-full max-w-xs">
            <div className="mb-2 h-2 overflow-hidden rounded-full bg-amber-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-400 transition-all duration-500"
                style={{ width: `${clamped}%` }}
              />
            </div>
            <Text strong className="block text-sm">
              {buildMessage ?? 'Building AR scan file…'}
            </Text>
            <Text type="secondary" className="mt-1 block text-xs">
              {WAIT_TIPS[tipIndex]}
            </Text>
            <Text type="secondary" className="mt-2 block text-[11px] tabular-nums">
              {clamped}%{elapsed ? ` · ${elapsed}` : ''}
            </Text>
          </div>
        </div>
      ) : (
        <>
          <Paragraph type="secondary" className="text-sm">
            Print this QR in the photo album so customers open the experience instantly — no typing
            URLs.
          </Paragraph>

          <div ref={qrWrapRef} className="mb-4 flex justify-center rounded-xl bg-white p-4">
            <QRCode value={viewerUrl} size={196} bordered={false} errorLevel="M" />
          </div>

          <Paragraph copyable className="!mb-3 text-xs">
            {viewerUrl}
          </Paragraph>

          <Button block type="primary" onClick={downloadQr} disabled={!showQr}>
            Download QR for print
          </Button>
        </>
      )}
    </Card>
  );
};
