import { Link } from 'react-router-dom';
import { BrandLogo } from '@/components/BrandLogo';
import { useAuthStore } from '@/store/auth.store';
import { UserRole } from '@/types/auth.types';
import { ROUTES } from '@/routes/paths';
import { brand } from '@/styles/brand';
import './LandingPage.css';

const DEMO_SLUG = import.meta.env.VITE_DEMO_ALBUM_SLUG as string | undefined;

const STEPS = [
  {
    n: '01',
    title: 'Print the photo',
    body: 'Use the photo your studio mapped in Story-pix — a standard print on plain paper is enough.',
  },
  {
    n: '02',
    title: 'Open the album link',
    body: 'Scan the QR or open the shared link in your phone browser. No app store. Camera permission is all you need.',
  },
  {
    n: '03',
    title: 'Point and watch',
    body: 'Hold the camera on the print. The mapped video plays on the photo, with the real world still around it.',
  },
];

export const LandingPage = () => {
  const { isAuthenticated, isInitialized, user } = useAuthStore();

  const studioHome =
    user?.role === UserRole.SUPER_ADMIN ? ROUTES.ADMIN_DASHBOARD : ROUTES.DASHBOARD;
  const demoHref = DEMO_SLUG ? `/viewer/${DEMO_SLUG}` : '#how-it-works';
  const showDashboard = isInitialized && isAuthenticated;

  return (
    <div className="sp-land">
      <header className="sp-land__nav">
        <a href="#top" className="sp-land__brand" aria-label={brand.name}>
          <BrandLogo variant="full" height={32} />
        </a>
        <nav className="sp-land__links" aria-label="Page">
          <a href="#how-it-works">How it works</a>
          <a href="#studios">For studios</a>
        </nav>
        {showDashboard ? (
          <Link className="sp-land__btn sp-land__btn--ghost" to={studioHome}>
            Open studio
          </Link>
        ) : (
          <Link className="sp-land__btn sp-land__btn--ghost" to={ROUTES.LOGIN}>
            Log in
          </Link>
        )}
      </header>

      <main id="top">
        <section className="sp-land__hero">
          <div className="sp-land__hero-copy">
            <p className="sp-land__eyebrow">{brand.tagline}</p>
            <h1>
              Print a photo.
              <br />
              Point your phone.
              <br />
              <span>Watch it come to life.</span>
            </h1>
            <p className="sp-land__lede">
              Story-pix turns a printed portrait into living AR — video plays on the photo in your
              phone camera, in the browser, in under a minute.
            </p>
            <div className="sp-land__cta">
              <a className="sp-land__btn sp-land__btn--primary" href={demoHref}>
                {DEMO_SLUG ? 'Try the live demo' : 'See how it works'}
              </a>
              {showDashboard ? (
                <Link className="sp-land__btn sp-land__btn--light" to={studioHome}>
                  Go to dashboard
                </Link>
              ) : (
                <Link className="sp-land__btn sp-land__btn--light" to={ROUTES.LOGIN}>
                  Studio log in
                </Link>
              )}
            </div>
            <p className="sp-land__hint">
              Works in Safari and Chrome on your phone. No app download.
            </p>
          </div>

          <div className="sp-land__preview" aria-hidden>
            <div className="sp-land__phone">
              <div className="sp-land__scan">
                <span className="sp-land__pill">
                  <i />
                  Point camera at your photo
                </span>
                <div className="sp-land__frame">
                  <span className="sp-land__corner sp-land__corner--tl" />
                  <span className="sp-land__corner sp-land__corner--tr" />
                  <span className="sp-land__corner sp-land__corner--bl" />
                  <span className="sp-land__corner sp-land__corner--br" />
                  <div className="sp-land__scanline" />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="sp-land__section" id="how-it-works">
          <p className="sp-land__kicker">Getting started</p>
          <h2>Three steps to your first AR moment</h2>
          <p className="sp-land__sub">
            No technical setup. Print, open the link, and scan — the same flow your guests will use.
          </p>
          <ol className="sp-land__steps">
            {STEPS.map((step) => (
              <li key={step.n}>
                <span className="sp-land__step-n">{step.n}</span>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="sp-land__section sp-land__section--dark" id="experience">
          <p className="sp-land__kicker">What you’ll experience</p>
          <h2>The photo stays in the room. The memory plays on it.</h2>
          <ul className="sp-land__bullets">
            <li>Live camera around the print — a true AR overlay, not a black box.</li>
            <li>Video locks to the photo as you move.</li>
            <li>One album link. Many prints. Guests scan whatever page they hold.</li>
          </ul>
          {DEMO_SLUG ? (
            <a className="sp-land__btn sp-land__btn--primary" href={demoHref}>
              Open the demo on your phone
            </a>
          ) : null}
        </section>

        <section className="sp-land__section" id="studios">
          <p className="sp-land__kicker">For studios</p>
          <h2>Map a photo to a video. Share a QR. That’s the product.</h2>
          <p className="sp-land__sub">
            Wedding, school, and heritage albums become living experiences your clients can open on
            any smartphone — you stay in Story-pix, they never install an app.
          </p>
          <div className="sp-land__cta">
            {showDashboard ? (
              <Link className="sp-land__btn sp-land__btn--primary" to={studioHome}>
                Continue in studio
              </Link>
            ) : (
              <Link className="sp-land__btn sp-land__btn--primary" to={ROUTES.LOGIN}>
                Log in to your studio
              </Link>
            )}
          </div>
        </section>
      </main>

      <footer className="sp-land__foot">
        <BrandLogo variant="full" height={28} />
        <p>{brand.tagline}</p>
        <p className="sp-land__copy">
          © {new Date().getFullYear()} Story-pix. All rights reserved.
        </p>
      </footer>
    </div>
  );
};
