import { AlbumStatus } from '@/types/album.types';

/** Studio-facing album status (avoid CMS jargon). */
export const albumStatusLabel = (status: AlbumStatus): string => {
  if (status === AlbumStatus.PUBLISHED) return 'Shared';
  if (status === AlbumStatus.ARCHIVED) return 'Archived';
  return 'Working on';
};

export const albumStatusFilterLabel = (status: AlbumStatus): string => {
  if (status === AlbumStatus.PUBLISHED) return 'Shared with client';
  if (status === AlbumStatus.ARCHIVED) return 'Archived';
  return 'Working on';
};
