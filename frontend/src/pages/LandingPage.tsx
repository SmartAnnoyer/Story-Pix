import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { BrandLogo } from '@/components/BrandLogo';
import { prefetchPublicCatalog } from '@/hooks/usePackQueries';
import { useAuthStore } from '@/store/auth.store';
import { UserRole } from '@/types/auth.types';
import { ROUTES } from '@/routes/paths';
import { brand } from '@/styles/brand';
import './LandingPage.css';

const DEMO_SLUG = import.meta.env.VITE_DEMO_ALBUM_SLUG as string | undefined;

const STEPS = [
  {
    n: '1',
    title: 'Choose living photos',
    body: 'Pick how many printed photos can play a video. Prices show when you create your account.',
  },
  {
    n: '2',
    title: 'Link photo + video',
    body: 'Upload the print photo and its video. Story-PIX connects them.',
  },
  {
    n: '3',
    title: 'Share one QR',
    body: 'Client opens the QR, points the phone at the print, and the video plays.',
  },
];

export const LandingPage = () => {
  const queryClient = useQueryClient();
  const { isAuthenticated, isInitialized, user } = useAuthStore();

  const studioHome = user?.role === UserRole.SUPER_ADMIN ? ROUTES.ADMIN_DASHBOARD : ROUTES.ALBUMS;
  const showDashboard = isInitialized && isAuthenticated;

  useEffect(() => {
    if (showDashboard) return;
    void prefetchPublicCatalog(queryClient);
  }, [queryClient, showDashboard]);

  const warmCatalog = () => {
    void prefetchPublicCatalog(queryClient);
  };

  return (
    <div className="sp-land">
      <header className="sp-land__nav">
        <a href="#top" className="sp-land__brand" aria-label={brand.name}>
          <BrandLogo variant="full" height={48} />
        </a>
        {showDashboard ? (
          <Link className="sp-land__btn sp-land__btn--nav" to={studioHome}>
            Open app
          </Link>
        ) : (
          <div className="sp-land__nav-actions">
            <Link className="sp-land__btn sp-land__btn--ghost-nav" to={ROUTES.LOGIN}>
              Log in
            </Link>
            <Link
              className="sp-land__btn sp-land__btn--nav"
              to={ROUTES.SIGNUP}
              onMouseEnter={warmCatalog}
              onFocus={warmCatalog}
              onTouchStart={warmCatalog}
            >
              Get started
            </Link>
          </div>
        )}
      </header>

      <main id="top">
        <section className="sp-land__hero" aria-label={`${brand.name} home`}>
          <div className="sp-land__hero-stage">
            <BrandLogo variant="full" height={120} />
            <p className="sp-land__brand-line">{brand.tagline}</p>
            <h1 className="sp-land__hero-title">Print a photo. Watch it come alive.</h1>
            <p className="sp-land__lede">
              Guests open one QR, point their phone at the printed photo, and the video plays. No
              app download.
            </p>
            <div className="sp-land__cta">
              {showDashboard ? (
                <Link className="sp-land__btn sp-land__btn--primary" to={studioHome}>
                  Go to my albums
                </Link>
              ) : (
                <Link
                  className="sp-land__btn sp-land__btn--primary"
                  to={ROUTES.SIGNUP}
                  onMouseEnter={warmCatalog}
                  onFocus={warmCatalog}
                  onTouchStart={warmCatalog}
                >
                  Get started
                </Link>
              )}
              {DEMO_SLUG ? (
                <a className="sp-land__btn sp-land__btn--ghost" href={`/viewer/${DEMO_SLUG}`}>
                  Try a live demo
                </a>
              ) : null}
            </div>
            <p className="sp-land__hint">Works on phone · Safari & Chrome</p>
          </div>
        </section>

        <section className="sp-land__how" id="how-it-works">
          <div className="sp-land__how-inner">
            <p className="sp-land__how-eyebrow">Simple flow</p>
            <h2>How it works</h2>
            <p className="sp-land__sub">
              Three steps from print to living photo. No app download for guests.
            </p>
            <ol className="sp-land__steps">
              {STEPS.map((step, index) => (
                <li
                  key={step.n}
                  className="sp-land__step"
                  style={{ ['--step-i' as string]: String(index) }}
                >
                  <div className="sp-land__step-top">
                    <span className="sp-land__step-n" aria-hidden>
                      {step.n}
                    </span>
                    {index < STEPS.length - 1 ? (
                      <span className="sp-land__step-rail" aria-hidden />
                    ) : null}
                  </div>
                  <h3>{step.title}</h3>
                  <p>{step.body}</p>
                </li>
              ))}
            </ol>
            {!showDashboard ? (
              <div className="sp-land__cta sp-land__cta--packs">
                <Link
                  className="sp-land__btn sp-land__btn--primary"
                  to={ROUTES.SIGNUP}
                  onMouseEnter={warmCatalog}
                  onFocus={warmCatalog}
                  onTouchStart={warmCatalog}
                >
                  Get started
                </Link>
              </div>
            ) : null}
          </div>
        </section>
      </main>

      <footer className="sp-land__foot">
        <BrandLogo variant="full" height={72} />
        <p>{brand.tagline}</p>
        <p className="sp-land__copy">
          © {new Date().getFullYear()} {brand.name}. All rights reserved.
        </p>
      </footer>
    </div>
  );
};
