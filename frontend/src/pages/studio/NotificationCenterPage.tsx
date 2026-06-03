import { Typography } from 'antd';
import { useNotificationsQuery, useMarkNotificationReadMutation } from '@/hooks/useNotificationQueries';
import { NotificationList } from '@/features/notifications/components/NotificationList';
import { LoadingSpinner } from '@/components/LoadingSpinner';

const { Title, Paragraph } = Typography;

export const NotificationCenterPage = () => {
  const { data, isLoading } = useNotificationsQuery({ page: 1, limit: 50 });
  const markReadMutation = useMarkNotificationReadMutation();

  if (isLoading || !data) return <LoadingSpinner />;

  return (
    <div>
      <Title level={3} className="!mb-1">
        Notification Center
      </Title>
      <Paragraph type="secondary" className="!mb-6">
        {data.unreadCount} unread notification{data.unreadCount === 1 ? '' : 's'}
      </Paragraph>

      <NotificationList
        notifications={data.items}
        onMarkRead={(id) => markReadMutation.mutate(id)}
      />
    </div>
  );
};
