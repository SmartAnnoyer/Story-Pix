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

  const albumsLeft = packs.remainingAlbumCredits;
  const canCreateAlbum = albumsLeft > 0;
  const usedPct =
    packs.totalAssignedCredits > 0
      ? Math.round((packs.usedCredits / packs.totalAssignedCredits) * 100)
      : 0;

  return (
    <div className="studio-home">
      <header className="studio-home__hero">
        <p className="studio-home__eyebrow">Studio</p>
        <h1>Hello{user ? `, ${user.firstName}` : ''}</h1>
        <div className="studio-home__actions">
          <button
            type="button"
            className="studio-home__btn studio-home__btn--primary"
            disabled={!canCreateAlbum}
            onClick={() => navigate(ROUTES.ALBUM_CREATE)}
          >
            {canCreateAlbum ? 'Start album' : 'No albums left'}
          </button>
        </div>
      </header>

      <section className="studio-home__strip" aria-label="Studio status">
        <article
          className={`studio-home__stat${canCreateAlbum ? ' studio-home__stat--live' : ' studio-home__stat--warn'}`}
        >
          <span className="studio-home__stat-label">Albums you can create</span>
          <strong className="studio-home__stat-value">{albumsLeft}</strong>
          <span className="studio-home__stat-meta">
            {canCreateAlbum ? 'From your plans' : 'Contact Story-PIX to add more albums'}
          </span>
        </article>
        <article className="studio-home__stat">
          <span className="studio-home__stat-label">Albums used</span>
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
          <span className="studio-home__stat-meta">{usedPct}% of your album allowance</span>
        </article>
        <article className="studio-home__stat">
          <span className="studio-home__stat-label">Albums in studio</span>
          <strong className="studio-home__stat-value">{summary.usage.albumCount}</strong>
          <span className="studio-home__stat-meta">Working on and shared</span>
        </article>
      </section>

      <section className="studio-home__panel" aria-label="Plan status">
        <h2>Your plans</h2>
        {packs.credits.length ? (
          <ul className="studio-home__pack-cards">
            {packs.credits.map((pack) => {
              const used = Math.max(0, pack.totalCredits - pack.remainingCredits);
              const pct = pack.totalCredits > 0 ? Math.round((used / pack.totalCredits) * 100) : 0;
              const active = pack.remainingCredits > 0;
              const views = (pack.scansPerMapping ?? 1000).toLocaleString('en-IN');

              return (
                <li key={pack.id} className="studio-home__pack-card">
                  <div className="studio-home__pack-card-top">
                    <div>
                      <div className="studio-home__pack-name">{pack.packName}</div>
                      <span
                        className={`studio-home__badge${active ? '' : ' studio-home__badge--warn'}`}
                      >
                        {active ? 'Active' : 'Used up'}
                      </span>
                    </div>
                    <div className="studio-home__pack-credits">
                      {pack.remainingCredits} left
                      <span> / {pack.totalCredits}</span>
                    </div>
                  </div>

                  <div
                    className={`studio-home__meter${pct >= 100 ? ' studio-home__meter--warn' : ''}`}
                    aria-hidden
                  >
                    <i style={{ width: `${Math.min(pct, 100)}%` }} />
                  </div>
                  <p className="studio-home__pack-progress">
                    {used} album{used === 1 ? '' : 's'} used · {pack.remainingCredits} still
                    available
                  </p>

                  <div className="studio-home__pack-facts">
                    <div>
                      <span>Albums in this plan</span>
                      <strong>
                        {used} used / {pack.totalCredits} total
                      </strong>
                    </div>
                    <div>
                      <span>Photos per album</span>
                      <strong>Up to {pack.maxMappings}</strong>
                    </div>
                    <div>
                      <span>Guest views per photo</span>
                      <strong>{views}</strong>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="studio-home__empty">
            No plan enabled yet. Contact Story-PIX after payment to unlock albums.
          </p>
        )}
      </section>

      <ol className="studio-home__steps">
        <li className="studio-home__step">
          <strong>1. Start an album</strong>
          <p>Name the event — wedding, birthday, or any shoot you are delivering.</p>
        </li>
        <li className="studio-home__step">
          <strong>2. Link print → video</strong>
          <p>Upload the printed photo and the video that should play on it.</p>
        </li>
        <li className="studio-home__step">
          <strong>3. Share the QR</strong>
          <p>One tap shares with your client. Guests open the link and point at the print.</p>
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
