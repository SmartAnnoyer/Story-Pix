import { getMindArSystem } from './mindar-scene';

type TrackingState = {
  showing?: boolean;
  isTracking?: boolean;
  trackCount?: number;
  trackMiss?: number;
};

/**
 * Best-effort match strength from MindAR's internal trackingStates.
 * MindAR does not publish a public confidence API — this uses track lock + hit/miss counts.
 */
export const readMatchPercent = (host: HTMLElement | null): number => {
  if (!host) return 0;

  const controller = getMindArSystem(host)?.controller as
    | { trackingStates?: TrackingState[] }
    | undefined;
  const states = controller?.trackingStates;
  if (!states?.length) return 0;

  let best = 0;

  for (const state of states) {
    const hits = Math.max(0, state.trackCount ?? 0);
    const misses = Math.max(0, state.trackMiss ?? 0);
    const stability = hits / (hits + misses + 1);

    if (state.showing) {
      best = Math.max(best, Math.round(92 + stability * 8));
      continue;
    }

    if (state.isTracking) {
      best = Math.max(best, Math.round(58 + stability * 34));
      continue;
    }

    if (hits > 0) {
      best = Math.max(best, Math.min(48, Math.round(12 + hits * 4 + stability * 10)));
    }
  }

  return Math.min(99, Math.max(0, best));
};

/** Smooth toward a target percent for a calmer on-screen readout. */
export const smoothMatchPercent = (current: number, target: number, alpha = 0.28): number => {
  if (target >= 95) return Math.max(current, target);
  if (target === 0) return Math.max(0, current * 0.82);
  return current + (target - current) * alpha;
};
