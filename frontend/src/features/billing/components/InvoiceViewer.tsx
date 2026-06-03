import { Card, Descriptions, Tag, Typography } from 'antd';
import type { Invoice } from '@/types/billing.types';

const { Title } = Typography;

interface InvoiceViewerProps {
  invoice: Invoice;
}

export const InvoiceViewer = ({ invoice }: InvoiceViewerProps) => {
  return (
    <Card>
      <Title level={4}>Invoice {invoice.invoiceNumber}</Title>
      <Descriptions bordered column={{ xs: 1, sm: 2 }} size="small">
        <Descriptions.Item label="Status">
          <Tag>{invoice.status}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="Billing cycle">{invoice.billingCycle}</Descriptions.Item>
        <Descriptions.Item label="Issued">
          {new Date(invoice.issuedDate).toLocaleDateString()}
        </Descriptions.Item>
        <Descriptions.Item label="Paid">
          {invoice.paidDate ? new Date(invoice.paidDate).toLocaleDateString() : '—'}
        </Descriptions.Item>
        <Descriptions.Item label="Subtotal">₹{invoice.amount.toLocaleString()}</Descriptions.Item>
        <Descriptions.Item label="Tax">₹{invoice.taxAmount.toLocaleString()}</Descriptions.Item>
        <Descriptions.Item label="Total">₹{invoice.totalAmount.toLocaleString()}</Descriptions.Item>
      </Descriptions>
    </Card>
  );
};
