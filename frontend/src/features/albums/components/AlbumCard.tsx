import { BrandLogo } from '@/components/BrandLogo';
import type { Album } from '@/types/album.types';
import { AlbumStatusBadge } from './AlbumStatusBadge';
import './AlbumCard.css';

interface AlbumCardProps {
  album: Pick<Album, 'id' | 'albumName' | 'status' | 'createdAt'>;
  onClick?: () => void;
}

export const AlbumCard = ({ album, onClick }: AlbumCardProps) => {
  return (
    <button type="button" className="sp-album-card" onClick={onClick}>
      <div className="sp-album-card__cover" aria-hidden>
        <BrandLogo variant="full" height={56} />
      </div>
      <div className="sp-album-card__body">
        <div className="sp-album-card__name">{album.albumName}</div>
        <AlbumStatusBadge status={album.status} />
      </div>
    </button>
  );
};
