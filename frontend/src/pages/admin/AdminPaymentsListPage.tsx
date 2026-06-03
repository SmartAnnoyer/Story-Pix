import { useState } from 'react';
import { Typography } from 'antd';
import { useAdminPaymentsQuery } from '@/hooks/useBillingQueries';
import { BillingTable } from '@/features/billing/components/BillingTable';
import { LoadingSpinner } from '@/components/LoadingSpinner';

const { Title, Paragraph } = Typography;

export const AdminPaymentsListPage = () => {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const { data, isLoading } = useAdminPaymentsQuery({ page, limit });

  if (isLoading && !data) return <LoadingSpinner />;

  return (
    <div>
      <Title level={3} className="!mb-1">
        Payments
      </Title>
      <Paragraph type="secondary" className="!mb-6">
        All platform payments across studios.
      </Paragraph>

      <BillingTable
        payments={data?.items ?? []}
        loading={isLoading}
        pagination={{
          current: page,
          pageSize: limit,
          total: data?.pagination.total ?? 0,
          onChange: (nextPage, nextLimit) => {
            setPage(nextPage);
            setLimit(nextLimit);
          },
        }}
      />
    </div>
  );
};
