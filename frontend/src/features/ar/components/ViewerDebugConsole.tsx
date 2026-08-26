import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  clearViewerLogs,
  getViewerLogs,
  installViewerLogCapture,
  subscribeViewerLogs,
  type ViewerLogEntry,
} from '../utils/viewer-debug-log';
import './ViewerDebugConsole.css';

const formatTime = (at: number) => {
  const date = new Date(at);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(
    date.getSeconds(),
  ).padStart(2, '0')}.${String(date.getMilliseconds()).padStart(3, '0')}`;
};

const toCopyText = (logs: ViewerLogEntry[]) =>
  logs
    .map((entry) => `[${formatTime(entry.at)}] ${entry.level.toUpperCase()} ${entry.message}`)
    .join('\n');

export const ViewerDebugConsole = () => {
  const [open, setOpen] = useState(true);
  const [logs, setLogs] = useState<ViewerLogEntry[]>(() => getViewerLogs());
  const [copied, setCopied] = useState(false);
  const logRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    const uninstall = installViewerLogCapture();
    const unsubscribe = subscribeViewerLogs(() => setLogs(getViewerLogs()));
    setLogs(getViewerLogs());
    return () => {
      uninstall();
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!open || !logRef.current) return;
    logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logs, open]);

  const copyText = useMemo(() => toCopyText(logs), [logs]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(copyText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      const area = document.createElement('textarea');
      area.value = copyText;
      area.style.position = 'fixed';
      area.style.left = '-9999px';
      document.body.appendChild(area);
      area.select();
      document.execCommand('copy');
      document.body.removeChild(area);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    }
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className={`viewer-debug ${open ? 'viewer-debug--open' : ''}`}>
      <button
        type="button"
        className="viewer-debug__toggle"
        onClick={() => setOpen((value) => !value)}
      >
        {open ? 'Hide debug' : `Debug (${logs.length})`}
      </button>

      {open ? (
        <div className="viewer-debug__panel">
          <div className="viewer-debug__toolbar">
            <strong>Story-pix debug</strong>
            <div className="viewer-debug__actions">
              <button type="button" onClick={() => void handleCopy()}>
                {copied ? 'Copied' : 'Copy all'}
              </button>
              <button type="button" onClick={() => clearViewerLogs()}>
                Clear
              </button>
            </div>
          </div>
          <pre className="viewer-debug__log" ref={logRef}>
            {logs.length === 0
              ? 'Waiting for logs… open camera and scan.'
              : logs
                  .map(
                    (entry) =>
                      `[${formatTime(entry.at)}] ${entry.level.toUpperCase()} ${entry.message}`,
                  )
                  .join('\n')}
          </pre>
        </div>
      ) : null}
    </div>,
    document.body,
  );
};
