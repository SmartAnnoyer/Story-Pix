import { useMemo, useState } from 'react';
import { Select, Typography } from 'antd';
import { useAdminNotificationsQuery, useEmailTemplatesQuery } from '@/hooks/useNotificationQueries';
import { NotificationList } from '@/features/notifications/components/NotificationList';
import { EmailTemplatePreview } from '@/features/notifications/components/EmailTemplatePreview';
import { notificationService } from '@/services/notification.service';
import { LoadingSpinner } from '@/components/LoadingSpinner';

const { Title, Paragraph } = Typography;

export const AdminNotificationMonitoringPage = () => {
  const { data, isLoading } = useAdminNotificationsQuery({ page: 1, limit: 50 });
  const { data: templates, isLoading: templatesLoading } = useEmailTemplatesQuery();
  const [selectedTemplate, setSelectedTemplate] = useState<string>();
  const [preview, setPreview] = useState<{ subject: string; html: string } | null>(null);

  const templateOptions = useMemo(
    () => templates?.map((template) => ({ label: `${template.key} v${template.version}`, value: template.notificationType })) ?? [],
    [templates],
  );

  if (isLoading || !data) return <LoadingSpinner />;

  const handlePreview = async (notificationType: string) => {
    setSelectedTemplate(notificationType);
    const result = await notificationService.previewEmailTemplate(notificationType, {
      firstName: 'Studio Admin',
      studioName: 'Demo Studio',
      amount: '999',
      albumName: 'Wedding Album',
      resetUrl: 'https://app.story-pix.app/reset-password?token=demo',
      endDate: new Date().toLocaleDateString(),
    });
    setPreview({ subject: result.subject, html: result.html });
  };

  return (
    <div>
      <Title level={3} className="!mb-1">
        Notification Monitoring
      </Title>
      <Paragraph type="secondary" className="!mb-6">
        Platform-wide notification delivery and email template previews.
      </Paragraph>

      <Title level={4}>Recent Notifications</Title>
      <NotificationList notifications={data.items} />

      <Title level={4} className="!mt-8">
        Email Template Preview
      </Title>
      {!templatesLoading ? (
        <>
          <Select
            className="mb-4 w-full max-w-md"
            placeholder="Select template"
            options={templateOptions}
            value={selectedTemplate}
            onChange={handlePreview}
          />
          {preview ? <EmailTemplatePreview subject={preview.subject} html={preview.html} /> : null}
        </>
      ) : (
        <LoadingSpinner />
      )}
    </div>
  );
};
