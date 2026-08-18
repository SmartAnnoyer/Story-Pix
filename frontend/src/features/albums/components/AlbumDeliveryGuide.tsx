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

  const steps: Array<{
    key: DeliveryStepKey;
    n: number;
    label: string;
    hint: string;
    done: boolean;
    path: string;
  }> = [
    {
      key: 'media',
      n: 1,
      label: 'Photos & videos',
      hint: 'Upload the print and the video that plays on it.',
      done: mediaDone,
      path: albumMediaPath(albumId),
    },
    {
      key: 'map',
      n: 2,
      label: 'Map to video',
      hint: 'Choose which video plays when a guest scans that photo.',
      done: mapDone,
      path: albumMapPath(albumId, total > 0),
    },
    {
      key: 'share',
      n: 3,
      label: 'Share',
      hint: 'Turn the album on, then print the QR or send the link.',
      done: shareDone,
      path: albumSharePath(albumId),
    },
  ];

  return (
    <nav className="album-guide" aria-label="How to deliver this album">
      {steps.map((step) => {
        const isCurrent = current === step.key;
        return (
          <button
            key={step.key}
            type="button"
            className={`album-guide__step${isCurrent ? ' album-guide__step--current' : ''}${
              step.done ? ' album-guide__step--done' : ''
            }`}
            onClick={() => {
              if (step.key === 'map' && !mediaDone) {
                navigate(albumMediaPath(albumId));
                return;
              }
              if (step.key === 'share' && !mapDone) {
                navigate(mediaDone ? albumMapPath(albumId, total > 0) : albumMediaPath(albumId));
                return;
              }
              navigate(step.path);
            }}
          >
            <span className="album-guide__n">{step.done ? '✓' : step.n}</span>
            <span>
              <span className="album-guide__label">{step.label}</span>
              <span className="album-guide__hint">{step.hint}</span>
            </span>
          </button>
        );
      })}
    </nav>
  );
};
