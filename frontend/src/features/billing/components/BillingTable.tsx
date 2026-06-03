import { Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { Invoice, Payment } from '@/types/billing.types';
import { PaymentStatus } from '@/types/billing.types';

const paymentStatusColors: Record<PaymentStatus, string> = {
  [PaymentStatus.PENDING]: 'gold',
  [PaymentStatus.PAID]: 'green',
  [PaymentStatus.FAILED]: 'red',
  [PaymentStatus.REFUNDED]: 'purple',
  [PaymentStatus.CANCELLED]: 'default',
};

interface BillingTableProps {
  payments: Payment[];
  loading?: boolean;
  pagination?: {
    current: number;
    pageSize: number;
    total: number;
    onChange: (page: number, pageSize: number) => void;
  };
}

export const BillingTable = ({ payments, loading, pagination }: BillingTableProps) => {
  const columns: ColumnsType<Payment> = [
    {
      title: 'Date',
      dataIndex: 'transactionDate',
      render: (value: string | null) => (value ? new Date(value).toLocaleString() : '—'),
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      render: (value: number, row) => `${row.currency} ${value.toLocaleString()}`,
    },
    {
      title: 'Method',
      dataIndex: 'paymentMethod',
      render: (value: string | null) => value ?? '—',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      render: (value: PaymentStatus) => <Tag color={paymentStatusColors[value]}>{value}</Tag>,
    },
    {
      title: 'Order ID',
      dataIndex: 'razorpayOrderId',
      responsive: ['md'],
      render: (value: string | null) => value ?? '—',
    },
  ];

  return (
    <Table
      rowKey="id"
      columns={columns}
      dataSource={payments}
      loading={loading}
      pagination={pagination}
      scroll={{ x: true }}
    />
  );
};

interface InvoiceTableProps {
  invoices: Invoice[];
  loading?: boolean;
  onDownload?: (invoice: Invoice) => void;
  pagination?: BillingTableProps['pagination'];
}

export const InvoiceTable = ({ invoices, loading, onDownload, pagination }: InvoiceTableProps) => {
  const columns: ColumnsType<Invoice> = [
    {
      title: 'Invoice #',
      dataIndex: 'invoiceNumber',
    },
    {
      title: 'Issued',
      dataIndex: 'issuedDate',
      render: (value: string) => new Date(value).toLocaleDateString(),
    },
    {
      title: 'Total',
      dataIndex: 'totalAmount',
      render: (value: number) => `₹${value.toLocaleString()}`,
    },
    {
      title: 'Cycle',
      dataIndex: 'billingCycle',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      render: (value: string) => <Tag>{value}</Tag>,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, row) =>
        onDownload ? (
          <button type="button" className="text-blue-600 hover:underline" onClick={() => onDownload(row)}>
            Download
          </button>
        ) : null,
    },
  ];

  return (
    <Table
      rowKey="id"
      columns={columns}
      dataSource={invoices}
      loading={loading}
      pagination={pagination}
      scroll={{ x: true }}
    />
  );
};
