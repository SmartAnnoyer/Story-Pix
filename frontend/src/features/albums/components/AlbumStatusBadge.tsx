import { Tag } from 'antd';
import { AlbumStatus } from '@/types/album.types';
import { albumStatusLabel } from '../utils/studio-labels';
import './AlbumStatusBadge.css';

export const AlbumStatusBadge = ({ status }: { status: AlbumStatus }) => {
  return (
    <Tag className={`sp-status-badge sp-status-badge--${status}`}>{albumStatusLabel(status)}</Tag>
  );
};
