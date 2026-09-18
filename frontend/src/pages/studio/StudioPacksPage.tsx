import { useEffect, useMemo, useState } from 'react';
import { Button, Input, message } from 'antd';
import { getErrorMessage } from '@/api/client';
import { PackSavingsBanner } from '@/features/packs/components/PackSavingsBanner';
import { findPackSavingsSuggestion } from '@/features/packs/utils/pack-savings';
import {
  checkoutService,
  collectRazorpayPayment,
  type CartItem,
  type CartQuote,
} from '@/services/checkout.service';
import { packKeys, usePublicCatalogQuery, useStudioPackSummaryQuery } from '@/hooks/usePackQueries';
import type { AlbumPack } from '@/types/pack.types';
import { useQueryClient } from '@tanstack/react-query';
import '../SignupPage.css';

export const StudioPacksPage = () => {
  const queryClient = useQueryClient();
  const { data: summary, isLoading: summaryLoading } = useStudioPackSummaryQuery();
  const {
    data: packs = [],
    isLoading: loadingCatalog,
    isError: catalogFailed,
    error: catalogErr,
  } = usePublicCatalogQuery();
  const [qty, setQty] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ignoreSavingsKey, setIgnoreSavingsKey] = useState<string | null>(null);
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState('');
  const [quote, setQuote] = useState<CartQuote | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);

  useEffect(() => {
    if (!catalogFailed) return;
    setError(getErrorMessage(catalogErr, 'Unable to load packs'));
  }, [catalogFailed, catalogErr]);

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

    const amountInr = selected.reduce((sum, row) => sum + row.pack.unitPriceInr * row.quantity, 0);
    const photos = selected.reduce(
      (sum, row) => sum + row.pack.maxMappings * row.pack.albumsIncluded * row.quantity,
      0,
    );

    return { amountInr, photos };
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
  const photos = quote?.totalMappings ?? localPreview.photos;
  const hasDiscount = discountInr > 0 && Boolean(quote?.couponCode);

  const savingsSuggestion = useMemo(() => findPackSavingsSuggestion(packs, qty), [packs, qty]);
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

  const handlePurchase = async () => {
    if (!items.length) {
      setError('Tap + to add living photos');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const order = await checkoutService.createRechargeOrder(items, appliedCoupon || undefined);
      const payment = await collectRazorpayPayment({
        orderId: order.orderId,
        amount: order.amount,
        currency: order.currency,
        keyId: order.keyId,
        provider: order.provider,
        description: 'Story-PIX photos',
      });
      await checkoutService.verifyRecharge(payment);
      await queryClient.invalidateQueries({ queryKey: packKeys.studioSummary() });
      await queryClient.invalidateQueries({ queryKey: packKeys.studioCredits() });
      await queryClient.invalidateQueries({ queryKey: packKeys.studioHistory() });
      setQty({});
      clearCoupon();
      message.success('Photos added');
    } catch (err) {
      setError(getErrorMessage(err, 'Payment failed'));
    } finally {
      setSubmitting(false);
    }
  };

  const left = summary?.remainingMappingSlots ?? summary?.remainingAlbumCredits ?? 0;
  const used = summary?.usedMappingSlots ?? summary?.usedCredits ?? 0;
  const total = summary?.grantedMappingSlots ?? summary?.totalAssignedCredits ?? 0;
  const paymentCancelled = Boolean(error && /cancelled/i.test(error));
  const packsPending = loadingCatalog && !packs.length;

  return (
    <div className="signup-page signup-page--docked signup-page--in-shell">
      <div className="signup-page__scroll">
        <header className="signup-page__header">
          <h1>Add living photos</h1>
          <p>
            {summaryLoading ? (
              'Loading balance…'
            ) : (
              <>
                <strong>{left} left</strong> · {used} used · {total} total
              </>
            )}
          </p>
        </header>

        {error ? (
          <div
            className={`signup-page__notice${
              paymentCancelled ? ' signup-page__notice--soft' : ' signup-page__notice--error'
            }`}
            role="alert"
          >
            <strong>{paymentCancelled ? 'Payment cancelled' : 'Something went wrong'}</strong>
            <p>
              {paymentCancelled
                ? 'No charge was made. Choose packs again when you’re ready.'
                : error}
            </p>
          </div>
        ) : null}

        <div className="signup-page__grid">
          {packsPending
            ? Array.from({ length: 4 }, (_, i) => (
                <article
                  key={`skel-${i}`}
                  className="signup-pack signup-pack--skeleton"
                  aria-hidden
                >
                  <div>
                    <strong />
                    <span />
                  </div>
                  <p />
                  <div className="signup-pack__qty" />
                </article>
              ))
            : packs.map((pack) => {
                const packPhotos = pack.maxMappings * pack.albumsIncluded;
                const selected = (qty[pack.id] ?? 0) > 0;
                return (
                  <article
                    key={pack.id}
                    className={`signup-pack${selected ? ' signup-pack--on' : ''}`}
                  >
                    <div>
                      <strong>
                        {packPhotos} living photo{packPhotos === 1 ? '' : 's'}
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

        <div className="signup-page__coupon">
          <label htmlFor="packs-coupon">Coupon code</label>
          <p className="signup-page__coupon-hint">Optional — enter a code for a discount</p>
          <div className="signup-page__coupon-row">
            <Input
              id="packs-coupon"
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
              className={`signup-page__checkout-hint${photos > 0 ? ' signup-page__checkout-hint--ready' : ''}`}
            >
              {photos > 0
                ? `+${photos} living photo${photos === 1 ? '' : 's'}`
                : 'Tap + to choose living photos'}
            </p>
          </div>
          <Button
            type="primary"
            size="large"
            loading={submitting}
            disabled={!items.length}
            className="signup-page__pay"
            onClick={() => void handlePurchase()}
          >
            Pay
          </Button>
        </div>
      </div>
    </div>
  );
};
