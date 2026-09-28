import { useState } from 'react';
import { LinkOutlined, PictureOutlined, VideoCameraOutlined } from '@ant-design/icons';
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
import { RenewPlaysModal, type RenewablePhoto } from '@/features/packs/components/RenewPlaysModal';
import { useAuthStore } from '@/store/auth.store';
import { UserRole } from '@/types/auth.types';
import { ArTargetStatus } from '@/types/ar-target.types';
import { AlbumStudioShell } from '@/features/albums/components/AlbumStudioShell';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ROUTES } from '@/routes/paths';
import { getErrorMessage } from '@/api/client';
import './AlbumStudioPages.css';

export const ArMappingsPage = () => {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { data: album, isLoading: albumLoading } = useAlbumQuery(id);
  const { data: packs } = useStudioPackSummaryQuery();
  const { data, isLoading, refetch } = useAlbumArTargetsQuery(id, { limit: 100 });
  const archiveMutation = useArchiveArTargetMutation();
  const deleteMutation = useDeleteArTargetMutation();
  const canRenew = useAuthStore((s) => s.user?.role === UserRole.STUDIO_ADMIN);
  const [renewIds, setRenewIds] = useState<string[] | null>(null);

  if (albumLoading || !album) return <LoadingSpinner />;

  const mappingCount = data?.items.length ?? 0;
  const renewablePhotos: RenewablePhoto[] = (data?.items ?? [])
    .filter((item) => item.status !== ArTargetStatus.ARCHIVED)
    .map((item) => ({
      id: item.id,
      name: (item.photo?.originalFileName ?? '').replace(/\.[^.]+$/, '').trim() || item.targetName,
      scanUsage: item.scanUsage ?? 0,
      scanLimit: item.scanLimit ?? 1000,
    }));
  const finishedCount = renewablePhotos.filter(
    (photo) => photo.scanUsage >= photo.scanLimit,
  ).length;
  const lowCount = renewablePhotos.filter(
    (photo) => photo.scanUsage < photo.scanLimit && photo.scanUsage >= photo.scanLimit * 0.8,
  ).length;
  const studioRemaining = packs?.remainingMappingSlots ?? packs?.remainingAlbumCredits ?? 0;
  const atMappingCap = studioRemaining <= 0;
  const isEmpty = !isLoading && mappingCount === 0;

  const goLink = () => {
    if (atMappingCap) {
      navigate(ROUTES.STUDIO_PACKS);
      return;
    }
    navigate(ROUTES.ALBUM_AR_MAPPING_CREATE.replace(':id', id));
  };

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

  const shortLabel = atMappingCap ? 'Buy' : isEmpty ? 'Start' : 'Add';
  const fullLabel = atMappingCap ? 'Buy more photos' : isEmpty ? 'Start linking' : 'Link another';

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
          onClick={goLink}
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
        <div className="album-link-coach">
          <div className="album-link-coach__intro">
            <strong>Match each print to its video</strong>
            <p>
              When a guest points their phone at the printed photo, this video plays. Tap Start
              linking, then follow the three steps.
            </p>
          </div>

          <ol className="album-link-coach__steps">
            <li>
              <span className="album-link-coach__icon" aria-hidden>
                <PictureOutlined />
              </span>
              <div>
                <strong>Tap a photo</strong>
                <p>The image you will print for the client.</p>
              </div>
            </li>
            <li>
              <span className="album-link-coach__icon" aria-hidden>
                <VideoCameraOutlined />
              </span>
              <div>
                <strong>Tap a video</strong>
                <p>What plays on their phone when they scan.</p>
              </div>
            </li>
            <li>
              <span className="album-link-coach__icon" aria-hidden>
                <LinkOutlined />
              </span>
              <div>
                <strong>Confirm link</strong>
                <p>Sticky button at the bottom — you can’t miss it.</p>
              </div>
            </li>
          </ol>

          <button
            type="button"
            className="studio-home__btn studio-home__btn--primary album-link-coach__cta"
            disabled={atMappingCap}
            onClick={goLink}
          >
            {atMappingCap ? 'Buy more living photos' : 'Start linking'}
          </button>
        </div>
      ) : (
        <>
          {finishedCount > 0 || lowCount > 0 ? (
            <div
              className={`album-renew-banner${finishedCount ? ' album-renew-banner--over' : ''}`}
              role="status"
            >
              <div>
                <strong>
                  {finishedCount
                    ? `${finishedCount} photo${finishedCount === 1 ? ' has' : 's have'} used all guest plays`
                    : `${lowCount} photo${lowCount === 1 ? ' is' : 's are'} running low on plays`}
                </strong>
                <p>
                  {canRenew
                    ? 'Renew to keep the videos playing — the QR code stays the same.'
                    : 'Ask the studio owner to renew plays so guests can keep watching.'}
                </p>
              </div>
              {canRenew ? (
                <button
                  type="button"
                  className="studio-home__btn studio-home__btn--primary"
                  onClick={() =>
                    setRenewIds(
                      renewablePhotos
                        .filter((photo) => photo.scanUsage >= photo.scanLimit * 0.8)
                        .map((photo) => photo.id),
                    )
                  }
                >
                  Renew plays
                </button>
              ) : null}
            </div>
          ) : null}
          <MappingTable
            items={data?.items ?? []}
            loading={isLoading}
            onRenew={canRenew ? (mappingId) => setRenewIds([mappingId]) : undefined}
            onEdit={(mappingId) =>
              navigate(
                ROUTES.ALBUM_AR_MAPPING_EDIT.replace(':id', id).replace(':mappingId', mappingId),
              )
            }
            onDelete={handleDelete}
            onArchive={handleArchive}
          />
        </>
      )}
      {canRenew ? (
        <RenewPlaysModal
          open={renewIds !== null}
          albumId={id}
          albumName={album.albumName}
          photos={renewablePhotos}
          initialSelectedIds={renewIds ?? []}
          onClose={() => {
            setRenewIds(null);
            void refetch();
          }}
        />
      ) : null}
    </AlbumStudioShell>
  );
};
