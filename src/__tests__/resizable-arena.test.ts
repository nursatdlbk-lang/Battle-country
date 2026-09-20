// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { getArenaPreviewHeight, getFittedArenaSize, ResizableArena } from '../ui/ResizableArena';

let host: HTMLDivElement;
let root: Root;
let observerCallback: ResizeObserverCallback | undefined;

class ResizeObserverMock {
  constructor(callback: ResizeObserverCallback) { observerCallback = callback; }
  observe() {}
  disconnect() {}
  unobserve() {}
}

const pointer = (target: Element, type: string, values: Record<string, unknown>) => {
  const event = new Event(type, { bubbles: true, cancelable: true }) as PointerEvent;
  Object.assign(event, { pointerId: 1, button: 0, clientX: 0, clientY: 0, ...values });
  target.dispatchEvent(event);
};

beforeEach(async () => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  vi.stubGlobal('ResizeObserver', ResizeObserverMock);
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
});

afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
});

async function renderArena(onResize = vi.fn(), onResizeStart = vi.fn()) {
  await act(async () => root.render(
    React.createElement(
      ResizableArena,
      {
        width: 1000,
        height: 500,
        previewHeight: 300,
        minWidth: 240,
        minHeight: 240,
        onResize,
        onResizeStart,
        children: React.createElement('canvas', { 'data-testid': 'live-canvas' }),
      },
    ),
  ));
  const viewport = host.querySelector<HTMLElement>('[data-testid="resizable-arena-viewport"]')!;
  const field = host.querySelector<HTMLElement>('[data-testid="resizable-arena-field"]')!;
  const handle = host.querySelector<HTMLButtonElement>('[data-testid="resizable-arena-handle"]')!;
  vi.spyOn(viewport, 'getBoundingClientRect').mockReturnValue({ left: 10, top: 20, width: 600, height: 300 } as DOMRect);
  vi.spyOn(field, 'getBoundingClientRect').mockReturnValue({ left: 10, top: 20, width: 600, height: 300 } as DOMRect);
  await act(async () => observerCallback?.([], {} as ResizeObserver));
  handle.setPointerCapture = vi.fn();
  return { field, handle, onResize, onResizeStart };
}

describe('ResizableArena', () => {
  it('fits every arena aspect ratio inside the responsive preview without scrolling or cropping', async () => {
    const props = {
      previewHeight: 300,
      minWidth: 240,
      minHeight: 240,
      onResize: vi.fn(),
      children: React.createElement('canvas', { 'data-testid': 'live-canvas' }),
    };
    await act(async () => root.render(React.createElement(ResizableArena, { ...props, width: 1920, height: 900 })));
    const viewport = host.querySelector<HTMLElement>('[data-testid="resizable-arena-viewport"]')!;
    vi.spyOn(viewport, 'getBoundingClientRect').mockReturnValue({ left: 0, top: 0, width: 600, height: 316 } as DOMRect);
    await act(async () => observerCallback?.([], {} as ResizeObserver));
    const largeField = host.querySelector<HTMLElement>('[data-testid="resizable-arena-field"]')!;

    await act(async () => root.render(React.createElement(ResizableArena, { ...props, width: 800, height: 400 })));
    const smallField = host.querySelector<HTMLElement>('[data-testid="resizable-arena-field"]')!;
    expect(Number.parseFloat(smallField.style.width)).toBeLessThanOrEqual(600);
    expect(Number.parseFloat(smallField.style.height)).toBeLessThanOrEqual(300);
    expect(Number.parseFloat(smallField.style.width) / Number.parseFloat(smallField.style.height)).toBeCloseTo(2);
    expect(Number.parseFloat(largeField.style.width)).toBeLessThanOrEqual(600);
    expect(Number.parseFloat(largeField.style.height)).toBeLessThanOrEqual(300);
    expect(host.querySelector('[data-testid="live-canvas"]')).toBeTruthy();
  });

  it('uses the available height for portrait arenas and preserves their aspect ratio', () => {
    const fitted = getFittedArenaSize({ width: 540, height: 960 }, 600, 300);
    expect(fitted).toMatchObject({ width: 168.75, height: 300 });
    expect(fitted.width / fitted.height).toBeCloseTo(540 / 960);
  });

  it('uses empty desktop height while retaining the compact mobile preview', () => {
    expect(getArenaPreviewHeight(360, 1440, 900)).toBe(600);
    expect(getArenaPreviewHeight(360, 1200, 768)).toBe(588);
    expect(getArenaPreviewHeight(360, 390, 844)).toBe(360);
  });

  it('resizes both world dimensions using the field scale and commits once on release', async () => {
    const ui = await renderArena();
    await act(async () => {
      pointer(ui.handle, 'pointerdown', { clientX: 600, clientY: 300 });
      pointer(ui.handle, 'pointermove', { clientX: 660, clientY: 330 });
    });
    expect(ui.onResize).not.toHaveBeenCalled();
    expect(ui.onResizeStart).toHaveBeenCalledOnce();
    expect(host.textContent).toContain('1100 × 550');
    expect(ui.field.style.width).toBe('600px');
    expect(ui.field.style.height).toBe('300px');
    expect(host.querySelector('[data-testid="live-canvas"]')).toBeTruthy();
    await act(async () => pointer(ui.handle, 'pointerup', { clientX: 660, clientY: 330 }));
    expect(ui.onResize).toHaveBeenCalledTimes(1);
    expect(ui.onResize).toHaveBeenCalledWith(1100, 550);
  });

  it('keeps independently resized dimensions instead of forcing a square or aspect ratio', async () => {
    const ui = await renderArena();
    await act(async () => {
      pointer(ui.handle, 'pointerdown', { clientX: 600, clientY: 300 });
      pointer(ui.handle, 'pointermove', { clientX: 660, clientY: 420 });
      pointer(ui.handle, 'pointerup', { clientX: 660, clientY: 420 });
    });
    expect(ui.onResize).toHaveBeenCalledWith(1100, 700);
  });

  it('cancels a gesture without committing and exposes the Russian resize instructions', async () => {
    const ui = await renderArena();
    expect(ui.handle.getAttribute('aria-label')).toBe('Изменить размер поля');
    expect(ui.handle.title).toBe('Изменить размер поля');
    expect(host.textContent).toContain('Потяните за угол, чтобы изменить поле');
    await act(async () => {
      pointer(ui.handle, 'pointerdown', { clientX: 600, clientY: 300 });
      pointer(ui.handle, 'pointermove', { clientX: 660, clientY: 330 });
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    expect(ui.onResize).not.toHaveBeenCalled();
    expect(host.textContent).toContain('1000 × 500');
  });
});
