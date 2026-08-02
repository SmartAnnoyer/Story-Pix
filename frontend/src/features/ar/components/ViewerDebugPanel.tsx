import { useEffect, useState } from 'react';
import {
  clearViewerLogs,
  getViewerLogs,
  subscribeViewerLogs,
  type ViewerLogEntry,
} from '../utils/viewer-debug-log';

const levelColor: Record<ViewerLogEntry['level'], string> = {
  info: '#9ae6b4',
  warn: '#f6e05e',
  error: '#fc8181',
  debug: '#a0aec0',
};

const formatTime = (at: number) => {
  const date = new Date(at);
  return date.toLocaleTimeString(undefined, {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

export const ViewerDebugPanel = () => {
  const [open, setOpen] = useState(true);
  const [logs, setLogs] = useState<ViewerLogEntry[]>(() => getViewerLogs());
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');

  useEffect(() => subscribeViewerLogs(() => setLogs(getViewerLogs())), []);

  useEffect(() => {
    if (!open) return undefined;
    const node = document.getElementById('viewer-debug-scroll');
    if (node) node.scrollTop = node.scrollHeight;
    return undefined;
  }, [logs, open]);

  const handleCopy = async () => {
    const text = logs
      .map((entry) => `${formatTime(entry.at)} [${entry.level}] ${entry.message}`)
      .join('\n');

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const area = document.createElement('textarea');
        area.value = text;
        area.setAttribute('readonly', '');
        area.style.position = 'fixed';
        area.style.left = '-9999px';
        document.body.appendChild(area);
        area.select();
        document.execCommand('copy');
        document.body.removeChild(area);
      }
      setCopyState('copied');
      window.setTimeout(() => setCopyState('idle'), 1600);
    } catch {
      setCopyState('failed');
      window.setTimeout(() => setCopyState('idle'), 1600);
    }
  };

  return (
    <div className="pointer-events-auto fixed bottom-3 left-3 z-[10050] max-w-[min(100vw-1.5rem,28rem)] font-mono text-[10px] leading-snug text-white">
      <div className="mb-1 flex flex-wrap gap-1">
        <button
          type="button"
          className="rounded bg-black/80 px-2 py-1 text-[11px] font-semibold text-white"
          onClick={() => setOpen((value) => !value)}
        >
          {open ? 'Hide debug' : 'Show debug'}
        </button>
        {open ? (
          <>
            <button
              type="button"
              className="rounded bg-black/80 px-2 py-1 text-[11px] text-white/80"
              onClick={() => void handleCopy()}
            >
              {copyState === 'copied' ? 'Copied' : copyState === 'failed' ? 'Copy failed' : 'Copy'}
            </button>
            <button
              type="button"
              className="rounded bg-black/80 px-2 py-1 text-[11px] text-white/80"
              onClick={() => clearViewerLogs()}
            >
              Clear
            </button>
          </>
        ) : null}
      </div>

      {open ? (
        <div
          id="viewer-debug-scroll"
          className="max-h-[42vh] overflow-y-auto rounded-lg border border-white/15 bg-black/85 p-2 shadow-2xl backdrop-blur-sm"
        >
          {logs.length === 0 ? (
            <p className="mb-0 text-white/50">Waiting for viewer logs…</p>
          ) : (
            logs.map((entry) => (
              <p key={entry.id} className="mb-1 break-words last:mb-0">
                <span className="text-white/45">{formatTime(entry.at)}</span>{' '}
                <span style={{ color: levelColor[entry.level] }}>[{entry.level}]</span>{' '}
                <span>{entry.message}</span>
              </p>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
};
