import { Badge, Button } from 'antd';
import { BellOutlined } from '@ant-design/icons';
import { useUnreadNotificationsQuery } from '@/hooks/useNotificationQueries';

interface NotificationBellProps {
  onClick: () => void;
}

export const NotificationBell = ({ onClick }: NotificationBellProps) => {
  const { data: unread = [] } = useUnreadNotificationsQuery();

  return (
    <Badge count={unread.length} size="small">
      <Button type="text" icon={<BellOutlined />} onClick={onClick} aria-label="Notifications" />
    </Badge>
  );
};
