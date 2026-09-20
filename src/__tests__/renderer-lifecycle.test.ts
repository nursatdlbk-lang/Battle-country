import { describe, it, expect } from 'vitest';
import { PixiBattleRenderer } from '../renderer/pixi-battle-renderer';

describe('PixiBattleRenderer Lifecycle & Regression Tests', () => {
  it('destroy() on uninitialized renderer is safe and does not throw', () => {
    const renderer = new PixiBattleRenderer();
    expect(() => {
      renderer.destroy();
    }).not.toThrow();
    expect(renderer.isReady).toBe(false);
  });

  it('destroy() is idempotent and can be called multiple times without error', () => {
    const renderer = new PixiBattleRenderer();
    expect(() => {
      renderer.destroy();
      renderer.destroy();
      renderer.destroy();
    }).not.toThrow();
    expect(renderer.isReady).toBe(false);
  });

  it('handles cancellation and destruction requested during async init without throwing', async () => {
    const renderer = new PixiBattleRenderer();

    // Create a mock canvas
    const mockCanvas = {
      getContext: () => null,
      addEventListener: () => {},
      removeEventListener: () => {},
      style: {},
      width: 800,
      height: 600,
    } as unknown as HTMLCanvasElement;

    // Start init (which is asynchronous)
    const initPromise = renderer.init(mockCanvas, 800, 600);

    // Immediately request destroy while init is still in-flight
    // (This reproduces the React StrictMode unmount race!)
    expect(() => {
      renderer.destroy();
    }).not.toThrow();

    // Await init promise completion
    await expect(initPromise).resolves.not.toThrow();

    // Must be marked destroyed and not ready
    expect(renderer.isReady).toBe(false);

    // Subsequent destroy calls must still be safe
    expect(() => {
      renderer.destroy();
    }).not.toThrow();
  });
});
