import type { ReactNode } from 'react';
import { AlbumDeliveryGuide } from '@/features/albums/components/AlbumDeliveryGuide';
import type { DeliveryStepKey } from '@/features/albums/utils/album-delivery';
import '@/pages/DashboardPage.css';
import '@/pages/studio/AlbumStudioPages.css';

export type AlbumStudioStat = {
  label: string;
  value: ReactNode;
  tone?: 'default' | 'accent' | 'live';
};

interface AlbumStudioShellProps {
  albumId: string;
  albumName: string;
  current: DeliveryStepKey;
  stepLabel: string;
  action?: ReactNode;
  stats: [AlbumStudioStat, AlbumStudioStat];
  children: ReactNode;
}

/** Shared Add / Link / QR chrome so tab position stays stable across steps. */
export const AlbumStudioShell = ({
  albumId,
  albumName,
  current,
  stepLabel,
  action,
  stats,
  children,
}: AlbumStudioShellProps) => {
  return (
    <div className="studio-home album-studio">
      <header className="album-studio__hero">
        <p className="studio-home__eyebrow">{stepLabel}</p>
        <div className="album-studio__title-row">
          <h1 className="album-studio__title">{albumName}</h1>
          <div className="album-studio__title-action">{action ?? null}</div>
        </div>
      </header>

      <AlbumDeliveryGuide albumId={albumId} current={current} />

      <section className="album-studio__strip album-studio__strip--inline" aria-label="Status">
        <p className="album-studio__inline-stats">
          <span>
            {stats[0].label} <strong className={statClass(stats[0].tone)}>{stats[0].value}</strong>
          </span>
          <span aria-hidden>·</span>
          <span>
            {stats[1].label} <strong className={statClass(stats[1].tone)}>{stats[1].value}</strong>
          </span>
        </p>
      </section>

      <div className="album-studio__body">{children}</div>
    </div>
  );
};

function statClass(tone?: AlbumStudioStat['tone']) {
  if (tone === 'accent') return 'album-studio__stat-value--accent';
  if (tone === 'live') return 'album-studio__stat-value--live';
  return undefined;
}
