import { useCallback, useMemo, useState } from 'react';
import { Alert, Button, Empty, Input, Typography, message } from 'antd';
import {
  ArrowRightOutlined,
  DeleteOutlined,
  DragOutlined,
  PictureOutlined,
  VideoCameraOutlined,
} from '@ant-design/icons';
import type { MediaItem, OverlayFrame } from '@/types/media.types';
import { MediaType } from '@/types/media.types';
import { FrameSelector } from '@/features/media/components/FrameSelector';
import { MappingPickerTile } from '@/features/ar/components/MappingPickerTile';
import {
  StudioMediaThumbnail,
  useStudioMediaPreviewSrc,
} from '@/features/media/components/StudioMediaThumbnail';
import { clampOverlayFrame, DEFAULT_OVERLAY_FRAME } from '@/features/ar/utils/overlay-frame';
import './MappingWorkspace.css';

const { Text, Title } = Typography;

export interface MappingFormValues {
  targetName: string;
  photoMediaId: string;
  videoMediaId: string;
  overlayFrame: OverlayFrame;
}

export type PendingMapping = MappingFormValues & {
  key: string;
};

interface MappingWorkspaceProps {
  photos: MediaItem[];
  videos: MediaItem[];
  initialMappings?: PendingMapping[];
  loading?: boolean;
  submitLabel?: string;
  singleMapping?: boolean;
  onSubmit: (values: MappingFormValues[]) => void;
  onCancel?: () => void;
}

const nameFromPair = (photo?: MediaItem, video?: MediaItem) => {
  const photoName = (photo?.originalFileName ?? 'Photo').replace(/\.[^.]+$/, '').trim() || 'Photo';
  const videoName = (video?.originalFileName ?? '').replace(/\.[^.]+$/, '').trim();
  return videoName ? `${photoName} → ${videoName}` : photoName;
};

const pairKey = (photoMediaId: string, videoMediaId: string) => `${photoMediaId}:${videoMediaId}`;

const createPendingMapping = (
  photo: MediaItem,
  video: MediaItem,
  overlayFrame?: OverlayFrame,
): PendingMapping => ({
  key: pairKey(photo.id, video.id),
  photoMediaId: photo.id,
  videoMediaId: video.id,
  targetName: nameFromPair(photo, video),
  overlayFrame: clampOverlayFrame(overlayFrame ?? photo.overlayFrame ?? DEFAULT_OVERLAY_FRAME),
});

