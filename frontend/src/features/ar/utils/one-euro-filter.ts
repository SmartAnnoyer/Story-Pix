const smoothingFactor = (dtSec: number, cutoffHz: number) => {
  const r = 2 * Math.PI * cutoffHz * dtSec;
  return r / (r + 1);
};

/**
 * One Euro filter (Casiez et al.) over a fixed-length vector, time in seconds.
 * Heavy smoothing when still (kills jitter), light smoothing when moving fast (no lag).
 * All components share one cutoff driven by the fastest component, so a quad keeps its
 * shape instead of corners lagging by different amounts.
 */
export class OneEuroVectorFilter {
  private prev: number[] | null = null;
  private dPrev: number[] | null = null;
  private tPrev = 0;

  constructor(
    private readonly minCutoffHz: number,
    private readonly beta: number,
    private readonly dCutoffHz = 1,
  ) {}

  reset(): void {
    this.prev = null;
    this.dPrev = null;
  }

  filter(values: number[], timeSec: number): number[] {
    const prev = this.prev;
    const dPrev = this.dPrev;
    if (!prev || !dPrev || prev.length !== values.length) {
      this.prev = values.slice();
      this.dPrev = values.map(() => 0);
      this.tPrev = timeSec;
      return values.slice();
    }

    const dt = Math.min(0.25, Math.max(1 / 240, timeSec - this.tPrev));
    const dAlpha = smoothingFactor(dt, this.dCutoffHz);
    const derivative = values.map((value, index) => {
      const raw = (value - prev[index]) / dt;
      return dAlpha * raw + (1 - dAlpha) * dPrev[index];
    });
    const speed = derivative.reduce((max, value) => Math.max(max, Math.abs(value)), 0);
    const alpha = smoothingFactor(dt, this.minCutoffHz + this.beta * speed);
    const next = values.map((value, index) => alpha * value + (1 - alpha) * prev[index]);

    this.prev = next;
    this.dPrev = derivative;
    this.tPrev = timeSec;
    return next;
  }
}
