import { useEffect, useRef, useState } from 'react';
import { Form, Input, Select, Button, Space, message } from 'antd';
import type { MediaItem, OverlayFrame } from '@/types/media.types';
import { MediaType } from '@/types/media.types';
import { FrameSelector } from '@/features/media/components/FrameSelector';
import { clampOverlayFrame, DEFAULT_OVERLAY_FRAME } from '@/features/ar/utils/overlay-frame';
import { useUpdateMediaMutation } from '@/hooks/useMediaQueries';
import { getErrorMessage } from '@/api/client';

export interface MappingFormValues {
  targetName: string;
  photoMediaId: string;
  videoMediaId: string;
  overlayFrame: OverlayFrame;
}

interface MappingFormProps {
  photos: MediaItem[];
  videos: MediaItem[];
  initialValues?: Partial<MappingFormValues>;
  loading?: boolean;
  submitLabel?: string;
  onSubmit: (values: MappingFormValues) => void;
  onCancel?: () => void;
}

export const MappingForm = ({
  photos,
  videos,
  initialValues,
  loading,
  submitLabel = 'Save Mapping',
  onSubmit,
  onCancel,
}: MappingFormProps) => {
  const [form] = Form.useForm<Omit<MappingFormValues, 'overlayFrame'>>();
  const photoMediaId = Form.useWatch('photoMediaId', form);
  const videoMediaId = Form.useWatch('videoMediaId', form);
  const [overlayFrame, setOverlayFrame] = useState<OverlayFrame>(
    clampOverlayFrame(initialValues?.overlayFrame ?? DEFAULT_OVERLAY_FRAME),
  );
  const [photoLabel, setPhotoLabel] = useState('');
  const [videoLabel, setVideoLabel] = useState('');
  const updateMediaMutation = useUpdateMediaMutation();

  const readyPhotos = photos.filter((item) => item.mediaType === MediaType.PHOTO);
  const readyVideos = videos.filter((item) => item.mediaType === MediaType.VIDEO);
  const selectedPhoto = readyPhotos.find((photo) => photo.id === photoMediaId);
  const selectedVideo = readyVideos.find((video) => video.id === videoMediaId);
  const photoPreview = selectedPhoto?.publicUrl ?? selectedPhoto?.thumbnailUrl ?? null;

  const photosRef = useRef(photos);
  photosRef.current = photos;

  useEffect(() => {
    if (!photoMediaId) return;
    const photo = photosRef.current.find((item) => item.id === photoMediaId);
    const fromMapping =
      photoMediaId === initialValues?.photoMediaId ? initialValues.overlayFrame : undefined;
    setOverlayFrame(clampOverlayFrame(fromMapping ?? photo?.overlayFrame));

    if (!initialValues?.targetName && photo && !form.getFieldValue('targetName')) {
      form.setFieldValue('targetName', photo.originalFileName.replace(/\.[^.]+$/, '') || 'Photo');
    }
  }, [
    photoMediaId,
    form,
    initialValues?.photoMediaId,
    initialValues?.overlayFrame,
    initialValues?.targetName,
  ]);

  useEffect(() => {
    setPhotoLabel(selectedPhoto?.originalFileName ?? '');
  }, [selectedPhoto?.id, selectedPhoto?.originalFileName]);

  useEffect(() => {
    setVideoLabel(selectedVideo?.originalFileName ?? '');
  }, [selectedVideo?.id, selectedVideo?.originalFileName]);

  const renameMedia = async (
    mediaId: string,
    originalFileName: string,
    kind: 'Photo' | 'Video',
  ) => {
    const trimmed = originalFileName.trim();
    if (!trimmed) {
      message.warning(`Enter a ${kind.toLowerCase()} name`);
      return;
    }
    try {
      await updateMediaMutation.mutateAsync({ id: mediaId, originalFileName: trimmed });
      message.success(`${kind} renamed`);
    } catch (error) {
      message.error(getErrorMessage(error, `${kind} rename failed`));
    }
  };

  return (
    <Form
      form={form}
      layout="vertical"
      initialValues={initialValues}
      onFinish={(values) =>
        onSubmit({
          ...values,
          overlayFrame: clampOverlayFrame(overlayFrame),
        })
      }
      requiredMark={false}
    >
      <Form.Item
        name="targetName"
        label="Name"
        extra="Only you see this — to find it later."
        rules={[{ required: true, message: 'Enter a name' }]}
      >
        <Input placeholder="e.g. First dance" maxLength={120} />
      </Form.Item>

      <Form.Item
        name="photoMediaId"
        label="Printed photo"
        extra="Guests point their phone at this photo."
        rules={[{ required: true, message: 'Select a photo' }]}
      >
        <Select
          placeholder={readyPhotos.length ? 'Select photo' : 'Upload a photo first'}
          disabled={readyPhotos.length === 0}
          options={readyPhotos.map((photo) => ({
            value: photo.id,
            label: photo.originalFileName,
          }))}
          showSearch
          optionFilterProp="label"
          notFoundContent="No photos yet — upload them on Photos & videos"
        />
      </Form.Item>

      {selectedPhoto ? (
        <Form.Item label="Photo name" extra="Rename if uploads look alike.">
          <Space.Compact className="!w-full">
            <Input
              value={photoLabel}
              maxLength={255}
              placeholder="Name shown in the list"
              onChange={(event) => setPhotoLabel(event.target.value)}
            />
            <Button
              loading={updateMediaMutation.isPending}
              disabled={!photoLabel.trim() || photoLabel.trim() === selectedPhoto.originalFileName}
              onClick={() => void renameMedia(selectedPhoto.id, photoLabel, 'Photo')}
            >
              Rename
            </Button>
          </Space.Compact>
        </Form.Item>
      ) : null}

      {photoPreview ? (
        <Form.Item label="Video plays inside this frame">
          <p className="mb-2 text-sm text-neutral-500">
            Drag the rectangle onto the printed frame. Guests will see the video stay inside it as
            they move the photo.
          </p>
          <FrameSelector imageSrc={photoPreview} value={overlayFrame} onChange={setOverlayFrame} />
        </Form.Item>
      ) : null}

      <Form.Item
        name="videoMediaId"
        label="Video that plays"
        extra="This is what they see on the print."
        rules={[{ required: true, message: 'Select a video' }]}
      >
        <Select
          placeholder={readyVideos.length ? 'Select video' : 'Upload a video first'}
          disabled={readyVideos.length === 0}
          options={readyVideos.map((video) => ({
            value: video.id,
            label: video.originalFileName,
          }))}
          showSearch
          optionFilterProp="label"
          notFoundContent="No videos yet — upload them on Photos & videos"
        />
      </Form.Item>

      {selectedVideo ? (
        <Form.Item label="Video name" extra="Rename if uploads look alike.">
          <Space.Compact className="!w-full">
            <Input
              value={videoLabel}
              maxLength={255}
              placeholder="Name shown in the list"
              onChange={(event) => setVideoLabel(event.target.value)}
            />
            <Button
              loading={updateMediaMutation.isPending}
              disabled={!videoLabel.trim() || videoLabel.trim() === selectedVideo.originalFileName}
              onClick={() => void renameMedia(selectedVideo.id, videoLabel, 'Video')}
            >
              Rename
            </Button>
          </Space.Compact>
        </Form.Item>
      ) : null}

      <Space>
        <Button type="primary" htmlType="submit" loading={loading}>
          {submitLabel}
        </Button>
        {onCancel ? <Button onClick={onCancel}>Cancel</Button> : null}
      </Space>
    </Form>
  );
};