export const MappingWorkspace = ({
  photos,
  videos,
  initialMappings = [],
  loading,
  submitLabel = 'Save mappings',
  singleMapping = false,
  onSubmit,
  onCancel,
}: MappingWorkspaceProps) => {
  const readyPhotos = useMemo(
    () => photos.filter((item) => item.mediaType === MediaType.PHOTO),
    [photos],
  );
  const readyVideos = useMemo(
    () => videos.filter((item) => item.mediaType === MediaType.VIDEO),
    [videos],
  );

  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);
  const [pendingMappings, setPendingMappings] = useState<PendingMapping[]>(initialMappings);
  const [activeMappingKey, setActiveMappingKey] = useState<string | null>(
    initialMappings[0]?.key ?? null,
  );
  const [dropVideoId, setDropVideoId] = useState<string | null>(null);

  const photoById = useMemo(
    () => new Map(readyPhotos.map((photo) => [photo.id, photo])),
    [readyPhotos],
  );
  const videoById = useMemo(
    () => new Map(readyVideos.map((video) => [video.id, video])),
    [readyVideos],
  );

  const mappedPairKeys = useMemo(
    () => new Set(pendingMappings.map((item) => item.key)),
    [pendingMappings],
  );

  const photoMappedCounts = useMemo(() => {
    const counts = new Map<string, number>();
    pendingMappings.forEach((mapping) => {
      counts.set(mapping.photoMediaId, (counts.get(mapping.photoMediaId) ?? 0) + 1);
    });
    return counts;
  }, [pendingMappings]);

  const videoMappedCounts = useMemo(() => {
    const counts = new Map<string, number>();
    pendingMappings.forEach((mapping) => {
      counts.set(mapping.videoMediaId, (counts.get(mapping.videoMediaId) ?? 0) + 1);
    });
    return counts;
  }, [pendingMappings]);

  const addMapping = useCallback(
    (photoMediaId: string, videoMediaId: string) => {
      const photo = photoById.get(photoMediaId);
      const video = videoById.get(videoMediaId);
      if (!photo || !video) return;

      const key = pairKey(photoMediaId, videoMediaId);
      if (mappedPairKeys.has(key)) {
        message.info('This photo and video are already mapped together.');
        setActiveMappingKey(key);
        return;
      }

      const nextMapping = createPendingMapping(photo, video);
      setPendingMappings((current) => {
        if (singleMapping) return [nextMapping];
        return [...current, nextMapping];
      });
      setActiveMappingKey(key);
      setSelectedPhotoId(null);
      message.success('Added to mapped list');
    },
    [mappedPairKeys, photoById, singleMapping, videoById],
  );

  const handlePhotoSelect = (photoId: string) => {
    setSelectedPhotoId((current) => (current === photoId ? null : photoId));
  };

  const handleVideoSelect = (videoId: string) => {
    if (!selectedPhotoId) {
      message.info('Select a photo first, then tap a video to map.');
      return;
    }
    addMapping(selectedPhotoId, videoId);
  };

  const removeMapping = (key: string) => {
    setPendingMappings((current) => current.filter((item) => item.key !== key));
    setActiveMappingKey((current) => (current === key ? null : current));
  };

  const updateMapping = (key: string, patch: Partial<PendingMapping>) => {
    setPendingMappings((current) =>
      current.map((item) => (item.key === key ? { ...item, ...patch } : item)),
    );
  };

  const handleSubmit = () => {
    if (!pendingMappings.length) {
      message.warning('Map at least one photo to a video.');
      return;
    }
    const invalid = pendingMappings.find((item) => !item.targetName.trim());
    if (invalid) {
      message.warning('Give each mapping a name.');
      setActiveMappingKey(invalid.key);
      return;
    }
    onSubmit(
      pendingMappings.map(({ targetName, photoMediaId, videoMediaId, overlayFrame }) => ({
        targetName: targetName.trim(),
        photoMediaId,
        videoMediaId,
        overlayFrame: clampOverlayFrame(overlayFrame),
      })),
    );
  };

  const activeMapping = useMemo(
    () => pendingMappings.find((item) => item.key === activeMappingKey) ?? null,
    [pendingMappings, activeMappingKey],
  );
  const activePhoto = activeMapping ? photoById.get(activeMapping.photoMediaId) : undefined;
  const activePhotoSrc = useStudioMediaPreviewSrc(activePhoto, 'original');

  return (
    <div className="mapping-workspace">
      <div className="mapping-workspace__pickers">
        <section className="mapping-workspace__section">
          <div className="mapping-workspace__section-head">
            <Title level={5} className="mapping-workspace__section-title">
              <PictureOutlined /> Photos
            </Title>
            <Text type="secondary" className="text-xs">
              {readyPhotos.length} ready
            </Text>
          </div>
          <p className="mapping-workspace__hint">
            Tap a photo, then tap a video below — or drag a photo onto a video tile.
            {selectedPhotoId ? ' Now choose a video.' : ''}
          </p>
          {readyPhotos.length ? (
            <div className="mapping-workspace__grid">
              {readyPhotos.map((photo) => (
                <MappingPickerTile
                  key={photo.id}
                  item={photo}
                  selected={selectedPhotoId === photo.id}
                  mappedCount={photoMappedCounts.get(photo.id) ?? 0}
                  draggable
                  onSelect={() => handlePhotoSelect(photo.id)}
                />
              ))}
            </div>
          ) : (
            <Empty description="Upload photos first" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          )}
        </section>

        <section className="mapping-workspace__section">
          <div className="mapping-workspace__section-head">
            <Title level={5} className="mapping-workspace__section-title">
              <VideoCameraOutlined /> Videos
            </Title>
            <Text type="secondary" className="text-xs">
              {readyVideos.length} ready
            </Text>
          </div>
          <p className="mapping-workspace__hint">
            <DragOutlined /> Drop a photo here, or tap after selecting a photo above.
          </p>
          {readyVideos.length ? (
            <div className="mapping-workspace__grid">
              {readyVideos.map((video) => (
                <MappingPickerTile
                  key={video.id}
                  item={video}
                  mappedCount={videoMappedCounts.get(video.id) ?? 0}
                  dropHighlight={dropVideoId === video.id}
                  droppable
                  onSelect={() => handleVideoSelect(video.id)}
                  onPhotoDrop={(photoId) => addMapping(photoId, video.id)}
                  onDragEnterTile={() => setDropVideoId(video.id)}
                  onDragLeaveTile={() =>
                    setDropVideoId((current) => (current === video.id ? null : current))
                  }
                />
              ))}
            </div>
          ) : (
            <Empty description="Upload videos first" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          )}
        </section>
      </div>

      <aside className="mapping-workspace__mapped">
        <div className="mapping-workspace__section-head">
          <Title level={5} className="mapping-workspace__section-title">
            Mapped
          </Title>
          <Text type="secondary" className="text-xs">
            {pendingMappings.length} pair{pendingMappings.length === 1 ? '' : 's'}
          </Text>
        </div>
        <p className="mapping-workspace__hint">
          One photo can map to several videos. Tap a pair to adjust the playback frame.
        </p>

        {pendingMappings.length ? (
          pendingMappings.map((mapping) => {
            const photo = photoById.get(mapping.photoMediaId);
            const video = videoById.get(mapping.videoMediaId);
            const isActive = mapping.key === activeMappingKey;

            return (
              <div
                key={mapping.key}
                className={['mapping-pair-card', isActive ? 'mapping-pair-card--active' : '']
                  .filter(Boolean)
                  .join(' ')}
              >
                <button
                  type="button"
                  className="mapping-pair-card__row w-full border-0 bg-transparent p-0 text-left"
                  onClick={() => setActiveMappingKey(mapping.key)}
                >
                  <div className="mapping-pair-card__media">
                    <div className="mapping-pair-card__thumb">
                      {photo ? <StudioMediaThumbnail item={photo} variant="thumbnail" /> : null}
                    </div>
                    <Text ellipsis className="mapping-pair-card__label">
                      {photo?.originalFileName ?? 'Photo'}
                    </Text>
                  </div>
                  <ArrowRightOutlined className="mapping-pair-card__arrow" />
                  <div className="mapping-pair-card__media">
                    <div className="mapping-pair-card__thumb">
                      {video ? <StudioMediaThumbnail item={video} variant="thumbnail" /> : null}
                    </div>
                    <Text ellipsis className="mapping-pair-card__label">
                      {video?.originalFileName ?? 'Video'}
                    </Text>
                  </div>
                  <Button
                    type="text"
                    danger
                    size="small"
                    icon={<DeleteOutlined />}
                    aria-label="Remove mapping"
                    onClick={(event) => {
                      event.stopPropagation();
                      removeMapping(mapping.key);
                    }}
                  />
                </button>

                {isActive ? (
                  <>
                    <Input
                      className="mapping-pair-card__name"
                      value={mapping.targetName}
                      maxLength={120}
                      placeholder="Mapping name"
                      onChange={(event) =>
                        updateMapping(mapping.key, { targetName: event.target.value })
                      }
                    />
                    {isActive && activePhotoSrc ? (
                      <div className="mapping-pair-card__frame">
                        <Text type="secondary" className="mb-2 block text-xs">
                          Drag the rectangle to where the video should play on the print.
                        </Text>
                        <FrameSelector
                          imageSrc={activePhotoSrc}
                          value={mapping.overlayFrame}
                          onChange={(overlayFrame) => updateMapping(mapping.key, { overlayFrame })}
                        />
                      </div>
                    ) : null}
                  </>
                ) : null}
              </div>
            );
          })
        ) : (
          <div className="mapping-workspace__empty">
            Mapped pairs appear here after you connect a photo and video.
          </div>
        )}

        {!singleMapping && pendingMappings.length > 1 ? (
          <Alert
            className="!mt-3"
            type="info"
            showIcon
            message="Same photo, multiple videos"
            description="Reuse a photo in the picker to attach more than one video to the same print."
          />
        ) : null}
      </aside>

      <div className="mapping-workspace__footer lg:col-span-2">
        <Button type="primary" loading={loading} onClick={handleSubmit}>
          {submitLabel}
        </Button>
        {onCancel ? <Button onClick={onCancel}>Cancel</Button> : null}
      </div>
    </div>
  );
};
