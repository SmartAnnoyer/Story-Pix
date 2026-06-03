import { Button, Typography } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import { usePlanQuery } from '@/hooks/useSubscriptionQueries';
import { PlanCard } from '@/features/subscriptions/components/PlanCard';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ROUTES } from '@/routes/paths';

const { Title } = Typography;

export const PlanDetailsPage = () => {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { data: plan, isLoading } = usePlanQuery(id);

  if (isLoading || !plan) return <LoadingSpinner />;

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Title level={3} className="!mb-0">
          {plan.name}
        </Title>
        <Button onClick={() => navigate(ROUTES.PLAN_EDIT.replace(':id', id))}>Edit Plan</Button>
      </div>
      <div className="max-w-md">
        <PlanCard plan={plan} />
      </div>
    </div>
  );
};
