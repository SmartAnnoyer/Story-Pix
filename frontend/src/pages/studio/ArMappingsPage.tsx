import { useNavigate, useParams } from 'react-router-dom';
import { message } from 'antd';
import {
  useAlbumArTargetsQuery,
  useArchiveArTargetMutation,
  useDeleteArTargetMutation,
} from '@/hooks/useArTargetQueries';
import { useAlbumQuery } from '@/hooks/useAlbumQueries';
import { MappingTable } from '@/features/ar/components/MappingTable';
import { AlbumDeliveryGuide } from '@/features/albums/components/AlbumDeliveryGuide';
import { albumSharePath } from '@/features/albums/utils/album-delivery';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ROUTES } from '@/routes/paths';
import { getErrorMessage } from '@/api/client';
import { MAX_AR_ITEMS_PER_ALBUM } from '@/features/media/utils/media-limits';
import { ArTargetStatus } from '@/types/ar-target.types';
import '@/pages/DashboardPage.css';
import './AlbumStudioPages.css';

export const ArMappingsPage = () => {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { data: album, isLoading: albumLoading } = useAlbumQuery(id);
  const { data, isLoading, refetch } = useAlbumArTargetsQuery(id, { limit: 100 });
  const archiveMutation = useArchiveArTargetMutation();
  const deleteMutation = useDeleteArTargetMutation();

  if (albumLoading || !album) return <LoadingSpinner />;

  const mappingCount = data?.items.length ?? 0;
  const maxMappings = album.maxMappings ?? MAX_AR_ITEMS_PER_ALBUM;
  const atMappingCap = mappingCount >= maxMappings;
  const liveCount = (data?.items ?? []).filter(
    (item) => item.status === ArTargetStatus.ACTIVE,
  ).length;
  const isEmpty = !isLoading && mappingCount === 0;

  const handleArchive = async (mappingId: string) => {
    try {
      await archiveMutation.mutateAsync(mappingId);
      message.success('Hidden from guests');
      void refetch();
    } catch (error) {
      message.error(getErrorMessage(error, 'Could not hide'));
    }
  };

  const handleDelete = async (mappingId: string) => {
    try {
      await deleteMutation.mutateAsync(mappingId);
      message.success('Removed');
      void refetch();
    } catch (error) {
      message.error(getErrorMessage(error, 'Delete failed'));
      throw error;
    }
  };

  return (
    <div className="studio-home album-studio">
      <header className="studio-home__hero">
        <p className="studio-home__eyebrow">Link print → video</p>
        <h1>{album.albumName}</h1>
        <div className="studio-home__actions">
          <button
            type="button"
            className="studio-home__btn studio-home__btn--primary"
            disabled={atMappingCap}
            onClick={() => navigate(ROUTES.ALBUM_AR_MAPPING_CREATE.replace(':id', id))}
          >
            {atMappingCap
              ? `Album full (${maxMappings} photos)`
              : isEmpty
                ? 'Link your first photo'
                : 'Link another photo'}
          </button>
          <button
            type="button"
            className="studio-home__btn studio-home__btn--ghost"
            onClick={() => navigate(albumSharePath(id))}
          >
            Share
          </button>
        </div>
      </header>

      <section className="album-studio__strip" aria-label="Link status">
        <article className="album-studio__stat">
          <span>Linked</span>
          <strong>
            {mappingCount}
            <small> / {maxMappings}</small>
          </strong>
        </article>
        <article className="album-studio__stat album-studio__stat--live">
          <span>Live for guests</span>
          <strong>{liveCount}</strong>
        </article>
        <article className="album-studio__stat">
          <span>Views / photo</span>
          <strong>{(album.scansPerMapping ?? 1000).toLocaleString('en-IN')}</strong>
        </article>
      </section>

      <AlbumDeliveryGuide albumId={id} current="map" />

      {isEmpty ? (
        <div className="album-studio__notice">
          <strong>Link your first photo</strong>
          <p>
            Choose the printed photo and the video that should play when guests point their phone at
            it.
          </p>
          <button
            type="button"
            className="studio-home__btn studio-home__btn--primary"
            onClick={() => navigate(ROUTES.ALBUM_AR_MAPPING_CREATE.replace(':id', id))}
          >
            Link print → video
          </button>
        </div>
      ) : (
        <MappingTable
          items={data?.items ?? []}
          loading={isLoading}
          onEdit={(mappingId) =>
            navigate(
              ROUTES.ALBUM_AR_MAPPING_EDIT.replace(':id', id).replace(':mappingId', mappingId),
            )
          }
          onDelete={handleDelete}
          onArchive={handleArchive}
        />
      )}
    </div>
  );
};
