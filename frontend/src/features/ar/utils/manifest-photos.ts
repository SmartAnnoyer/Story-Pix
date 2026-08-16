import type { ViewerManifestTarget } from '@/types/ar-target.types';

/** Unique tracking photos in MindAR order (shared targetIndex per print). */
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

export const mappingsForMindIndex = (
  targets: ViewerManifestTarget[],
  mindIndex: number,
): ViewerManifestTarget[] =>
  [...targets]
    .filter((target) => target.targetIndex === mindIndex)
    .sort((a, b) => a.targetName.localeCompare(b.targetName));
