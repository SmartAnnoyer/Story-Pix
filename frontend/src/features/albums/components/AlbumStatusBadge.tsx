import { AlbumStatus } from '@/types/album.types';
import { albumStatusLabel } from '../utils/studio-labels';
import { Tag } from 'antd';

const COLORS: Record<AlbumStatus, string> = {
  [AlbumStatus.DRAFT]: 'default',
  [AlbumStatus.PUBLISHED]: 'success',
  [AlbumStatus.ARCHIVED]: 'warning',
};

export const AlbumStatusBadge = ({ status }: { status: AlbumStatus }) => {
  return <Tag color={COLORS[status] ?? 'default'}>{albumStatusLabel(status)}</Tag>;
};
