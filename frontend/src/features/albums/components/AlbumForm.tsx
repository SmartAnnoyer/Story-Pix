import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { Alert, Button, Col, Form, Input, Row, Select } from 'antd';
import type { CreateAlbumPayload, UpdateAlbumPayload } from '@/types/album.types';
import { EVENT_TYPE_LABELS, EventType } from '@/types/album.types';

const schema = z.object({
  albumName: z.string().min(2, 'Album name is required'),
  eventType: z.nativeEnum(EventType),
  customerName: z.string().min(2, 'Customer name is required'),
  customerPhone: z.string().optional(),
  customerEmail: z.string().email('Enter a valid email').optional().or(z.literal('')),
  eventDate: z.string().min(1, 'Event date is required'),
  coverImage: z.string().url('Enter a valid URL').optional().or(z.literal('')),
  description: z.string().max(2000).optional(),
});

type FormValues = z.infer<typeof schema>;

type AlbumFormProps =
  | {
      mode: 'create';
      initialValues?: Partial<FormValues>;
      onSubmit: (values: CreateAlbumPayload) => Promise<void>;
      isSubmitting?: boolean;
      errorMessage?: string;
    }
  | {
      mode: 'edit';
      initialValues?: Partial<FormValues>;
      onSubmit: (values: UpdateAlbumPayload) => Promise<void>;
      isSubmitting?: boolean;
      errorMessage?: string;
    };

export const AlbumForm = ({ mode, initialValues, onSubmit, isSubmitting, errorMessage }: AlbumFormProps) => {
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      albumName: '',
      eventType: EventType.WEDDING,
      customerName: '',
      customerPhone: '',
      customerEmail: '',
      eventDate: '',
      coverImage: '',
      description: '',
      ...initialValues,
    },
  });

  return (
    <Form layout="vertical" onFinish={handleSubmit((values) => onSubmit(values as never))} className="max-w-3xl">
      {errorMessage ? <Alert type="error" message={errorMessage} className="mb-4" showIcon /> : null}

      <Row gutter={16}>
        <Col xs={24} md={12}>
          <Form.Item
            label="Album Name"
            validateStatus={errors.albumName ? 'error' : ''}
            help={errors.albumName?.message}
          >
            <Controller
              name="albumName"
              control={control}
              render={({ field }) => <Input {...field} placeholder="Priya & Rahul Wedding" />}
            />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item
            label="Event Type"
            validateStatus={errors.eventType ? 'error' : ''}
            help={errors.eventType?.message}
          >
            <Controller
              name="eventType"
              control={control}
              render={({ field }) => (
                <Select
                  {...field}
                  options={Object.values(EventType).map((value) => ({
                    value,
                    label: EVENT_TYPE_LABELS[value],
                  }))}
                />
              )}
            />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item
            label="Customer Name"
            validateStatus={errors.customerName ? 'error' : ''}
            help={errors.customerName?.message}
          >
            <Controller
              name="customerName"
              control={control}
              render={({ field }) => <Input {...field} placeholder="Customer name" />}
            />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item label="Event Date" validateStatus={errors.eventDate ? 'error' : ''} help={errors.eventDate?.message}>
            <Controller
              name="eventDate"
              control={control}
              render={({ field }) => <Input {...field} type="date" />}
            />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item label="Customer Phone">
            <Controller name="customerPhone" control={control} render={({ field }) => <Input {...field} />} />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item
            label="Customer Email"
            validateStatus={errors.customerEmail ? 'error' : ''}
            help={errors.customerEmail?.message}
          >
            <Controller name="customerEmail" control={control} render={({ field }) => <Input {...field} />} />
          </Form.Item>
        </Col>
        <Col xs={24}>
          <Form.Item label="Cover Image URL" validateStatus={errors.coverImage ? 'error' : ''} help={errors.coverImage?.message}>
            <Controller name="coverImage" control={control} render={({ field }) => <Input {...field} placeholder="https://..." />} />
          </Form.Item>
        </Col>
        <Col xs={24}>
          <Form.Item label="Description">
            <Controller
              name="description"
              control={control}
              render={({ field }) => <Input.TextArea {...field} rows={3} placeholder="Album description" />}
            />
          </Form.Item>
        </Col>
      </Row>

      <Button type="primary" htmlType="submit" loading={isSubmitting}>
        {mode === 'create' ? 'Create Album' : 'Save Changes'}
      </Button>
    </Form>
  );
};
