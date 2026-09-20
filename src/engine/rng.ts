/**
 * Seeded Pseudo-Random Number Generator using Mulberry32.
 * Deterministic: same seed always produces the same sequence.
 * NEVER uses Math.random().
 */

export interface RngState {
  readonly state: number;
}

export function createRng(seed: number): RngState {
  // Ensure seed is a 32-bit integer
  return { state: seed >>> 0 };
}

/**
 * Mulberry32 core — advances state and returns a float in [0, 1).
 */
function mulberry32Step(s: number): [number, number] {
  let t = (s + 0x6D2B79F5) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const result = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  // The new state is the incremented seed
  const newState = (s + 1) | 0;
  return [result, newState];
}

/**
 * Returns a float in [0, 1) and a new RngState.
 */
export function nextFloat(rng: RngState): [number, RngState] {
  const [val, newState] = mulberry32Step(rng.state);
  return [val, { state: newState }];
}

/**
 * Returns a float in [min, max) and a new RngState.
 */
export function nextRange(rng: RngState, min: number, max: number): [number, RngState] {
  const [val, newRng] = nextFloat(rng);
  return [min + val * (max - min), newRng];
}

/**
 * Returns an integer in [min, max] (inclusive) and a new RngState.
 */
export function nextInt(rng: RngState, min: number, max: number): [number, RngState] {
  const [val, newRng] = nextFloat(rng);
  return [Math.floor(min + val * (max - min + 1)), newRng];
}
