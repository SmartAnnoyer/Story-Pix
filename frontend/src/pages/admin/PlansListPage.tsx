import { Button, Table, Typography, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { usePlansQuery, useTogglePlanMutation } from '@/hooks/useSubscriptionQueries';
import { ROUTES } from '@/routes/paths';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import type { Plan } from '@/types/subscription.types';

const { Title } = Typography;

export const PlansListPage = () => {
  const navigate = useNavigate();
  const { data: plans, isLoading } = usePlansQuery();
  const toggleMutation = useTogglePlanMutation();

  if (isLoading) return <LoadingSpinner />;

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Title level={3} className="!mb-0">
          Plans
        </Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate(ROUTES.PLAN_CREATE)}>
          Create Plan
        </Button>
      </div>

      <Table
        rowKey="id"
        scroll={{ x: 900 }}
        dataSource={plans ?? []}
        columns={[
          { title: 'Name', dataIndex: 'name', key: 'name' },
          { title: 'Code', dataIndex: 'code', key: 'code' },
          { title: 'Monthly', dataIndex: 'monthlyPrice', render: (v: number) => `₹${v}` },
          { title: 'Storage (GB)', dataIndex: 'storageLimitGB' },
          { title: 'Scans/mo', dataIndex: 'monthlyScanLimit', render: (v: number) => (v < 0 ? '∞' : v) },
          {
            title: 'Status',
            dataIndex: 'isActive',
            render: (active: boolean) => (active ? 'Active' : 'Inactive'),
          },
          {
            title: 'Actions',
            key: 'actions',
            render: (_: unknown, record: Plan) => (
              <>
                <Button type="link" onClick={() => navigate(ROUTES.PLAN_DETAILS.replace(':id', record.id))}>
                  View
                </Button>
                <Button type="link" onClick={() => navigate(ROUTES.PLAN_EDIT.replace(':id', record.id))}>
                  Edit
                </Button>
                <Button
                  type="link"
                  onClick={async () => {
                    await toggleMutation.mutateAsync({ id: record.id, active: !record.isActive });
                    message.success(record.isActive ? 'Plan deactivated' : 'Plan activated');
                  }}
                >
                  {record.isActive ? 'Deactivate' : 'Activate'}
                </Button>
              </>
            ),
          },
        ]}
      />
    </div>
  );
};
