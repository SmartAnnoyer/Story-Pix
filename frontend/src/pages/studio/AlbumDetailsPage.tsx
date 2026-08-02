import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
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
  useRebuildArScanFileMutation,
} from '@/hooks/useAlbumQueries';
import { useAlbumArTargetsQuery } from '@/hooks/useArTargetQueries';
import { AlbumStatusBadge } from '@/features/albums/components/AlbumStatusBadge';
import { EventTypeBadge } from '@/features/albums/components/EventTypeBadge';
import { PublishToggle } from '@/features/albums/components/PublishToggle';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { AlbumViewerQrCard } from '@/features/studio/components/AlbumViewerQrCard';
import { ArScanFileStatus } from '@/features/albums/components/ArScanFileStatus';
import { getErrorMessage } from '@/api/client';
import { EVENT_TYPE_LABELS, AlbumStatus } from '@/types/album.types';
import { ArTargetStatus } from '@/types/ar-target.types';
import { ROUTES } from '@/routes/paths';

const { Title, Paragraph, Text, Link } = Typography;

export const AlbumDetailsPage = () => {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { data: album, isLoading } = useAlbumQuery(id);
  const { data: mappings } = useAlbumArTargetsQuery(id, { limit: 100 });
  const actionMutation = useAlbumActionMutation();
  const rebuildMutation = useRebuildArScanFileMutation();

  if (isLoading || !album) return <LoadingSpinner />;

  const activeMappingCount =
    mappings?.items.filter((item) => item.status === ArTargetStatus.ACTIVE).length ?? 0;
  const draftMappingCount =
    mappings?.items.filter((item) => item.status === ArTargetStatus.DRAFT).length ?? 0;
  const canPublishAlbum = activeMappingCount > 0;

  const handlePublishToggle = async (publish: boolean) => {
    try {
      await actionMutation.mutateAsync({ id, action: publish ? 'publish' : 'unpublish' });
      message.success(publish ? 'Album published' : 'Album unpublished');
    } catch (error) {
      message.error(getErrorMessage(error, publish ? 'Publish failed' : 'Unpublish failed'));
    }
  };

  const handleRetryArBuild = async () => {
    await rebuildMutation.mutateAsync(id);
    message.success('AR scan file rebuild started');
  };

  const handleArchive = async () => {
    await actionMutation.mutateAsync({ id, action: 'archive' });
    message.success('Album archived');
    navigate(ROUTES.ALBUMS);
  };

  const handleDelete = async () => {
    try {
      await actionMutation.mutateAsync({ id, action: 'delete' });
      message.success('Album deleted');
      navigate(ROUTES.ALBUMS);
    } catch (error) {
      message.error(getErrorMessage(error, 'Delete failed'));
    }
  };

  const mappingsPath = ROUTES.ALBUM_AR_MAPPINGS.replace(':id', id);

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
          <Button onClick={() => navigate(mappingsPath)}>AR Mappings</Button>
          <Button onClick={() => navigate(ROUTES.ALBUM_INSIGHTS.replace(':id', id))}>
            Insights
          </Button>
          {album.status !== AlbumStatus.ARCHIVED ? (
            <Popconfirm title="Archive this album?" onConfirm={handleArchive}>
              <Button>Archive</Button>
            </Popconfirm>
          ) : null}
          <Popconfirm
            title="Delete this album?"
            description={
              album.status === AlbumStatus.PUBLISHED
                ? 'The album will be unpublished and permanently removed from your list.'
                : 'This permanently removes the album from your list.'
            }
            okText="Delete"
            okButtonProps={{ danger: true }}
            onConfirm={() => void handleDelete()}
          >
            <Button danger>Delete</Button>
          </Popconfirm>
        </Space>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          <Card title="Album Details">
            <Descriptions column={{ xs: 1, sm: 2 }} bordered size="small">
              <Descriptions.Item label="Customer">{album.customerName}</Descriptions.Item>
              <Descriptions.Item label="Event Type">
                {EVENT_TYPE_LABELS[album.eventType]}
              </Descriptions.Item>
              <Descriptions.Item label="Event Date">
                {new Date(album.eventDate).toLocaleDateString()}
              </Descriptions.Item>
              <Descriptions.Item label="Customer Phone">
                {album.customerPhone ?? '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Customer Email">
                {album.customerEmail ?? '—'}
              </Descriptions.Item>
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
            {album.status !== AlbumStatus.PUBLISHED && !canPublishAlbum ? (
              <Alert
                className="!mb-3"
                type="warning"
                showIcon
                message="Publish an AR mapping first"
                description={
                  draftMappingCount > 0
                    ? `You have ${draftMappingCount} draft mapping${draftMappingCount === 1 ? '' : 's'}. Open AR Mappings and click Publish on each one, then publish the album.`
                    : 'Create a photo → video mapping, publish it, then publish this album.'
                }
                action={
                  <Button size="small" type="primary" onClick={() => navigate(mappingsPath)}>
                    AR Mappings
                  </Button>
                }
              />
            ) : null}
            <PublishToggle
              status={album.status}
              loading={actionMutation.isPending}
              disabled={album.status !== AlbumStatus.PUBLISHED && !canPublishAlbum}
              disabledReason={
                canPublishAlbum
                  ? undefined
                  : 'Needs at least one published AR mapping (status: Active)'
              }
              onToggle={handlePublishToggle}
            />
            {album.publishedAt ? (
              <Text type="secondary" className="mt-3 block text-xs">
                Published on {new Date(album.publishedAt).toLocaleString()}
              </Text>
            ) : null}
            <div className="mt-4">
              <ArScanFileStatus
                status={album.status}
                ready={album.arScanFileReady}
                buildStatus={album.arScanFileStatus}
                progress={album.arScanFileProgress}
                message={album.arScanFileMessage}
                error={album.arScanFileError}
                compiledAt={album.arScanFileCompiledAt}
                buildStartedAt={album.arScanFileBuildStartedAt}
                onRetry={handleRetryArBuild}
                retrying={rebuildMutation.isPending}
              />
            </div>
          </Card>
          <AlbumViewerQrCard
            albumName={album.albumName}
            viewerUrl={album.publicViewerUrl}
            published={album.status === AlbumStatus.PUBLISHED}
            arScanFileReady={album.arScanFileReady}
            progress={album.arScanFileProgress}
            buildMessage={album.arScanFileMessage}
            buildStartedAt={album.arScanFileBuildStartedAt}
            failed={album.arScanFileStatus === 'failed'}
            onRetry={handleRetryArBuild}
            retrying={rebuildMutation.isPending}
          />
          <Card title="Public Viewer Link">
            {album.status === AlbumStatus.PUBLISHED && album.arScanFileReady ? (
              <>
                <Paragraph type="secondary" className="text-sm">
                  Share this link with customers — AR scan file is ready.
                </Paragraph>
                <Link href={album.publicViewerUrl} target="_blank" copyable>
                  {album.publicViewerUrl}
                </Link>
              </>
            ) : (
              <Paragraph type="secondary" className="text-sm !mb-0">
                {album.status !== AlbumStatus.PUBLISHED
                  ? 'Publish the album first. The viewer link appears after the AR scan file is ready.'
                  : 'Viewer link will appear when the AR scan file finishes building.'}
              </Paragraph>
            )}
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
