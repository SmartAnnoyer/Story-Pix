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
    n: '1',
    title: 'Print the photo',
    body: 'Use the photo your studio mapped — a standard print on plain paper is enough.',
  },
  {
    n: '2',
    title: 'Open the album link',
    body: 'Scan the QR or open the shared link in your phone browser. No app store.',
  },
  {
    n: '3',
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
    price: null,
    blurb: 'Multiple Standard albums for busy shops',
    detail: 'Same Standard limits per album (up to 25 photos · 1,000 plays each).',
    bundlePrices: [
      { albums: 5, price: '₹11,249' },
      { albums: 10, price: '₹19,999' },
      { albums: 20, price: '₹34,999' },
    ],
  },
] as const;

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
          <BrandLogo variant="nav" height={40} />
        </a>
        <nav className="sp-land__links" aria-label="Page">
          <a href="#how-it-works">How it works</a>
          <a href="#packs">Packs</a>
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
          <div className="sp-land__hero-stage">
            <BrandLogo variant="full" height={96} />
            <h1 className="sp-land__hero-title">Print a photo. Watch it come alive.</h1>
            <p className="sp-land__lede">
              Story-PIX plays the mapped video on a printed photo in your phone browser — no app
              download.
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
            <p className="sp-land__hint">Works in Safari and Chrome</p>
          </div>
        </section>

        <section className="sp-land__section" id="how-it-works">
          <h2>How it works</h2>
          <p className="sp-land__sub">Three steps guests already know how to do.</p>
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

        <section className="sp-land__section sp-land__section--alt" id="experience">
          <h2>The photo stays in the room. The memory plays on it.</h2>
          <ul className="sp-land__bullets">
            <li>Live camera around the print — a real AR overlay, not a black box.</li>
            <li>Video locks to the photo as you move.</li>
            <li>One album link. Many prints.</li>
          </ul>
          {DEMO_SLUG ? (
            <a className="sp-land__btn sp-land__btn--primary" href={demoHref}>
              Open the demo on your phone
            </a>
          ) : null}
        </section>

        <section className="sp-land__section" id="packs">
          <h2>Album packs</h2>
          <p className="sp-land__sub">
            Pay per album outside the app. Every photo gets 1,000 plays.
          </p>
          <div className="sp-land__packs" role="list">
            {PACKS.map((pack) => (
              <article
                key={pack.name}
                role="listitem"
                className={`sp-land__pack${'featured' in pack && pack.featured ? ' sp-land__pack--featured' : ''}`}
              >
                {'featured' in pack && pack.featured ? (
                  <span className="sp-land__pack-tag">Most chosen</span>
                ) : null}
                <h3>{pack.name}</h3>
                {pack.price ? <p className="sp-land__pack-price">{pack.price}</p> : null}
                {'bundlePrices' in pack && pack.bundlePrices ? (
                  <ul className="sp-land__bundle-prices">
                    {pack.bundlePrices.map((row) => (
                      <li key={row.albums}>
                        <span>{row.albums} albums</span>
                        <strong>{row.price}</strong>
                      </li>
                    ))}
                  </ul>
                ) : null}
                <p className="sp-land__pack-blurb">{pack.blurb}</p>
                <p className="sp-land__pack-detail">{pack.detail}</p>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer className="sp-land__foot">
        <BrandLogo variant="full" height={64} />
        <p>{brand.tagline}</p>
        <p className="sp-land__copy">
          © {new Date().getFullYear()} {brand.name}. All rights reserved.
        </p>
      </footer>
    </div>
  );
};
