import { useState } from 'react';
import { Typography } from 'antd';
import { useAdminInvoicesQuery } from '@/hooks/useBillingQueries';
import { InvoiceTable } from '@/features/billing/components/BillingTable';
import { LoadingSpinner } from '@/components/LoadingSpinner';

const { Title, Paragraph } = Typography;

export const AdminInvoicesListPage = () => {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const { data, isLoading } = useAdminInvoicesQuery({ page, limit });

  if (isLoading && !data) return <LoadingSpinner />;

  return (
    <div>
      <Title level={3} className="!mb-1">
        Invoices
      </Title>
      <Paragraph type="secondary" className="!mb-6">
        Platform invoice records (tax fields reserved for future GST support).
      </Paragraph>

      <InvoiceTable
        invoices={data?.items ?? []}
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
