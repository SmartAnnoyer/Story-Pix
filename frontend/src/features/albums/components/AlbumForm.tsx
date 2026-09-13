import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { Alert, Button, Form, Input } from 'antd';
import type { CreateAlbumPayload, UpdateAlbumPayload } from '@/types/album.types';

const createSchema = z.object({
  albumName: z.string().min(2, 'Please enter an album name'),
  customerName: z.string().min(2, 'Please enter the client name'),
});

const editSchema = z.object({
  albumName: z.string().min(2, 'Please enter an album name'),
  customerName: z.string().min(2, 'Please enter the client name'),
});

type CreateFormValues = z.infer<typeof createSchema>;
type EditFormValues = z.infer<typeof editSchema>;

type AlbumFormProps =
  | {
      mode: 'create';
      remainingMappingSlots?: number;
      initialValues?: Partial<CreateFormValues>;
      onSubmit: (values: CreateAlbumPayload) => Promise<void>;
      isSubmitting?: boolean;
      errorMessage?: string;
    }
  | {
      mode: 'edit';
      remainingMappingSlots?: number;
      initialValues?: Partial<EditFormValues>;
      onSubmit: (values: UpdateAlbumPayload) => Promise<void>;
      isSubmitting?: boolean;
      errorMessage?: string;
    };

export const AlbumForm = (props: AlbumFormProps) => {
  const { mode, initialValues, onSubmit, isSubmitting, errorMessage } = props;
  const remainingMappingSlots = props.remainingMappingSlots;

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateFormValues | EditFormValues>({
    resolver: zodResolver(mode === 'create' ? createSchema : editSchema),
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
      className="max-w-xl create-album-form"
    >
      {errorMessage ? (
        <Alert type="error" message={errorMessage} className="mb-4" showIcon />
      ) : null}

      {mode === 'create' && remainingMappingSlots != null && remainingMappingSlots <= 0 ? (
        <Alert
          type="warning"
          showIcon
          className="mb-4"
          message="No photos left — buy a pack first"
        />
      ) : null}

      <Form.Item
        label="Album name"
        extra="Example: Priya & Rahul Wedding"
        validateStatus={'albumName' in errors && errors.albumName ? 'error' : ''}
        help={'albumName' in errors ? errors.albumName?.message : undefined}
      >
        <Controller
          name="albumName"
          control={control}
          render={({ field }) => (
            <Input {...field} size="large" placeholder="Wedding / Birthday / Event name" />
          )}
        />
      </Form.Item>

      <Form.Item
        label="Client name"
        extra="Who this album is for"
        validateStatus={'customerName' in errors && errors.customerName ? 'error' : ''}
        help={'customerName' in errors ? errors.customerName?.message : undefined}
      >
        <Controller
          name="customerName"
          control={control}
          render={({ field }) => <Input {...field} size="large" placeholder="Client name" />}
        />
      </Form.Item>

      <Button type="primary" htmlType="submit" loading={isSubmitting} size="large" block>
        {mode === 'create' ? 'Continue — add photo next' : 'Save'}
      </Button>
    </Form>
  );
};
