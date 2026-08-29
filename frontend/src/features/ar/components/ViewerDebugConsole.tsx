import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  clearViewerLogs,
  getViewerLogs,
  subscribeViewerLogs,
  type ViewerLogEntry,
} from '../utils/viewer-debug-log';
import './ViewerDebugConsole.css';

const formatTime = (at: number) => {
  const date = new Date(at);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;
};

const levelClass = (level: ViewerLogEntry['level']) => `viewer-debug-console__line--${level}`;

const buildLogText = (logs: ViewerLogEntry[]) =>
  logs.map((entry) => `${formatTime(entry.at)} [${entry.level}] ${entry.message}`).join('\n');

export const ViewerDebugConsole = () => {
  const [logs, setLogs] = useState(() => getViewerLogs());
  const [collapsed, setCollapsed] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => subscribeViewerLogs(() => setLogs(getViewerLogs())), []);

  useEffect(() => {
    const node = listRef.current;
    if (!node || collapsed) return;
    node.scrollTop = node.scrollHeight;
  }, [logs, collapsed]);

  const handleCopy = useCallback(async () => {
    const text = buildLogText(logs);
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Story-pix debug log', text });
        return;
      }
    } catch {
      // fall through to clipboard / prompt
    }
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      window.prompt('Copy debug log', text);
    }
  }, [logs]);

  if (typeof document === 'undefined') return null;

  const panel = collapsed ? (
    <div className="viewer-debug-console viewer-debug-console--collapsed">
      <button
        type="button"
        className="viewer-debug-console__toggle"
        onClick={() => setCollapsed(false)}
      >
        Debug log ({logs.length}) — tap to open
      </button>
    </div>
  ) : (
    <div className="viewer-debug-console" aria-label="Viewer debug log">
      <div className="viewer-debug-console__panel">
        <div className="viewer-debug-console__header">
          <span className="viewer-debug-console__title">Debug · {logs.length} lines</span>
          <div className="viewer-debug-console__actions">
            <button type="button" className="viewer-debug-console__btn" onClick={handleCopy}>
              Share
            </button>
            <button type="button" className="viewer-debug-console__btn" onClick={clearViewerLogs}>
              Clear
            </button>
            <button
              type="button"
              className="viewer-debug-console__btn"
              onClick={() => setCollapsed(true)}
            >
              Min
            </button>
          </div>
        </div>
        <div ref={listRef} className="viewer-debug-console__list">
          {logs.length === 0 ? (
            <p className="viewer-debug-console__line viewer-debug-console__line--debug">
              Waiting for logs…
            </p>
          ) : (
            logs.map((entry) => (
              <p key={entry.id} className={`viewer-debug-console__line ${levelClass(entry.level)}`}>
                <span className="viewer-debug-console__time">{formatTime(entry.at)} </span>[
                {entry.level}] {entry.message}
              </p>
            ))
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(panel, document.body);
};
