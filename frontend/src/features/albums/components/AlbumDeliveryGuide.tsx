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
    n: string;
    label: string;
    short: string;
    done: boolean;
    path: string;
  }> = [
    {
      key: 'media',
      n: '1',
      label: 'Add photo & video',
      short: 'Add',
      done: mediaDone,
      path: albumMediaPath(albumId),
    },
    {
      key: 'map',
      n: '2',
      label: 'Match photo → video',
      short: 'Link',
      done: mapDone,
      path: albumMapPath(albumId, total > 0),
    },
    {
      key: 'share',
      n: '3',
      label: 'Get QR',
      short: 'QR',
      done: shareDone,
      path: albumSharePath(albumId),
    },
  ];

  return (
    <nav className="album-tabs" aria-label="3 easy steps">
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
            <span className="album-tabs__n" aria-hidden>
              {tab.done && !isCurrent ? '✓' : tab.n}
            </span>
            <span className="album-tabs__label album-tabs__label--full">{tab.label}</span>
            <span className="album-tabs__label album-tabs__label--short">{tab.short}</span>
          </button>
        );
      })}
    </nav>
  );
};
