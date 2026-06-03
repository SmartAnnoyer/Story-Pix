import { Form, Input, Select, Button, Space } from 'antd';
import type { MediaItem } from '@/types/media.types';
import { MediaType } from '@/types/media.types';

export interface MappingFormValues {
  targetName: string;
  photoMediaId: string;
  videoMediaId: string;
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
  const [form] = Form.useForm<MappingFormValues>();

  const readyPhotos = photos.filter((item) => item.mediaType === MediaType.PHOTO);
  const readyVideos = videos.filter((item) => item.mediaType === MediaType.VIDEO);

  return (
    <Form
      form={form}
      layout="vertical"
      initialValues={initialValues}
      onFinish={onSubmit}
      requiredMark={false}
    >
      <Form.Item
        name="targetName"
        label="Mapping Name"
        rules={[{ required: true, message: 'Enter a mapping name' }]}
      >
        <Input placeholder="e.g. First Dance" maxLength={120} />
      </Form.Item>

      <Form.Item
        name="photoMediaId"
        label="Photo"
        rules={[{ required: true, message: 'Select a photo' }]}
      >
        <Select
          placeholder={readyPhotos.length ? 'Select photo' : 'Upload photos in Manage Media first'}
          disabled={readyPhotos.length === 0}
          options={readyPhotos.map((photo) => ({
            value: photo.id,
            label: photo.originalFileName,
          }))}
          showSearch
          optionFilterProp="label"
          notFoundContent="No ready photos — upload on the album Media page"
        />
      </Form.Item>

      <Form.Item
        name="videoMediaId"
        label="Video"
        rules={[{ required: true, message: 'Select a video' }]}
      >
        <Select
          placeholder={readyVideos.length ? 'Select video' : 'Upload videos in Manage Media first'}
          disabled={readyVideos.length === 0}
          options={readyVideos.map((video) => ({
            value: video.id,
            label: video.originalFileName,
          }))}
          showSearch
          optionFilterProp="label"
          notFoundContent="No ready videos — upload on the album Media page"
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
