import { useEffect, useMemo } from 'react';
import { useUploadStore } from '@/store/upload.store';
import { mediaService } from '@/services/media.service';
import { MediaType } from '@/types/media.types';
import './UploadProgressList.css';

const statusLabel = (status: string) => {
  switch (status) {
    case 'compressing':
      return 'Preparing';
    case 'uploading':
      return 'Uploading';
    case 'confirming':
      return 'Finishing';
    case 'done':
      return 'Done';
    case 'failed':
      return 'Failed';
    case 'pending':
      return 'Waiting';
    default:
      return status;
  }
};

export const UploadProgressList = () => {
  const { tasks, updateTask, removeTask, clearCompleted } = useUploadStore();

  const active = useMemo(
    () =>
      tasks.filter(
        (task) =>
          task.status === 'pending' ||
          task.status === 'compressing' ||
          task.status === 'uploading' ||
          task.status === 'confirming',
      ),
    [tasks],
  );
  const failed = useMemo(() => tasks.filter((task) => task.status === 'failed'), [tasks]);
  const done = useMemo(() => tasks.filter((task) => task.status === 'done'), [tasks]);

  const overallPercent = useMemo(() => {
    if (!tasks.length) return 0;
    const sum = tasks.reduce((acc, task) => acc + Math.min(100, Math.max(0, task.progress)), 0);
    return Math.round(sum / tasks.length);
  }, [tasks]);

  useEffect(() => {
    if (!done.length || active.length) return undefined;
    const timer = window.setTimeout(() => clearCompleted(), 4500);
    return () => window.clearTimeout(timer);
  }, [done.length, active.length, clearCompleted]);

  if (!tasks.length) return null;

  return (
    <section className="upload-progress" aria-live="polite" aria-label="Upload progress">
      <header className="upload-progress__head">
        <div>
          <h3 className="upload-progress__title">
            {active.length
              ? `Uploading ${active.length} file${active.length === 1 ? '' : 's'}`
              : failed.length
                ? 'Some uploads need attention'
                : 'Uploads complete'}
          </h3>
          <p className="upload-progress__summary">
            {done.length} done
            {active.length ? ` · ${active.length} in progress` : ''}
            {failed.length ? ` · ${failed.length} failed` : ''}
          </p>
        </div>
        <div className="upload-progress__overall">
          <strong>{overallPercent}%</strong>
          <button
            type="button"
            className="upload-progress__ghost"
            onClick={() => clearCompleted()}
            disabled={!done.length && !failed.length}
          >
            Clear done
          </button>
        </div>
      </header>

      <div className="upload-progress__overall-meter" aria-hidden>
        <i style={{ width: `${overallPercent}%` }} />
      </div>

      <ul className="upload-progress__list">
        {tasks.map((task) => {
          const isFailed = task.status === 'failed';
          const isDone = task.status === 'done';
          const pct = Math.min(100, Math.max(0, Math.round(task.progress)));
          const kind = task.mediaType === MediaType.VIDEO ? 'Video' : 'Photo';

          return (
            <li
              key={task.id}
              className={`upload-progress__item${isFailed ? ' upload-progress__item--failed' : ''}${isDone ? ' upload-progress__item--done' : ''}`}
            >
              <div className="upload-progress__row">
                <div className="upload-progress__meta">
                  <span className="upload-progress__kind">{kind}</span>
                  <span className="upload-progress__name" title={task.file.name}>
                    {task.file.name}
                  </span>
                </div>
                <div className="upload-progress__right">
                  <span className="upload-progress__status">{statusLabel(task.status)}</span>
                  <span className="upload-progress__pct">{isFailed ? '—' : `${pct}%`}</span>
                  {isFailed ? (
                    <button
                      type="button"
                      className="upload-progress__btn"
                      onClick={() => void retryTask(task.id, task.mediaId, updateTask)}
                    >
                      Retry
                    </button>
                  ) : null}
                  {task.status !== 'uploading' &&
                  task.status !== 'confirming' &&
                  task.status !== 'compressing' ? (
                    <button
                      type="button"
                      className="upload-progress__btn"
                      onClick={() => removeTask(task.id)}
                    >
                      Dismiss
                    </button>
                  ) : null}
                </div>
              </div>

              <div
                className={`upload-progress__meter${isFailed ? ' upload-progress__meter--failed' : ''}${isDone ? ' upload-progress__meter--done' : ''}`}
                role="progressbar"
                aria-valuenow={pct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${task.file.name} ${pct}%`}
              >
                <i style={{ width: `${pct}%` }} />
              </div>
              {task.error ? <p className="upload-progress__error">{task.error}</p> : null}
            </li>
          );
        })}
      </ul>
    </section>
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
      (p) => updateTask(taskId, { progress: Math.max(5, Math.round(p * 0.9)) }),
    );
    updateTask(taskId, { status: 'confirming', progress: 95 });
    await mediaService.confirmUpload(result.media.id);
    updateTask(taskId, { status: 'done', progress: 100 });
  } catch (error) {
    updateTask(taskId, { status: 'failed', error: (error as Error).message });
  }
};
