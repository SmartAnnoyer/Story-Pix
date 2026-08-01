import { useEffect, useState } from 'react';
import {
  clearViewerLogs,
  getViewerLogs,
  subscribeViewerLogs,
  type ViewerLogEntry,
} from '../utils/viewer-debug-log';

const levelColor: Record<ViewerLogEntry['level'], string> = {
  info: '#9ae6b4',
  debug: '#90cdf4',
  warn: '#f6e05e',
  error: '#fc8181',
};

export const ViewerDebugPanel = () => {
  const [open, setOpen] = useState(true);
  const [logs, setLogs] = useState<ViewerLogEntry[]>(() => getViewerLogs());

  useEffect(() => subscribeViewerLogs(() => setLogs(getViewerLogs())), []);

  const copyLogs = async () => {
    const text = getViewerLogs()
      .map((entry) => {
        const time = new Date(entry.at).toISOString().slice(11, 23);
        return `${time} [${entry.level}] ${entry.message}`;
      })
      .join('\n');
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // ignore — panel still visible for screenshot
    }
  };

  return (
    <div
      className="pointer-events-auto fixed bottom-3 left-3 z-[10050] max-w-[min(100vw-1.5rem,28rem)] font-mono text-[10px] leading-snug text-white"
      style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}
    >
      <div className="mb-1 flex flex-wrap gap-1">
        <button
          type="button"
          className="rounded bg-black/70 px-2 py-1 border border-white/20"
          onClick={() => setOpen((value) => !value)}
        >
          {open ? 'Hide debug' : 'Show debug'}
        </button>
        <button
          type="button"
          className="rounded bg-black/70 px-2 py-1 border border-white/20"
          onClick={() => void copyLogs()}
        >
          Copy
        </button>
        <button
          type="button"
          className="rounded bg-black/70 px-2 py-1 border border-white/20"
          onClick={() => clearViewerLogs()}
        >
          Clear
        </button>
      </div>

      {open ? (
        <div className="max-h-[40vh] overflow-auto rounded-lg border border-white/20 bg-black/80 p-2 backdrop-blur-sm">
          {logs.length === 0 ? (
            <p className="text-white/50">No logs yet…</p>
          ) : (
            logs.map((entry) => (
              <div key={entry.id} className="mb-1 break-words">
                <span className="text-white/40">
                  {new Date(entry.at).toISOString().slice(11, 23)}{' '}
                </span>
                <span style={{ color: levelColor[entry.level] }}>[{entry.level}]</span>{' '}
                <span>{entry.message}</span>
              </div>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
};
