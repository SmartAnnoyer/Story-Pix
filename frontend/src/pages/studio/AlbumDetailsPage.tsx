import { useNavigate, useParams } from 'react-router-dom';
import { useRef } from 'react';
import { message } from 'antd';
import { ShareAltOutlined } from '@ant-design/icons';
import {
  useAlbumActionMutation,
  useAlbumQuery,
  useRebuildArScanFileMutation,
} from '@/hooks/useAlbumQueries';
import { useAlbumArTargetsQuery, usePublishArTargetMutation } from '@/hooks/useArTargetQueries';
import { useAlbumMediaQuery } from '@/hooks/useMediaQueries';
import { useStudioPackSummaryQuery } from '@/hooks/usePackQueries';
import { AlbumStudioShell } from '@/features/albums/components/AlbumStudioShell';
import {
  albumMapPath,
  albumMediaPath,
  getDeliveryProgress,
  getMappingCounts,
  getReadyMediaCounts,
} from '@/features/albums/utils/album-delivery';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import {
  AlbumViewerQrCard,
  type AlbumViewerQrCardHandle,
} from '@/features/studio/components/AlbumViewerQrCard';
import { getErrorMessage } from '@/api/client';
import { AlbumStatus } from '@/types/album.types';
import './AlbumDetailsPage.css';

export const AlbumDetailsPage = () => {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const qrRef = useRef<AlbumViewerQrCardHandle>(null);
  const { data: album, isLoading } = useAlbumQuery(id);
  const { data: mappings } = useAlbumArTargetsQuery(id, { limit: 100 });
  const { data: media } = useAlbumMediaQuery(id, { limit: 100 });
  const { data: packs } = useStudioPackSummaryQuery();
  const actionMutation = useAlbumActionMutation();
  const publishMappingMutation = usePublishArTargetMutation();
  const rebuildMutation = useRebuildArScanFileMutation();

  if (isLoading || !album) return <LoadingSpinner />;

  const { readyPhotos, readyVideos } = getReadyMediaCounts(media?.items);
  const { live, total, drafts } = getMappingCounts(mappings?.items);
  const studioRemaining = packs?.remainingMappingSlots ?? packs?.remainingAlbumCredits ?? 0;
  const { mediaDone, mapDone, published, shareDone } = getDeliveryProgress({
    readyPhotoCount: readyPhotos.length,
    readyVideoCount: readyVideos.length,
    liveMappingCount: live,
    album,
  });
  const canShareQr = published && Boolean(album.arScanFileReady);

  const handleShare = async () => {
    try {
      for (const draft of drafts) {
        await publishMappingMutation.mutateAsync(draft.id);
      }
      if (album.status !== AlbumStatus.PUBLISHED) {
        await actionMutation.mutateAsync({ id, action: 'publish' });
      }
      message.success('Shared with client');
    } catch (error) {
      message.error(getErrorMessage(error, 'Could not share yet'));
    }
  };

  const handleRetryArBuild = async () => {
    await rebuildMutation.mutateAsync(id);
    message.success('Trying again — usually a few minutes');
  };

  const sharing = actionMutation.isPending || publishMappingMutation.isPending;
  const canShare = mediaDone && (mapDone || drafts.length > 0);

  let statusTitle = 'Ready to deliver';
  let statusBody = 'Print the QR or send the link.';
  let statusAction: { label: string; onClick: () => void; loading?: boolean } | null = null;
  let statusTone: 'accent' | 'muted' = 'accent';

  if (!mediaDone) {
    statusTitle = 'Add photos & videos';
    statusBody = 'Upload the print and the video first.';
    statusTone = 'muted';
    statusAction = {
      label: 'Photos & videos',
      onClick: () => navigate(albumMediaPath(id)),
    };
  } else if (!mapDone && drafts.length === 0) {
    statusTitle = 'Link print → video';
    statusBody = 'Link each printed photo to the video that should play on it.';
    statusTone = 'muted';
    statusAction = {
      label: 'Link print → video',
      onClick: () => navigate(albumMapPath(id, total > 0)),
    };
  } else if (!published) {
    statusTitle = 'Share with client';
    statusBody = 'One tap turns links on and unlocks the QR for your client.';
    statusTone = 'accent';
    statusAction = {
      label: 'Share with client',
      onClick: () => void handleShare(),
      loading: sharing,
    };
  } else if (!shareDone) {
    statusTitle = 'Getting album ready for phones';
    statusBody = 'Usually a few minutes — then print or send the QR.';
    statusTone = 'muted';
  } else {
    statusTitle = 'Ready to deliver';
    statusBody = 'Print the QR or send the link.';
    statusTone = 'accent';
  }

  return (
    <AlbumStudioShell
      albumId={id}
      albumName={album.albumName}
      current="share"
      stepLabel="Step 3 · QR"
      action={
        <button
          type="button"
          className="studio-home__btn studio-home__btn--primary album-studio__hero-action"
          disabled={!canShareQr}
          onClick={() => void qrRef.current?.share()}
        >
          <ShareAltOutlined aria-hidden />
          <span className="album-studio__hero-action-label--full">Share QR</span>
          <span className="album-studio__hero-action-label--short">Share</span>
        </button>
      }
      stats={[
        { label: 'Live', value: live, tone: 'live' },
        { label: 'Left', value: studioRemaining, tone: 'accent' },
      ]}
    >
      <div className={`album-details__cta album-details__cta--${statusTone}`}>
        <div>
          <strong>{statusTitle}</strong>
          <p>{statusBody}</p>
        </div>
        {statusAction ? (
          <button
            type="button"
            className="studio-home__btn studio-home__btn--primary"
            disabled={
              statusAction.loading || (statusAction.label === 'Share with client' && !canShare)
            }
            onClick={statusAction.onClick}
          >
            {statusAction.loading ? 'Working…' : statusAction.label}
          </button>
        ) : null}
      </div>

      <div className="album-details__layout">
        <AlbumViewerQrCard
          ref={qrRef}
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
    </AlbumStudioShell>
  );
};
