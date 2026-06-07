import { useRef } from 'react';
import { Button, Card, QRCode, Typography, message } from 'antd';

const { Paragraph, Text } = Typography;

interface AlbumViewerQrCardProps {
  albumName: string;
  viewerUrl: string;
  published: boolean;
}

export const AlbumViewerQrCard = ({ albumName, viewerUrl, published }: AlbumViewerQrCardProps) => {
  const qrWrapRef = useRef<HTMLDivElement>(null);

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
      <Paragraph type="secondary" className="text-sm">
        Print this QR in the photo album so customers open the experience instantly — no typing URLs.
      </Paragraph>

      {!published ? (
        <Text type="warning" className="mb-3 block text-xs">
          Publish the album before sharing the QR with customers.
        </Text>
      ) : null}

      <div ref={qrWrapRef} className="mb-4 flex justify-center rounded-xl bg-white p-4">
        <QRCode value={viewerUrl} size={196} bordered={false} errorLevel="M" />
      </div>

      <Paragraph copyable className="!mb-3 text-xs">
        {viewerUrl}
      </Paragraph>

      <Button block onClick={downloadQr} disabled={!published}>
        Download QR for print
      </Button>
    </Card>
  );
};
