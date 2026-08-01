import { Switch, Typography } from 'antd';
import { AlbumStatus } from '@/types/album.types';

const { Text } = Typography;

interface PublishToggleProps {
  status: AlbumStatus;
  loading?: boolean;
  disabled?: boolean;
  disabledReason?: string;
  onToggle: (publish: boolean) => void;
}

export const PublishToggle = ({
  status,
  loading,
  disabled,
  disabledReason,
  onToggle,
}: PublishToggleProps) => {
  const isPublished = status === AlbumStatus.PUBLISHED;
  const isDisabled = disabled || status === AlbumStatus.ARCHIVED;

  return (
    <div>
      <div className="flex items-center gap-3">
        <Switch
          checked={isPublished}
          loading={loading}
          disabled={isDisabled}
          onChange={(checked) => onToggle(checked)}
        />
        <Text type="secondary">{isPublished ? 'Published' : 'Draft'}</Text>
      </div>
      {!isPublished && disabledReason ? (
        <Text type="warning" className="mt-2 block text-xs">
          {disabledReason}
        </Text>
      ) : null}
    </div>
  );
};
