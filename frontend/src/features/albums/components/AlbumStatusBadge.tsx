import { Tag } from 'antd';
import { AlbumStatus } from '@/types/album.types';

const CONFIG: Record<AlbumStatus, { color: string; label: string }> = {
  [AlbumStatus.DRAFT]: { color: 'default', label: 'Draft' },
  [AlbumStatus.PUBLISHED]: { color: 'success', label: 'Published' },
  [AlbumStatus.ARCHIVED]: { color: 'warning', label: 'Archived' },
};

export const AlbumStatusBadge = ({ status }: { status: AlbumStatus }) => {
  const config = CONFIG[status] ?? { color: 'default', label: status };
  return <Tag color={config.color}>{config.label}</Tag>;
};
