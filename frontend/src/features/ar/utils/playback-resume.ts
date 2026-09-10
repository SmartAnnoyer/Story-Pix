/** Resume position for the last soft-paused AR video (same clip only). */

let saved: { key: string; time: number } | null = null;

export const saveVideoResumePosition = (key: string, time: number): void => {
  if (!key || !Number.isFinite(time)) return;
  const clamped = Math.max(0, time);
  // Near the start — treat as fresh play next time.
  if (clamped < 0.35) {
    if (saved?.key === key) saved = null;
    return;
  }
  saved = { key, time: clamped };
};

export const peekVideoResumePosition = (key: string): number | null => {
  if (!saved || saved.key !== key) return null;
  return saved.time;
};

/** Clear all, or only if it matches `key`. */
export const clearVideoResumePosition = (key?: string): void => {
  if (!key) {
    saved = null;
    return;
  }
  if (saved?.key === key) saved = null;
};

/** When focusing a different clip, drop any saved resume for another video. */
export const clearVideoResumeIfDifferent = (nextKey: string): void => {
  if (saved && saved.key !== nextKey) saved = null;
};
