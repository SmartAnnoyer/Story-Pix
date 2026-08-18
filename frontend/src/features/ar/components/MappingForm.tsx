import { useEffect, useRef, useState } from 'react';
import { Form, Input, Select, Button, Space } from 'antd';
import type { MediaItem, OverlayFrame } from '@/types/media.types';
import { MediaType } from '@/types/media.types';
import { FrameSelector } from '@/features/media/components/FrameSelector';
import { clampOverlayFrame, DEFAULT_OVERLAY_FRAME } from '@/features/ar/utils/overlay-frame';

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
  const [overlayFrame, setOverlayFrame] = useState<OverlayFrame>(
    clampOverlayFrame(initialValues?.overlayFrame ?? DEFAULT_OVERLAY_FRAME),
  );

  const readyPhotos = photos.filter((item) => item.mediaType === MediaType.PHOTO);
  const readyVideos = videos.filter((item) => item.mediaType === MediaType.VIDEO);
  const selectedPhoto = readyPhotos.find((photo) => photo.id === photoMediaId);
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

      <Space>
        <Button type="primary" htmlType="submit" loading={loading}>
          {submitLabel}
        </Button>
        {onCancel ? <Button onClick={onCancel}>Cancel</Button> : null}
      </Space>
    </Form>
  );
};
