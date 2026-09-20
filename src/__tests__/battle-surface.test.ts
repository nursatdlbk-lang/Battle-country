import { afterEach, describe, expect, it } from 'vitest';
import { createBattleSurface } from '../renderer/battle-surface';

interface FakeCanvas {
  style: Record<string, string>;
  parentNode: FakeHost | null;
}

interface FakeHost {
  children: FakeCanvas[];
  appendChild(canvas: FakeCanvas): FakeCanvas;
  removeChild(canvas: FakeCanvas): FakeCanvas;
}

function createHost(): FakeHost {
  return {
    children: [],
    appendChild(canvas) {
      this.children.push(canvas);
      canvas.parentNode = this;
      return canvas;
    },
    removeChild(canvas) {
      this.children = this.children.filter((child) => child !== canvas);
      canvas.parentNode = null;
      return canvas;
    },
  };
}

const originalDocument = globalThis.document;

afterEach(() => {
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: originalDocument,
  });
});

describe('createBattleSurface', () => {
  it('does not remove a replacement surface during delayed StrictMode cleanup', () => {
    Object.defineProperty(globalThis, 'document', {
      configurable: true,
      value: {
        createElement: () => ({ style: {}, parentNode: null } as FakeCanvas),
      },
    });
    const host = createHost();

    const first = createBattleSurface(host as unknown as HTMLDivElement);
    const second = createBattleSurface(host as unknown as HTMLDivElement);

    first.dispose();

    expect(host.children).toHaveLength(1);
    expect(host.children[0]).toBe(second.canvas);

    second.dispose();
    expect(host.children).toHaveLength(0);
  });
});
