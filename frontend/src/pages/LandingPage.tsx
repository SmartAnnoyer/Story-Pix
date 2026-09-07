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
    body: 'Use the photo your studio mapped — a standard print on plain paper is enough.',
  },
  {
    n: '02',
    title: 'Open the album link',
    body: 'Scan the QR or open the shared link in your phone browser. No app store.',
  },
  {
    n: '03',
    title: 'Point and watch',
    body: 'Hold the camera on the print. Video plays on the photo with the room still around it.',
  },
];

const PACKS = [
  {
    name: 'Mini Album',
    price: '₹999',
    blurb: '1 album · up to 10 living photos',
    detail: '1,000 guest plays per photo. Ideal for frames and small jobs.',
  },
  {
    name: 'Standard Album',
    price: '₹2,499',
    blurb: '1 album · up to 25 living photos',
    detail: '1,000 guest plays per photo. Best for weddings and full albums.',
    featured: true,
  },
  {
    name: 'Album Bundles',
    price: '5 / 10 / 20',
    blurb: 'Multiple album credits for busy shops',
    detail: 'Same Standard limits per album, with volume pricing when you buy several.',
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
          <BrandLogo variant="nav" height={34} />
        </a>
        <nav className="sp-land__links" aria-label="Page">
          <a href="#how-it-works">How it works</a>
          <a href="#packs">Packs</a>
          <a href="#studios">For studios</a>
        </nav>
        {showDashboard ? (
          <Link className="sp-land__btn sp-land__btn--nav" to={studioHome}>
            Open studio
          </Link>
        ) : (
          <Link className="sp-land__btn sp-land__btn--nav" to={ROUTES.LOGIN}>
            Log in
          </Link>
        )}
      </header>

      <main id="top">
        <section className="sp-land__hero" aria-label={`${brand.name} home`}>
          <div className="sp-land__hero-atmosphere" aria-hidden>
            <span className="sp-land__orb sp-land__orb--a" />
            <span className="sp-land__orb sp-land__orb--b" />
            <span className="sp-land__orb sp-land__orb--c" />
            <span className="sp-land__grain" />
            <span className="sp-land__beam" />
          </div>

          <div className="sp-land__hero-stage">
            <div className="sp-land__hero-brand">
              <BrandLogo variant="full" height={72} />
            </div>
            <h1 className="sp-land__hero-title">
              Photos that
              <span> remember.</span>
            </h1>
            <p className="sp-land__lede">
              Point a phone at a print. Story-PIX plays the mapped video on the photo — in the
              browser, in under a minute.
            </p>
            <div className="sp-land__cta">
              <a className="sp-land__btn sp-land__btn--primary" href={demoHref}>
                {DEMO_SLUG ? 'Try the live demo' : 'See how it works'}
              </a>
              {showDashboard ? (
                <Link className="sp-land__btn sp-land__btn--ghost" to={studioHome}>
                  Go to dashboard
                </Link>
              ) : (
                <Link className="sp-land__btn sp-land__btn--ghost" to={ROUTES.LOGIN}>
                  Studio log in
                </Link>
              )}
            </div>
            <p className="sp-land__hint">Safari &amp; Chrome · No app download</p>
          </div>

          <div className="sp-land__hero-visual" aria-hidden>
            <div className="sp-land__stage-print">
              <div className="sp-land__print-glow" />
              <div className="sp-land__print">
                <div className="sp-land__print-face">
                  <span className="sp-land__print-shine" />
                  <span className="sp-land__print-pulse" />
                </div>
              </div>
              <div className="sp-land__phone-shell">
                <div className="sp-land__phone-screen">
                  <div className="sp-land__reticle">
                    <span className="sp-land__corner sp-land__corner--tl" />
                    <span className="sp-land__corner sp-land__corner--tr" />
                    <span className="sp-land__corner sp-land__corner--bl" />
                    <span className="sp-land__corner sp-land__corner--br" />
                    <div className="sp-land__scanline" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="sp-land__section" id="how-it-works">
          <p className="sp-land__kicker">Getting started</p>
          <h2>Three steps to your first living photo</h2>
          <p className="sp-land__sub">
            Print, open the link, scan — the same flow your guests will use.
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

        <section className="sp-land__section sp-land__section--cinema" id="experience">
          <div className="sp-land__cinema-inner">
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
          </div>
        </section>

        <section className="sp-land__section" id="packs">
          <p className="sp-land__kicker">Album packs</p>
          <h2>Pay per album. Every photo gets 1,000 plays.</h2>
          <p className="sp-land__sub">
            Enable a pack, create albums, map photos. When credits run out, new albums pause until
            you renew.
          </p>
          <div className="sp-land__packs" role="list">
            {PACKS.map((pack) => (
              <article
                key={pack.name}
                role="listitem"
                className={`sp-land__pack${pack.featured ? ' sp-land__pack--featured' : ''}`}
              >
                {pack.featured ? <span className="sp-land__pack-tag">Most chosen</span> : null}
                <h3>{pack.name}</h3>
                <p className="sp-land__pack-price">{pack.price}</p>
                <p className="sp-land__pack-blurb">{pack.blurb}</p>
                <p className="sp-land__pack-detail">{pack.detail}</p>
              </article>
            ))}
          </div>
          <p className="sp-land__hint sp-land__hint--packs">
            Bundles = more albums for the shop. Plays stay 1,000 per photo.
          </p>
        </section>

        <section className="sp-land__section sp-land__section--studio" id="studios">
          <p className="sp-land__kicker">For studios</p>
          <h2>Map a photo to a video. Share a QR. That’s the product.</h2>
          <p className="sp-land__sub">
            Wedding, school, frame, and heritage jobs become living experiences — one album, one QR,
            many guests.
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
        <BrandLogo variant="full" height={44} />
        <p>{brand.tagline}</p>
        <p className="sp-land__copy">
          © {new Date().getFullYear()} {brand.name}. All rights reserved.
        </p>
      </footer>
    </div>
  );
};
