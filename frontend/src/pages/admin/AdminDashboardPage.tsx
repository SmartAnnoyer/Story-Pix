import { Link } from 'react-router-dom';
import { useAdminDashboardQuery } from '@/hooks/useStudioQueries';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ROUTES } from '@/routes/paths';
import './AdminDashboardPage.css';

export const AdminDashboardPage = () => {
  const { data, isLoading, isError } = useAdminDashboardQuery();

  if (isLoading) return <LoadingSpinner />;
  if (isError || !data) {
    return <p className="admin-home__error">Unable to load dashboard statistics.</p>;
  }

  const studioTotal = Math.max(data.totalStudios, 1);
  const activePct = Math.round((data.activeStudios / studioTotal) * 100);
  const suspendedPct = Math.round((data.suspendedStudios / studioTotal) * 100);

  return (
    <div className="admin-home">
      <header className="admin-home__hero">
        <div className="admin-home__hero-glow" aria-hidden />
        <p className="admin-home__eyebrow">Overview</p>
        <h1>Home</h1>
        <p className="admin-home__lede">
          Studio status, storage, and scan volume across the platform.
        </p>
        <div className="admin-home__actions">
          <Link className="admin-home__btn admin-home__btn--primary" to={ROUTES.STUDIOS}>
            Manage studios
          </Link>
          <Link className="admin-home__btn admin-home__btn--ghost" to={ROUTES.CATALOG}>
            Album packs
          </Link>
        </div>
      </header>

      <section className="admin-home__strip" aria-label="Studio status">
        <article className="admin-home__stat admin-home__stat--ink">
          <span className="admin-home__stat-label">Studios</span>
          <strong className="admin-home__stat-value">{data.totalStudios}</strong>
          <span className="admin-home__stat-meta">All accounts</span>
        </article>
        <article className="admin-home__stat admin-home__stat--live">
          <span className="admin-home__stat-label">Active</span>
          <strong className="admin-home__stat-value">{data.activeStudios}</strong>
          <div className="admin-home__meter" aria-hidden>
            <i style={{ width: `${activePct}%` }} />
          </div>
          <span className="admin-home__stat-meta">{activePct}% of network</span>
        </article>
        <article className="admin-home__stat admin-home__stat--warn">
          <span className="admin-home__stat-label">Suspended</span>
          <strong className="admin-home__stat-value">{data.suspendedStudios}</strong>
          <div className="admin-home__meter admin-home__meter--warn" aria-hidden>
            <i style={{ width: `${suspendedPct}%` }} />
          </div>
          <span className="admin-home__stat-meta">{suspendedPct}% paused</span>
        </article>
      </section>

      <section className="admin-home__grid admin-home__grid--two">
        <article className="admin-home__panel admin-home__panel--wide">
          <h2>Usage now</h2>
          <div className="admin-home__usage">
            <div>
              <span>Storage</span>
              <strong>
                {data.totalStorageUsedGB.toFixed(2)} <small>GB</small>
              </strong>
            </div>
            <div>
              <span>Monthly scans</span>
              <strong>{data.totalMonthlyScans.toLocaleString('en-IN')}</strong>
            </div>
          </div>
        </article>

        <article className="admin-home__panel admin-home__panel--cta">
          <h2>Album packs</h2>
          <p>Enable Mini, Standard, or Bundle packs on a studio after offline payment.</p>
          <div className="admin-home__actions">
            <Link
              className="admin-home__btn admin-home__btn--light"
              to={`${ROUTES.CATALOG}?tab=history`}
            >
              Pack history
            </Link>
            <Link className="admin-home__btn admin-home__btn--ghost-light" to={ROUTES.CATALOG}>
              Catalog
            </Link>
          </div>
        </article>
      </section>
    </div>
  );
};
