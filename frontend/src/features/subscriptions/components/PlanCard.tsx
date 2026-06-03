import { Card, Tag, Typography } from 'antd';
import type { Plan } from '@/types/subscription.types';

const { Text, Title } = Typography;

interface PlanCardProps {
  plan: Plan;
  selected?: boolean;
  onSelect?: (plan: Plan) => void;
}

export const PlanCard = ({ plan, selected, onSelect }: PlanCardProps) => {
  return (
    <Card
      hoverable={Boolean(onSelect)}
      className={`h-full ${selected ? 'border-primary-500 ring-2 ring-primary-200' : ''}`}
      onClick={() => onSelect?.(plan)}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <Title level={4} className="!mb-0">
            {plan.name}
          </Title>
          <Text type="secondary" className="text-xs uppercase">
            {plan.code}
          </Text>
        </div>
        <Tag color={plan.isActive ? 'success' : 'default'}>{plan.isActive ? 'Active' : 'Inactive'}</Tag>
      </div>

      <div className="mb-4">
        <Text className="text-2xl font-semibold">₹{plan.monthlyPrice}</Text>
        <Text type="secondary"> /month</Text>
      </div>

      <ul className="mb-4 space-y-1 text-sm text-gray-600">
        <li>{plan.maxAlbums < 0 ? 'Unlimited' : plan.maxAlbums} albums</li>
        <li>{plan.storageLimitGB} GB storage</li>
        <li>{plan.monthlyScanLimit < 0 ? 'Unlimited' : plan.monthlyScanLimit} scans/mo</li>
        <li>{plan.maxUsers < 0 ? 'Unlimited' : plan.maxUsers} users</li>
      </ul>

      {plan.features?.length ? (
        <div className="flex flex-wrap gap-1">
          {plan.features.slice(0, 3).map((feature) => (
            <Tag key={feature}>{feature}</Tag>
          ))}
        </div>
      ) : null}
    </Card>
  );
};
