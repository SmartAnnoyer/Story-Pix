import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Alert, Button, Form, Input, Spin, message } from 'antd';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { getErrorMessage } from '@/api/client';
import { ROUTES } from '@/routes/paths';
import { signupSchema, type SignupFormValues } from '@/features/auth/schemas/auth.schemas';
import {
  checkoutService,
  collectRazorpayPayment,
  type CartItem,
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

  const items: CartItem[] = useMemo(
    () =>
      Object.entries(qty)
        .filter(([, quantity]) => quantity > 0)
        .map(([packId, quantity]) => ({ packId, quantity })),
    [qty],
  );

  const preview = useMemo(() => {
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

  const bump = (packId: string, delta: number) => {
    setQty((current) => {
      const next = Math.max(0, (current[packId] ?? 0) + delta);
      return { ...current, [packId]: next };
    });
  };

  const onSubmit = async (values: SignupFormValues) => {
    if (!items.length) {
      setError('Tap + to pick how many photos you need');
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

      const session = await checkoutService.verifySignup(payment);
      if ('accessToken' in session && session.accessToken && session.user) {
        setAuth(session.user, session.accessToken);
        message.success('Account ready — welcome to Story-PIX');
        navigate(ROUTES.ALBUMS, { replace: true });
        return;
      }
      message.success('Payment received — please sign in');
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
          <p>1) Choose photos · 2) Email & password · 3) Pay</p>
        </header>

        {error ? (
          <Alert type="error" showIcon message={error} className="signup-page__alert" />
        ) : null}

        <section className="signup-page__packs" aria-label="How many photos">
          <h2>How many photos?</h2>
          <p className="signup-page__hint">Tap + on a size. Mix sizes if you want (5 + 3 = 8).</p>
          <div className="signup-page__grid">
            {personalPacks.map((pack) => {
              const selected = (qty[pack.id] ?? 0) > 0;
              return (
                <article
                  key={pack.id}
                  className={`signup-pack${selected ? ' signup-pack--on' : ''}`}
                >
                  <div>
                    <strong>
                      {pack.maxMappings} photo{pack.maxMappings === 1 ? '' : 's'}
                    </strong>
                    <span>₹{pack.unitPriceInr}</span>
                  </div>
                  <p>1,000 guest plays each</p>
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

        {studioPacks.length ? (
          <section className="signup-page__packs" aria-label="Shop packs">
            <h2>For photo shops</h2>
            <div className="signup-page__grid">
              {studioPacks.map((pack) => {
                const slots = pack.maxMappings * pack.albumsIncluded;
                const selected = (qty[pack.id] ?? 0) > 0;
                return (
                  <article
                    key={pack.id}
                    className={`signup-pack${selected ? ' signup-pack--on' : ''}`}
                  >
                    <div>
                      <strong>{pack.name}</strong>
                      <span>₹{pack.unitPriceInr}</span>
                    </div>
                    <p>{slots} photos</p>
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
        ) : null}

        <Form
          id="signup-form"
          layout="vertical"
          onFinish={handleSubmit(onSubmit)}
          requiredMark={false}
        >
          <Form.Item
            label="Email"
            validateStatus={errors.email ? 'error' : ''}
            help={errors.email?.message}
          >
            <Controller
              name="email"
              control={control}
              render={({ field }) => (
                <Input {...field} size="large" autoComplete="email" placeholder="you@email.com" />
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
        </Form>

        <p className="signup-page__footer">
          Already have an account? <Link to={ROUTES.LOGIN}>Sign in</Link>
        </p>
      </div>

      <div className="signup-page__dock">
        <div className="signup-page__checkout">
          <div className="signup-page__checkout-meta">
            <p className="signup-page__checkout-amount">
              <span>Total</span>₹{preview.amountInr.toLocaleString('en-IN')}
            </p>
            <p
              className={`signup-page__checkout-hint${preview.mappings > 0 ? ' signup-page__checkout-hint--ready' : ''}`}
            >
              {preview.mappings > 0
                ? `+${preview.mappings} photo${preview.mappings === 1 ? '' : 's'}`
                : 'Tap + to choose a pack'}
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
