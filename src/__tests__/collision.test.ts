import { describe, it, expect } from 'vitest';
import { circleVsCircle, circleVsArena } from '../engine/collision';
import { vec2 } from '../engine/vector';

describe('Collision Detection', () => {
  it('detects circle vs circle overlap correctly', () => {
    const posA = vec2(100, 100);
    const posB = vec2(140, 100);
    const radiusA = 25;
    const radiusB = 25; // total radius = 50, distance = 40, overlap = 10

    const result = circleVsCircle(posA, radiusA, posB, radiusB);
    expect(result.colliding).toBe(true);
    expect(result.overlap).toBeCloseTo(10);
    expect(result.normal.x).toBeCloseTo(1);
    expect(result.normal.y).toBeCloseTo(0);
  });

  it('detects no collision when circles are separated', () => {
    const posA = vec2(100, 100);
    const posB = vec2(200, 100);
    const result = circleVsCircle(posA, 25, posB, 25);
    expect(result.colliding).toBe(false);
    expect(result.overlap).toBe(0);
  });

  it('detects circle collision with arena walls', () => {
    const arena = { x: 0, y: 0, width: 1000, height: 1000 };
    // Touches left wall
    const colLeft = circleVsArena(vec2(20, 500), 25, arena);
    expect(colLeft.length).toBe(1);
    expect(colLeft[0].edge).toBe('left');
    expect(colLeft[0].penetration).toBe(5);

    // Touches bottom right corner
    const colCorner = circleVsArena(vec2(990, 990), 20, arena);
    expect(colCorner.length).toBe(2);
    const edges = colCorner.map((c) => c.edge);
    expect(edges).toContain('right');
    expect(edges).toContain('bottom');
  });
});
