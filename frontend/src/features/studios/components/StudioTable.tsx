import { Button, Popconfirm, Space, Table, Tooltip } from 'antd';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import {
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import type { Studio } from '@/types/studio.types';
import { StudioStatus } from '@/types/studio.types';
import { StatusBadge } from './StatusBadge';
import { ROUTES } from '@/routes/paths';

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
          {record.status === StudioStatus.SUSPENDED ? (
            <Tooltip title="Activate">
              <Button type="text" icon={<PlayCircleOutlined />} onClick={() => onActivate(record.id)} />
            </Tooltip>
          ) : (
            <Tooltip title="Suspend">
              <Button type="text" icon={<PauseCircleOutlined />} onClick={() => onSuspend(record.id)} />
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
