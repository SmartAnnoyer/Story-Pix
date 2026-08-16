import { Tag, Grid } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Table, Space, Button, Popconfirm } from 'antd';
import { EditOutlined, DeleteOutlined, CheckCircleOutlined, StopOutlined } from '@ant-design/icons';
import type { ArTarget } from '@/types/ar-target.types';
import { ArTargetStatus } from '@/types/ar-target.types';

const { useBreakpoint } = Grid;

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

const MappingActions = ({
  record,
  onEdit,
  onDelete,
  onPublish,
  onArchive,
}: {
  record: ArTarget;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onPublish: (id: string) => void;
  onArchive: (id: string) => void;
}) => (
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
      </>
    ) : null}
    {record.status === ArTargetStatus.ACTIVE ? (
      <Button size="small" icon={<StopOutlined />} onClick={() => onArchive(record.id)}>
        Archive
      </Button>
    ) : null}
    <Popconfirm
      title="Delete this mapping?"
      description={
        record.status === ArTargetStatus.ACTIVE
          ? 'This removes it from the live AR scan file.'
          : 'This cannot be undone.'
      }
      okText="Delete"
      okButtonProps={{ danger: true }}
      onConfirm={() => onDelete(record.id)}
    >
      <Button size="small" danger icon={<DeleteOutlined />}>
        Delete
      </Button>
    </Popconfirm>
  </Space>
);

export const MappingTable = ({
  items,
  loading,
  onEdit,
  onDelete,
  onPublish,
  onArchive,
}: MappingTableProps) => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  if (isMobile) {
    return (
      <div>
        {loading && items.length === 0 ? (
          <p className="text-sm text-gray-500">Loading mappings…</p>
        ) : null}
        {!loading && items.length === 0 ? (
          <p className="rounded-2xl bg-white p-6 text-center text-sm text-gray-500">
            No mappings yet. Create one to link a photo to a video. You can reuse photos and videos.
          </p>
        ) : null}
        {items.map((record) => (
          <div key={record.id} className="app-list-card" style={{ display: 'block' }}>
            <div className="font-semibold text-gray-900">{record.targetName}</div>
            <div className="mt-1 text-xs text-gray-500">
              {record.photo?.originalFileName ?? 'Photo'} →{' '}
              {record.video?.originalFileName ?? 'Video'}
            </div>
            <div className="mt-2">
              <Tag color={statusColors[record.status]}>{record.status.toUpperCase()}</Tag>
            </div>
            <div className="mt-3 border-t border-gray-100 pt-2">
              <MappingActions
                record={record}
                onEdit={onEdit}
                onDelete={onDelete}
                onPublish={onPublish}
                onArchive={onArchive}
              />
            </div>
          </div>
        ))}
      </div>
    );
  }

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
        <MappingActions
          record={record}
          onEdit={onEdit}
          onDelete={onDelete}
          onPublish={onPublish}
          onArchive={onArchive}
        />
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
