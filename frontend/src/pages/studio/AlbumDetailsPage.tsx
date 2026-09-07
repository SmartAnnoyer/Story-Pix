import { useNavigate, useParams } from 'react-router-dom';
import { Dropdown, message } from 'antd';
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
import '@/pages/DashboardPage.css';
import './AlbumStudioPages.css';
import './AlbumDetailsPage.css';

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
    statusTitle = 'Map to video';
    statusBody = 'Link each printed photo to a video.';
    statusTone = 'muted';
    statusAction = {
      label: 'Map to video',
      onClick: () => navigate(albumMapPath(id, total > 0)),
    };
  } else if (!published) {
    statusTitle = 'Share with client';
    statusBody = 'Turn the album on to unlock the QR.';
    statusTone = 'accent';
    statusAction = {
      label: 'Share with client',
      onClick: () => void handleShare(),
      loading: sharing,
    };
  } else if (!shareDone) {
    statusTitle = 'Preparing scan file';
    statusBody = 'QR appears when this finishes — usually a few minutes.';
    statusTone = 'muted';
  } else {
    statusTitle = 'Ready to deliver';
    statusBody = 'Print the QR or send the link.';
    statusTone = 'accent';
  }

  return (
    <div className="studio-home album-studio album-details">
      <header className="studio-home__hero">
        <p className="studio-home__eyebrow">Album</p>
        <div className="album-details__hero-row">
          <div>
            <h1>{album.albumName}</h1>
            <p className="album-details__client">For {album.customerName}</p>
            <div className="album-details__badge">
              <AlbumStatusBadge status={album.status} />
            </div>
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
            <button type="button" className="studio-home__btn studio-home__btn--ghost">
              More
            </button>
          </Dropdown>
        </div>
      </header>

      <AlbumDeliveryGuide albumId={id} current="share" />

      <section className="album-studio__strip" aria-label="Album capacity">
        <article className="album-studio__stat">
          <span>Pack</span>
          <strong className="album-studio__stat-text">
            {album.packName ?? album.packCode ?? '—'}
          </strong>
        </article>
        <article className="album-studio__stat">
          <span>Photos max</span>
          <strong>{album.maxMappings ?? 25}</strong>
        </article>
        <article className="album-studio__stat">
          <span>Plays used</span>
          <strong>
            {(album.scanUsage ?? 0).toLocaleString('en-IN')}
            <small>
              {' '}
              /{' '}
              {((album.scansPerMapping ?? 1000) * (album.maxMappings ?? 25)).toLocaleString(
                'en-IN',
              )}
            </small>
          </strong>
        </article>
      </section>

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
