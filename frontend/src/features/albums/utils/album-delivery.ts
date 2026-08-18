import { ROUTES } from '@/routes/paths';
import { AlbumStatus, type Album } from '@/types/album.types';
import { ArTargetStatus, type ArTarget } from '@/types/ar-target.types';
import { MediaStatus, MediaType, type MediaItem } from '@/types/media.types';

export type DeliveryStepKey = 'media' | 'map' | 'share';

export const getReadyMediaCounts = (items: MediaItem[] = []) => {
  const photos = items.filter((item) => item.mediaType === MediaType.PHOTO);
  const videos = items.filter((item) => item.mediaType === MediaType.VIDEO);
  return {
    photos,
    videos,
    readyPhotos: photos.filter((item) => item.status === MediaStatus.READY),
    readyVideos: videos.filter((item) => item.status === MediaStatus.READY),
    processing: items.some(
      (item) => item.status === MediaStatus.PROCESSING || item.status === MediaStatus.UPLOADING,
    ),
  };
};

export const getMappingCounts = (items: ArTarget[] = []) => ({
  total: items.length,
  live: items.filter((item) => item.status === ArTargetStatus.ACTIVE).length,
  drafts: items.filter((item) => item.status === ArTargetStatus.DRAFT),
});

export const getDeliveryProgress = ({
  readyPhotoCount,
  readyVideoCount,
  liveMappingCount,
  album,
}: {
  readyPhotoCount: number;
  readyVideoCount: number;
  liveMappingCount: number;
  album?: Pick<Album, 'status' | 'arScanFileReady'> | null;
}) => {
  const mediaDone = readyPhotoCount > 0 && readyVideoCount > 0;
  const mapDone = liveMappingCount > 0;
  const published = album?.status === AlbumStatus.PUBLISHED;
  const shareDone = Boolean(published && album?.arScanFileReady);
  const next: DeliveryStepKey = !mediaDone ? 'media' : !mapDone ? 'map' : 'share';

  return { mediaDone, mapDone, published, shareDone, next };
};

export const albumMediaPath = (albumId: string) => ROUTES.ALBUM_MEDIA.replace(':id', albumId);

export const albumSharePath = (albumId: string) => ROUTES.ALBUM_DETAILS.replace(':id', albumId);

export const albumMapPath = (albumId: string, hasMappings: boolean) =>
  (hasMappings ? ROUTES.ALBUM_AR_MAPPINGS : ROUTES.ALBUM_AR_MAPPING_CREATE).replace(':id', albumId);
