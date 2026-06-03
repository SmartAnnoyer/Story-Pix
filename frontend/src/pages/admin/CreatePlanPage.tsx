import { useNavigate } from 'react-router-dom';
import { Typography } from 'antd';
import { PlanForm } from '@/features/subscriptions/components/PlanForm';
import { ROUTES } from '@/routes/paths';

const { Title } = Typography;

export const CreatePlanPage = () => {
  const navigate = useNavigate();

  return (
    <div>
      <Title level={3} className="!mb-6">
        Create Plan
      </Title>
      <PlanForm mode="create" onDone={() => navigate(ROUTES.PLANS)} />
    </div>
  );
};
