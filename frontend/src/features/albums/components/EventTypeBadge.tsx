import { Tag } from 'antd';
import { EVENT_TYPE_LABELS, EventType } from '@/types/album.types';

export const EventTypeBadge = ({ eventType }: { eventType: EventType }) => {
  return <Tag>{EVENT_TYPE_LABELS[eventType] ?? eventType}</Tag>;
};
