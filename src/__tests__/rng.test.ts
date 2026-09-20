import { describe, it, expect } from 'vitest';
import { createRng, nextFloat, nextRange, nextInt } from '../engine/rng';

describe('Seeded PRNG (Mulberry32)', () => {
  it('same seed produces identical sequence', () => {
    let rng1 = createRng(12345);
    let rng2 = createRng(12345);

    for (let i = 0; i < 1000; i++) {
      let v1: number, v2: number;
      [v1, rng1] = nextFloat(rng1);
      [v2, rng2] = nextFloat(rng2);
      expect(v1).toBe(v2);
    }
  });

  it('different seeds produce different sequences', () => {
    let rng1 = createRng(12345);
    let rng2 = createRng(67890);

    let [v1] = nextFloat(rng1);
    let [v2] = nextFloat(rng2);
    expect(v1).not.toBe(v2);
  });

  it('nextRange produces numbers within [min, max)', () => {
    let rng = createRng(999);
    for (let i = 0; i < 200; i++) {
      let v: number;
      [v, rng] = nextRange(rng, 10, 50);
      expect(v).toBeGreaterThanOrEqual(10);
      expect(v).toBeLessThan(50);
    }
  });

  it('nextInt produces integers within [min, max]', () => {
    let rng = createRng(777);
    for (let i = 0; i < 200; i++) {
      let v: number;
      [v, rng] = nextInt(rng, 1, 6);
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(6);
      expect(Number.isInteger(v)).toBe(true);
    }
  });
});
