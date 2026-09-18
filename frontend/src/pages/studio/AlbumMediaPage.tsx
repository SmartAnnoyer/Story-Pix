import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { message } from 'antd';
import { useAlbumQuery } from '@/hooks/useAlbumQueries';
import { useAlbumMediaQuery, useDeleteMediaMutation } from '@/hooks/useMediaQueries';
import { UploadArea } from '@/features/media/components/UploadArea';
import { UploadProgressList } from '@/features/media/components/UploadProgressList';
import { PhotoGallery } from '@/features/media/components/PhotoGallery';
import { VideoGallery } from '@/features/media/components/VideoGallery';
import { AlbumStudioShell } from '@/features/albums/components/AlbumStudioShell';
import { albumMapPath, getReadyMediaCounts } from '@/features/albums/utils/album-delivery';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { AlbumStatus } from '@/types/album.types';
import { MediaStatus, MediaType } from '@/types/media.types';
import { getErrorMessage } from '@/api/client';
import { useAlbumArTargetsQuery } from '@/hooks/useArTargetQueries';
import './AlbumMediaPage.css';

type MediaTab = 'photos' | 'videos';

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
  const [mediaTab, setMediaTab] = useState<MediaTab>('photos');

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
  const waiting =
    processing ||
    photos.some((item) => item.status !== MediaStatus.READY) ||
    videos.some((item) => item.status !== MediaStatus.READY);
  const showingPhotos = mediaTab === 'photos';

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
    <AlbumStudioShell
      albumId={id}
      albumName={album.albumName}
      current="media"
      stepLabel="Step 1 · Add"
      stats={[
        {
          label: 'Photos',
          value: `${readyPhotos.length}/${photos.length}`,
          tone: canMap ? 'accent' : 'default',
        },
        {
          label: 'Videos',
          value: `${readyVideos.length}/${videos.length}`,
          tone: canMap ? 'accent' : 'default',
        },
      ]}
    >
      <div className="album-media">
        {canMap ? (
          <div className="album-media__cta">
            <div>
              <strong>Ready to link</strong>
              <p>Match each printed photo to the video guests should see when they scan.</p>
            </div>
            <button
              type="button"
              className="studio-home__btn studio-home__btn--primary"
              onClick={() => navigate(albumMapPath(id, (mappings?.items.length ?? 0) > 0))}
            >
              Link photo → video
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

        <div className="album-media__switch" role="tablist" aria-label="Photos or videos">
          <button
            type="button"
            role="tab"
            aria-selected={showingPhotos}
            className={`album-media__switch-tab${showingPhotos ? ' album-media__switch-tab--on' : ''}`}
            onClick={() => setMediaTab('photos')}
          >
            Photos
            <span>{readyPhotos.length}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={!showingPhotos}
            className={`album-media__switch-tab${!showingPhotos ? ' album-media__switch-tab--on' : ''}`}
            onClick={() => setMediaTab('videos')}
          >
            Videos
            <span>{readyVideos.length}</span>
          </button>
        </div>

        <div className="album-media__workspace album-media__workspace--single">
          {showingPhotos ? (
            <section className="album-media__panel" role="tabpanel" aria-label="Photos">
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
          ) : (
            <section className="album-media__panel" role="tabpanel" aria-label="Videos">
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
          )}
        </div>
      </div>
    </AlbumStudioShell>
  );
};
