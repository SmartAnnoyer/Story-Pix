import { Button, Result } from 'antd';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/routes/paths';

export const NotFoundPage = () => {
  const navigate = useNavigate();

  return (
    <Result
      status="404"
      title="404"
      subTitle="Sorry, the page you visited does not exist."
      extra={
        <Button type="primary" onClick={() => navigate(ROUTES.DASHBOARD)}>
          Back to Dashboard
        </Button>
      }
    />
  );
};
