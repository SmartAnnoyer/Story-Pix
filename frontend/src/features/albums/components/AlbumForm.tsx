import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { Alert, Button, Form, Input, Select } from 'antd';
import type { CreateAlbumPayload, UpdateAlbumPayload } from '@/types/album.types';
import type { StudioPackCredit } from '@/types/pack.types';

const createSchema = z.object({
  albumName: z.string().min(2, 'Album name is required'),
  customerName: z.string().min(2, 'Client name is required'),
  packCreditId: z.string().min(1, 'Select a plan'),
});

const editSchema = z.object({
  albumName: z.string().min(2, 'Album name is required'),
  customerName: z.string().min(2, 'Client name is required'),
});

type CreateFormValues = z.infer<typeof createSchema>;
type EditFormValues = z.infer<typeof editSchema>;

type AlbumFormProps =
  | {
      mode: 'create';
      packCredits?: StudioPackCredit[];
      initialValues?: Partial<CreateFormValues>;
      onSubmit: (values: CreateAlbumPayload) => Promise<void>;
      isSubmitting?: boolean;
      errorMessage?: string;
    }
  | {
      mode: 'edit';
      packCredits?: StudioPackCredit[];
      initialValues?: Partial<EditFormValues>;
      onSubmit: (values: UpdateAlbumPayload) => Promise<void>;
      isSubmitting?: boolean;
      errorMessage?: string;
    };

export const AlbumForm = (props: AlbumFormProps) => {
  const { mode, initialValues, onSubmit, isSubmitting, errorMessage } = props;
  const packCredits = mode === 'create' ? (props.packCredits ?? []) : [];
  const availableCredits = packCredits.filter((credit) => credit.remainingCredits > 0);
  const singlePlan = availableCredits.length === 1;

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateFormValues | EditFormValues>({
    resolver: zodResolver(mode === 'create' ? createSchema : editSchema),
    defaultValues: {
      albumName: '',
      customerName: '',
      ...(mode === 'create' ? { packCreditId: availableCredits[0]?.id ?? '' } : {}),
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

      {mode === 'create' && availableCredits.length === 0 ? (
        <Alert
          type="warning"
          showIcon
          className="mb-4"
          message="No albums left on your plan"
          description="Contact Story-PIX to add Mini, Standard, or a Bundle for your studio."
        />
      ) : null}

      <Form.Item
        label="Album name"
        extra="The event you are delivering — so you can find it later."
        validateStatus={'albumName' in errors && errors.albumName ? 'error' : ''}
        help={'albumName' in errors ? errors.albumName?.message : undefined}
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
        validateStatus={'customerName' in errors && errors.customerName ? 'error' : ''}
        help={'customerName' in errors ? errors.customerName?.message : undefined}
      >
        <Controller
          name="customerName"
          control={control}
          render={({ field }) => <Input {...field} placeholder="Rahul" />}
        />
      </Form.Item>

      {mode === 'create' && singlePlan ? (
        <Alert
          type="info"
          showIcon
          className="mb-4"
          message={`Using ${availableCredits[0].packName}`}
          description={`Up to ${availableCredits[0].maxMappings} photos · about ${(availableCredits[0].scansPerMapping ?? 1000).toLocaleString('en-IN')} guest views each · ${availableCredits[0].remainingCredits} album${availableCredits[0].remainingCredits === 1 ? '' : 's'} left`}
        />
      ) : null}

      {mode === 'create' && !singlePlan ? (
        <Form.Item
          label="Which plan?"
          extra="Uses 1 album from that plan. Photo limit comes from the plan."
          validateStatus={
            'packCreditId' in errors &&
            (errors as { packCreditId?: { message?: string } }).packCreditId
              ? 'error'
              : ''
          }
          help={
            'packCreditId' in errors
              ? (errors as { packCreditId?: { message?: string } }).packCreditId?.message
              : undefined
          }
        >
          <Controller
            name="packCreditId"
            control={control}
            render={({ field }) => (
              <Select
                {...field}
                placeholder="Select plan"
                options={availableCredits.map((credit) => ({
                  value: credit.id,
                  label: `${credit.packName} · up to ${credit.maxMappings} photos · ${credit.remainingCredits} left`,
                }))}
                disabled={availableCredits.length === 0}
              />
            )}
          />
        </Form.Item>
      ) : null}

      {mode === 'create' && singlePlan ? (
        <Controller
          name="packCreditId"
          control={control}
          render={({ field }) => <input type="hidden" {...field} />}
        />
      ) : null}

      <Button
        type="primary"
        htmlType="submit"
        loading={isSubmitting}
        disabled={mode === 'create' && availableCredits.length === 0}
      >
        {mode === 'create' ? 'Create album' : 'Save changes'}
      </Button>
    </Form>
  );
};
