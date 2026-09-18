import { Link, Navigate, useNavigate } from 'react-router-dom';
import { BrandLogo } from '@/components/BrandLogo';
import { useAuthStore } from '@/store/auth.store';
import { useStudioPackSummaryQuery } from '@/hooks/usePackQueries';
import { RecentAlbumsWidget } from '@/features/albums/components/RecentAlbumsWidget';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { UserRole } from '@/types/auth.types';
import { ROUTES } from '@/routes/paths';
import './DashboardPage.css';

export const DashboardPage = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const { data: packs, isLoading: packsLoading } = useStudioPackSummaryQuery();

  if (user?.role === UserRole.SUPER_ADMIN) {
    return <Navigate to={ROUTES.ADMIN_DASHBOARD} replace />;
  }

  if (packsLoading || !packs) {
    return <LoadingSpinner />;
  }

  const total = packs.grantedMappingSlots ?? packs.totalAssignedCredits ?? 0;
  const used = packs.usedMappingSlots ?? packs.usedCredits ?? 0;
  const left = packs.remainingMappingSlots ?? packs.remainingAlbumCredits ?? 0;
  const usedPct = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;
  const outOfPhotos = left <= 0;

  return (
    <div className="studio-home studio-home--simple">
      <header className="studio-home__brand-hero">
        <BrandLogo variant="full" height={64} />
        <h1 className="studio-home__hello">Hi{user?.firstName ? `, ${user.firstName}` : ''}</h1>
      </header>

      <button
        type="button"
        className="sp-btn-gradient studio-home__big-cta"
        onClick={() => navigate(ROUTES.ALBUM_CREATE)}
      >
        Make a living photo
      </button>

      <section className="studio-home__plan" aria-label="Your photos">
        <div className="studio-home__plan-head">
          <h2>Your photos</h2>
          <span>
            {used} used · <strong>{left} left</strong>
          </span>
        </div>
        <div
          className={`studio-home__meter${outOfPhotos ? ' studio-home__meter--warn' : ''}`}
          aria-hidden
        >
          <i style={{ width: `${usedPct}%` }} />
        </div>
        <p className="studio-home__plan-total">{total} photos in your plan</p>
      </section>

      <Link
        to={ROUTES.STUDIO_PACKS}
        className={`studio-home__buy-cta${outOfPhotos ? ' studio-home__buy-cta--pulse' : ''}`}
      >
        <span className="studio-home__buy-cta-title">Add living photos →</span>
        <span className="studio-home__buy-cta-sub">Get more photo–video links anytime</span>
      </Link>

      <div className="studio-home__albums">
        <div className="studio-home__albums-head">
          <h2>Your albums</h2>
          <Link className="studio-home__text-link" to={ROUTES.ALBUMS}>
            See all
          </Link>
        </div>
        <RecentAlbumsWidget hideHeader />
      </div>
    </div>
  );
};
