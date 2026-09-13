import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Spin, message } from 'antd';
import { getErrorMessage } from '@/api/client';
import {
  checkoutService,
  collectRazorpayPayment,
  type CartItem,
} from '@/services/checkout.service';
import { useStudioPackSummaryQuery, packKeys } from '@/hooks/usePackQueries';
import type { AlbumPack } from '@/types/pack.types';
import { useQueryClient } from '@tanstack/react-query';
import '../SignupPage.css';

export const StudioPacksPage = () => {
  const queryClient = useQueryClient();
  const { data: summary, isLoading: summaryLoading } = useStudioPackSummaryQuery();
  const [packs, setPacks] = useState<AlbumPack[]>([]);
  const [qty, setQty] = useState<Record<string, number>>({});
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void checkoutService
      .catalog()
      .then(setPacks)
      .catch((err) => setError(getErrorMessage(err, 'Unable to load packs')))
      .finally(() => setLoadingCatalog(false));
  }, []);

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

    const amountInr = selected.reduce((sum, row) => sum + row.pack.unitPriceInr * row.quantity, 0);
    const photos = selected.reduce(
      (sum, row) => sum + row.pack.maxMappings * row.pack.albumsIncluded * row.quantity,
      0,
    );

    return { amountInr, photos };
  }, [items, packs]);

  const bump = (packId: string, delta: number) => {
    setQty((current) => {
      const next = Math.max(0, (current[packId] ?? 0) + delta);
      return { ...current, [packId]: next };
    });
  };

  const handlePurchase = async () => {
    if (!items.length) {
      setError('Tap + to add photos');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const order = await checkoutService.createRechargeOrder(items);
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
      message.success('Photos added');
    } catch (err) {
      setError(getErrorMessage(err, 'Payment failed'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingCatalog || summaryLoading) {
    return (
      <div className="signup-page signup-page--center">
        <Spin />
      </div>
    );
  }

  const left = summary?.remainingMappingSlots ?? summary?.remainingAlbumCredits ?? 0;
  const used = summary?.usedMappingSlots ?? summary?.usedCredits ?? 0;
  const total = summary?.grantedMappingSlots ?? summary?.totalAssignedCredits ?? 0;

  return (
    <div className="signup-page" style={{ maxWidth: 920, margin: '0 auto', padding: '1rem 0' }}>
      <header className="signup-page__header">
        <h1>Buy / recharge packs</h1>
        <p>
          <strong>{left} left</strong> · {used} used · {total} total
        </p>
      </header>

      {error ? <Alert type="error" showIcon message={error} /> : null}

      <div className="signup-page__grid">
        {packs.map((pack) => {
          const photos = pack.maxMappings * pack.albumsIncluded;
          const selected = (qty[pack.id] ?? 0) > 0;
          return (
            <article key={pack.id} className={`signup-pack${selected ? ' signup-pack--on' : ''}`}>
              <div>
                <strong>{photos} photos</strong>
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

      <aside className="signup-page__summary">
        <p>
          <strong>Total</strong> ₹{preview.amountInr}
        </p>
        <p>
          {preview.photos > 0
            ? `+${preview.photos} photo${preview.photos === 1 ? '' : 's'}`
            : 'Tap + to choose'}
        </p>
      </aside>

      <Button
        type="primary"
        size="large"
        block
        loading={submitting}
        className="signup-page__pay"
        onClick={() => void handlePurchase()}
      >
        Pay & add photos
      </Button>
    </div>
  );
};
