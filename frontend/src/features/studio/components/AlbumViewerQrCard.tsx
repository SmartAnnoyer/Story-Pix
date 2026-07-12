import { useRef } from 'react';
import { Button, Card, QRCode, Spin, Typography, message } from 'antd';

const { Paragraph, Text } = Typography;

interface AlbumViewerQrCardProps {
  albumName: string;
  viewerUrl: string;
  published: boolean;
  arScanFileReady?: boolean;
}

export const AlbumViewerQrCard = ({
  albumName,
  viewerUrl,
  published,
  arScanFileReady = false,
}: AlbumViewerQrCardProps) => {
  const qrWrapRef = useRef<HTMLDivElement>(null);
  const showQr = published && arScanFileReady;

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
      ) : !arScanFileReady ? (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <Spin />
          <div>
            <Text strong className="block">
              Building AR scan file…
            </Text>
            <Text type="secondary" className="mt-1 block text-xs">
              QR code will appear here when it is ready to print.
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
