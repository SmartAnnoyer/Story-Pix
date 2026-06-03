import { Button, Popconfirm, Space, Table } from 'antd';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import { EditOutlined, EyeOutlined, InboxOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import type { Album } from '@/types/album.types';
import { AlbumStatusBadge } from './AlbumStatusBadge';
import { EventTypeBadge } from './EventTypeBadge';
import { ROUTES } from '@/routes/paths';

interface AlbumTableProps {
  albums: Album[];
  loading?: boolean;
  pagination: { page: number; limit: number; total: number };
  onPageChange: (page: number, pageSize: number) => void;
  onArchive?: (id: string) => void;
}

export const AlbumTable = ({
  albums,
  loading,
  pagination,
  onPageChange,
  onArchive,
}: AlbumTableProps) => {
  const navigate = useNavigate();

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
      width: 140,
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
          {onArchive ? (
            <Popconfirm title="Archive this album?" onConfirm={() => onArchive(record.id)}>
              <Button type="text" icon={<InboxOutlined />} />
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
