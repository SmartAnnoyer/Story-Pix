import { Card, Typography } from 'antd';
import type { Album } from '@/types/album.types';
import { AlbumStatusBadge } from './AlbumStatusBadge';
import { EventTypeBadge } from './EventTypeBadge';

const { Text } = Typography;

interface AlbumCardProps {
  album: Pick<Album, 'id' | 'albumName' | 'coverImage' | 'eventType' | 'status' | 'createdAt'>;
  onClick?: () => void;
}

export const AlbumCard = ({ album, onClick }: AlbumCardProps) => {
  return (
    <Card hoverable={Boolean(onClick)} className="h-full overflow-hidden" onClick={onClick}>
      <div className="mb-3 aspect-video overflow-hidden rounded-md bg-gray-100">
        {album.coverImage ? (
          <img src={album.coverImage} alt={album.albumName} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-gray-400">No cover</div>
        )}
      </div>
      <div className="font-medium">{album.albumName}</div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <EventTypeBadge eventType={album.eventType} />
        <AlbumStatusBadge status={album.status} />
      </div>
      {album.createdAt ? (
        <Text type="secondary" className="mt-2 block text-xs">
          {new Date(album.createdAt).toLocaleDateString()}
        </Text>
      ) : null}
    </Card>
  );
};
