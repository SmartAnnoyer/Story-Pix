import { LinkOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { message } from 'antd';
import {
  useAlbumArTargetsQuery,
  useArchiveArTargetMutation,
  useDeleteArTargetMutation,
} from '@/hooks/useArTargetQueries';
import { useAlbumQuery } from '@/hooks/useAlbumQueries';
import { useStudioPackSummaryQuery } from '@/hooks/usePackQueries';
import { MappingTable } from '@/features/ar/components/MappingTable';
import { AlbumStudioShell } from '@/features/albums/components/AlbumStudioShell';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ROUTES } from '@/routes/paths';
import { getErrorMessage } from '@/api/client';

export const ArMappingsPage = () => {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { data: album, isLoading: albumLoading } = useAlbumQuery(id);
  const { data: packs } = useStudioPackSummaryQuery();
  const { data, isLoading, refetch } = useAlbumArTargetsQuery(id, { limit: 100 });
  const archiveMutation = useArchiveArTargetMutation();
  const deleteMutation = useDeleteArTargetMutation();

  if (albumLoading || !album) return <LoadingSpinner />;

  const mappingCount = data?.items.length ?? 0;
  const studioRemaining = packs?.remainingMappingSlots ?? packs?.remainingAlbumCredits ?? 0;
  const atMappingCap = studioRemaining <= 0;
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

  const shortLabel = atMappingCap ? 'Buy' : 'Link';
  const fullLabel = atMappingCap
    ? 'Buy more photos'
    : isEmpty
      ? 'Link photo'
      : 'Link another photo';

  return (
    <AlbumStudioShell
      albumId={id}
      albumName={album.albumName}
      current="map"
      stepLabel="Step 2 · Link"
      action={
        <button
          type="button"
          className="studio-home__btn studio-home__btn--primary album-studio__hero-action"
          disabled={atMappingCap}
          onClick={() => navigate(ROUTES.ALBUM_AR_MAPPING_CREATE.replace(':id', id))}
        >
          <LinkOutlined aria-hidden />
          <span className="album-studio__hero-action-label--full">{fullLabel}</span>
          <span className="album-studio__hero-action-label--short">{shortLabel}</span>
        </button>
      }
      stats={[
        { label: 'Linked', value: mappingCount },
        { label: 'Left', value: studioRemaining, tone: 'accent' },
      ]}
    >
      {isEmpty ? (
        <div className="album-studio__notice">
          <strong>Link your first photo</strong>
          <p>
            Choose the printed photo and the video that should play when guests point their phone at
            it.
          </p>
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
    </AlbumStudioShell>
  );
};
