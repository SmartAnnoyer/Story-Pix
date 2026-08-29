import { useMemo } from 'react';
import type { MediaItem } from '@/types/media.types';
import {
  MappingWorkspace,
  type MappingFormValues,
  type PendingMapping,
} from '@/features/ar/components/MappingWorkspace';
import { clampOverlayFrame, DEFAULT_OVERLAY_FRAME } from '@/features/ar/utils/overlay-frame';

export type { MappingFormValues, PendingMapping };

interface MappingFormProps {
  photos: MediaItem[];
  videos: MediaItem[];
  initialValues?: Partial<MappingFormValues>;
  initialMappings?: PendingMapping[];
  loading?: boolean;
  submitLabel?: string;
  singleMapping?: boolean;
  onSubmit?: (values: MappingFormValues) => void;
  onSubmitBatch?: (values: MappingFormValues[]) => void;
  onCancel?: () => void;
}

const toPendingMapping = (
  values: Partial<MappingFormValues>,
  photos: MediaItem[],
  videos: MediaItem[],
): PendingMapping | null => {
  if (!values.photoMediaId || !values.videoMediaId) return null;
  const photo = photos.find((item) => item.id === values.photoMediaId);
  const video = videos.find((item) => item.id === values.videoMediaId);
  if (!photo || !video) return null;

  return {
    key: `${values.photoMediaId}:${values.videoMediaId}`,
    targetName:
      values.targetName ?? (photo.originalFileName.replace(/\.[^.]+$/, '').trim() || 'Photo'),
    photoMediaId: values.photoMediaId,
    videoMediaId: values.videoMediaId,
    overlayFrame: clampOverlayFrame(
      values.overlayFrame ?? photo.overlayFrame ?? DEFAULT_OVERLAY_FRAME,
    ),
  };
};

export const MappingForm = ({
  photos,
  videos,
  initialValues,
  initialMappings,
  loading,
  submitLabel,
  singleMapping = false,
  onSubmit,
  onSubmitBatch,
  onCancel,
}: MappingFormProps) => {
  const seedMappings = useMemo(() => {
    if (initialMappings?.length) return initialMappings;
    const pending = initialValues ? toPendingMapping(initialValues, photos, videos) : null;
    return pending ? [pending] : [];
  }, [initialMappings, initialValues, photos, videos]);

  const workspaceKey =
    seedMappings[0]?.key ??
    (initialValues?.photoMediaId && initialValues?.videoMediaId
      ? `${initialValues.photoMediaId}:${initialValues.videoMediaId}`
      : 'create');

  return (
    <MappingWorkspace
      key={workspaceKey}
      photos={photos}
      videos={videos}
      initialMappings={seedMappings}
      loading={loading}
      submitLabel={submitLabel}
      singleMapping={singleMapping}
      onCancel={onCancel}
      onSubmit={(values) => {
        if (onSubmitBatch) {
          onSubmitBatch(values);
          return;
        }
        const first = values[0];
        if (first && onSubmit) onSubmit(first);
      }}
    />
  );
};
