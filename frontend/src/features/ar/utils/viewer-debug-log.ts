type ViewerLogLevel = 'info' | 'warn' | 'error' | 'debug';

export type ViewerLogEntry = {
  id: number;
  at: number;
  level: ViewerLogLevel;
  message: string;
};

const MAX_LOGS = 200;
const entries: ViewerLogEntry[] = [];
const listeners = new Set<() => void>();
let nextId = 1;

const notify = () => {
  listeners.forEach((listener) => listener());
};

const formatExtra = (extra: unknown): string => {
  if (extra === undefined || extra === null) return '';
  if (typeof extra === 'string') return ` ${extra}`;
  try {
    return ` ${JSON.stringify(extra)}`;
  } catch {
    return ` ${String(extra)}`;
  }
};

export const viewerLog = (level: ViewerLogLevel, message: string, extra?: unknown) => {
  const line = `${message}${formatExtra(extra)}`;
  entries.push({ id: nextId++, at: Date.now(), level, message: line });
  if (entries.length > MAX_LOGS) {
    entries.splice(0, entries.length - MAX_LOGS);
  }

  const consoleFn =
    level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
  consoleFn(`[Story-pix] ${line}`);
  notify();
};

export const getViewerLogs = () => entries.slice();

export const clearViewerLogs = () => {
  entries.length = 0;
  notify();
};

export const subscribeViewerLogs = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/** Capture window errors into the on-screen log. */
export const installViewerLogCapture = () => {
  if (typeof window === 'undefined') return () => undefined;
  if ((window as Window & { __storypixLogCapture?: boolean }).__storypixLogCapture) {
    return () => undefined;
  }
  (window as Window & { __storypixLogCapture?: boolean }).__storypixLogCapture = true;

  const onError = (event: ErrorEvent) => {
    viewerLog('error', `window.onerror: ${event.message}`, {
      file: event.filename,
      line: event.lineno,
      col: event.colno,
    });
  };

  const onRejection = (event: PromiseRejectionEvent) => {
    const reason = event.reason;
    viewerLog(
      'error',
      `unhandledrejection: ${reason instanceof Error ? reason.message : String(reason)}`,
    );
  };

  window.addEventListener('error', onError);
  window.addEventListener('unhandledrejection', onRejection);

  viewerLog('info', 'Debug log capture armed', {
    href: window.location.href,
    ua: navigator.userAgent.slice(0, 120),
  });

  return () => {
    window.removeEventListener('error', onError);
    window.removeEventListener('unhandledrejection', onRejection);
  };
};
