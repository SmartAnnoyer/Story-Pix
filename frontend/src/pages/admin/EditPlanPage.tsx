import { useNavigate, useParams } from 'react-router-dom';
import { Typography } from 'antd';
import { PlanForm } from '@/features/subscriptions/components/PlanForm';
import { ROUTES } from '@/routes/paths';

const { Title } = Typography;

export const EditPlanPage = () => {
  const navigate = useNavigate();
  const { id = '' } = useParams();

  return (
    <div>
      <Title level={3} className="!mb-6">
        Edit Plan
      </Title>
      <PlanForm mode="edit" planId={id} onDone={() => navigate(ROUTES.PLAN_DETAILS.replace(':id', id))} />
    </div>
  );
};
