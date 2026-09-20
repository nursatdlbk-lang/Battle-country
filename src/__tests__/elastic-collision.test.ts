import { describe, it, expect } from 'vitest';
import { resolveElasticCollision } from '../engine/physics';
import { vec2 } from '../engine/vector';

describe('Elastic Collision Physics', () => {
  it('conserves expected linear momentum within floating-point tolerance (equal mass)', () => {
    const a = {
      pos: vec2(100, 100),
      vel: vec2(50, 0),
      mass: 2,
      radius: 20,
    };
    const b = {
      pos: vec2(130, 100),
      vel: vec2(-30, 0),
      mass: 2,
      radius: 20,
    };

    const initialTotalMomentumX = a.mass * a.vel.x + b.mass * b.vel.x;
    const initialTotalMomentumY = a.mass * a.vel.y + b.mass * b.vel.y;

    const res = resolveElasticCollision(a, b, 1.0);
    expect(res.collided).toBe(true);

    const finalTotalMomentumX = res.a.mass * res.a.vel.x + res.b.mass * res.b.vel.x;
    const finalTotalMomentumY = res.a.mass * res.a.vel.y + res.b.mass * res.b.vel.y;

    expect(finalTotalMomentumX).toBeCloseTo(initialTotalMomentumX, 5);
    expect(finalTotalMomentumY).toBeCloseTo(initialTotalMomentumY, 5);

    // For equal masses in 1D head-on elastic collision, velocities swap
    expect(res.a.vel.x).toBeCloseTo(-30, 5);
    expect(res.b.vel.x).toBeCloseTo(50, 5);
  });

  it('conserves momentum with unequal masses at arbitrary collision angles', () => {
    const a = {
      pos: vec2(100, 100),
      vel: vec2(40, 20),
      mass: 3.5,
      radius: 25,
    };
    const b = {
      pos: vec2(130, 120),
      vel: vec2(-15, 35),
      mass: 1.2,
      radius: 20,
    };

    const initialPx = a.mass * a.vel.x + b.mass * b.vel.x;
    const initialPy = a.mass * a.vel.y + b.mass * b.vel.y;

    const res = resolveElasticCollision(a, b, 1.0);
    expect(res.collided).toBe(true);

    const finalPx = res.a.mass * res.a.vel.x + res.b.mass * res.b.vel.x;
    const finalPy = res.a.mass * res.a.vel.y + res.b.mass * res.b.vel.y;

    expect(finalPx).toBeCloseTo(initialPx, 4);
    expect(finalPy).toBeCloseTo(initialPy, 4);
  });

  it('does not push bodies towards each other if they are already separating', () => {
    const a = {
      pos: vec2(100, 100),
      vel: vec2(-50, 0), // moving left (away)
      mass: 1,
      radius: 20,
    };
    const b = {
      pos: vec2(130, 100),
      vel: vec2(50, 0), // moving right (away)
      mass: 1,
      radius: 20,
    };

    const res = resolveElasticCollision(a, b, 1.0);
    // Velocities should remain unchanged because they are already moving apart
    expect(res.a.vel.x).toBe(-50);
    expect(res.b.vel.x).toBe(50);
  });
});
