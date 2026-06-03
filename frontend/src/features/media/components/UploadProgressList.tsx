import { Button, List, Progress, Typography } from 'antd';
import { CloseOutlined, ReloadOutlined } from '@ant-design/icons';
import { useUploadStore } from '@/store/upload.store';
import { mediaService } from '@/services/media.service';

const { Text } = Typography;

export const UploadProgressList = () => {
  const { tasks, updateTask, removeTask } = useUploadStore();

  if (!tasks.length) return null;

  return (
    <List
      size="small"
      header={<Text strong>Uploads</Text>}
      dataSource={tasks}
      renderItem={(task) => (
        <List.Item
          actions={[
            task.status === 'failed' ? (
              <Button
                type="link"
                icon={<ReloadOutlined />}
                onClick={() => retryTask(task.id, task.mediaId, updateTask)}
              />
            ) : null,
            task.status !== 'uploading' && task.status !== 'confirming' ? (
              <Button type="link" icon={<CloseOutlined />} onClick={() => removeTask(task.id)} />
            ) : null,
          ].filter(Boolean)}
        >
          <div className="w-full">
            <Text ellipsis className="block">
              {task.file.name}
            </Text>
            <Progress percent={task.progress} size="small" status={task.status === 'failed' ? 'exception' : 'active'} />
            {task.error ? (
              <Text type="danger" className="text-xs">
                {task.error}
              </Text>
            ) : null}
          </div>
        </List.Item>
      )}
    />
  );
};

const retryTask = async (
  taskId: string,
  mediaId: string | undefined,
  updateTask: (id: string, patch: Partial<import('@/types/media.types').UploadTask>) => void,
) => {
  if (!mediaId) return;
  try {
    updateTask(taskId, { status: 'uploading', progress: 0, error: undefined });
    const result = await mediaService.retryUpload(mediaId);
    await mediaService.uploadToStorage(result.upload.uploadUrl, useUploadStore.getState().tasks.find((t) => t.id === taskId)!.file, (p) =>
      updateTask(taskId, { progress: p }),
    );
    updateTask(taskId, { status: 'confirming', progress: 95 });
    await mediaService.confirmUpload(result.media.id);
    updateTask(taskId, { status: 'done', progress: 100 });
  } catch (error) {
    updateTask(taskId, { status: 'failed', error: (error as Error).message });
  }
};
