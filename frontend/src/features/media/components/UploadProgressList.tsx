import { useUploadStore } from '@/store/upload.store';
import { mediaService } from '@/services/media.service';

export const UploadProgressList = () => {
  const { tasks, updateTask, removeTask } = useUploadStore();

  if (!tasks.length) return null;

  return (
    <div className="media-uploads">
      <h3 className="media-uploads__title">Uploads</h3>
      <ul className="media-uploads__list">
        {tasks.map((task) => {
          const failed = task.status === 'failed';
          return (
            <li key={task.id} className="media-uploads__item">
              <div className="media-uploads__row">
                <span className="media-uploads__name" title={task.file.name}>
                  {task.file.name}
                </span>
                <div className="media-uploads__actions">
                  {failed ? (
                    <button
                      type="button"
                      className="media-uploads__btn"
                      onClick={() => void retryTask(task.id, task.mediaId, updateTask)}
                    >
                      Retry
                    </button>
                  ) : null}
                  {task.status !== 'uploading' && task.status !== 'confirming' ? (
                    <button
                      type="button"
                      className="media-uploads__btn"
                      onClick={() => removeTask(task.id)}
                    >
                      Dismiss
                    </button>
                  ) : null}
                </div>
              </div>
              <div
                className={`media-uploads__meter${failed ? ' media-uploads__meter--failed' : ''}`}
                aria-hidden
              >
                <i style={{ width: `${Math.min(task.progress, 100)}%` }} />
              </div>
              {task.error ? <p className="media-uploads__error">{task.error}</p> : null}
            </li>
          );
        })}
      </ul>
    </div>
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
    await mediaService.uploadToStorage(
      result.upload.uploadUrl,
      useUploadStore.getState().tasks.find((t) => t.id === taskId)!.file,
      (p) => updateTask(taskId, { progress: p }),
    );
    updateTask(taskId, { status: 'confirming', progress: 95 });
    await mediaService.confirmUpload(result.media.id);
    updateTask(taskId, { status: 'done', progress: 100 });
  } catch (error) {
    updateTask(taskId, { status: 'failed', error: (error as Error).message });
  }
};
