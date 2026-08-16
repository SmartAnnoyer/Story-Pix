import { useCallback, useEffect, useRef, useState } from 'react';
import {
  clampOverlayFrame,
  DEFAULT_OVERLAY_FRAME,
  type OverlayFrame,
} from '@/features/ar/utils/overlay-frame';
import './FrameSelector.css';

type Handle = 'move' | 'nw' | 'ne' | 'se' | 'sw';

interface FrameSelectorProps {
  imageSrc: string;
  value?: OverlayFrame | null;
  onChange: (frame: OverlayFrame) => void;
}

const getContainRect = (containerW: number, containerH: number, imageW: number, imageH: number) => {
  if (!imageW || !imageH) {
    return { left: 0, top: 0, width: containerW, height: containerH };
  }
  const scale = Math.min(containerW / imageW, containerH / imageH);
  const width = imageW * scale;
  const height = imageH * scale;
  return {
    left: (containerW - width) / 2,
    top: (containerH - height) / 2,
    width,
    height,
  };
};

export const FrameSelector = ({ imageSrc, value, onChange }: FrameSelectorProps) => {
  const shellRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const dragRef = useRef<{
    handle: Handle;
    startX: number;
    startY: number;
    origin: OverlayFrame;
  } | null>(null);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [shellSize, setShellSize] = useState({ width: 0, height: 0 });
  const frame = clampOverlayFrame(value ?? DEFAULT_OVERLAY_FRAME);

  const measure = useCallback(() => {
    const shell = shellRef.current;
    const image = imageRef.current;
    if (!shell) return;
    setShellSize({ width: shell.clientWidth, height: shell.clientHeight });
    if (image?.naturalWidth) {
      setImageSize({ width: image.naturalWidth, height: image.naturalHeight });
    }
  }, []);

  useEffect(() => {
    measure();
    const shell = shellRef.current;
    if (!shell || typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(() => measure());
    observer.observe(shell);
    return () => observer.disconnect();
  }, [measure, imageSrc]);

  const displayed = getContainRect(
    shellSize.width,
    shellSize.height,
    imageSize.width,
    imageSize.height,
  );

  const toFrame = (clientX: number, clientY: number) => {
    const shell = shellRef.current;
    if (!shell || displayed.width <= 0) return { x: 0, y: 0 };
    const bounds = shell.getBoundingClientRect();
    return {
      x: (clientX - bounds.left - displayed.left) / displayed.width,
      y: (clientY - bounds.top - displayed.top) / displayed.height,
    };
  };

  const applyDrag = (clientX: number, clientY: number) => {
    const drag = dragRef.current;
    if (!drag) return;
    const now = toFrame(clientX, clientY);
    const start = toFrame(drag.startX, drag.startY);
    const dx = now.x - start.x;
    const dy = now.y - start.y;
    const origin = drag.origin;
    let next: OverlayFrame;

    if (drag.handle === 'move') {
      next = {
        width: origin.width,
        height: origin.height,
        x: Math.min(1 - origin.width, Math.max(0, origin.x + dx)),
        y: Math.min(1 - origin.height, Math.max(0, origin.y + dy)),
      };
      onChange(next);
      return;
    }

    const right = origin.x + origin.width;
    const bottom = origin.y + origin.height;
    let x = origin.x;
    let y = origin.y;
    let nextRight = right;
    let nextBottom = bottom;

    if (drag.handle.includes('w')) x = origin.x + dx;
    if (drag.handle.includes('e')) nextRight = right + dx;
    if (drag.handle.includes('n')) y = origin.y + dy;
    if (drag.handle.includes('s')) nextBottom = bottom + dy;

    next = clampOverlayFrame({
      x,
      y,
      width: nextRight - x,
      height: nextBottom - y,
    });
    onChange(next);
  };

  const startDrag = (handle: Handle, event: React.PointerEvent) => {
    event.preventDefault();
    event.stopPropagation();
    dragRef.current = {
      handle,
      startX: event.clientX,
      startY: event.clientY,
      origin: frame,
    };
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: React.PointerEvent) => {
    if (!dragRef.current) return;
    applyDrag(event.clientX, event.clientY);
  };

  const endDrag = () => {
    dragRef.current = null;
  };

  const maskStyle = {
    left: displayed.left + frame.x * displayed.width,
    top: displayed.top + frame.y * displayed.height,
    width: frame.width * displayed.width,
    height: frame.height * displayed.height,
  };

  return (
    <div
      ref={shellRef}
      className="frame-selector"
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      <img
        ref={imageRef}
        className="frame-selector__image"
        src={imageSrc}
        alt="Tracking photo"
        onLoad={measure}
        draggable={false}
      />
      {displayed.width > 0 ? (
        <div
          className="frame-selector__mask"
          style={maskStyle}
          onPointerDown={(event) => startDrag('move', event)}
        >
          {(['nw', 'ne', 'se', 'sw'] as const).map((handle) => (
            <span
              key={handle}
              className={`frame-selector__handle frame-selector__handle--${handle}`}
              onPointerDown={(event) => startDrag(handle, event)}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
};
