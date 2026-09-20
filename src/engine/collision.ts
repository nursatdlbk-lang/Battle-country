import { Vec2, distance, sub, normalize } from './vector';

export interface CircleCollisionResult {
  colliding: boolean;
  overlap: number;
  normal: Vec2;
}

export interface CapsuleCollisionResult extends CircleCollisionResult {
  /** Painted weapon edge closest to the target; useful for honest hit VFX. */
  contactPoint: Vec2;
}

export interface WallCollisionResult {
  colliding: boolean;
  edge: 'left' | 'right' | 'top' | 'bottom';
  penetration: number;
}

export interface ArenaBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function circleVsCircle(posA: Vec2, radiusA: number, posB: Vec2, radiusB: number): CircleCollisionResult {
  const dist = distance(posA, posB);
  const totalRadius = radiusA + radiusB;
  if (dist < totalRadius && dist > 0) {
    return {
      colliding: true,
      overlap: totalRadius - dist,
      normal: normalize(sub(posB, posA))
    };
  } else if (dist === 0 && totalRadius > 0) {
     return {
      colliding: true,
      overlap: totalRadius,
      normal: {x: 1, y: 0}
     }
  }
  return { colliding: false, overlap: 0, normal: { x: 0, y: 0 } };
}

/**
 * Tests a circular body against a capsule (a line segment swept by a radius).
 *
 * Melee art is rendered as a rotated weapon sprite, so its damaging volume must
 * be the blade-shaped capsule rather than a circle at the sprite's pivot.
 */
export function capsuleVsCircle(
  start: Vec2,
  end: Vec2,
  capsuleRadius: number,
  circlePos: Vec2,
  circleRadius: number,
): CapsuleCollisionResult {
  const segment = sub(end, start);
  const segmentLengthSq = segment.x * segment.x + segment.y * segment.y;
  const toCircle = sub(circlePos, start);
  const projection = segmentLengthSq === 0
    ? 0
    : Math.max(0, Math.min(1, (toCircle.x * segment.x + toCircle.y * segment.y) / segmentLengthSq));
  const closestPoint = {
    x: start.x + segment.x * projection,
    y: start.y + segment.y * projection,
  };
  return { ...circleVsCircle(closestPoint, capsuleRadius, circlePos, circleRadius), contactPoint: closestPoint };
}

export function circleVsArena(pos: Vec2, radius: number, arena: ArenaBounds): WallCollisionResult[] {
  const results: WallCollisionResult[] = [];

  if (pos.x - radius < arena.x) {
    results.push({ colliding: true, edge: 'left', penetration: arena.x - (pos.x - radius) });
  }
  if (pos.x + radius > arena.x + arena.width) {
    results.push({ colliding: true, edge: 'right', penetration: (pos.x + radius) - (arena.x + arena.width) });
  }
  if (pos.y - radius < arena.y) {
    results.push({ colliding: true, edge: 'top', penetration: arena.y - (pos.y - radius) });
  }
  if (pos.y + radius > arena.y + arena.height) {
    results.push({ colliding: true, edge: 'bottom', penetration: (pos.y + radius) - (arena.y + arena.height) });
  }

  return results;
}
