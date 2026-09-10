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

  const linkedCountByMediaId = useMemo(() => {
    const counts = new Map<string, number>();
    for (const mapping of mappings?.items ?? []) {
      counts.set(mapping.photoMediaId, (counts.get(mapping.photoMediaId) ?? 0) + 1);
      counts.set(mapping.videoMediaId, (counts.get(mapping.videoMediaId) ?? 0) + 1);
    }
    return counts;
  }, [mappings]);

  if (albumLoading || !album) return <LoadingSpinner />;

  const isArchived = album.status === AlbumStatus.ARCHIVED;
  const canMap = readyPhotos.length > 0 && readyVideos.length > 0;
  const hasMappings = (mappings?.items.length ?? 0) > 0;
  const waiting =
    processing ||
    photos.some((item) => item.status !== MediaStatus.READY) ||
    videos.some((item) => item.status !== MediaStatus.READY);

  const statusLabel = canMap
    ? 'Ready to link'
    : waiting
      ? 'Processing…'
      : photos.length === 0 && videos.length === 0
        ? 'Add photos & videos'
        : photos.length === 0
          ? 'Need a photo'
          : videos.length === 0
            ? 'Need a video'
            : 'Waiting';

  const handleDelete = async (mediaId: string) => {
    const linked = linkedCountByMediaId.get(mediaId) ?? 0;
    try {
      const result = await deleteMutation.mutateAsync(mediaId);
      const removed = result.removedLinks ?? linked;
      message.success(
        removed > 0 ? `Removed — also deleted ${removed} linked print → video` : 'Removed',
      );
      void refetch();
    } catch (error) {
      message.error(getErrorMessage(error, 'Delete failed'));
      throw error;
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
              Link print → video
            </button>
          ) : null}
          <button
            type="button"
            className="studio-home__btn studio-home__btn--ghost"
            onClick={() => navigate(albumSharePath(id))}
          >
            Share
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
            <strong>{hasMappings ? 'Ready to link more' : 'Add a living photo'}</strong>
            <p>
              {hasMappings
                ? 'Link another printed photo to a video, or continue to Share.'
                : 'Next step: connect the print to the video that should play on it.'}
            </p>
          </div>
          <button
            type="button"
            className="studio-home__btn studio-home__btn--primary"
            onClick={() => navigate(albumMapPath(id, hasMappings))}
          >
            {hasMappings ? 'Link another' : 'Link print → video'}
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
                      : 'Wait until uploads finish, then link'}
            </strong>
            <p>The photo is what they print. The video is what plays on the phone.</p>
          </div>
        </div>
      )}

      <div className="album-media__uploads">
        <UploadProgressList />
      </div>

      <div className="album-media__workspace">
        <section className="album-media__panel">
          <div className="album-media__panel-head">
            <div>
              <h2>Printed photos</h2>
              <p>Same image you will print for the client.</p>
            </div>
            <span className="album-media__count">{readyPhotos.length} ready</span>
          </div>
          {isArchived ? (
            <div className="album-media__upload-slot" />
          ) : (
            <div className="album-media__upload-slot">
              <UploadArea
                albumId={id}
                mediaType={MediaType.PHOTO}
                onComplete={() => void refetch()}
              />
            </div>
          )}
          <div className="album-media__gallery">
            <PhotoGallery
              items={photos}
              loading={mediaLoading}
              onDelete={handleDelete}
              getLinkedLinkCount={(mediaId) => linkedCountByMediaId.get(mediaId) ?? 0}
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
          {isArchived ? (
            <div className="album-media__upload-slot" />
          ) : (
            <div className="album-media__upload-slot">
              <UploadArea
                albumId={id}
                mediaType={MediaType.VIDEO}
                onComplete={() => void refetch()}
              />
            </div>
          )}
          <div className="album-media__gallery">
            <VideoGallery
              items={videos}
              loading={mediaLoading}
              onDelete={handleDelete}
              getLinkedLinkCount={(mediaId) => linkedCountByMediaId.get(mediaId) ?? 0}
              onMediaUpdated={() => void refetch()}
            />
          </div>
        </section>
      </div>
    </div>
  );
};
