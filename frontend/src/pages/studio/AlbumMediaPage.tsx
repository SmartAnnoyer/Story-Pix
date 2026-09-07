import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { message } from 'antd';
import { useAlbumQuery } from '@/hooks/useAlbumQueries';
import { useAlbumMediaQuery, useDeleteMediaMutation } from '@/hooks/useMediaQueries';
import { UploadArea } from '@/features/media/components/UploadArea';
import { UploadProgressList } from '@/features/media/components/UploadProgressList';
import { PhotoGallery } from '@/features/media/components/PhotoGallery';
import { VideoGallery } from '@/features/media/components/VideoGallery';
import { AlbumDeliveryGuide } from '@/features/albums/components/AlbumDeliveryGuide';
import {
  albumMapPath,
  albumSharePath,
  getReadyMediaCounts,
} from '@/features/albums/utils/album-delivery';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { AlbumStatus } from '@/types/album.types';
import { MediaStatus, MediaType } from '@/types/media.types';
import { getErrorMessage } from '@/api/client';
import { useAlbumArTargetsQuery } from '@/hooks/useArTargetQueries';
import '@/pages/DashboardPage.css';
import './AlbumStudioPages.css';
import './AlbumMediaPage.css';

export const AlbumMediaPage = () => {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { data: album, isLoading: albumLoading } = useAlbumQuery(id);
  const {
    data: mediaData,
    isLoading: mediaLoading,
    refetch,
  } = useAlbumMediaQuery(id, { limit: 100 });
  const { data: mappings } = useAlbumArTargetsQuery(id, { limit: 100 });
  const deleteMutation = useDeleteMediaMutation();

  const { photos, videos, readyPhotos, readyVideos, processing } = useMemo(
    () => getReadyMediaCounts(mediaData?.items),
    [mediaData],
  );

  if (albumLoading || !album) return <LoadingSpinner />;

  const isArchived = album.status === AlbumStatus.ARCHIVED;
  const canMap = readyPhotos.length > 0 && readyVideos.length > 0;
  const hasMappings = (mappings?.items.length ?? 0) > 0;
  const waiting =
    processing ||
    photos.some((item) => item.status !== MediaStatus.READY) ||
    videos.some((item) => item.status !== MediaStatus.READY);

  const statusLabel = canMap
    ? 'Ready to map'
    : waiting
      ? 'Processing…'
      : photos.length === 0 && videos.length === 0
        ? 'Add media'
        : photos.length === 0
          ? 'Need a photo'
          : videos.length === 0
            ? 'Need a video'
            : 'Waiting';

  const handleDelete = async (mediaId: string) => {
    try {
      await deleteMutation.mutateAsync(mediaId);
      message.success('Removed');
      void refetch();
    } catch (error) {
      message.error(getErrorMessage(error, 'Delete failed'));
    }
  };

  return (
    <div className="studio-home album-studio album-media">
      <header className="studio-home__hero">
        <p className="studio-home__eyebrow">Photos & videos</p>
        <h1>{album.albumName}</h1>
        <div className="studio-home__actions">
          {canMap ? (
            <button
              type="button"
              className="studio-home__btn studio-home__btn--primary"
              onClick={() => navigate(albumMapPath(id, hasMappings))}
            >
              Map to video
            </button>
          ) : null}
          <button
            type="button"
            className="studio-home__btn studio-home__btn--ghost"
            onClick={() => navigate(albumSharePath(id))}
          >
            Album
          </button>
        </div>
      </header>

      <section className="album-studio__strip" aria-label="Media status">
        <article className="album-studio__stat">
          <span>Photos ready</span>
          <strong>
            {readyPhotos.length}
            <small> / {photos.length}</small>
          </strong>
        </article>
        <article className="album-studio__stat">
          <span>Videos ready</span>
          <strong>
            {readyVideos.length}
            <small> / {videos.length}</small>
          </strong>
        </article>
        <article className={`album-studio__stat${canMap ? ' album-studio__stat--accent' : ''}`}>
          <span>Status</span>
          <strong className="album-studio__stat-text">{statusLabel}</strong>
        </article>
      </section>

      <AlbumDeliveryGuide albumId={id} current="media" />

      {canMap ? (
        <div className="album-media__cta">
          <div>
            <strong>Ready for mapping</strong>
            <p>Choose which video plays when a guest scans each printed photo.</p>
          </div>
          <button
            type="button"
            className="studio-home__btn studio-home__btn--primary"
            onClick={() => navigate(albumMapPath(id, hasMappings))}
          >
            Continue to map
          </button>
        </div>
      ) : (
        <div className="album-media__cta album-media__cta--muted">
          <div>
            <strong>
              {photos.length === 0 && videos.length === 0
                ? 'Upload the print and the video'
                : photos.length === 0
                  ? 'Add the printed photo next'
                  : videos.length === 0
                    ? 'Add the video next'
                    : waiting
                      ? 'Wait until uploads finish'
                      : 'Finish processing before mapping'}
            </strong>
            <p>The photo is what they print. The video is what plays on scan.</p>
          </div>
        </div>
      )}

      <div className="album-media__workspace">
        <section className="album-media__panel">
          <div className="album-media__panel-head">
            <div>
              <h2>Printed photos</h2>
              <p>Same image you will print for the client.</p>
            </div>
            <span className="album-media__count">{readyPhotos.length} ready</span>
          </div>
          {isArchived ? null : (
            <UploadArea
              albumId={id}
              mediaType={MediaType.PHOTO}
              onComplete={() => void refetch()}
            />
          )}
          <div className="album-media__gallery">
            <PhotoGallery
              items={photos}
              loading={mediaLoading}
              onDelete={handleDelete}
              onMediaUpdated={() => void refetch()}
            />
          </div>
        </section>

        <section className="album-media__panel">
          <div className="album-media__panel-head">
            <div>
              <h2>Videos</h2>
              <p>Plays on the photo in the guest’s camera.</p>
            </div>
            <span className="album-media__count">{readyVideos.length} ready</span>
          </div>
          {isArchived ? null : (
            <UploadArea
              albumId={id}
              mediaType={MediaType.VIDEO}
              onComplete={() => void refetch()}
            />
          )}
          <div className="album-media__gallery">
            <VideoGallery
              items={videos}
              loading={mediaLoading}
              onDelete={handleDelete}
              onMediaUpdated={() => void refetch()}
            />
          </div>
        </section>
      </div>

      <div className="album-media__uploads">
        <UploadProgressList />
      </div>
    </div>
  );
};
