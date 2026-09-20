import React, { useCallback, useEffect, useRef, useState } from 'react';
import { clampArenaDimension } from './arena-dimensions';

export interface ResizableArenaProps {
  width: number;
  height: number;
  previewHeight: number;
  minWidth: number;
  minHeight: number;
  maxDimension?: number;
  onResize: (width: number, height: number) => void;
  onResizeStart?: () => void;
  children: React.ReactNode;
}

type Dimensions = { width: number; height: number };

/**
 * Scale a physical arena into its preview without ever hiding one of its
 * edges.  Keeping this separate makes the responsive constraint explicit and
 * lets the resize interaction continue to work in world coordinates.
 */
export function getFittedArenaSize(
  dimensions: Dimensions,
  availableWidth: number,
  availableHeight: number,
) {
  if (availableWidth <= 0 || availableHeight <= 0) return { width: 0, height: 0, scale: 0 };
  const scale = Math.min(availableWidth / dimensions.width, availableHeight / dimensions.height);
  return { width: dimensions.width * scale, height: dimensions.height * scale, scale };
}

/** Use spare desktop height without turning the compact mobile preview into a tall page. */
export function getArenaPreviewHeight(preferredHeight: number, viewportWidth: number, viewportHeight: number) {
  if (viewportWidth < 900) return preferredHeight;
  return Math.max(preferredHeight, Math.min(600, Math.max(360, viewportHeight - 180)));
}

/**
 * Keeps the canvas mounted while its world dimensions are being adjusted. The
 * new dimensions are only committed after a completed pointer gesture.
 */
