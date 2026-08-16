import { Button, Grid, Pagination, Popconfirm, Space, Table } from 'antd';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import {
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  InboxOutlined,
  RightOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import type { Album } from '@/types/album.types';
import { AlbumStatus } from '@/types/album.types';
import { AlbumStatusBadge } from './AlbumStatusBadge';
import { EventTypeBadge } from './EventTypeBadge';
import { ROUTES } from '@/routes/paths';

const { useBreakpoint } = Grid;

interface AlbumTableProps {
  albums: Album[];
  loading?: boolean;
  pagination: { page: number; limit: number; total: number };
  onPageChange: (page: number, pageSize: number) => void;
  onArchive?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export const AlbumTable = ({
  albums,
  loading,
  pagination,
  onPageChange,
  onArchive,
  onDelete,
}: AlbumTableProps) => {
  const navigate = useNavigate();
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  if (isMobile) {
    return (
      <div>
        {loading && albums.length === 0 ? (
          <p className="text-sm text-gray-500">Loading albums…</p>
        ) : null}
        {!loading && albums.length === 0 ? (
          <p className="rounded-2xl bg-white p-6 text-center text-sm text-gray-500">
            No albums yet.
          </p>
        ) : null}
        {albums.map((record) => (
          <div key={record.id} className="app-list-card" style={{ display: 'block' }}>
            <button
              type="button"
              className="flex w-full items-center gap-3 bg-transparent p-0 text-left"
              onClick={() => navigate(ROUTES.ALBUM_DETAILS.replace(':id', record.id))}
            >
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold text-gray-900">{record.albumName}</div>
                <div className="mt-0.5 truncate text-xs text-gray-500">
                  {record.customerName} · {record.albumCode}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <AlbumStatusBadge status={record.status} />
                  <EventTypeBadge eventType={record.eventType} />
                </div>
              </div>
              <RightOutlined className="text-gray-300" />
            </button>
            <div className="mt-3 flex justify-end gap-1 border-t border-gray-100 pt-2">
              <Button
                type="text"
                size="small"
                icon={<EditOutlined />}
                onClick={() => navigate(ROUTES.ALBUM_EDIT.replace(':id', record.id))}
              >
                Edit
              </Button>
              {onArchive && record.status !== AlbumStatus.ARCHIVED ? (
                <Popconfirm title="Archive this album?" onConfirm={() => onArchive(record.id)}>
                  <Button type="text" size="small" icon={<InboxOutlined />}>
                    Archive
                  </Button>
                </Popconfirm>
              ) : null}
              {onDelete ? (
                <Popconfirm
                  title="Delete this album?"
                  okText="Delete"
                  okButtonProps={{ danger: true }}
                  onConfirm={() => onDelete(record.id)}
                >
                  <Button type="text" size="small" danger icon={<DeleteOutlined />}>
                    Delete
                  </Button>
                </Popconfirm>
              ) : null}
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

  const columns: ColumnsType<Album> = [
    {
      title: 'Album',
      key: 'albumName',
      render: (_, record) => (
        <div>
          <div className="font-medium">{record.albumName}</div>
          <div className="text-xs text-gray-500">{record.albumCode}</div>
        </div>
      ),
    },
    {
      title: 'Customer',
      dataIndex: 'customerName',
      responsive: ['md'],
    },
    {
      title: 'Event',
      dataIndex: 'eventType',
      responsive: ['lg'],
      render: (eventType: Album['eventType']) => <EventTypeBadge eventType={eventType} />,
    },
    {
      title: 'Event Date',
      dataIndex: 'eventDate',
      responsive: ['lg'],
      render: (value: string) => new Date(value).toLocaleDateString(),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      render: (status: Album['status']) => <AlbumStatusBadge status={status} />,
    },
    {
      title: 'Actions',
      key: 'actions',
      fixed: 'right',
      width: 180,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="text"
            icon={<EyeOutlined />}
            onClick={() => navigate(ROUTES.ALBUM_DETAILS.replace(':id', record.id))}
          />
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => navigate(ROUTES.ALBUM_EDIT.replace(':id', record.id))}
          />
          {onArchive && record.status !== AlbumStatus.ARCHIVED ? (
            <Popconfirm title="Archive this album?" onConfirm={() => onArchive(record.id)}>
              <Button type="text" icon={<InboxOutlined />} />
            </Popconfirm>
          ) : null}
          {onDelete ? (
            <Popconfirm
              title="Delete this album?"
              description={
                record.status === AlbumStatus.PUBLISHED
                  ? 'It will be unpublished and removed from your list.'
                  : 'This permanently removes the album from your list.'
              }
              okText="Delete"
              okButtonProps={{ danger: true }}
              onConfirm={() => onDelete(record.id)}
            >
              <Button type="text" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          ) : null}
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
    <Table
      rowKey="id"
      columns={columns}
      dataSource={albums}
      loading={loading}
      pagination={tablePagination}
      scroll={{ x: 900 }}
    />
  );
};
