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
import { AlbumDeliveryGuide } from '@/features/albums/components/AlbumDeliveryGuide';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ROUTES } from '@/routes/paths';
import { getErrorMessage } from '@/api/client';
import { ArTargetStatus } from '@/types/ar-target.types';
import '@/pages/DashboardPage.css';
import './AlbumStudioPages.css';

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

  const linkLabel = atMappingCap
    ? 'Buy more photos first'
    : isEmpty
      ? 'Link photo + video'
      : 'Link another photo';

  return (
    <div className="studio-home album-studio">
      <header className="studio-home__hero album-studio__hero-row">
        <div className="album-studio__hero-copy">
          <p className="studio-home__eyebrow">Step 2 · Link</p>
          <h1>{album.albumName}</h1>
        </div>
        <button
          type="button"
          className="studio-home__btn studio-home__btn--primary album-studio__hero-action"
          disabled={atMappingCap}
          onClick={() => navigate(ROUTES.ALBUM_AR_MAPPING_CREATE.replace(':id', id))}
        >
          <LinkOutlined aria-hidden />
          {linkLabel}
        </button>
      </header>

      <section className="album-studio__strip album-studio__strip--inline" aria-label="Link status">
        <p className="album-studio__inline-stats">
          <span>
            Linked <strong>{mappingCount}</strong>
          </span>
          <span aria-hidden>·</span>
          <span>
            <strong>{studioRemaining}</strong> left in studio
          </span>
          <span aria-hidden>·</span>
          <span>
            Live <strong className="album-studio__live">{liveCount}</strong>
          </span>
        </p>
      </section>

      <AlbumDeliveryGuide albumId={id} current="map" />

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
    </div>
  );
};
