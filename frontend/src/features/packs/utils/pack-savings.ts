import type { AlbumPack } from '@/types/pack.types';

export type PackSavingsSuggestion = {
  suggestedQty: Record<string, number>;
  currentAmountInr: number;
  suggestedAmountInr: number;
  savingsInr: number;
  photos: number;
  suggestedPhotos: number;
  summary: string;
};

const packPhotos = (pack: AlbumPack) =>
  Math.max(0, pack.maxMappings) * Math.max(1, pack.albumsIncluded || 1);

const qtyFingerprint = (qty: Record<string, number>) =>
  Object.entries(qty)
    .filter(([, n]) => n > 0)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([id, n]) => `${id}:${n}`)
    .join('|');

/**
 * Find a cheaper pack mix that covers at least as many photo slots as the current cart.
 * Classic unbounded knapsack on photo count → minimum INR.
 */
export const findPackSavingsSuggestion = (
  packs: AlbumPack[],
  qtyByPackId: Record<string, number>,
  options?: { minSavingsInr?: number },
): PackSavingsSuggestion | null => {
  const minSavingsInr = options?.minSavingsInr ?? 1;
  const catalog = packs.filter((pack) => pack.isActive !== false && pack.unitPriceInr > 0);
  if (!catalog.length) return null;

  let currentAmountInr = 0;
  let photos = 0;
  for (const pack of catalog) {
    const qty = qtyByPackId[pack.id] ?? 0;
    if (qty <= 0) continue;
    currentAmountInr += pack.unitPriceInr * qty;
    photos += packPhotos(pack) * qty;
  }

  if (photos <= 0 || currentAmountInr <= 0) return null;

  const maxUnit = Math.max(...catalog.map(packPhotos), 1);
  const limit = photos + maxUnit;
  const INF = Number.POSITIVE_INFINITY;
  const cost = new Array<number>(limit + 1).fill(INF);
  const prev = new Array<{ packId: string; from: number } | null>(limit + 1).fill(null);
  cost[0] = 0;

  for (let have = 0; have <= limit; have += 1) {
    if (cost[have] === INF) continue;
    for (const pack of catalog) {
      const add = packPhotos(pack);
      if (add <= 0) continue;
      const next = have + add;
      if (next > limit) continue;
      const nextCost = cost[have] + pack.unitPriceInr;
      // Prefer fewer rupees; on ties prefer reaching with a larger pack (already iterating).
      if (nextCost < cost[next]) {
        cost[next] = nextCost;
        prev[next] = { packId: pack.id, from: have };
      }
    }
  }

  let bestPhotos = -1;
  let bestCost = INF;
  for (let n = photos; n <= limit; n += 1) {
    if (cost[n] < bestCost) {
      bestCost = cost[n];
      bestPhotos = n;
    }
  }

  if (bestPhotos < 0 || bestCost === INF) return null;

  const savingsInr = currentAmountInr - bestCost;
  if (savingsInr < minSavingsInr) return null;

  const suggestedQty: Record<string, number> = {};
  let cursor = bestPhotos;
  while (cursor > 0) {
    const step = prev[cursor];
    if (!step) break;
    suggestedQty[step.packId] = (suggestedQty[step.packId] ?? 0) + 1;
    cursor = step.from;
  }

  if (qtyFingerprint(suggestedQty) === qtyFingerprint(qtyByPackId)) return null;

  const parts = Object.entries(suggestedQty)
    .map(([packId, quantity]) => {
      const pack = catalog.find((row) => row.id === packId);
      if (!pack) return null;
      const label = `${packPhotos(pack)} photo${packPhotos(pack) === 1 ? '' : 's'}`;
      return quantity > 1 ? `${quantity}× ${label}` : label;
    })
    .filter(Boolean);

  const summary =
    bestPhotos === photos
      ? `Same ${photos} photo${photos === 1 ? '' : 's'} for ₹${bestCost.toLocaleString('en-IN')} — save ₹${savingsInr.toLocaleString('en-IN')}`
      : `${bestPhotos} photos for ₹${bestCost.toLocaleString('en-IN')} — save ₹${savingsInr.toLocaleString('en-IN')}`;

  return {
    suggestedQty,
    currentAmountInr,
    suggestedAmountInr: bestCost,
    savingsInr,
    photos,
    suggestedPhotos: bestPhotos,
    summary: parts.length ? `${summary} (${parts.join(' + ')})` : summary,
  };
};
