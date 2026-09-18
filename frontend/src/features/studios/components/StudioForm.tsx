import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { Alert, Button, Col, Form, Input, Row } from 'antd';
import { passwordSchema } from '@/features/auth/schemas/auth.schemas';
import type { CreateStudioPayload, UpdateStudioPayload } from '@/types/studio.types';

const createSchema = z
  .object({
    studioName: z.string().min(2, 'Studio name is required'),
    ownerName: z.string().min(2, 'Owner name is required'),
    email: z.string().email('Enter a valid studio email'),
    phone: z.string().optional(),
    address: z.string().optional(),
    adminEmail: z.string().email('Enter a valid admin email'),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

const updateSchema = z.object({
  studioName: z.string().min(2, 'Studio name is required'),
  ownerName: z.string().min(2, 'Owner name is required'),
  email: z.string().email('Enter a valid studio email'),
  phone: z.string().optional(),
  address: z.string().optional(),
  website: z.string().url('Enter a valid URL').optional().or(z.literal('')),
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
      adminEmail: '',
      password: '',
      confirmPassword: '',
      ...initialValues,
    },
  });

  return (
    <Form
      layout="vertical"
      onFinish={handleSubmit(async (values) => {
        await onSubmit({
          studioName: values.studioName,
          ownerName: values.ownerName,
          email: values.email,
          phone: values.phone || undefined,
          address: values.address || undefined,
          adminEmail: values.adminEmail,
          password: values.password,
          confirmPassword: values.confirmPassword,
        });
      })}
      requiredMark={false}
    >
      {errorMessage ? (
        <Alert message={errorMessage} type="error" showIcon className="mb-4" />
      ) : null}

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
              render={({ field }) => (
                <Input {...field} size="large" placeholder="Sunrise Photography" />
              )}
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
              render={({ field }) => (
                <Input {...field} size="large" placeholder="studio@example.com" />
              )}
            />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item
            label="Phone"
            validateStatus={errors.phone ? 'error' : ''}
            help={errors.phone?.message}
          >
            <Controller
              name="phone"
              control={control}
              render={({ field }) => (
                <Input {...field} size="large" placeholder="+91 98765 43210" />
              )}
            />
          </Form.Item>
        </Col>
        <Col xs={24}>
          <Form.Item
            label="Address"
            validateStatus={errors.address ? 'error' : ''}
            help={errors.address?.message}
          >
            <Controller
              name="address"
              control={control}
              render={({ field }) => (
                <Input.TextArea {...field} rows={2} placeholder="Business address (optional)" />
              )}
            />
          </Form.Item>
        </Col>
      </Row>

      <div className="mb-4 mt-2 border-t pt-4 text-sm font-medium text-gray-700">Studio login</div>
      <p className="mb-4 text-sm text-gray-500">
        Owner name is used as the admin display name. Set the email and password they will use to
        sign in.
      </p>

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
              render={({ field }) => (
                <Input
                  {...field}
                  size="large"
                  autoComplete="username"
                  placeholder="admin@example.com"
                />
              )}
            />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item
            label="Password"
            validateStatus={errors.password ? 'error' : ''}
            help={errors.password?.message}
          >
            <Controller
              name="password"
              control={control}
              render={({ field }) => (
                <Input.Password
                  {...field}
                  size="large"
                  autoComplete="new-password"
                  placeholder="Create a password"
                />
              )}
            />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item
            label="Confirm password"
            validateStatus={errors.confirmPassword ? 'error' : ''}
            help={errors.confirmPassword?.message}
          >
            <Controller
              name="confirmPassword"
              control={control}
              render={({ field }) => (
                <Input.Password
                  {...field}
                  size="large"
                  autoComplete="new-password"
                  placeholder="Confirm password"
                />
              )}
            />
          </Form.Item>
        </Col>
      </Row>

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
          studioName: values.studioName,
          ownerName: values.ownerName,
          email: values.email,
          phone: values.phone || undefined,
          address: values.address || undefined,
          website: values.website || undefined,
        });
      })}
      requiredMark={false}
    >
      {errorMessage ? (
        <Alert message={errorMessage} type="error" showIcon className="mb-4" />
      ) : null}

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
              render={({ field }) => (
                <Input {...field} size="large" placeholder="Sunrise Photography" />
              )}
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
              render={({ field }) => (
                <Input {...field} size="large" placeholder="studio@example.com" />
              )}
            />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item
            label="Phone"
            validateStatus={errors.phone ? 'error' : ''}
            help={errors.phone?.message}
          >
            <Controller
              name="phone"
              control={control}
              render={({ field }) => (
                <Input {...field} size="large" placeholder="+91 98765 43210" />
              )}
            />
          </Form.Item>
        </Col>
        <Col xs={24}>
          <Form.Item
            label="Address"
            validateStatus={errors.address ? 'error' : ''}
            help={errors.address?.message}
          >
            <Controller
              name="address"
              control={control}
              render={({ field }) => (
                <Input.TextArea {...field} rows={2} placeholder="Business address (optional)" />
              )}
            />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item
            label="Website"
            validateStatus={errors.website ? 'error' : ''}
            help={errors.website?.message}
          >
            <Controller
              name="website"
              control={control}
              render={({ field }) => (
                <Input {...field} size="large" placeholder="https://example.com" />
              )}
            />
          </Form.Item>
        </Col>
      </Row>

      <Button type="primary" htmlType="submit" size="large" loading={isSubmitting}>
        Save Changes
      </Button>
    </Form>
  );
};
