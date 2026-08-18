import { useNavigate, useParams } from 'react-router-dom';
import { Alert, Button, Card, Dropdown, Space, Typography, message } from 'antd';
import {
  useAlbumActionMutation,
  useAlbumQuery,
  useRebuildArScanFileMutation,
} from '@/hooks/useAlbumQueries';
import { useAlbumArTargetsQuery, usePublishArTargetMutation } from '@/hooks/useArTargetQueries';
import { useAlbumMediaQuery } from '@/hooks/useMediaQueries';
import { AlbumStatusBadge } from '@/features/albums/components/AlbumStatusBadge';
import { AlbumDeliveryGuide } from '@/features/albums/components/AlbumDeliveryGuide';
import {
  albumMapPath,
  albumMediaPath,
  getDeliveryProgress,
  getMappingCounts,
  getReadyMediaCounts,
} from '@/features/albums/utils/album-delivery';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { AlbumViewerQrCard } from '@/features/studio/components/AlbumViewerQrCard';
import { getErrorMessage } from '@/api/client';
import { AlbumStatus } from '@/types/album.types';
import { ROUTES } from '@/routes/paths';

const { Title, Paragraph, Text } = Typography;

export const AlbumDetailsPage = () => {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { data: album, isLoading } = useAlbumQuery(id);
  const { data: mappings } = useAlbumArTargetsQuery(id, { limit: 100 });
  const { data: media } = useAlbumMediaQuery(id, { limit: 100 });
  const actionMutation = useAlbumActionMutation();
  const publishMappingMutation = usePublishArTargetMutation();
  const rebuildMutation = useRebuildArScanFileMutation();

  if (isLoading || !album) return <LoadingSpinner />;

  const { readyPhotos, readyVideos } = getReadyMediaCounts(media?.items);
  const { live, total, drafts } = getMappingCounts(mappings?.items);
  const { mediaDone, mapDone, published, shareDone } = getDeliveryProgress({
    readyPhotoCount: readyPhotos.length,
    readyVideoCount: readyVideos.length,
    liveMappingCount: live,
    album,
  });

  const handleShare = async () => {
    try {
      for (const draft of drafts) {
        await publishMappingMutation.mutateAsync(draft.id);
      }
      if (album.status !== AlbumStatus.PUBLISHED) {
        await actionMutation.mutateAsync({ id, action: 'publish' });
      }
      message.success('Album is on. The QR appears when the scan file is ready.');
    } catch (error) {
      message.error(getErrorMessage(error, 'Could not share yet'));
    }
  };

  const handleUnpublish = async () => {
    try {
      await actionMutation.mutateAsync({ id, action: 'unpublish' });
      message.success('Album is off. Guests cannot scan it.');
    } catch (error) {
      message.error(getErrorMessage(error, 'Could not turn off'));
    }
  };

  const handleRetryArBuild = async () => {
    await rebuildMutation.mutateAsync(id);
    message.success('Scan file rebuild started');
  };

  const handleArchive = async () => {
    await actionMutation.mutateAsync({ id, action: 'archive' });
    message.success('Album archived');
    navigate(ROUTES.ALBUMS);
  };

  const handleDelete = async () => {
    try {
      await actionMutation.mutateAsync({ id, action: 'delete' });
      message.success('Album deleted');
      navigate(ROUTES.ALBUMS);
    } catch (error) {
      message.error(getErrorMessage(error, 'Delete failed'));
    }
  };

  const sharing = actionMutation.isPending || publishMappingMutation.isPending;
  const canShare = mediaDone && (mapDone || drafts.length > 0);

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Title level={3} className="!mb-1">
            {album.albumName}
          </Title>
          <Paragraph type="secondary" className="!mb-2">
            For {album.customerName}
          </Paragraph>
          <Space wrap>
            <AlbumStatusBadge status={album.status} />
          </Space>
        </div>
        <Dropdown
          menu={{
            items: [
              album.status !== AlbumStatus.ARCHIVED
                ? {
                    key: 'edit',
                    label: 'Edit album details',
                    onClick: () => navigate(ROUTES.ALBUM_EDIT.replace(':id', id)),
                  }
                : null,
              {
                key: 'insights',
                label: 'Scan counts',
                onClick: () => navigate(ROUTES.ALBUM_INSIGHTS.replace(':id', id)),
              },
              published
                ? {
                    key: 'unpublish',
                    label: 'Stop sharing',
                    onClick: () => void handleUnpublish(),
                  }
                : null,
              album.status !== AlbumStatus.ARCHIVED
                ? { key: 'archive', label: 'Archive', onClick: () => void handleArchive() }
                : null,
              {
                key: 'delete',
                label: 'Delete',
                danger: true,
                onClick: () => void handleDelete(),
              },
            ].filter(Boolean),
          }}
        >
          <Button>More</Button>
        </Dropdown>
      </div>

      <AlbumDeliveryGuide albumId={id} current="share" />

      {!mediaDone ? (
        <Alert
          className="!mb-4"
          type="info"
          showIcon
          message="Step 1 — add a photo and a video"
          description="Upload the printed photo the client will hold, then the video that should play on it."
          action={
            <Button type="primary" onClick={() => navigate(albumMediaPath(id))}>
              Add photos & videos
            </Button>
          }
        />
      ) : !mapDone && drafts.length === 0 ? (
        <Alert
          className="!mb-4"
          type="info"
          showIcon
          message="Step 2 — link photo to video"
          description="Choose which video plays when a guest points their phone at that print."
          action={
            <Button type="primary" onClick={() => navigate(albumMapPath(id, total > 0))}>
              Map to video
            </Button>
          }
        />
      ) : !published ? (
        <Alert
          className="!mb-4"
          type="success"
          showIcon
          message="Step 3 — share with your client"
          description="Turn the album on. Then print the QR in the album or send the link. Guests open it on their phone and scan the photo."
          action={
            <Button
              type="primary"
              loading={sharing}
              disabled={!canShare}
              onClick={() => void handleShare()}
            >
              Share with client
            </Button>
          }
        />
      ) : !shareDone ? (
        <Alert
          className="!mb-4"
          type="info"
          showIcon
          message="Preparing the scan"
          description="Wait here. The QR appears when this finishes — usually a few minutes. Guests do not wait for this."
        />
      ) : (
        <Alert
          className="!mb-4"
          type="success"
          showIcon
          message="Ready to deliver"
          description="Print the QR or send the link. Guests open it on their phone and point the camera at the photo."
        />
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Card title="What to do">
          <ol className="m-0 list-decimal space-y-2 pl-5 text-sm text-neutral-600">
            <li>
              <Text strong={!mediaDone}>Photos & videos</Text>
              {' — '}
              {mediaDone
                ? `${readyPhotos.length} photo${readyPhotos.length === 1 ? '' : 's'}, ${readyVideos.length} video${readyVideos.length === 1 ? '' : 's'} ready.`
                : 'Add the print and the video.'}{' '}
              <Button type="link" className="!px-0" onClick={() => navigate(albumMediaPath(id))}>
                Open
              </Button>
            </li>
            <li>
              <Text strong={mediaDone && !mapDone}>Map to video</Text>
              {' — '}
              {mapDone
                ? `${live} live pairing${live === 1 ? '' : 's'}.`
                : drafts.length
                  ? 'Saved, but not live yet.'
                  : 'Tell us which video plays on which photo.'}{' '}
              <Button
                type="link"
                className="!px-0"
                onClick={() => navigate(albumMapPath(id, total > 0))}
              >
                Open
              </Button>
            </li>
            <li>
              <Text strong={mapDone || drafts.length > 0}>Share</Text>
              {' — '}
              {shareDone
                ? 'QR is ready to print.'
                : published
                  ? 'Scan file is building.'
                  : 'Turn the album on, then print the QR.'}
            </li>
          </ol>
          {canShare && !published ? (
            <Button
              type="primary"
              className="mt-4"
              loading={sharing}
              onClick={() => void handleShare()}
            >
              Share with client
            </Button>
          ) : null}
        </Card>

        <AlbumViewerQrCard
          albumName={album.albumName}
          viewerUrl={album.publicViewerUrl}
          published={album.status === AlbumStatus.PUBLISHED}
          arScanFileReady={album.arScanFileReady}
          progress={album.arScanFileProgress}
          buildMessage={album.arScanFileMessage}
          buildStartedAt={album.arScanFileBuildStartedAt}
          failed={album.arScanFileStatus === 'failed'}
          onRetry={handleRetryArBuild}
          retrying={rebuildMutation.isPending}
        />
      </div>
    </div>
  );
};
