import type { ViewerManifestTarget } from '@/types/ar-target.types';

/** Unique tracking photos in MindAR order (dense 0..N-1 compile / scene order). */
export const uniqueTrackingPhotos = (targets: ViewerManifestTarget[]): ViewerManifestTarget[] => {
  const seen = new Set<string>();
  const photos: ViewerManifestTarget[] = [];
  const sorted = [...targets].sort((a, b) => a.targetIndex - b.targetIndex);

  for (const target of sorted) {
    if (seen.has(target.photoMediaId)) continue;
    seen.add(target.photoMediaId);
    photos.push(target);
  }

  return photos;
};

/**
 * Resolve mappings for a MindAR dense index (0..N-1 from uniqueTrackingPhotos order).
 * Prefer photoMediaId over sparse DB targetIndex so gaps / stale indices cannot swap videos.
 */
export const mappingsForMindIndex = (
  targets: ViewerManifestTarget[],
  mindIndex: number,
): ViewerManifestTarget[] => {
  const photos = uniqueTrackingPhotos(targets);
  const photo = photos[mindIndex];
  if (!photo) return [];

  return [...targets]
    .filter((target) => target.photoMediaId === photo.photoMediaId)
    .sort((a, b) => a.targetName.localeCompare(b.targetName));
};
