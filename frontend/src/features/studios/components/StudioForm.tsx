import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { Alert, Button, Col, Form, Input, Row } from 'antd';
import type { CreateStudioPayload, UpdateStudioPayload } from '@/types/studio.types';

const createSchema = z.object({
  studioName: z.string().min(2, 'Studio name is required'),
  ownerName: z.string().min(2, 'Owner name is required'),
  email: z.string().email('Enter a valid studio email'),
  phone: z.string().optional(),
  address: z.string().optional(),
  website: z.string().url('Enter a valid URL').optional().or(z.literal('')),
  adminEmail: z.string().email('Enter a valid admin email'),
  adminFirstName: z.string().min(1, 'Admin first name is required'),
  adminLastName: z.string().min(1, 'Admin last name is required'),
});

const updateSchema = createSchema.omit({
  adminEmail: true,
  adminFirstName: true,
  adminLastName: true,
});

type CreateFormValues = z.infer<typeof createSchema>;
type UpdateFormValues = z.infer<typeof updateSchema>;

type StudioFormProps =
  | {
      mode: 'create';
      initialValues?: Partial<CreateFormValues>;
      onSubmit: (values: CreateStudioPayload) => Promise<void>;
      isSubmitting?: boolean;
      errorMessage?: string;
    }
  | {
      mode: 'edit';
      initialValues?: Partial<UpdateFormValues>;
      onSubmit: (values: UpdateStudioPayload) => Promise<void>;
      isSubmitting?: boolean;
      errorMessage?: string;
    };

const StudioFields = ({
  control,
  errors,
  showAdmin,
}: {
  control: ReturnType<typeof useForm<CreateFormValues>>['control'];
  errors: ReturnType<typeof useForm<CreateFormValues>>['formState']['errors'];
  showAdmin: boolean;
}) => (
  <>
    <Row gutter={16}>
      <Col xs={24} md={12}>
        <Form.Item
          label="Studio Name"
          validateStatus={errors.studioName ? 'error' : ''}
          help={errors.studioName?.message}
        >
          <Controller
            name="studioName"
            control={control}
            render={({ field }) => <Input {...field} size="large" placeholder="Sunrise Photography" />}
          />
        </Form.Item>
      </Col>
      <Col xs={24} md={12}>
        <Form.Item
          label="Owner Name"
          validateStatus={errors.ownerName ? 'error' : ''}
          help={errors.ownerName?.message}
        >
          <Controller
            name="ownerName"
            control={control}
            render={({ field }) => <Input {...field} size="large" placeholder="Jane Doe" />}
          />
        </Form.Item>
      </Col>
      <Col xs={24} md={12}>
        <Form.Item
          label="Studio Email"
          validateStatus={errors.email ? 'error' : ''}
          help={errors.email?.message}
        >
          <Controller
            name="email"
            control={control}
            render={({ field }) => <Input {...field} size="large" placeholder="studio@example.com" />}
          />
        </Form.Item>
      </Col>
      <Col xs={24} md={12}>
        <Form.Item label="Phone" validateStatus={errors.phone ? 'error' : ''} help={errors.phone?.message}>
          <Controller
            name="phone"
            control={control}
            render={({ field }) => <Input {...field} size="large" placeholder="+1 555 0100" />}
          />
        </Form.Item>
      </Col>
      <Col xs={24}>
        <Form.Item label="Address" validateStatus={errors.address ? 'error' : ''} help={errors.address?.message}>
          <Controller
            name="address"
            control={control}
            render={({ field }) => <Input.TextArea {...field} rows={2} placeholder="Business address" />}
          />
        </Form.Item>
      </Col>
      <Col xs={24} md={12}>
        <Form.Item label="Website" validateStatus={errors.website ? 'error' : ''} help={errors.website?.message}>
          <Controller
            name="website"
            control={control}
            render={({ field }) => <Input {...field} size="large" placeholder="https://example.com" />}
          />
        </Form.Item>
      </Col>
    </Row>

    {showAdmin ? (
      <>
        <div className="mb-4 mt-2 border-t pt-4 text-sm font-medium text-gray-700">Studio Admin Account</div>
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              label="Admin Email"
              validateStatus={errors.adminEmail ? 'error' : ''}
              help={errors.adminEmail?.message}
            >
              <Controller
                name="adminEmail"
                control={control}
                render={({ field }) => <Input {...field} size="large" placeholder="admin@example.com" />}
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={6}>
            <Form.Item
              label="First Name"
              validateStatus={errors.adminFirstName ? 'error' : ''}
              help={errors.adminFirstName?.message}
            >
              <Controller
                name="adminFirstName"
                control={control}
                render={({ field }) => <Input {...field} size="large" />}
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={6}>
            <Form.Item
              label="Last Name"
              validateStatus={errors.adminLastName ? 'error' : ''}
              help={errors.adminLastName?.message}
            >
              <Controller
                name="adminLastName"
                control={control}
                render={({ field }) => <Input {...field} size="large" />}
              />
            </Form.Item>
          </Col>
        </Row>
      </>
    ) : null}
  </>
);

export const StudioForm = (props: StudioFormProps) => {
  if (props.mode === 'create') {
    return <CreateStudioFormInner {...props} />;
  }
  return <EditStudioFormInner {...props} />;
};

const CreateStudioFormInner = ({
  initialValues,
  onSubmit,
  isSubmitting,
  errorMessage,
}: Extract<StudioFormProps, { mode: 'create' }>) => {
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateFormValues>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      studioName: '',
      ownerName: '',
      email: '',
      phone: '',
      address: '',
      website: '',
      adminEmail: '',
      adminFirstName: '',
      adminLastName: '',
      ...initialValues,
    },
  });

  return (
    <Form
      layout="vertical"
      onFinish={handleSubmit(async (values) => {
        await onSubmit({
          ...values,
          website: values.website || undefined,
          phone: values.phone || undefined,
          address: values.address || undefined,
        });
      })}
      requiredMark={false}
    >
      {errorMessage ? <Alert message={errorMessage} type="error" showIcon className="mb-4" /> : null}
      <StudioFields control={control} errors={errors} showAdmin />
      <Button type="primary" htmlType="submit" size="large" loading={isSubmitting}>
        Create Studio
      </Button>
    </Form>
  );
};

const EditStudioFormInner = ({
  initialValues,
  onSubmit,
  isSubmitting,
  errorMessage,
}: Extract<StudioFormProps, { mode: 'edit' }>) => {
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<UpdateFormValues>({
    resolver: zodResolver(updateSchema),
    defaultValues: {
      studioName: '',
      ownerName: '',
      email: '',
      phone: '',
      address: '',
      website: '',
      ...initialValues,
    },
  });

  return (
    <Form
      layout="vertical"
      onFinish={handleSubmit(async (values) => {
        await onSubmit({
          ...values,
          website: values.website || undefined,
          phone: values.phone || undefined,
          address: values.address || undefined,
        });
      })}
      requiredMark={false}
    >
      {errorMessage ? <Alert message={errorMessage} type="error" showIcon className="mb-4" /> : null}
      <StudioFields control={control as never} errors={errors as never} showAdmin={false} />
      <Button type="primary" htmlType="submit" size="large" loading={isSubmitting}>
        Save Changes
      </Button>
    </Form>
  );
};