export function ResizableArena({
  width,
  height,
  previewHeight,
  minWidth,
  minHeight,
  maxDimension = 4096,
  onResize,
  onResizeStart,
  children,
}: ResizableArenaProps) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    worldPerPixelX: number;
    worldPerPixelY: number;
    dimensions: Dimensions;
    left: number;
    top: number;
    previousUserSelect: string;
  } | null>(null);
  const draftRef = useRef<Dimensions | null>(null);
  const [draft, setDraft] = useState<Dimensions | null>(null);
  const [retained, setRetained] = useState<Dimensions | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  const activeDrag = dragRef.current;
  const actual = draft ?? retained ?? { width, height };
  // `previewHeight` is the available vertical preview space.  Both axes take
  // part in the calculation so portrait, square, and wide arenas stay wholly
  // visible instead of creating an inner scrolling viewport.
  const fitted = getFittedArenaSize(actual, containerWidth, previewHeight);
  const displayWidth = fitted.width;
  const displayHeight = fitted.height;

  useEffect(() => {
    setRetained((current) => current && (current.width !== width || current.height !== height) ? null : current);
  }, [height, width]);

  useEffect(() => {
    if (!dragRef.current) setRetained(null);
  }, [containerWidth, previewHeight]);

  useEffect(() => {
    const element = viewportRef.current;
    if (!element) return;
    const updateWidth = () => setContainerWidth(element.getBoundingClientRect().width);
    updateWidth();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateWidth);
      return () => window.removeEventListener('resize', updateWidth);
    }
    const observer = new ResizeObserver(updateWidth);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const cancelDrag = useCallback(() => {
    const active = dragRef.current;
    if (!active) return;
    document.documentElement.style.userSelect = active.previousUserSelect;
    dragRef.current = null;
    draftRef.current = null;
    setDraft(null);
  }, []);

  const commitDrag = useCallback(() => {
    const active = dragRef.current;
    if (!active) return;
    const finalDimensions = draftRef.current ?? active.dimensions;
    document.documentElement.style.userSelect = active.previousUserSelect;
    dragRef.current = null;
    draftRef.current = null;
    setDraft(null);
    setRetained(finalDimensions);
    onResize(finalDimensions.width, finalDimensions.height);
  }, [onResize]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') cancelDrag();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [cancelDrag]);

  useEffect(() => () => {
    if (dragRef.current) document.documentElement.style.userSelect = dragRef.current.previousUserSelect;
  }, []);

  const updateDraft = (clientX: number, clientY: number) => {
    const active = dragRef.current;
    if (!active) return;
    const next = {
      width: clampArenaDimension(active.dimensions.width + (clientX - active.startX) * active.worldPerPixelX, minWidth, maxDimension),
      height: clampArenaDimension(active.dimensions.height + (clientY - active.startY) * active.worldPerPixelY, minHeight, maxDimension),
    };
    draftRef.current = next;
    setDraft(next);
  };

  const startDrag = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return;
    const field = fieldRef.current;
    const viewport = viewportRef.current;
    if (!field || !viewport) return;
    const rect = field.getBoundingClientRect();
    const viewportRect = viewport.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      worldPerPixelX: width / rect.width,
      worldPerPixelY: height / rect.height,
      dimensions: { width, height },
      left: rect.left - viewportRect.left + viewport.scrollLeft,
      top: rect.top - viewportRect.top + viewport.scrollTop,
      previousUserSelect: document.documentElement.style.userSelect,
    };
    document.documentElement.style.userSelect = 'none';
    draftRef.current = { width, height };
    setDraft({ width, height });
    onResizeStart?.();
  };

  const onHandleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    const step = event.shiftKey ? 20 : 2;
    let nextWidth = width;
    let nextHeight = height;
    if (event.key === 'ArrowRight') nextWidth += step;
    else if (event.key === 'ArrowLeft') nextWidth -= step;
    else if (event.key === 'ArrowDown') nextHeight += step;
    else if (event.key === 'ArrowUp') nextHeight -= step;
    else return;
    event.preventDefault();
    onResizeStart?.();
    onResize(
      clampArenaDimension(nextWidth, minWidth, maxDimension),
      clampArenaDimension(nextHeight, minHeight, maxDimension),
    );
  };

  return (
    <div style={{ width: '100%', minWidth: 0 }}>
      <p style={{ color: '#94a3b8', fontSize: 12, margin: '0 0 8px' }}>Потяните за угол, чтобы изменить поле</p>
    <div
      ref={viewportRef}
      data-testid="resizable-arena-viewport"
      style={{ width: '100%', height: previewHeight, minWidth: 0, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}
    >
      <div
        ref={fieldRef}
        data-testid="resizable-arena-field"
        style={{
          width: displayWidth,
          height: displayHeight,
          position: activeDrag ? 'absolute' : 'relative',
          left: activeDrag ? activeDrag.left : undefined,
          top: activeDrag ? activeDrag.top : undefined,
          flex: '0 0 auto',
          overflow: 'hidden',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ width: '100%', height: '100%' }}>{children}</div>
        <output aria-live="polite" style={{ position: 'absolute', left: 8, bottom: 8, color: '#fff', background: 'rgba(0, 0, 0, .65)', borderRadius: 3, padding: '2px 6px', fontSize: 12, pointerEvents: 'none' }}>
          {actual.width} × {actual.height}
        </output>
        <button
          type="button"
          aria-label="Изменить размер поля"
          title="Изменить размер поля"
          data-testid="resizable-arena-handle"
          onPointerDown={startDrag}
          onPointerMove={(event) => {
            if (dragRef.current?.pointerId === event.pointerId) updateDraft(event.clientX, event.clientY);
          }}
          onPointerUp={(event) => {
            if (dragRef.current?.pointerId === event.pointerId) {
              updateDraft(event.clientX, event.clientY);
              commitDrag();
            }
          }}
          onPointerCancel={(event) => {
            if (dragRef.current?.pointerId === event.pointerId) cancelDrag();
          }}
          onLostPointerCapture={cancelDrag}
          onKeyDown={onHandleKeyDown}
          style={{ position: 'absolute', right: 0, bottom: 0, width: 24, height: 24, padding: 0, border: 0, cursor: 'nwse-resize', touchAction: 'none', background: 'linear-gradient(135deg, transparent 45%, #67e8f9 46%, #67e8f9 54%, transparent 55%, transparent 65%, #67e8f9 66%, #67e8f9 74%, transparent 75%)' }}
        />
      </div>
    </div>
    </div>
  );
}
