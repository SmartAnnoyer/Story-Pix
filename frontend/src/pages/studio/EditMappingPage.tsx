import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { message } from 'antd';
import { MappingForm } from '@/features/ar/components/MappingForm';
import { useAlbumQuery } from '@/hooks/useAlbumQueries';
import { useAlbumMediaQuery } from '@/hooks/useMediaQueries';
import { useArTargetQuery, useUpdateArTargetMutation } from '@/hooks/useArTargetQueries';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ArTargetStatus } from '@/types/ar-target.types';
import { MediaStatus } from '@/types/media.types';
import { ROUTES } from '@/routes/paths';
import { getErrorMessage } from '@/api/client';
import { AlbumDeliveryGuide } from '@/features/albums/components/AlbumDeliveryGuide';
import '@/pages/DashboardPage.css';
import './AlbumStudioPages.css';

export const EditMappingPage = () => {
  const { id = '', mappingId = '' } = useParams();
  const navigate = useNavigate();
  const { data: album, isLoading: albumLoading } = useAlbumQuery(id);
  const { data: mapping, isLoading: mappingLoading } = useArTargetQuery(mappingId);
  const { data: mediaData, isLoading: mediaLoading } = useAlbumMediaQuery(id, { limit: 100 });
  const updateMutation = useUpdateArTargetMutation();

  const readyMedia = useMemo(
    () => (mediaData?.items ?? []).filter((item) => item.status === MediaStatus.READY),
    [mediaData],
  );

  if (albumLoading || mappingLoading || mediaLoading || !album || !mapping) {
    return <LoadingSpinner />;
  }

  if (mapping.status !== ArTargetStatus.DRAFT) {
    return (
      <div className="studio-home album-studio">
        <header className="studio-home__hero">
          <p className="studio-home__eyebrow">Map to video</p>
          <h1>Cannot edit</h1>
        </header>
        <div className="album-studio__notice">
          <strong>Only saved (draft) mappings can be edited</strong>
          <p>Turn this mapping off first, or create a new photo → video pair.</p>
          <button
            type="button"
            className="studio-home__btn studio-home__btn--primary"
            onClick={() => navigate(ROUTES.ALBUM_AR_MAPPINGS.replace(':id', id))}
          >
            Back to mappings
          </button>
        </div>
      </div>
    );
  }

  const handleSubmit = async (values: {
    targetName: string;
    photoMediaId: string;
    videoMediaId: string;
    overlayFrame: { x: number; y: number; width: number; height: number };
  }) => {
    try {
      await updateMutation.mutateAsync({ id: mappingId, payload: values });
      message.success('Mapping updated');
      navigate(ROUTES.ALBUM_AR_MAPPINGS.replace(':id', id));
    } catch (error) {
      message.error(getErrorMessage(error, 'Update failed'));
    }
  };

  return (
    <div className="studio-home album-studio">
      <header className="studio-home__hero">
        <p className="studio-home__eyebrow">Edit mapping</p>
        <h1>{mapping.targetName || album.albumName}</h1>
        <div className="studio-home__actions">
          <button
            type="button"
            className="studio-home__btn studio-home__btn--ghost"
            onClick={() => navigate(ROUTES.ALBUM_AR_MAPPINGS.replace(':id', id))}
          >
            Mappings
          </button>
        </div>
      </header>

      <AlbumDeliveryGuide albumId={id} current="map" />

      <MappingForm
        photos={readyMedia}
        videos={readyMedia}
        singleMapping
        initialValues={{
          targetName: mapping.targetName,
          photoMediaId: mapping.photoMediaId,
          videoMediaId: mapping.videoMediaId,
          overlayFrame: mapping.overlayFrame ?? undefined,
        }}
        loading={updateMutation.isPending}
        submitLabel="Save"
        onSubmit={handleSubmit}
        onCancel={() => navigate(ROUTES.ALBUM_AR_MAPPINGS.replace(':id', id))}
      />
    </div>
  );
};
