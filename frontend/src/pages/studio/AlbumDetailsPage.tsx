import { useNavigate, useParams } from 'react-router-dom';
import {
  Button,
  Card,
  Col,
  Descriptions,
  Popconfirm,
  Row,
  Space,
  Typography,
  message,
} from 'antd';
import {
  useAlbumActionMutation,
  useAlbumQuery,
} from '@/hooks/useAlbumQueries';
import { AlbumStatusBadge } from '@/features/albums/components/AlbumStatusBadge';
import { EventTypeBadge } from '@/features/albums/components/EventTypeBadge';
import { PublishToggle } from '@/features/albums/components/PublishToggle';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { AlbumViewerQrCard } from '@/features/studio/components/AlbumViewerQrCard';
import { EVENT_TYPE_LABELS, AlbumStatus } from '@/types/album.types';
import { ROUTES } from '@/routes/paths';

const { Title, Paragraph, Text, Link } = Typography;

export const AlbumDetailsPage = () => {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { data: album, isLoading } = useAlbumQuery(id);
  const actionMutation = useAlbumActionMutation();

  if (isLoading || !album) return <LoadingSpinner />;

  const handlePublishToggle = async (publish: boolean) => {
    await actionMutation.mutateAsync({ id, action: publish ? 'publish' : 'unpublish' });
    message.success(publish ? 'Album published' : 'Album unpublished');
  };

  const handleArchive = async () => {
    await actionMutation.mutateAsync({ id, action: 'archive' });
    message.success('Album archived');
    navigate(ROUTES.ALBUMS);
  };

  const handleDelete = async () => {
    await actionMutation.mutateAsync({ id, action: 'delete' });
    message.success('Album deleted');
    navigate(ROUTES.ALBUMS);
  };

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <Title level={3} className="!mb-1">
            {album.albumName}
          </Title>
          <Paragraph type="secondary" className="!mb-2">
            {album.albumCode}
          </Paragraph>
          <Space wrap>
            <AlbumStatusBadge status={album.status} />
            <EventTypeBadge eventType={album.eventType} />
          </Space>
        </div>
        <Space wrap>
          {album.status !== AlbumStatus.ARCHIVED ? (
            <Button onClick={() => navigate(ROUTES.ALBUM_EDIT.replace(':id', id))}>Edit</Button>
          ) : null}
          <Button type="primary" onClick={() => navigate(ROUTES.ALBUM_MEDIA.replace(':id', id))}>
            Manage Media
          </Button>
          <Button onClick={() => navigate(ROUTES.ALBUM_AR_MAPPINGS.replace(':id', id))}>
            AR Mappings
          </Button>
          <Button onClick={() => navigate(ROUTES.ALBUM_INSIGHTS.replace(':id', id))}>
            Insights
          </Button>
          {album.status !== AlbumStatus.ARCHIVED ? (
            <Popconfirm title="Archive this album?" onConfirm={handleArchive}>
              <Button>Archive</Button>
            </Popconfirm>
          ) : null}
          {album.status === AlbumStatus.DRAFT ? (
            <Popconfirm title="Delete this album?" onConfirm={handleDelete}>
              <Button danger>Delete</Button>
            </Popconfirm>
          ) : null}
        </Space>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          <Card title="Album Details">
            <Descriptions column={{ xs: 1, sm: 2 }} bordered size="small">
              <Descriptions.Item label="Customer">{album.customerName}</Descriptions.Item>
              <Descriptions.Item label="Event Type">{EVENT_TYPE_LABELS[album.eventType]}</Descriptions.Item>
              <Descriptions.Item label="Event Date">
                {new Date(album.eventDate).toLocaleDateString()}
              </Descriptions.Item>
              <Descriptions.Item label="Customer Phone">{album.customerPhone ?? '—'}</Descriptions.Item>
              <Descriptions.Item label="Customer Email">{album.customerEmail ?? '—'}</Descriptions.Item>
              <Descriptions.Item label="Created">
                {album.createdAt ? new Date(album.createdAt).toLocaleDateString() : '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Description" span={2}>
                {album.description ?? '—'}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title="Publishing" className="mb-4">
            <PublishToggle
              status={album.status}
              loading={actionMutation.isPending}
              onToggle={handlePublishToggle}
            />
            {album.publishedAt ? (
              <Text type="secondary" className="mt-3 block text-xs">
                Published on {new Date(album.publishedAt).toLocaleString()}
              </Text>
            ) : null}
          </Card>
          <AlbumViewerQrCard
            albumName={album.albumName}
            viewerUrl={album.publicViewerUrl}
            published={album.status === AlbumStatus.PUBLISHED}
          />
          <Card title="Public Viewer Link">
            <Paragraph type="secondary" className="text-sm">
              Share this link with customers once AR mappings are published.
            </Paragraph>
            <Link href={album.publicViewerUrl} target="_blank" copyable>
              {album.publicViewerUrl}
            </Link>
          </Card>
          {album.coverImage ? (
            <Card title="Cover" className="mt-4">
              <img src={album.coverImage} alt={album.albumName} className="w-full rounded-md" />
            </Card>
          ) : null}
        </Col>
      </Row>
    </div>
  );
};
