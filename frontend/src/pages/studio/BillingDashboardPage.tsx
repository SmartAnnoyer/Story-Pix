import { useState } from 'react';
import { Alert, Button, Card, Col, Modal, Radio, Row, Tabs, Typography, message } from 'antd';
import {
  useBillingSubscriptionQuery,
  useCancelSubscriptionMutation,
  useCreateOrderMutation,
  useVerifyPaymentMutation,
  usePaymentHistoryQuery,
  useInvoicesQuery,
} from '@/hooks/useBillingQueries';
import { useUpgradeOptionsQuery } from '@/hooks/useSubscriptionQueries';
import { SubscriptionSummary } from '@/features/billing/components/SubscriptionSummary';
import { PlanComparisonCard } from '@/features/billing/components/PlanComparisonCard';
import { BillingTable, InvoiceTable } from '@/features/billing/components/BillingTable';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { BillingCycle } from '@/types/subscription.types';
import type { Plan } from '@/types/subscription.types';
import { loadRazorpayScript } from '@/utils/razorpay';
import { billingService } from '@/services/billing.service';
import { getErrorMessage } from '@/api/client';
import { Link } from 'react-router-dom';
import { ROUTES } from '@/routes/paths';

const { Title, Paragraph } = Typography;

export const BillingDashboardPage = () => {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>(BillingCycle.MONTHLY);
  const [activeTab, setActiveTab] = useState('overview');

  const { data: summary, isLoading } = useBillingSubscriptionQuery();
  const { data: upgrades } = useUpgradeOptionsQuery();
  const { data: payments, isLoading: paymentsLoading } = usePaymentHistoryQuery({ page: 1, limit: 10 });
  const { data: invoices, isLoading: invoicesLoading } = useInvoicesQuery({ page: 1, limit: 10 });

  const createOrderMutation = useCreateOrderMutation();
  const verifyPaymentMutation = useVerifyPaymentMutation();
  const cancelMutation = useCancelSubscriptionMutation();

  if (isLoading || !summary) return <LoadingSpinner />;

  const handleCheckout = async (plan: Plan, cycle: BillingCycle) => {
    try {
      const order = await createOrderMutation.mutateAsync({ planId: plan.id, billingCycle: cycle });
      const loaded = await loadRazorpayScript();

      if (!loaded || !window.Razorpay || order.keyId === 'manual_key') {
        await verifyPaymentMutation.mutateAsync({
          razorpayOrderId: order.orderId,
          razorpayPaymentId: `manual_pay_${Date.now()}`,
          razorpaySignature: 'manual_signature',
        });
        message.success('Plan updated successfully (manual billing mode)');
        return;
      }

      const rzp = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: 'Story-pix',
        description: `${plan.name} subscription`,
        order_id: order.orderId,
        handler: async (response: Record<string, string>) => {
          await verifyPaymentMutation.mutateAsync({
            razorpayOrderId: response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature,
          });
          message.success('Payment successful');
        },
      });

      rzp.open();
    } catch (error) {
      message.error(getErrorMessage(error, 'Unable to start checkout'));
    }
  };

  const handleCancel = () => {
    Modal.confirm({
      title: 'Cancel subscription?',
      content: 'Your studio will lose access when the current billing period ends.',
      okType: 'danger',
      onOk: async () => {
        try {
          await cancelMutation.mutateAsync();
          message.success('Subscription cancelled');
        } catch (error) {
          message.error(getErrorMessage(error));
        }
      },
    });
  };

  const handleDownloadInvoice = async (invoiceId: string, invoiceNumber: string) => {
    try {
      const blob = await billingService.downloadInvoice(invoiceId);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${invoiceNumber}.html`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      message.error(getErrorMessage(error));
    }
  };

  return (
    <div>
      <Title level={3} className="!mb-1">
        Billing Dashboard
      </Title>
      <Paragraph type="secondary" className="!mb-6">
        Manage your subscription, payments, and invoices.
      </Paragraph>

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'overview',
            label: 'Overview',
            children: (
              <>
                <Card className="mb-6">
                  <SubscriptionSummary summary={summary} />
                  <div className="mt-6 flex flex-wrap gap-3">
                    <Button danger onClick={handleCancel} loading={cancelMutation.isPending}>
                      Cancel Subscription
                    </Button>
                    <Link to={ROUTES.STUDIO_PLAN}>
                      <Button>View Usage Details</Button>
                    </Link>
                  </div>
                </Card>

                <Title level={4}>Upgrade Plan</Title>
                <div className="mb-4">
                  <Radio.Group
                    value={billingCycle}
                    onChange={(event) => setBillingCycle(event.target.value)}
                  >
                    <Radio.Button value={BillingCycle.MONTHLY}>Monthly</Radio.Button>
                    <Radio.Button value={BillingCycle.YEARLY}>Yearly</Radio.Button>
                  </Radio.Group>
                </div>

                {upgrades?.length ? (
                  <Row gutter={[16, 16]}>
                    {upgrades.map((plan) => (
                      <Col key={plan.id} xs={24} md={12} lg={8}>
                        <PlanComparisonCard
                          plan={plan}
                          currentPlanId={summary.plan.id}
                          billingCycle={billingCycle}
                          onSelect={handleCheckout}
                          loading={createOrderMutation.isPending || verifyPaymentMutation.isPending}
                        />
                      </Col>
                    ))}
                  </Row>
                ) : (
                  <Alert type="info" showIcon message="You are on the highest available plan." />
                )}
              </>
            ),
          },
          {
            key: 'payments',
            label: 'Payment History',
            children: (
              <BillingTable
                payments={payments?.items ?? []}
                loading={paymentsLoading}
              />
            ),
          },
          {
            key: 'invoices',
            label: 'Invoices',
            children: (
              <InvoiceTable
                invoices={invoices?.items ?? []}
                loading={invoicesLoading}
                onDownload={(invoice) => handleDownloadInvoice(invoice.id, invoice.invoiceNumber)}
              />
            ),
          },
        ]}
      />
    </div>
  );
};
