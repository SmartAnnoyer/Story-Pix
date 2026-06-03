import { useState } from 'react';
import { Avatar, Button, Card, Form, Input, Typography, Upload, message } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import type { UploadChangeParam } from 'antd/es/upload';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  useConfirmLogoMutation,
  useStudioProfileQuery,
  useUpdateStudioProfileMutation,
} from '@/hooks/useStudioQueries';
import { useCurrentPlanQuery } from '@/hooks/useSubscriptionQueries';
import { SubscriptionSummaryWidget } from '@/features/subscriptions/components/SubscriptionSummaryWidget';
import { StatusBadge } from '@/features/studios/components/StatusBadge';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { getErrorMessage } from '@/api/client';
import { studioService } from '@/services/studio.service';

const { Title, Paragraph } = Typography;

const profileSchema = z.object({
  studioName: z.string().min(2),
  ownerName: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  address: z.string().optional(),
  website: z.string().url().optional().or(z.literal('')),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export const StudioProfilePage = () => {
  const { data: profile, isLoading: profileLoading } = useStudioProfileQuery();
  const { data: summary, isLoading: summaryLoading } = useCurrentPlanQuery();
  const updateMutation = useUpdateStudioProfileMutation();
  const confirmLogoMutation = useConfirmLogoMutation();
  const [uploading, setUploading] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    values: profile
      ? {
          studioName: profile.studioName,
          ownerName: profile.ownerName,
          email: profile.email,
          phone: profile.phone ?? '',
          address: profile.address ?? '',
          website: profile.website ?? '',
        }
      : undefined,
  });

  if (profileLoading || summaryLoading || !profile || !summary) {
    return <LoadingSpinner />;
  }

  const handleLogoUpload = async (info: UploadChangeParam) => {
    const file = info.file.originFileObj;
    if (!file) return;

    setUploading(true);
    try {
      const presigned = await studioService.requestLogoPresign(file.type, file.name);
      await confirmLogoMutation.mutateAsync(presigned.publicUrl);
      message.success('Logo updated (mock upload — R2 integration pending)');
    } catch (error) {
      message.error(getErrorMessage(error, 'Logo upload failed'));
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = async (values: ProfileFormValues) => {
    try {
      await updateMutation.mutateAsync({
        ...values,
        phone: values.phone || undefined,
        address: values.address || undefined,
        website: values.website || undefined,
      });
      message.success('Profile updated');
    } catch (error) {
      message.error(getErrorMessage(error, 'Unable to update profile'));
    }
  };

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Title level={3} className="!mb-1">
            Studio Profile
          </Title>
          <Paragraph type="secondary" className="!mb-0">
            Manage your studio details and view usage.
          </Paragraph>
        </div>
        <StatusBadge status={profile.status} />
      </div>

      <div className="mb-8">
        <SubscriptionSummaryWidget summary={summary} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <Card className="text-center">
          <Avatar size={96} src={profile.logo ?? undefined} className="mb-4">
            {profile.studioName.charAt(0)}
          </Avatar>
          <div className="mb-1 font-medium">{profile.studioName}</div>
          <div className="mb-4 text-sm text-gray-500">{profile.studioCode}</div>
          <Upload
            showUploadList={false}
            beforeUpload={() => false}
            onChange={handleLogoUpload}
            accept="image/*"
          >
            <Button icon={<UploadOutlined />} loading={uploading} block>
              Upload Logo
            </Button>
          </Upload>
          <Paragraph type="secondary" className="!mt-3 !text-xs">
            Logo upload uses presigned URL architecture (R2 placeholder).
          </Paragraph>
        </Card>

        <Card title="Studio Details">
          <Form layout="vertical" onFinish={handleSubmit(onSubmit)}>
            <Form.Item
              label="Studio Name"
              validateStatus={errors.studioName ? 'error' : ''}
              help={errors.studioName?.message}
            >
              <Controller name="studioName" control={control} render={({ field }) => <Input {...field} />} />
            </Form.Item>
            <Form.Item
              label="Owner Name"
              validateStatus={errors.ownerName ? 'error' : ''}
              help={errors.ownerName?.message}
            >
              <Controller name="ownerName" control={control} render={({ field }) => <Input {...field} />} />
            </Form.Item>
            <Form.Item
              label="Email"
              validateStatus={errors.email ? 'error' : ''}
              help={errors.email?.message}
            >
              <Controller name="email" control={control} render={({ field }) => <Input {...field} />} />
            </Form.Item>
            <Form.Item label="Phone">
              <Controller name="phone" control={control} render={({ field }) => <Input {...field} />} />
            </Form.Item>
            <Form.Item label="Address">
              <Controller
                name="address"
                control={control}
                render={({ field }) => <Input.TextArea {...field} rows={2} />}
              />
            </Form.Item>
            <Form.Item label="Website" validateStatus={errors.website ? 'error' : ''} help={errors.website?.message}>
              <Controller name="website" control={control} render={({ field }) => <Input {...field} />} />
            </Form.Item>
            <Button type="primary" htmlType="submit" loading={updateMutation.isPending}>
              Save Profile
            </Button>
          </Form>
        </Card>
      </div>
    </div>
  );
};
