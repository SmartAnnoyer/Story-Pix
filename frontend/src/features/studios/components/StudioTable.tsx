import { Button, Grid, Pagination, Popconfirm, Space, Table, Tooltip } from 'antd';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import {
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
  RightOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import type { Studio } from '@/types/studio.types';
import { StudioStatus } from '@/types/studio.types';
import { StatusBadge } from './StatusBadge';
import { ROUTES } from '@/routes/paths';

const { useBreakpoint } = Grid;

interface StudioTableProps {
  studios: Studio[];
  loading?: boolean;
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
  onPageChange: (page: number, pageSize: number) => void;
  onSuspend: (id: string) => void;
  onActivate: (id: string) => void;
  onDelete: (id: string) => void;
}

export const StudioTable = ({
  studios,
  loading,
  pagination,
  onPageChange,
  onSuspend,
  onActivate,
  onDelete,
}: StudioTableProps) => {
  const navigate = useNavigate();
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  if (isMobile) {
    return (
      <div>
        {loading && studios.length === 0 ? (
          <p className="text-sm text-gray-500">Loading studios…</p>
        ) : null}
        {!loading && studios.length === 0 ? (
          <p className="rounded-2xl bg-white p-6 text-center text-sm text-gray-500">
            No studios yet.
          </p>
        ) : null}
        {studios.map((record) => (
          <div key={record.id} className="app-list-card" style={{ display: 'block' }}>
            <button
              type="button"
              className="flex w-full items-center gap-3 bg-transparent p-0 text-left"
              onClick={() => navigate(ROUTES.STUDIO_DETAILS.replace(':id', record.id))}
            >
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold text-gray-900">{record.studioName}</div>
                <div className="mt-0.5 truncate text-xs text-gray-500">
                  {record.ownerName} · {record.studioCode}
                </div>
                <div className="mt-2">
                  <StatusBadge status={record.status} />
                </div>
              </div>
              <RightOutlined className="text-gray-300" />
            </button>
            <div className="mt-3 flex justify-end gap-1 border-t border-gray-100 pt-2">
              <Button
                type="text"
                size="small"
                icon={<EditOutlined />}
                onClick={() => navigate(ROUTES.STUDIO_EDIT.replace(':id', record.id))}
              >
                Edit
              </Button>
              {record.status === StudioStatus.SUSPENDED ||
              record.status === StudioStatus.EXPIRED ? (
                <Button
                  type="text"
                  size="small"
                  icon={<PlayCircleOutlined />}
                  onClick={() => onActivate(record.id)}
                >
                  Activate
                </Button>
              ) : (
                <Button
                  type="text"
                  size="small"
                  icon={<PauseCircleOutlined />}
                  onClick={() => onSuspend(record.id)}
                >
                  Suspend
                </Button>
              )}
              <Popconfirm title="Delete this studio?" onConfirm={() => onDelete(record.id)}>
                <Button type="text" size="small" danger icon={<DeleteOutlined />}>
                  Delete
                </Button>
              </Popconfirm>
            </div>
          </div>
        ))}
        {pagination.total > pagination.limit ? (
          <div className="mt-4 flex justify-center">
            <Pagination
              simple
              current={pagination.page}
              pageSize={pagination.limit}
              total={pagination.total}
              onChange={onPageChange}
            />
          </div>
        ) : null}
      </div>
    );
  }

  const columns: ColumnsType<Studio> = [
    {
      title: 'Code',
      dataIndex: 'studioCode',
      key: 'studioCode',
      responsive: ['md'],
    },
    {
      title: 'Studio',
      key: 'studioName',
      render: (_, record) => (
        <div>
          <div className="font-medium">{record.studioName}</div>
          <div className="text-xs text-gray-500">{record.ownerName}</div>
        </div>
      ),
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      responsive: ['lg'],
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: StudioStatus) => <StatusBadge status={status} />,
    },
    {
      title: 'Storage',
      key: 'storage',
      responsive: ['lg'],
      render: (_, record) => `${record.storageUsedGB} / ${record.storageLimitGB} GB`,
    },
    {
      title: 'Actions',
      key: 'actions',
      fixed: 'right',
      width: 160,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="View">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => navigate(ROUTES.STUDIO_DETAILS.replace(':id', record.id))}
            />
          </Tooltip>
          <Tooltip title="Edit">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => navigate(ROUTES.STUDIO_EDIT.replace(':id', record.id))}
            />
          </Tooltip>
          {record.status === StudioStatus.SUSPENDED || record.status === StudioStatus.EXPIRED ? (
            <Tooltip title="Activate">
              <Button
                type="text"
                icon={<PlayCircleOutlined />}
                onClick={() => onActivate(record.id)}
              />
            </Tooltip>
          ) : (
            <Tooltip title="Suspend">
              <Button
                type="text"
                icon={<PauseCircleOutlined />}
                onClick={() => onSuspend(record.id)}
              />
            </Tooltip>
          )}
          <Popconfirm title="Delete this studio?" onConfirm={() => onDelete(record.id)}>
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const tablePagination: TablePaginationConfig = {
    current: pagination.page,
    pageSize: pagination.limit,
    total: pagination.total,
    showSizeChanger: true,
    onChange: onPageChange,
  };

  return (
    <div className="overflow-x-auto">
      <Table
        rowKey="id"
        columns={columns}
        dataSource={studios}
        loading={loading}
        pagination={tablePagination}
        scroll={{ x: 800 }}
      />
    </div>
  );
};
