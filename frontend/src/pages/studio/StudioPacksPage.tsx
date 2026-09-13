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
import { AlbumPackTier } from '@/types/pack.types';
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
    const personalOnly =
      selected.length > 0 && selected.every((row) => row.pack.tier === AlbumPackTier.PERSONAL);
    const mappings = selected.reduce((sum, row) => sum + row.pack.maxMappings * row.quantity, 0);

    return { amountInr, mappings, personalOnly };
  }, [items, packs]);

  const bump = (packId: string, delta: number) => {
    setQty((current) => {
      const next = Math.max(0, (current[packId] ?? 0) + delta);
      return { ...current, [packId]: next };
    });
  };

  const handlePurchase = async () => {
    if (!items.length) {
      setError('Add at least one pack to recharge');
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
        description: 'Story-PIX pack recharge',
      });
      await checkoutService.verifyRecharge(payment);
      await queryClient.invalidateQueries({ queryKey: packKeys.studioSummary() });
      await queryClient.invalidateQueries({ queryKey: packKeys.studioCredits() });
      await queryClient.invalidateQueries({ queryKey: packKeys.studioHistory() });
      setQty({});
      message.success('Packs added to your studio');
    } catch (err) {
      setError(getErrorMessage(err, 'Recharge failed'));
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

  return (
    <div className="signup-page" style={{ maxWidth: 920, margin: '0 auto', padding: '1.5rem' }}>
      <header className="signup-page__header">
        <h1>Buy / recharge packs</h1>
        <p>
          You have <strong>{summary?.remainingAlbumCredits ?? 0}</strong> album credit(s) left.
          Stack personal packs (5+3=8 photos) or add studio packs anytime.
        </p>
      </header>

      {error ? <Alert type="error" showIcon message={error} /> : null}

      <div className="signup-page__grid">
        {packs.map((pack) => (
          <article key={pack.id} className="signup-pack">
            <div>
              <strong>{pack.name}</strong>
              <span>₹{pack.unitPriceInr}</span>
            </div>
            <p>{pack.description}</p>
            <div className="signup-pack__qty">
              <button type="button" onClick={() => bump(pack.id, -1)}>
                −
              </button>
              <span>{qty[pack.id] ?? 0}</span>
              <button type="button" onClick={() => bump(pack.id, 1)}>
                +
              </button>
            </div>
          </article>
        ))}
      </div>

      <aside className="signup-page__summary">
        <p>
          <strong>Total</strong> ₹{preview.amountInr}
        </p>
        <p>
          {preview.personalOnly && preview.mappings > 0
            ? `${preview.mappings} photos (merged)`
            : `${items.length} line item(s)`}
        </p>
      </aside>

      <Button
        type="primary"
        size="large"
        loading={submitting}
        onClick={() => void handlePurchase()}
      >
        Pay & add packs
      </Button>
    </div>
  );
};
