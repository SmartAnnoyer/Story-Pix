import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import { useCurrentPlanQuery } from '@/hooks/useSubscriptionQueries';
import { useStudioPackSummaryQuery } from '@/hooks/usePackQueries';
import { RecentAlbumsWidget } from '@/features/albums/components/RecentAlbumsWidget';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { UserRole } from '@/types/auth.types';
import { ROUTES } from '@/routes/paths';
import './DashboardPage.css';

export const DashboardPage = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const { data: summary, isLoading } = useCurrentPlanQuery();
  const { data: packs, isLoading: packsLoading } = useStudioPackSummaryQuery();

  if (user?.role === UserRole.SUPER_ADMIN) {
    return <Navigate to={ROUTES.ADMIN_DASHBOARD} replace />;
  }

  if (isLoading || packsLoading || !summary || !packs) {
    return <LoadingSpinner />;
  }

  const creditsLeft = packs.remainingAlbumCredits;
  const canCreateAlbum = creditsLeft > 0;
  const usedPct =
    packs.totalAssignedCredits > 0
      ? Math.round((packs.usedCredits / packs.totalAssignedCredits) * 100)
      : 0;

  const activePacks = packs.credits.filter((credit) => credit.remainingCredits > 0);
  const usedUpPacks = packs.credits.filter((credit) => credit.remainingCredits <= 0);

  return (
    <div className="studio-home">
      <header className="studio-home__hero">
        <p className="studio-home__eyebrow">Studio</p>
        <h1>Home{user ? `, ${user.firstName}` : ''}</h1>
        <p className="studio-home__lede">
          Make a printed photo play a video. Credits come from packs Story-PIX enables for your
          studio.
        </p>
        <div className="studio-home__actions">
          <button
            type="button"
            className="studio-home__btn studio-home__btn--primary"
            disabled={!canCreateAlbum}
            onClick={() => navigate(ROUTES.ALBUM_CREATE)}
          >
            {canCreateAlbum ? 'New album' : 'No credits left'}
          </button>
          <Link className="studio-home__btn studio-home__btn--ghost" to={ROUTES.ALBUMS}>
            Open albums
          </Link>
        </div>
      </header>

      <section className="studio-home__strip" aria-label="Studio status">
        <article
          className={`studio-home__stat${canCreateAlbum ? ' studio-home__stat--live' : ' studio-home__stat--warn'}`}
        >
          <span className="studio-home__stat-label">Album credits left</span>
          <strong className="studio-home__stat-value">{creditsLeft}</strong>
          <span className="studio-home__stat-meta">
            {canCreateAlbum ? 'Ready to create albums' : 'Ask admin for another pack'}
          </span>
        </article>
        <article className="studio-home__stat">
          <span className="studio-home__stat-label">Credits used</span>
          <strong className="studio-home__stat-value">
            {packs.usedCredits}
            <span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--sh-muted)' }}>
              {' '}
              / {packs.totalAssignedCredits}
            </span>
          </strong>
          <div
            className={`studio-home__meter${usedPct >= 100 ? ' studio-home__meter--warn' : ''}`}
            aria-hidden
          >
            <i style={{ width: `${Math.min(usedPct, 100)}%` }} />
          </div>
          <span className="studio-home__stat-meta">{usedPct}% of assigned credits</span>
        </article>
        <article className="studio-home__stat">
          <span className="studio-home__stat-label">Albums in studio</span>
          <strong className="studio-home__stat-value">{summary.usage.albumCount}</strong>
          <span className="studio-home__stat-meta">Draft and published</span>
        </article>
      </section>

      <section className="studio-home__panel" aria-label="Activated packs">
        <h2>Your activated pack</h2>
        <p className="studio-home__panel-lede">
          Each credit creates one album. Every mapped photo includes 1,000 guest plays — tracked on
          that photo, not as a studio monthly total.
        </p>
        {activePacks.length ? (
          <ul className="studio-home__pack-list">
            {activePacks.map((pack) => (
              <li key={pack.id}>
                <div>
                  <div className="studio-home__pack-name">{pack.packName}</div>
                  <div className="studio-home__pack-meta">
                    Up to {pack.maxMappings} photos ·{' '}
                    {(pack.scansPerMapping ?? 1000).toLocaleString('en-IN')} plays / photo
                  </div>
                  <span className="studio-home__badge">Active</span>
                </div>
                <div className="studio-home__pack-credits">
                  {pack.remainingCredits} left / {pack.totalCredits} credits
                </div>
              </li>
            ))}
          </ul>
        ) : packs.credits.length ? (
          <p className="studio-home__empty">
            All pack credits are used up. Contact Story-PIX to enable Mini, Standard, or a Bundle.
          </p>
        ) : (
          <p className="studio-home__empty">
            No pack enabled yet. Contact Story-PIX admin after offline payment.
          </p>
        )}
        {usedUpPacks.length && activePacks.length ? (
          <p className="studio-home__panel-lede" style={{ marginTop: '0.85rem', marginBottom: 0 }}>
            {usedUpPacks.length} earlier pack{usedUpPacks.length === 1 ? '' : 's'} fully used.
          </p>
        ) : null}
      </section>

      <ol className="studio-home__steps">
        <li className="studio-home__step">
          <strong>1. Create an album</strong>
          <p>Uses 1 pack credit. Photo capacity depends on the pack (10 or 25).</p>
        </li>
        <li className="studio-home__step">
          <strong>2. Map photo to video</strong>
          <p>Upload the print and video, then link them. Guest plays are counted per photo.</p>
        </li>
        <li className="studio-home__step">
          <strong>3. Share the QR</strong>
          <p>Turn the album on. Guests open the link and point at the printed photo.</p>
        </li>
      </ol>

      <div className="studio-home__albums">
        <div className="studio-home__albums-head">
          <h2>Recent albums</h2>
          <Link className="studio-home__text-link" to={ROUTES.ALBUMS}>
            View all
          </Link>
        </div>
        <RecentAlbumsWidget hideHeader />
      </div>
    </div>
  );
};
