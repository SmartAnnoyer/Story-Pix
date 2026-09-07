import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { message } from 'antd';
import {
  useAlbumArTargetsQuery,
  useArchiveArTargetMutation,
  useDeleteArTargetMutation,
  usePublishArTargetMutation,
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
  const publishMutation = usePublishArTargetMutation();
  const archiveMutation = useArchiveArTargetMutation();
  const deleteMutation = useDeleteArTargetMutation();

  if (albumLoading || !album) return <LoadingSpinner />;

  if (!isLoading && (data?.items.length ?? 0) === 0) {
    return <Navigate to={ROUTES.ALBUM_AR_MAPPING_CREATE.replace(':id', id)} replace />;
  }

  const mappingCount = data?.items.length ?? 0;
  const maxMappings = album.maxMappings ?? MAX_AR_ITEMS_PER_ALBUM;
  const atMappingCap = mappingCount >= maxMappings;
  const liveCount = (data?.items ?? []).filter(
    (item) => item.status === ArTargetStatus.ACTIVE,
  ).length;

  const handlePublish = async (mappingId: string) => {
    try {
      await publishMutation.mutateAsync(mappingId);
      message.success('This photo is now live for guests');
      void refetch();
    } catch (error) {
      message.error(getErrorMessage(error, 'Could not turn on'));
    }
  };

  const handleArchive = async (mappingId: string) => {
    try {
      await archiveMutation.mutateAsync(mappingId);
      message.success('Turned off');
      void refetch();
    } catch (error) {
      message.error(getErrorMessage(error, 'Could not turn off'));
    }
  };

  const handleDelete = async (mappingId: string) => {
    try {
      await deleteMutation.mutateAsync(mappingId);
      message.success('Removed');
      void refetch();
    } catch (error) {
      message.error(getErrorMessage(error, 'Delete failed'));
    }
  };

  return (
    <div className="studio-home album-studio">
      <header className="studio-home__hero">
        <p className="studio-home__eyebrow">Map to video</p>
        <h1>{album.albumName}</h1>
        <div className="studio-home__actions">
          <button
            type="button"
            className="studio-home__btn studio-home__btn--primary"
            disabled={atMappingCap}
            onClick={() => navigate(ROUTES.ALBUM_AR_MAPPING_CREATE.replace(':id', id))}
          >
            {atMappingCap ? `Limit reached (${maxMappings})` : 'Map another photo'}
          </button>
          <button
            type="button"
            className="studio-home__btn studio-home__btn--ghost"
            onClick={() => navigate(albumSharePath(id))}
          >
            Album
          </button>
        </div>
      </header>

      <section className="album-studio__strip" aria-label="Mapping status">
        <article className="album-studio__stat">
          <span>Mapped</span>
          <strong>
            {mappingCount}
            <small> / {maxMappings}</small>
          </strong>
        </article>
        <article className="album-studio__stat album-studio__stat--live">
          <span>Live</span>
          <strong>{liveCount}</strong>
        </article>
        <article className="album-studio__stat">
          <span>Plays / photo</span>
          <strong>{(album.scansPerMapping ?? 1000).toLocaleString('en-IN')}</strong>
        </article>
      </section>

      <AlbumDeliveryGuide albumId={id} current="map" />

      <MappingTable
        items={data?.items ?? []}
        loading={isLoading}
        onEdit={(mappingId) =>
          navigate(ROUTES.ALBUM_AR_MAPPING_EDIT.replace(':id', id).replace(':mappingId', mappingId))
        }
        onDelete={handleDelete}
        onPublish={handlePublish}
        onArchive={handleArchive}
      />
    </div>
  );
};
