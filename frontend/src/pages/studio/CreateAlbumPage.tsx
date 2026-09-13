import { useNavigate } from 'react-router-dom';
import { message } from 'antd';
import { AlbumForm } from '@/features/albums/components/AlbumForm';
import { useCreateAlbumMutation } from '@/hooks/useAlbumQueries';
import { useStudioPackSummaryQuery } from '@/hooks/usePackQueries';
import { useAuthStore } from '@/store/auth.store';
import { getErrorMessage } from '@/api/client';
import { ROUTES } from '@/routes/paths';
import type { CreateAlbumPayload } from '@/types/album.types';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { BrandLogo } from '@/components/BrandLogo';
import '../DashboardPage.css';
import './CreateAlbumPage.css';

export const CreateAlbumPage = () => {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const createMutation = useCreateAlbumMutation();
  const { data: packs, isLoading } = useStudioPackSummaryQuery();

  const handleSubmit = async (values: CreateAlbumPayload) => {
    try {
      const album = await createMutation.mutateAsync(values);
      if (!album?.id) {
        message.warning('Album created — open it from Albums.');
        navigate(ROUTES.ALBUMS);
        return;
      }
      message.success('Next: add your photo and video');
      navigate(ROUTES.ALBUM_MEDIA.replace(':id', album.id));
    } catch (error) {
      message.error(getErrorMessage(error, 'Could not create album'));
    }
  };

  if (isLoading) return <LoadingSpinner />;

  const defaultName = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim();

  return (
    <div className="studio-home create-album">
      <header className="create-album__hero">
        <BrandLogo variant="icon" height={48} />
        <h1>New album</h1>
      </header>
      <AlbumForm
        mode="create"
        remainingMappingSlots={packs?.remainingMappingSlots ?? packs?.remainingAlbumCredits}
        initialValues={defaultName ? { customerName: defaultName } : undefined}
        onSubmit={handleSubmit}
        isSubmitting={createMutation.isPending}
      />
    </div>
  );
};
