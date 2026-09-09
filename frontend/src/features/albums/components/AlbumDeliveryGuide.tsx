import { useNavigate } from 'react-router-dom';
import { useAlbumQuery } from '@/hooks/useAlbumQueries';
import { useAlbumMediaQuery } from '@/hooks/useMediaQueries';
import { useAlbumArTargetsQuery } from '@/hooks/useArTargetQueries';
import type { DeliveryStepKey } from '../utils/album-delivery';
import {
  albumMapPath,
  albumMediaPath,
  albumSharePath,
  getDeliveryProgress,
  getMappingCounts,
  getReadyMediaCounts,
} from '../utils/album-delivery';
import './AlbumDeliveryGuide.css';

interface AlbumDeliveryGuideProps {
  albumId: string;
  current: DeliveryStepKey;
}

export const AlbumDeliveryGuide = ({ albumId, current }: AlbumDeliveryGuideProps) => {
  const navigate = useNavigate();
  const { data: album } = useAlbumQuery(albumId);
  const { data: media } = useAlbumMediaQuery(albumId, { limit: 100 });
  const { data: mappings } = useAlbumArTargetsQuery(albumId, { limit: 100 });

  const { readyPhotos, readyVideos } = getReadyMediaCounts(media?.items);
  const { live, total } = getMappingCounts(mappings?.items);
  const { mediaDone, mapDone, shareDone } = getDeliveryProgress({
    readyPhotoCount: readyPhotos.length,
    readyVideoCount: readyVideos.length,
    liveMappingCount: live,
    album,
  });

  const tabs: Array<{
    key: DeliveryStepKey;
    label: string;
    done: boolean;
    path: string;
  }> = [
    {
      key: 'media',
      label: 'Photos & videos',
      done: mediaDone,
      path: albumMediaPath(albumId),
    },
    {
      key: 'map',
      label: 'Link print → video',
      done: mapDone,
      path: albumMapPath(albumId, total > 0),
    },
    {
      key: 'share',
      label: 'Share',
      done: shareDone,
      path: albumSharePath(albumId),
    },
  ];

  return (
    <nav className="album-tabs" aria-label="Album sections">
      {tabs.map((tab) => {
        const isCurrent = current === tab.key;
        return (
          <button
            key={tab.key}
            type="button"
            className={`album-tabs__tab${isCurrent ? ' album-tabs__tab--on' : ''}${
              tab.done && !isCurrent ? ' album-tabs__tab--done' : ''
            }`}
            onClick={() => {
              if (tab.key === 'map' && !mediaDone) {
                navigate(albumMediaPath(albumId));
                return;
              }
              if (tab.key === 'share' && !mapDone) {
                navigate(mediaDone ? albumMapPath(albumId, total > 0) : albumMediaPath(albumId));
                return;
              }
              navigate(tab.path);
            }}
          >
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
};
