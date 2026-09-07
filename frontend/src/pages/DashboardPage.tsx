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
            {canCreateAlbum ? 'New album' : 'No credits left'}
          </button>
        </div>
      </header>

      <section className="studio-home__strip" aria-label="Studio status">
        <article
          className={`studio-home__stat${canCreateAlbum ? ' studio-home__stat--live' : ' studio-home__stat--warn'}`}
        >
          <span className="studio-home__stat-label">Albums you can create</span>
          <strong className="studio-home__stat-value">{creditsLeft}</strong>
          <span className="studio-home__stat-meta">
            {canCreateAlbum ? 'From your active packs' : 'No credits left — ask admin'}
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
          <span className="studio-home__stat-meta">{usedPct}% of pack credits used</span>
        </article>
        <article className="studio-home__stat">
          <span className="studio-home__stat-label">Albums in studio</span>
          <strong className="studio-home__stat-value">{summary.usage.albumCount}</strong>
          <span className="studio-home__stat-meta">Draft and published</span>
        </article>
      </section>

      <section className="studio-home__panel" aria-label="Pack status">
        <h2>Your packs</h2>
        {packs.credits.length ? (
          <ul className="studio-home__pack-cards">
            {packs.credits.map((pack) => {
              const used = Math.max(0, pack.totalCredits - pack.remainingCredits);
              const pct = pack.totalCredits > 0 ? Math.round((used / pack.totalCredits) * 100) : 0;
              const active = pack.remainingCredits > 0;
              const plays = (pack.scansPerMapping ?? 1000).toLocaleString('en-IN');

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
                    creatable
                  </p>

                  <div className="studio-home__pack-facts">
                    <div>
                      <span>Albums in this pack</span>
                      <strong>
                        {used} used / {pack.totalCredits} total
                      </strong>
                    </div>
                    <div>
                      <span>Mappings per album</span>
                      <strong>Up to {pack.maxMappings} photos</strong>
                    </div>
                    <div>
                      <span>Guest plays per photo</span>
                      <strong>{plays}</strong>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="studio-home__empty">
            No pack enabled yet. Contact Story-PIX admin after offline payment.
          </p>
        )}
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
