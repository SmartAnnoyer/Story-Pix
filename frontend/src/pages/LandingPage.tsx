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
    title: 'Buy photos',
    body: 'Pick how many living photos you need. Pay once. Make as many albums as you like.',
  },
  {
    n: '2',
    title: 'Link photo + video',
    body: 'Upload the print photo and the video. Story-PIX connects them.',
  },
  {
    n: '3',
    title: 'Share the QR',
    body: 'Client opens the QR, points the phone at the print, and the video plays.',
  },
];

const PACKS = [
  {
    name: 'Mini',
    price: '₹999',
    blurb: '10 living photos',
    detail: 'Split across any albums. Each photo gets 1,000 plays.',
  },
  {
    name: 'Standard',
    price: '₹2,499',
    blurb: '25 living photos',
    detail: 'Best for weddings and full jobs. Unlimited albums / QRs.',
    featured: true,
  },
  {
    name: 'Shop bundles',
    price: null,
    blurb: 'More photos for busy studios',
    detail: 'Same idea — buy photo slots, make as many albums as you need.',
    bundlePrices: [
      { albums: '125 photos', price: '₹11,249' },
      { albums: '250 photos', price: '₹19,999' },
      { albums: '500 photos', price: '₹34,999' },
    ],
  },
] as const;

export const LandingPage = () => {
  const { isAuthenticated, isInitialized, user } = useAuthStore();

  const studioHome =
    user?.role === UserRole.SUPER_ADMIN ? ROUTES.ADMIN_DASHBOARD : ROUTES.ALBUMS;
  const demoHref = DEMO_SLUG ? `/viewer/${DEMO_SLUG}` : '#how-it-works';
  const showDashboard = isInitialized && isAuthenticated;

  return (
    <div className="sp-land">
      <header className="sp-land__nav">
        <a href="#top" className="sp-land__brand" aria-label={brand.name}>
          <BrandLogo variant="full" height={48} />
        </a>
        <nav className="sp-land__links" aria-label="Page">
          <a href="#how-it-works">How it works</a>
          <a href="#packs">Prices</a>
        </nav>
        {showDashboard ? (
          <Link className="sp-land__btn sp-land__btn--nav" to={studioHome}>
            Open app
          </Link>
        ) : (
          <div className="sp-land__nav-actions">
            <Link className="sp-land__btn sp-land__btn--ghost-nav" to={ROUTES.LOGIN}>
              Log in
            </Link>
            <Link className="sp-land__btn sp-land__btn--nav" to={ROUTES.SIGNUP}>
              Start
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
              Story-PIX turns a printed photo into a living memory — guests open one QR and point
              their phone. No app download.
            </p>
            <div className="sp-land__cta">
              {showDashboard ? (
                <Link className="sp-land__btn sp-land__btn--primary" to={studioHome}>
                  Go to my albums
                </Link>
              ) : (
                <Link className="sp-land__btn sp-land__btn--primary" to={ROUTES.SIGNUP}>
                  Start now — buy photos
                </Link>
              )}
              <a className="sp-land__btn sp-land__btn--ghost" href={demoHref}>
                {DEMO_SLUG ? 'Try a live demo' : 'See how it works'}
              </a>
            </div>
            <p className="sp-land__hint">Works on phone · Safari & Chrome</p>
          </div>
        </section>

        <section className="sp-land__section" id="how-it-works">
          <h2>3 easy steps</h2>
          <p className="sp-land__sub">Made simple for phone users — no tech skills needed.</p>
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
            <li>Point the phone at the print — video plays on the photo.</li>
            <li>One QR per album. Share with your client in one tap.</li>
            <li>Works in the phone browser — no app store.</li>
          </ul>
          {DEMO_SLUG ? (
            <a className="sp-land__btn sp-land__btn--primary" href={demoHref}>
              Open the demo on your phone
            </a>
          ) : null}
        </section>

        <section className="sp-land__section" id="packs">
          <h2>Simple prices</h2>
          <p className="sp-land__sub">
            Pay for photos. Albums and QRs are free and unlimited. Every photo gets 1,000 plays.
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
                        <span>{row.albums}</span>
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
          {!showDashboard ? (
            <div className="sp-land__cta sp-land__cta--packs">
              <Link className="sp-land__btn sp-land__btn--primary" to={ROUTES.SIGNUP}>
                Start now
              </Link>
            </div>
          ) : null}
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
