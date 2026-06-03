import { Tag } from 'antd';
import { SubscriptionStatus } from '@/types/subscription.types';

const CONFIG: Record<SubscriptionStatus, { color: string; label: string }> = {
  [SubscriptionStatus.TRIAL]: { color: 'processing', label: 'Trial' },
  [SubscriptionStatus.ACTIVE]: { color: 'success', label: 'Active' },
  [SubscriptionStatus.EXPIRED]: { color: 'warning', label: 'Expired' },
  [SubscriptionStatus.SUSPENDED]: { color: 'error', label: 'Suspended' },
  [SubscriptionStatus.CANCELLED]: { color: 'default', label: 'Cancelled' },
};

export const SubscriptionStatusBadge = ({ status }: { status: SubscriptionStatus }) => {
  const config = CONFIG[status] ?? { color: 'default', label: status };
  return <Tag color={config.color}>{config.label}</Tag>;
};
