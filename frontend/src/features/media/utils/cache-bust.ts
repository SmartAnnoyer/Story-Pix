/** Bust CDN/browser cache after in-place thumbnail overwrites. */
export const withCacheBust = (url: string | null | undefined): string | null => {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    parsed.searchParams.set('v', String(Date.now()));
    return parsed.toString();
  } catch {
    const join = url.includes('?') ? '&' : '?';
    return `${url}${join}v=${Date.now()}`;
  }
};

export const stripFileExtension = (name: string): string => name.replace(/\.[^.]+$/, '') || name;

export const applyDisplayName = (file: File, displayName: string): File => {
  const trimmed = displayName.trim();
  if (!trimmed) return file;
  const extMatch = file.name.match(/(\.[^.]+)$/);
  const ext = extMatch?.[1] ?? '';
  const next = /\.[^.]+$/.test(trimmed) ? trimmed : `${trimmed}${ext}`;
  if (next === file.name) return file;
  return new File([file], next, { type: file.type, lastModified: file.lastModified });
};
