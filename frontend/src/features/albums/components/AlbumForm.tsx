import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { Alert, Button, Form, Input } from 'antd';
import type { CreateAlbumPayload, UpdateAlbumPayload } from '@/types/album.types';

const schema = z.object({
  albumName: z.string().min(2, 'Album name is required'),
  customerName: z.string().min(2, 'Client name is required'),
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

export const AlbumForm = ({
  mode,
  initialValues,
  onSubmit,
  isSubmitting,
  errorMessage,
}: AlbumFormProps) => {
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      albumName: '',
      customerName: '',
      ...initialValues,
    },
  });

  return (
    <Form
      layout="vertical"
      onFinish={handleSubmit((values) => onSubmit(values as never))}
      className="max-w-xl"
    >
      {errorMessage ? (
        <Alert type="error" message={errorMessage} className="mb-4" showIcon />
      ) : null}

      <Form.Item
        label="Album name"
        extra="The event you are delivering — so you can find it later."
        validateStatus={errors.albumName ? 'error' : ''}
        help={errors.albumName?.message}
      >
        <Controller
          name="albumName"
          control={control}
          render={({ field }) => <Input {...field} placeholder="Priya & Rahul Wedding" />}
        />
      </Form.Item>

      <Form.Item
        label="Client name"
        extra="Who this album is for."
        validateStatus={errors.customerName ? 'error' : ''}
        help={errors.customerName?.message}
      >
        <Controller
          name="customerName"
          control={control}
          render={({ field }) => <Input {...field} placeholder="Client name" />}
        />
      </Form.Item>

      <Button type="primary" htmlType="submit" loading={isSubmitting}>
        {mode === 'create' ? 'Next: add photos' : 'Save'}
      </Button>
    </Form>
  );
};
