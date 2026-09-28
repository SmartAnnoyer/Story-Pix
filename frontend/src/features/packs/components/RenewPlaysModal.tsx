import { useEffect, useMemo, useState } from 'react';
import { Button, Checkbox, Modal, Segmented, message } from 'antd';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getErrorMessage } from '@/api/client';
import { checkoutService, collectRazorpayPayment } from '@/services/checkout.service';
import { packKeys } from '@/hooks/usePackQueries';
import './RenewPlaysModal.css';

export interface RenewablePhoto {
  id: string;
  name: string;
  scanUsage: number;
  scanLimit: number;
}

interface RenewPlaysModalProps {
  open: boolean;
  albumId: string;
  albumName: string;
  photos: RenewablePhoto[];
  initialSelectedIds: string[];
  onClose: () => void;
}

const BLOCK_OPTIONS = [
  { label: '+1,000', value: 1 },
  { label: '+2,000', value: 2 },
  { label: '+3,000', value: 3 },
  { label: '+5,000', value: 5 },
];

const isFinished = (photo: RenewablePhoto) => photo.scanUsage >= photo.scanLimit;

export const RenewPlaysModal = ({
  open,
  albumId,
  albumName,
  photos,
  initialSelectedIds,
  onClose,
}: RenewPlaysModalProps) => {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<string[]>([]);
  const [blocks, setBlocks] = useState(1);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setSelected(initialSelectedIds.length ? initialSelectedIds : photos.map((photo) => photo.id));
    setBlocks(1);
    setError(null);
    // Reset only when the modal opens, not on every parent refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const sortedIds = useMemo(() => [...selected].sort(), [selected]);
  const finishedIds = useMemo(() => photos.filter(isFinished).map((photo) => photo.id), [photos]);

  const quoteQuery = useQuery({
    queryKey: packKeys.renewalQuote(albumId, sortedIds, blocks),
    queryFn: () => checkoutService.quoteRenewal({ albumId, arTargetIds: sortedIds, blocks }),
    enabled: open && sortedIds.length > 0,
    staleTime: 30_000,
  });
  const quote = quoteQuery.data;

  const toggle = (id: string, checked: boolean) =>
    setSelected((current) =>
      checked ? [...new Set([...current, id])] : current.filter((item) => item !== id),
    );

  const handlePay = async () => {
    if (!sortedIds.length) return;
    setPaying(true);
    setError(null);
    try {
      const order = await checkoutService.createRenewalOrder({
        albumId,
        arTargetIds: sortedIds,
        blocks,
      });
      const payment = await collectRazorpayPayment({
        orderId: order.orderId,
        amount: order.amount,
        currency: order.currency,
        keyId: order.keyId,
        provider: order.provider,
        description: `Renew plays · ${albumName}`,
      });
      const result = await checkoutService.verifyRenewal(payment);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['ar-targets'] }),
        queryClient.invalidateQueries({ queryKey: ['albums'] }),
        queryClient.invalidateQueries({ queryKey: packKeys.studioHistory() }),
      ]);
      message.success(
        `Renewed ${result.renewedCount} photo${result.renewedCount === 1 ? '' : 's'} · guests can scan again`,
      );
      onClose();
    } catch (err) {
      const text = getErrorMessage(err, 'Payment failed');
      setError(/cancelled/i.test(text) ? 'Payment cancelled — no charge was made.' : text);
    } finally {
      setPaying(false);
    }
  };

  const amount = quote?.amountInr ?? 0;

  return (
    <Modal
      open={open}
      title="Renew guest plays"
      onCancel={paying ? undefined : onClose}
      maskClosable={!paying}
      destroyOnHidden
      footer={[
        <Button key="cancel" onClick={onClose} disabled={paying}>
          Cancel
        </Button>,
        <Button
          key="pay"
          type="primary"
          loading={paying}
          disabled={!sortedIds.length || !quote || quoteQuery.isFetching}
          onClick={() => void handlePay()}
        >
          {quote ? `Pay ₹${amount.toLocaleString('en-IN')}` : 'Pay'}
        </Button>,
      ]}
    >
      <p className="renew-plays__intro">
        Each selected photo gets more guest plays in <strong>{albumName}</strong>. The QR code and
        links stay the same — plays never expire.
      </p>

      <div className="renew-plays__section">
        <span className="renew-plays__label">Plays to add per photo</span>
        <Segmented
          block
          options={BLOCK_OPTIONS}
          value={blocks}
          onChange={(value) => setBlocks(Number(value))}
          disabled={paying}
        />
      </div>

      <div className="renew-plays__section">
        <div className="renew-plays__row">
          <span className="renew-plays__label">
            Photos ({selected.length}/{photos.length})
          </span>
          <span className="renew-plays__quick">
            <button
              type="button"
              onClick={() => setSelected(photos.map((photo) => photo.id))}
              disabled={paying}
            >
              All
            </button>
            {finishedIds.length ? (
              <button type="button" onClick={() => setSelected(finishedIds)} disabled={paying}>
                Only finished ({finishedIds.length})
              </button>
            ) : null}
          </span>
        </div>
        <ul className="renew-plays__list">
          {photos.map((photo) => {
            const finished = isFinished(photo);
            return (
              <li key={photo.id}>
                <Checkbox
                  checked={selected.includes(photo.id)}
                  onChange={(event) => toggle(photo.id, event.target.checked)}
                  disabled={paying}
                >
                  <span className="renew-plays__name">{photo.name}</span>
                </Checkbox>
                <span
                  className={`renew-plays__usage${finished ? ' renew-plays__usage--over' : ''}`}
                >
                  {photo.scanUsage.toLocaleString('en-IN')} /{' '}
                  {photo.scanLimit.toLocaleString('en-IN')}
                  {finished ? ' · Finished' : ''}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="renew-plays__total">
        {!sortedIds.length ? (
          <span>Select at least one photo</span>
        ) : quote ? (
          <>
            <span>
              {quote.photoCount} photo{quote.photoCount === 1 ? '' : 's'} × +
              {quote.scansPerPhoto.toLocaleString('en-IN')} plays · ₹{quote.unitPriceInr} per 1,000
            </span>
            <strong>₹{amount.toLocaleString('en-IN')}</strong>
          </>
        ) : quoteQuery.isError ? (
          <span className="renew-plays__error">
            {getErrorMessage(quoteQuery.error, 'Could not price this renewal')}
          </span>
        ) : (
          <span>Calculating…</span>
        )}
      </div>

      {error ? (
        <p className="renew-plays__error" role="alert">
          {error}
        </p>
      ) : null}
    </Modal>
  );
};
