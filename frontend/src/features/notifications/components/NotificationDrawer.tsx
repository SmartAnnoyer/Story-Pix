import { Drawer, Empty } from 'antd';
import { NotificationList } from './NotificationList';
import type { NotificationItem } from '@/types/notification.types';

interface NotificationDrawerProps {
  open: boolean;
  onClose: () => void;
  notifications: NotificationItem[];
  onMarkRead: (id: string) => void;
}

export const NotificationDrawer = ({
  open,
  onClose,
  notifications,
  onMarkRead,
}: NotificationDrawerProps) => {
  return (
    <Drawer title="Notifications" open={open} onClose={onClose} width={420}>
      {notifications.length ? (
        <NotificationList notifications={notifications} onMarkRead={onMarkRead} compact />
      ) : (
        <Empty description="No unread notifications" />
      )}
    </Drawer>
  );
};
