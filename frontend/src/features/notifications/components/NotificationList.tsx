import { List, Tag, Typography } from 'antd';
import type { NotificationItem } from '@/types/notification.types';
import { NotificationStatus } from '@/types/notification.types';

const { Text } = Typography;

interface NotificationListProps {
  notifications: NotificationItem[];
  onMarkRead?: (id: string) => void;
  compact?: boolean;
}

export const NotificationList = ({ notifications, onMarkRead, compact }: NotificationListProps) => {
  return (
    <List
      itemLayout="vertical"
      dataSource={notifications}
      renderItem={(item) => (
        <List.Item
          key={item.id}
          actions={
            onMarkRead && item.status !== NotificationStatus.READ
              ? [
                  <button
                    key="read"
                    type="button"
                    className="text-blue-600 hover:underline"
                    onClick={() => onMarkRead(item.id)}
                  >
                    Mark read
                  </button>,
                ]
              : undefined
          }
        >
          <List.Item.Meta
            title={
              <div className="flex items-center gap-2">
                <span>{item.title}</span>
                <Tag>{item.type}</Tag>
              </div>
            }
            description={
              <div>
                <Text type="secondary">{item.message}</Text>
                {!compact && item.createdAt ? (
                  <div className="mt-1">
                    <Text type="secondary" className="text-xs">
                      {new Date(item.createdAt).toLocaleString()}
                    </Text>
                  </div>
                ) : null}
              </div>
            }
          />
        </List.Item>
      )}
    />
  );
};
