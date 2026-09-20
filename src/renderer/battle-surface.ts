/**
 * Owns a canvas created outside React's child reconciliation.
 *
 * Pixi may asynchronously finish initialization after a React StrictMode
 * cleanup. Giving every renderer instance its own canvas prevents an old
 * renderer's WebGL context cleanup from affecting its replacement.
 */
export interface BattleSurface {
  readonly canvas: HTMLCanvasElement;
  dispose(): void;
}

export function createBattleSurface(
  host: HTMLDivElement,
  styles: Partial<CSSStyleDeclaration> = {},
): BattleSurface {
  const canvas = document.createElement('canvas');
  Object.assign(canvas.style, styles);
  host.appendChild(canvas);

  let disposed = false;
  return {
    canvas,
    dispose() {
      if (disposed) return;
      disposed = true;

      // Remove only this renderer's canvas. A newer StrictMode effect may
      // already have appended its own canvas to the same host.
      if (canvas.parentNode === host) host.removeChild(canvas);
    },
  };
}
