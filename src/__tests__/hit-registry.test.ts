import { describe, it, expect } from 'vitest';
import { createHitRegistry, checkAndRegisterHit, makeHitKey } from '../engine/hit-registry';

describe('Hit Registry & Contact State System', () => {
  it('melee cannot hit once every frame during continuous overlap', () => {
    let registry = createHitRegistry();
    const key = makeHitKey('fighterA', 'fighterB', 'melee');

    // Frame 1: Initial contact (enter overlap)
    const res1 = checkAndRegisterHit(registry, key, true);
    expect(res1.hitOccurred).toBe(true);
    registry = res1.registry;

    // Frames 2 to 100: Weapon continuously remains overlapping
    for (let frame = 2; frame <= 100; frame++) {
      const res = checkAndRegisterHit(registry, key, true);
      expect(res.hitOccurred).toBe(false);
      registry = res.registry;
    }
  });

  it('allows a new hit only after weapon exits and re-enters', () => {
    let registry = createHitRegistry();
    const key = makeHitKey('fighterA', 'fighterB', 'melee');

    // 1. Enter overlap -> Hit 1
    const res1 = checkAndRegisterHit(registry, key, true);
    expect(res1.hitOccurred).toBe(true);
    registry = res1.registry;

    // 2. Still overlapping -> No hit
    const res2 = checkAndRegisterHit(registry, key, true);
    expect(res2.hitOccurred).toBe(false);
    registry = res2.registry;

    // 3. Exits overlap
    const res3 = checkAndRegisterHit(registry, key, false);
    expect(res3.hitOccurred).toBe(false);
    registry = res3.registry;

    // 4. Outside for 10 frames
    for (let i = 0; i < 10; i++) {
      const res = checkAndRegisterHit(registry, key, false);
      expect(res.hitOccurred).toBe(false);
      registry = res.registry;
    }

    // 5. Re-enters overlap -> Hit 2
    const res4 = checkAndRegisterHit(registry, key, true);
    expect(res4.hitOccurred).toBe(true);
  });
});
