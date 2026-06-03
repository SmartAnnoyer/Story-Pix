import { Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Table, Space, Button, Popconfirm } from 'antd';
import { EditOutlined, DeleteOutlined, CheckCircleOutlined, StopOutlined } from '@ant-design/icons';
import type { ArTarget } from '@/types/ar-target.types';
import { ArTargetStatus } from '@/types/ar-target.types';

const statusColors: Record<ArTargetStatus, string> = {
  [ArTargetStatus.DRAFT]: 'default',
  [ArTargetStatus.ACTIVE]: 'success',
  [ArTargetStatus.ARCHIVED]: 'warning',
};

interface MappingTableProps {
  items: ArTarget[];
  loading?: boolean;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onPublish: (id: string) => void;
  onArchive: (id: string) => void;
}

export const MappingTable = ({
  items,
  loading,
  onEdit,
  onDelete,
  onPublish,
  onArchive,
}: MappingTableProps) => {
  const columns: ColumnsType<ArTarget> = [
    {
      title: 'Name',
      dataIndex: 'targetName',
      key: 'targetName',
    },
    {
      title: 'Photo',
      key: 'photo',
      render: (_, record) => record.photo?.originalFileName ?? '—',
    },
    {
      title: 'Video',
      key: 'video',
      render: (_, record) => record.video?.originalFileName ?? '—',
    },
    {
      title: 'Index',
      dataIndex: 'targetIndex',
      key: 'targetIndex',
      render: (value: number | null) => (value != null ? value : '—'),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: ArTargetStatus) => (
        <Tag color={statusColors[status]}>{status.toUpperCase()}</Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space wrap>
          {record.status === ArTargetStatus.DRAFT ? (
            <>
              <Button size="small" icon={<EditOutlined />} onClick={() => onEdit(record.id)}>
                Edit
              </Button>
              <Button
                size="small"
                type="primary"
                icon={<CheckCircleOutlined />}
                onClick={() => onPublish(record.id)}
              >
                Publish
              </Button>
              <Popconfirm title="Delete this mapping?" onConfirm={() => onDelete(record.id)}>
                <Button size="small" danger icon={<DeleteOutlined />}>
                  Delete
                </Button>
              </Popconfirm>
            </>
          ) : null}
          {record.status === ArTargetStatus.ACTIVE ? (
            <Button size="small" icon={<StopOutlined />} onClick={() => onArchive(record.id)}>
              Archive
            </Button>
          ) : null}
        </Space>
      ),
    },
  ];

  return (
    <Table
      rowKey="id"
      columns={columns}
      dataSource={items}
      loading={loading}
      pagination={false}
      scroll={{ x: true }}
    />
  );
};
