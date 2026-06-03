import { Button, Card, List, Tag, Typography } from 'antd';
import type { Plan } from '@/types/subscription.types';
import { BillingCycle } from '@/types/subscription.types';

const { Text, Title } = Typography;

interface PlanComparisonCardProps {
  plan: Plan;
  currentPlanId?: string;
  billingCycle?: BillingCycle;
  onSelect?: (plan: Plan, billingCycle: BillingCycle) => void;
  loading?: boolean;
}

export const PlanComparisonCard = ({
  plan,
  currentPlanId,
  billingCycle = BillingCycle.MONTHLY,
  onSelect,
  loading,
}: PlanComparisonCardProps) => {
  const price = billingCycle === BillingCycle.YEARLY ? plan.yearlyPrice : plan.monthlyPrice;
  const isCurrent = plan.id === currentPlanId;

  return (
    <Card className="h-full" bordered={!isCurrent}>
      <div className="mb-4 flex items-start justify-between gap-2">
        <div>
          <Title level={4} className="!mb-1">
            {plan.name}
          </Title>
          <Text type="secondary">{plan.description}</Text>
        </div>
        {isCurrent ? <Tag color="blue">Current</Tag> : null}
      </div>

      <div className="mb-4">
        <Title level={3} className="!mb-0">
          ₹{price.toLocaleString()}
          <Text className="text-base font-normal text-gray-500">
            /{billingCycle === BillingCycle.YEARLY ? 'year' : 'month'}
          </Text>
        </Title>
      </div>

      <List
        size="small"
        dataSource={plan.features?.length ? plan.features : [`${plan.maxAlbums} albums`, `${plan.storageLimitGB} GB storage`]}
        renderItem={(item) => <List.Item className="!px-0">{item}</List.Item>}
      />

      {!isCurrent && onSelect ? (
        <Button
          type="primary"
          block
          className="mt-4"
          loading={loading}
          onClick={() => onSelect(plan, billingCycle)}
        >
          Choose {plan.name}
        </Button>
      ) : null}
    </Card>
  );
};
