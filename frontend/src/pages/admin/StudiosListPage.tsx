import { useMemo, useState } from 'react';
import { Button, Input, Select, Space, Typography } from 'antd';
import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { StudioTable } from '@/features/studios/components/StudioTable';
import {
  useActivateStudioMutation,
  useDeleteStudioMutation,
  useStudiosQuery,
  useSuspendStudioMutation,
} from '@/hooks/useStudioQueries';
import { StudioStatus } from '@/types/studio.types';
import { ROUTES } from '@/routes/paths';
import { message } from 'antd';

const { Title, Paragraph } = Typography;

export const StudiosListPage = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StudioStatus | undefined>();

  const queryParams = useMemo(
    () => ({ page, limit, search: search || undefined, status }),
    [page, limit, search, status],
  );

  const { data, isLoading } = useStudiosQuery(queryParams);
  const suspendMutation = useSuspendStudioMutation();
  const activateMutation = useActivateStudioMutation();
  const deleteMutation = useDeleteStudioMutation();

  const handleSuspend = async (id: string) => {
    await suspendMutation.mutateAsync(id);
    message.success('Studio suspended');
  };

  const handleActivate = async (id: string) => {
    await activateMutation.mutateAsync(id);
    message.success('Studio activated');
  };

  const handleDelete = async (id: string) => {
    await deleteMutation.mutateAsync(id);
    message.success('Studio deleted');
  };

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Title level={3} className="!mb-1">
            Studios
          </Title>
          <Paragraph type="secondary" className="!mb-0">
            Manage all studios on the platform.
          </Paragraph>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate(ROUTES.STUDIO_CREATE)}>
          Create Studio
        </Button>
      </div>

      <Space direction="vertical" size="middle" className="mb-4 w-full">
        <div className="flex flex-col gap-3 sm:flex-row">
          <Input
            placeholder="Search studios..."
            prefix={<SearchOutlined />}
            allowClear
            className="sm:max-w-xs"
            onPressEnter={(e) => {
              setSearch((e.target as HTMLInputElement).value);
              setPage(1);
            }}
            onChange={(e) => {
              if (!e.target.value) {
                setSearch('');
                setPage(1);
              }
            }}
          />
          <Select
            allowClear
            placeholder="Filter by status"
            className="w-full sm:w-48"
            options={Object.values(StudioStatus).map((value) => ({ label: value, value }))}
            onChange={(value) => {
              setStatus(value);
              setPage(1);
            }}
          />
        </div>
      </Space>

      <StudioTable
        studios={data?.items ?? []}
        loading={isLoading}
        pagination={{
          page: data?.pagination.page ?? page,
          limit: data?.pagination.limit ?? limit,
          total: data?.pagination.total ?? 0,
        }}
        onPageChange={(nextPage, pageSize) => {
          setPage(nextPage);
          setLimit(pageSize);
        }}
        onSuspend={handleSuspend}
        onActivate={handleActivate}
        onDelete={handleDelete}
      />
    </div>
  );
};
