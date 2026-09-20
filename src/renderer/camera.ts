/**
 * Camera system with shake support.
 * Pure state — no DOM dependencies. The renderer reads camera state to apply transforms.
 */

import type { Vec2 } from '../engine/vector';

export interface CameraShakeConfig {
  /** Whether shake is enabled */
  enabled: boolean;
  /** Maximum shake offset in pixels */
  maxOffset: number;
  /** Shake decay rate (0-1, per frame) */
  decay: number;
  /** Shake intensity per hit */
  hitIntensity: number;
  /** Shake intensity for KO */
  koIntensity: number;
}

export interface CameraState {
  /** Current offset due to shake */
  offsetX: number;
  offsetY: number;
  /** Current shake trauma (0-1) */
  trauma: number;
  /** Current zoom level */
  zoom: number;
  /** Target position (center of arena by default) */
  targetX: number;
  targetY: number;
  /** Slow motion factor (1 = normal, <1 = slower) */
  slowMotionFactor: number;
  /** Slow motion timer (frames remaining) */
  slowMotionFrames: number;
}

export const DEFAULT_SHAKE_CONFIG: CameraShakeConfig = {
  enabled: true,
  maxOffset: 8,
  decay: 0.9,
  hitIntensity: 0.3,
  koIntensity: 1.0,
};

export function createCamera(centerX: number, centerY: number): CameraState {
  return {
    offsetX: 0,
    offsetY: 0,
    trauma: 0,
    zoom: 1,
    targetX: centerX,
    targetY: centerY,
    slowMotionFactor: 1,
    slowMotionFrames: 0,
  };
}

/**
 * Add trauma from a hit or event.
 * Trauma is clamped to [0, 1].
 */
export function addTrauma(camera: CameraState, amount: number): CameraState {
  return {
    ...camera,
    trauma: Math.min(1, camera.trauma + amount),
  };
}

/**
 * Trigger slow motion for a number of frames.
 */
export function triggerSlowMotion(
  camera: CameraState,
  factor: number,
  durationFrames: number,
): CameraState {
  return {
    ...camera,
    slowMotionFactor: factor,
    slowMotionFrames: durationFrames,
  };
}

/**
 * Update camera shake using deterministic "random" based on frame number.
 * Uses simple hash to avoid needing the RNG (visual only, doesn't affect simulation).
 */
export function updateCamera(
  camera: CameraState,
  config: CameraShakeConfig,
  frameNumber: number,
): CameraState {
  let { trauma, slowMotionFactor, slowMotionFrames } = camera;

  // Decay trauma
  trauma *= config.decay;
  if (trauma < 0.001) trauma = 0;

  // Calculate shake offset using deterministic noise based on frame
  const shake = trauma * trauma; // quadratic for more natural feel
  const offsetX = config.enabled
    ? shake * config.maxOffset * deterministicNoise(frameNumber, 0)
    : 0;
  const offsetY = config.enabled
    ? shake * config.maxOffset * deterministicNoise(frameNumber, 1)
    : 0;

  // Update slow motion
  if (slowMotionFrames > 0) {
    slowMotionFrames--;
    if (slowMotionFrames <= 0) {
      slowMotionFactor = 1;
    }
  }

  return {
    ...camera,
    offsetX,
    offsetY,
    trauma,
    slowMotionFactor,
    slowMotionFrames,
  };
}

/**
 * Simple deterministic noise function using frame and channel.
 * Returns value in [-1, 1].
 */
function deterministicNoise(frame: number, channel: number): number {
  const n = frame * 1327 + channel * 7919;
  const x = Math.sin(n) * 43758.5453;
  return (x - Math.floor(x)) * 2 - 1;
}

/**
 * Get the transform to apply to the stage/container.
 */
export function getCameraTransform(camera: CameraState): {
  x: number;
  y: number;
  zoom: number;
} {
  return {
    x: camera.offsetX,
    y: camera.offsetY,
    zoom: camera.zoom,
  };
}
