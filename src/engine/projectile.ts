import { Vec2, add, distance, length, normalize, scale, sub, vec2, rotate } from './vector';
import { ArenaBounds } from './collision';

export type ProjectileKind = 'linear' | 'returning';
export type ProjectilePhase = 'outbound' | 'returning';

/** Optional metadata used by abilities and renderers to identify a projectile. */
export interface ProjectileSpawnOptions {
  readonly pattern?: 'radial' | 'spread';
  readonly spreadRadians?: number;
  readonly kind?: ProjectileKind;
  readonly returnAfter?: number;
  readonly source?: string;
  readonly ability?: string;
  readonly visual?: string;
  readonly hitTargetIds?: readonly string[];
}

export interface Projectile {
  readonly id: string;
  readonly pos: Vec2;
  readonly vel: Vec2;
  readonly radius: number;
  readonly damage: number;
  readonly ownerId: string;
  /** Omitted fields retain compatibility with projectiles created before returning shots existed. */
  readonly kind?: ProjectileKind;
  readonly phase?: ProjectilePhase;
  readonly age?: number;
  readonly returnAfter?: number;
  readonly source?: string;
  readonly ability?: string;
  readonly visual?: string;
  readonly hitTargetIds?: readonly string[];
}

export function spawnProjectiles(
  weaponPos: Vec2,
  baseAngle: number,
  projectileCount: number,
  speed: number,
  radius: number,
  damage: number,
  ownerId: string,
  nextId: number,
  options: ProjectileSpawnOptions = {},
): { projectiles: Projectile[]; nextId: number } {
  const kind = options.kind ?? 'linear';
  const pattern = options.pattern ?? 'radial';
  const projectiles: Projectile[] = [];
  for (let i = 0; i < projectileCount; i++) {
    const angle = pattern === 'spread'
      ? projectileCount <= 1
        ? baseAngle
        : baseAngle - (options.spreadRadians ?? 0) / 2
          + (i * (options.spreadRadians ?? 0)) / (projectileCount - 1)
      : baseAngle + (i * 2 * Math.PI) / projectileCount;
    // Velocity direction strictly along angle
    const vel = scale(rotate(vec2(1, 0), angle), speed);
    projectiles.push({
      id: `proj_${nextId++}`,
      pos: weaponPos,
      vel,
      radius,
      damage,
      ownerId,
      kind,
      phase: 'outbound',
      age: 0,
      returnAfter: options.returnAfter ?? (kind === 'returning' ? 1 : Infinity),
      source: options.source ?? 'weapon',
      ability: options.ability ?? 'basic',
      visual: options.visual ?? 'default',
      hitTargetIds: options.hitTargetIds ?? [],
    });
  }
  return { projectiles, nextId };
}

export function updateProjectile(p: Projectile, dt: number, ownerPos?: Vec2): Projectile {
  const age = (p.age ?? 0) + dt;
  const kind = p.kind ?? 'linear';
  const phase = p.phase ?? 'outbound';

  if (kind !== 'returning') {
    return {
      ...p,
      age,
      pos: add(p.pos, scale(p.vel, dt)),
    };
  }

  const returnAfter = p.returnAfter ?? 1;
  if (phase === 'outbound' && age < returnAfter) {
    return {
      ...p,
      age,
      pos: add(p.pos, scale(p.vel, dt)),
    };
  }

  // If this frame crosses the turnaround time, retain the exact outbound distance
  // before using the remainder of the frame to home in on the owner's current position.
  const outboundDt = phase === 'outbound'
    ? Math.max(0, Math.min(dt, returnAfter - (p.age ?? 0)))
    : 0;
  const outboundPos = add(p.pos, scale(p.vel, outboundDt));
  const remainingDt = dt - outboundDt;
  const speed = length(p.vel);

  if (!ownerPos || speed === 0) {
    return {
      ...p,
      age,
      phase: 'returning',
      pos: add(outboundPos, scale(p.vel, remainingDt)),
    };
  }

  const toOwner = sub(ownerPos, outboundPos);
  const ownerDistance = length(toOwner);
  const returnVelocity = scale(normalize(toOwner), speed);
  const travelDistance = speed * remainingDt;

  return {
    ...p,
    age,
    phase: 'returning',
    vel: returnVelocity,
    pos: travelDistance >= ownerDistance
      ? ownerPos
      : add(outboundPos, scale(returnVelocity, remainingDt)),
  };
}

/** Switches a returning projectile to its homing phase after it reaches a wall. */
export function forceReturnAtWall(p: Projectile): Projectile {
  if (p.kind !== 'returning') return p;
  return { ...p, phase: 'returning' };
}

/** True when a returning projectile overlaps its owner and can be removed as caught. */
export function isCaughtByOwner(p: Projectile, ownerPos: Vec2, ownerRadius = 0): boolean {
  return p.kind === 'returning'
    && p.phase === 'returning'
    && distance(p.pos, ownerPos) <= p.radius + ownerRadius;
}

/**
 * Checks if a projectile collides with or exceeds any arena wall.
 * A projectile disappears immediately when its boundary reaches any arena wall.
 */
export function isOutOfBounds(p: Projectile, arena: ArenaBounds): boolean {
  return (
    p.pos.x - p.radius <= arena.x ||
    p.pos.x + p.radius >= arena.x + arena.width ||
    p.pos.y - p.radius <= arena.y ||
    p.pos.y + p.radius >= arena.y + arena.height
  );
}
