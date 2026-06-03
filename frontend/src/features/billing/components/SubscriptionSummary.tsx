import { Descriptions, Progress, Tag, Typography } from 'antd';
import type { UsageSummary } from '@/types/subscription.types';
import { SubscriptionStatusBadge } from '@/features/subscriptions/components/SubscriptionStatusBadge';

const { Title, Text } = Typography;

interface SubscriptionSummaryProps {
  summary: UsageSummary;
}

export const SubscriptionSummary = ({ summary }: SubscriptionSummaryProps) => {
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Title level={4} className="!mb-0">
          {summary.plan.name}
        </Title>
        <SubscriptionStatusBadge status={summary.subscription.status} />
        {summary.subscription.autoRenew ? <Tag color="green">Auto-renew</Tag> : <Tag>Manual renewal</Tag>}
      </div>

      <Descriptions column={{ xs: 1, sm: 2 }} size="small" className="mb-6">
        <Descriptions.Item label="Billing cycle">{summary.subscription.billingCycle}</Descriptions.Item>
        <Descriptions.Item label="Start date">
          {summary.subscription.startDate
            ? new Date(summary.subscription.startDate).toLocaleDateString()
            : '—'}
        </Descriptions.Item>
        <Descriptions.Item label="End date">
          {summary.subscription.endDate
            ? new Date(summary.subscription.endDate).toLocaleDateString()
            : '—'}
        </Descriptions.Item>
        <Descriptions.Item label="Monthly price">₹{summary.plan.monthlyPrice.toLocaleString()}</Descriptions.Item>
      </Descriptions>

      <div className="grid gap-4 md:grid-cols-2">
        <UsageBar label="Storage" percent={summary.percentages.storage} detail={`${summary.usage.storageUsedGB} / ${summary.limits.storageLimitGB} GB`} />
        <UsageBar label="Scans" percent={summary.percentages.scans} detail={`${summary.usage.scanUsage} / ${summary.limits.monthlyScanLimit}`} />
        <UsageBar label="Albums" percent={summary.percentages.albums} detail={`${summary.usage.albumCount} / ${summary.limits.maxAlbums}`} />
        <UsageBar label="Users" percent={summary.percentages.users} detail={`${summary.usage.userCount} / ${summary.limits.maxUsers}`} />
      </div>
    </div>
  );
};

const UsageBar = ({ label, percent, detail }: { label: string; percent: number; detail: string }) => (
  <div>
    <div className="mb-1 flex justify-between">
      <Text>{label}</Text>
      <Text type="secondary">{detail}</Text>
    </div>
    <Progress percent={percent} showInfo={false} />
  </div>
);
