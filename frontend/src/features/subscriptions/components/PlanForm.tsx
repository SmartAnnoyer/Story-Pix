import { useEffect } from 'react';
import { Button, Form, Input, InputNumber, Select, Switch, message } from 'antd';
import {
  useCreatePlanMutation,
  usePlanQuery,
  useUpdatePlanMutation,
} from '@/hooks/useSubscriptionQueries';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { PlanCode } from '@/types/subscription.types';

interface PlanFormProps {
  mode: 'create' | 'edit';
  planId?: string;
  onDone: () => void;
}

export const PlanForm = ({ mode, planId = '', onDone }: PlanFormProps) => {
  const [form] = Form.useForm();
  const { data: plan, isLoading } = usePlanQuery(planId);
  const createMutation = useCreatePlanMutation();
  const updateMutation = useUpdatePlanMutation(planId);

  useEffect(() => {
    if (mode === 'edit' && plan) {
      form.setFieldsValue(plan);
    }
  }, [mode, plan, form]);

  if (mode === 'edit' && isLoading) return <LoadingSpinner />;

  const onFinish = async (values: Record<string, unknown>) => {
    if (mode === 'create') {
      await createMutation.mutateAsync(values as never);
    } else {
      await updateMutation.mutateAsync(values as never);
    }
    message.success('Plan saved');
    onDone();
  };

  return (
    <Form form={form} layout="vertical" className="max-w-2xl" onFinish={onFinish}>
      <Form.Item name="name" label="Name" rules={[{ required: true }]}>
        <Input />
      </Form.Item>
      {mode === 'create' ? (
        <Form.Item name="code" label="Code" rules={[{ required: true }]}>
          <Select options={Object.values(PlanCode).map((v) => ({ label: v, value: v }))} />
        </Form.Item>
      ) : null}
      <Form.Item name="description" label="Description">
        <Input.TextArea rows={2} />
      </Form.Item>
      <div className="grid gap-4 sm:grid-cols-2">
        <Form.Item name="monthlyPrice" label="Monthly Price" rules={[{ required: true }]}>
          <InputNumber className="w-full" min={0} />
        </Form.Item>
        <Form.Item name="yearlyPrice" label="Yearly Price" rules={[{ required: true }]}>
          <InputNumber className="w-full" min={0} />
        </Form.Item>
        <Form.Item name="maxAlbums" label="Max Albums" rules={[{ required: true }]}>
          <InputNumber className="w-full" />
        </Form.Item>
        <Form.Item name="maxPhotosPerAlbum" label="Max Photos/Album" rules={[{ required: true }]}>
          <InputNumber className="w-full" min={0} />
        </Form.Item>
        <Form.Item name="maxVideosPerAlbum" label="Max Videos/Album" rules={[{ required: true }]}>
          <InputNumber className="w-full" min={0} />
        </Form.Item>
        <Form.Item name="storageLimitGB" label="Storage GB" rules={[{ required: true }]}>
          <InputNumber className="w-full" min={0} />
        </Form.Item>
        <Form.Item name="monthlyScanLimit" label="Monthly Scans" rules={[{ required: true }]}>
          <InputNumber className="w-full" />
        </Form.Item>
        <Form.Item name="maxUsers" label="Max Users" rules={[{ required: true }]}>
          <InputNumber className="w-full" />
        </Form.Item>
      </div>
      {mode === 'edit' ? (
        <Form.Item name="isActive" label="Active" valuePropName="checked">
          <Switch />
        </Form.Item>
      ) : null}
      <Button type="primary" htmlType="submit" loading={createMutation.isPending || updateMutation.isPending}>
        Save Plan
      </Button>
    </Form>
  );
};
