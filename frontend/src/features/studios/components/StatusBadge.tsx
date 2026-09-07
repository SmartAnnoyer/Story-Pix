import { Tag } from 'antd';
import { StudioStatus } from '@/types/studio.types';

const STATUS_CONFIG: Record<StudioStatus, { color: string; label: string }> = {
  [StudioStatus.ACTIVE]: { color: 'success', label: 'Active' },
  [StudioStatus.SUSPENDED]: { color: 'error', label: 'Suspended' },
  // Legacy statuses from the old plan/trial model — treat as needing Activate.
  [StudioStatus.TRIAL]: { color: 'warning', label: 'Needs activate' },
  [StudioStatus.EXPIRED]: { color: 'warning', label: 'Needs activate' },
};

interface StatusBadgeProps {
  status: StudioStatus;
}

export const StatusBadge = ({ status }: StatusBadgeProps) => {
  const config = STATUS_CONFIG[status] ?? { color: 'default', label: status };

  return <Tag color={config.color}>{config.label}</Tag>;
};
