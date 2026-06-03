import { Switch, Typography } from 'antd';
import { AlbumStatus } from '@/types/album.types';

const { Text } = Typography;

interface PublishToggleProps {
  status: AlbumStatus;
  loading?: boolean;
  onToggle: (publish: boolean) => void;
}

export const PublishToggle = ({ status, loading, onToggle }: PublishToggleProps) => {
  const isPublished = status === AlbumStatus.PUBLISHED;

  return (
    <div className="flex items-center gap-3">
      <Switch
        checked={isPublished}
        loading={loading}
        disabled={status === AlbumStatus.ARCHIVED}
        onChange={(checked) => onToggle(checked)}
      />
      <Text type="secondary">{isPublished ? 'Published' : 'Draft'}</Text>
    </div>
  );
};
