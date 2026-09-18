import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Alert, Button, Form, Input, Spin, message } from 'antd';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { getErrorMessage } from '@/api/client';
import { ROUTES } from '@/routes/paths';
import { signupSchema, type SignupFormValues } from '@/features/auth/schemas/auth.schemas';
import { PackSavingsBanner } from '@/features/packs/components/PackSavingsBanner';
import { findPackSavingsSuggestion } from '@/features/packs/utils/pack-savings';
import {
  checkoutService,
  collectRazorpayPayment,
  type CartItem,
  type CartQuote,
} from '@/services/checkout.service';
import { useAuthStore } from '@/store/auth.store';
import type { AlbumPack } from '@/types/pack.types';
import { AlbumPackTier } from '@/types/pack.types';
import './SignupPage.css';

export const SignupPage = () => {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [packs, setPacks] = useState<AlbumPack[]>([]);
  const [qty, setQty] = useState<Record<string, number>>({});
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ignoreSavingsKey, setIgnoreSavingsKey] = useState<string | null>(null);
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState('');
  const [quote, setQuote] = useState<CartQuote | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { email: '', password: '', confirmPassword: '' },
  });

  useEffect(() => {
    void checkoutService
      .catalog()
      .then(setPacks)
      .catch((err) => setError(getErrorMessage(err, 'Unable to load packs')))
      .finally(() => setLoadingCatalog(false));
  }, []);

  const personalPacks = useMemo(
    () => packs.filter((pack) => pack.tier === AlbumPackTier.PERSONAL),
    [packs],
  );
  const studioPacks = useMemo(
    () => packs.filter((pack) => pack.tier !== AlbumPackTier.PERSONAL),
    [packs],
  );
  const catalogPacks = useMemo(
    () => [...personalPacks, ...studioPacks],
    [personalPacks, studioPacks],
  );

  const items: CartItem[] = useMemo(
    () =>
      Object.entries(qty)
        .filter(([, quantity]) => quantity > 0)
        .map(([packId, quantity]) => ({ packId, quantity })),
    [qty],
  );

  const localPreview = useMemo(() => {
    const selected = items
      .map((item) => {
        const pack = packs.find((row) => row.id === item.packId);
        if (!pack) return null;
        return { pack, quantity: item.quantity };
      })
      .filter(Boolean) as Array<{ pack: AlbumPack; quantity: number }>;

    if (!selected.length) {
      return { amountInr: 0, mappings: 0 };
    }

    const amountInr = selected.reduce((sum, row) => sum + row.pack.unitPriceInr * row.quantity, 0);
    const mappings = selected.reduce(
      (sum, row) => sum + row.pack.maxMappings * row.pack.albumsIncluded * row.quantity,
      0,
    );

    return { amountInr, mappings };
  }, [items, packs]);

  useEffect(() => {
    if (!items.length) {
      setQuote(null);
      setCouponError(null);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(() => {
      setQuoting(true);
      void checkoutService
        .quote(items, appliedCoupon || undefined)
        .then((next) => {
          if (cancelled) return;
          setQuote(next);
          setCouponError(null);
        })
        .catch((err) => {
          if (cancelled) return;
          setQuote(null);
          if (appliedCoupon) {
            setCouponError(getErrorMessage(err, 'Invalid coupon'));
            setAppliedCoupon('');
          }
        })
        .finally(() => {
          if (!cancelled) setQuoting(false);
        });
    }, 280);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [items, appliedCoupon]);

  const amountInr = quote?.amountInr ?? localPreview.amountInr;
  const subtotalInr = quote?.subtotalInr ?? localPreview.amountInr;
  const discountInr = quote?.discountInr ?? 0;
  const mappings = quote?.totalMappings ?? localPreview.mappings;
  const hasDiscount = discountInr > 0 && Boolean(quote?.couponCode);

  const savingsSuggestion = useMemo(
    () => findPackSavingsSuggestion(catalogPacks, qty),
    [catalogPacks, qty],
  );
  const savingsKey = savingsSuggestion
    ? `${savingsSuggestion.photos}:${savingsSuggestion.suggestedAmountInr}:${savingsSuggestion.savingsInr}`
    : null;
  const showSavingsBanner = Boolean(savingsSuggestion && savingsKey !== ignoreSavingsKey);

  const bump = (packId: string, delta: number) => {
    setQty((current) => {
      const next = Math.max(0, (current[packId] ?? 0) + delta);
      return { ...current, [packId]: next };
    });
  };

  const applySavingsSuggestion = () => {
    if (!savingsSuggestion) return;
    setQty(savingsSuggestion.suggestedQty);
    setIgnoreSavingsKey(null);
  };

  const applyCoupon = () => {
    const code = couponInput.trim().toUpperCase();
    if (!code) {
      setAppliedCoupon('');
      setCouponError(null);
      return;
    }
    if (!items.length) {
      setCouponError('Pick living photos before applying a coupon');
      return;
    }
    setCouponError(null);
    setAppliedCoupon(code);
  };

  const clearCoupon = () => {
    setCouponInput('');
    setAppliedCoupon('');
    setCouponError(null);
  };

  const onSubmit = async (values: SignupFormValues) => {
    if (!items.length) {
      setError('Tap + to pick how many living photos you need');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const order = await checkoutService.createSignupOrder({
        email: values.email,
        password: values.password,
        confirmPassword: values.confirmPassword,
        items,
        ...(appliedCoupon ? { couponCode: appliedCoupon } : {}),
      });

      const payment = await collectRazorpayPayment({
        orderId: order.orderId,
        amount: order.amount,
        currency: order.currency,
        keyId: order.keyId,
        provider: order.provider,
        email: values.email,
        description: 'Story-PIX pack purchase',
      });

      let session: Awaited<ReturnType<typeof checkoutService.verifySignup>>;
      try {
        session = await checkoutService.verifySignup(payment);
      } catch (verifyError) {
        // Payment already succeeded — one retry covers transient/partial fulfill races.
        try {
          session = await checkoutService.verifySignup(payment);
        } catch {
          throw verifyError;
        }
      }

      if ('accessToken' in session && session.accessToken && session.user) {
        setAuth(session.user, session.accessToken);
        message.success('Account ready — welcome to Story-PIX');
        navigate(ROUTES.ALBUMS, { replace: true });
        return;
      }

      message.success(
        typeof session === 'object' && session && 'message' in session && session.message
          ? String(session.message)
          : 'Payment successful — sign in with your email and password',
      );
      navigate(ROUTES.LOGIN, { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, 'Signup payment failed'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingCatalog) {
    return (
      <div className="signup-page signup-page--center">
        <Spin />
      </div>
    );
  }

  return (
    <div className="signup-page signup-page--docked">
      <div className="signup-page__scroll">
        <header className="signup-page__header">
          <h1>Start with Story-PIX</h1>
          <p>Choose how many living photos you need, then create your account.</p>
        </header>

        {error ? (
          <Alert type="error" showIcon message={error} className="signup-page__alert" />
        ) : null}

        <div className="signup-page__desktop">
          <section className="signup-page__packs" aria-label="Choose living photos">
            <h2>Living photos</h2>
            <p className="signup-page__hint">
              Each living photo links one printed photo to a video. Tap + to choose a size.
            </p>
            <div className="signup-page__grid">
              {catalogPacks.map((pack) => {
                const photos = pack.maxMappings * pack.albumsIncluded;
                const selected = (qty[pack.id] ?? 0) > 0;
                return (
                  <article
                    key={pack.id}
                    className={`signup-pack${selected ? ' signup-pack--on' : ''}`}
                  >
                    <div>
                      <strong>
                        {photos} living photo{photos === 1 ? '' : 's'}
                      </strong>
                      <span>₹{pack.unitPriceInr}</span>
                    </div>
                    <p>{pack.name}</p>
                    <div className="signup-pack__qty">
                      <button type="button" onClick={() => bump(pack.id, -1)} aria-label="Less">
                        −
                      </button>
                      <span>{qty[pack.id] ?? 0}</span>
                      <button type="button" onClick={() => bump(pack.id, 1)} aria-label="More">
                        +
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <div className="signup-page__aside">
            <Form
              id="signup-form"
              layout="vertical"
              onFinish={handleSubmit(onSubmit)}
              requiredMark={false}
              className="signup-page__form"
            >
              <h2 className="signup-page__aside-title">Your account</h2>
              <Form.Item
                label="Email"
                validateStatus={errors.email ? 'error' : ''}
                help={errors.email?.message}
              >
                <Controller
                  name="email"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      size="large"
                      autoComplete="email"
                      placeholder="you@email.com"
                    />
                  )}
                />
              </Form.Item>

              <Form.Item
                label="Password"
                validateStatus={errors.password ? 'error' : ''}
                help={errors.password?.message}
              >
                <Controller
                  name="password"
                  control={control}
                  render={({ field }) => (
                    <Input.Password
                      {...field}
                      size="large"
                      autoComplete="new-password"
                      placeholder="Create a password"
                    />
                  )}
                />
              </Form.Item>

              <Form.Item
                label="Confirm password"
                validateStatus={errors.confirmPassword ? 'error' : ''}
                help={errors.confirmPassword?.message}
              >
                <Controller
                  name="confirmPassword"
                  control={control}
                  render={({ field }) => (
                    <Input.Password
                      {...field}
                      size="large"
                      autoComplete="new-password"
                      placeholder="Confirm password"
                    />
                  )}
                />
              </Form.Item>

              <div className="signup-page__coupon">
                <label htmlFor="signup-coupon">Coupon code</label>
                <p className="signup-page__coupon-hint">Optional — enter a code for a discount</p>
                <div className="signup-page__coupon-row">
                  <Input
                    id="signup-coupon"
                    size="large"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                    onPressEnter={(e) => {
                      e.preventDefault();
                      applyCoupon();
                    }}
                    placeholder="WELCOME10"
                    maxLength={32}
                    status={couponError ? 'error' : undefined}
                    disabled={submitting}
                  />
                  {hasDiscount ? (
                    <Button type="default" size="large" onClick={clearCoupon} disabled={submitting}>
                      Clear
                    </Button>
                  ) : (
                    <Button
                      type="default"
                      size="large"
                      onClick={applyCoupon}
                      loading={quoting && Boolean(couponInput.trim())}
                      disabled={submitting || !couponInput.trim()}
                    >
                      Apply
                    </Button>
                  )}
                </div>
                {couponError ? <p className="signup-page__coupon-error">{couponError}</p> : null}
                {hasDiscount && quote?.couponCode ? (
                  <p className="signup-page__coupon-ok">
                    {quote.couponCode} · {quote.discountPercent}% off (−₹
                    {discountInr.toLocaleString('en-IN')})
                  </p>
                ) : null}
              </div>
            </Form>

            <div className="signup-page__aside-checkout">
              {showSavingsBanner && savingsSuggestion ? (
                <PackSavingsBanner
                  message={savingsSuggestion.summary}
                  onSwitch={applySavingsSuggestion}
                  onIgnore={() => setIgnoreSavingsKey(savingsKey)}
                />
              ) : null}
              <div className="signup-page__checkout">
                <div className="signup-page__checkout-meta">
                  <p className="signup-page__checkout-amount">
                    <span>Total</span>₹{amountInr.toLocaleString('en-IN')}
                  </p>
                  {hasDiscount ? (
                    <p className="signup-page__checkout-was">
                      Was ₹{subtotalInr.toLocaleString('en-IN')}
                    </p>
                  ) : null}
                  <p
                    className={`signup-page__checkout-hint${mappings > 0 ? ' signup-page__checkout-hint--ready' : ''}`}
                  >
                    {mappings > 0
                      ? `+${mappings} living photo${mappings === 1 ? '' : 's'}`
                      : 'Tap + to choose living photos'}
                  </p>
                </div>
                <Button
                  type="primary"
                  htmlType="submit"
                  form="signup-form"
                  size="large"
                  loading={submitting}
                  disabled={!items.length}
                  className="signup-page__pay"
                >
                  Pay & start
                </Button>
              </div>
            </div>
          </div>
        </div>

        <p className="signup-page__footer">
          Already have an account? <Link to={ROUTES.LOGIN}>Sign in</Link>
        </p>
      </div>

      <div className="signup-page__dock">
        {showSavingsBanner && savingsSuggestion ? (
          <PackSavingsBanner
            message={savingsSuggestion.summary}
            onSwitch={applySavingsSuggestion}
            onIgnore={() => setIgnoreSavingsKey(savingsKey)}
          />
        ) : null}
        <div className="signup-page__checkout">
          <div className="signup-page__checkout-meta">
            <p className="signup-page__checkout-amount">
              <span>Total</span>₹{amountInr.toLocaleString('en-IN')}
            </p>
            {hasDiscount ? (
              <p className="signup-page__checkout-was">
                Was ₹{subtotalInr.toLocaleString('en-IN')}
              </p>
            ) : null}
            <p
              className={`signup-page__checkout-hint${mappings > 0 ? ' signup-page__checkout-hint--ready' : ''}`}
            >
              {mappings > 0
                ? `+${mappings} living photo${mappings === 1 ? '' : 's'}`
                : 'Tap + to choose living photos'}
            </p>
          </div>
          <Button
            type="primary"
            htmlType="submit"
            form="signup-form"
            size="large"
            loading={submitting}
            disabled={!items.length}
            className="signup-page__pay"
          >
            Pay & start
          </Button>
        </div>
      </div>
    </div>
  );
};
