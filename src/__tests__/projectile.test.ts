import { describe, it, expect } from 'vitest';
import { forceReturnAtWall, isCaughtByOwner, isOutOfBounds, spawnProjectiles, updateProjectile } from '../engine/projectile';
import { getProjectileCount, RangedWeaponConfig } from '../engine/ranged-weapon';
import { vec2, angle } from '../engine/vector';

describe('Projectile System', () => {
  const defaultConfig: RangedWeaponConfig = {
    baseDamage: 15,
    damageGrowthPerHit: 1.5,
    orbitRadius: 40,
    rotationSpeed: 2,
    weaponRadius: 12,
    cooldown: 0.8,
    projectileSpeed: 400,
    projectileRadius: 8,
    initialProjectileCount: 1,
    projectileGrowthPerHit: 1,
    maxProjectileCount: 4,
  };

  it('projectile count never exceeds 4 regardless of hit count', () => {
    for (let hits = 0; hits <= 100; hits++) {
      const state = { angle: 0, cooldownTimer: 0, hitCount: hits };
      const count = getProjectileCount(state, defaultConfig);
      expect(count).toBeGreaterThanOrEqual(1);
      expect(count).toBeLessThanOrEqual(4);
    }
  });

  it('generates exact radial pattern for counts 1, 2, 3, and 4', () => {
    const baseAngle = 0.5; // arbitrary angle in radians
    const pos = vec2(500, 500);

    // Count 1: single projectile along base angle
    const p1 = spawnProjectiles(pos, baseAngle, 1, 300, 8, 10, 'A', 1).projectiles;
    expect(p1.length).toBe(1);
    expect(angle(p1[0].vel)).toBeCloseTo(baseAngle);

    // Count 2: separated by 180 degrees (Math.PI)
    const p2 = spawnProjectiles(pos, baseAngle, 2, 300, 8, 10, 'A', 1).projectiles;
    expect(p2.length).toBe(2);
    const a0 = angle(p2[0].vel);
    const a1 = angle(p2[1].vel);
    let diff2 = Math.abs(a1 - a0);
    if (diff2 > Math.PI) diff2 = 2 * Math.PI - diff2;
    expect(diff2).toBeCloseTo(Math.PI, 4);

    // Count 3: separated by 120 degrees (2*PI/3)
    const p3 = spawnProjectiles(pos, baseAngle, 3, 300, 8, 10, 'A', 1).projectiles;
    expect(p3.length).toBe(3);

    // Count 4: separated by 90 degrees (PI/2)
    const p4 = spawnProjectiles(pos, baseAngle, 4, 300, 8, 10, 'A', 1).projectiles;
    expect(p4.length).toBe(4);
    for (let i = 0; i < 4; i++) {
      const expected = baseAngle + (i * 2 * Math.PI) / 4;
      // Normalizing angles
      let velAngle = angle(p4[i].vel);
      if (velAngle < 0) velAngle += 2 * Math.PI;
      let expNorm = expected % (2 * Math.PI);
      if (expNorm < 0) expNorm += 2 * Math.PI;
      expect(velAngle).toBeCloseTo(expNorm, 4);
    }
  });

  it('generates a centered spread pattern, with a single projectile on baseAngle', () => {
    const baseAngle = 0.5;
    const spreadRadians = Math.PI / 2;
    const pos = vec2(500, 500);

    const single = spawnProjectiles(pos, baseAngle, 1, 300, 8, 10, 'A', 1, {
      pattern: 'spread',
      spreadRadians,
    }).projectiles;
    expect(angle(single[0].vel)).toBeCloseTo(baseAngle, 6);

    const spread = spawnProjectiles(pos, baseAngle, 3, 300, 8, 10, 'A', 1, {
      pattern: 'spread',
      spreadRadians,
    }).projectiles;
    expect(angle(spread[0].vel)).toBeCloseTo(baseAngle - spreadRadians / 2, 6);
    expect(angle(spread[1].vel)).toBeCloseTo(baseAngle, 6);
    expect(angle(spread[2].vel)).toBeCloseTo(baseAngle + spreadRadians / 2, 6);
  });

  it('projectile disappears immediately when it reaches an arena wall', () => {
    const arena = { x: 0, y: 0, width: 1000, height: 1000 };
    const radius = 8;

    // Inside arena -> not out of bounds
    const inside = { id: 'p1', pos: vec2(500, 500), vel: vec2(0, 0), radius, damage: 10, ownerId: 'A' };
    expect(isOutOfBounds(inside, arena)).toBe(false);

    // Touching left wall: x - radius <= 0
    const touchLeft = { id: 'p2', pos: vec2(8, 500), vel: vec2(-10, 0), radius, damage: 10, ownerId: 'A' };
    expect(isOutOfBounds(touchLeft, arena)).toBe(true);

    // Touching right wall: x + radius >= 1000
    const touchRight = { id: 'p3', pos: vec2(992, 500), vel: vec2(10, 0), radius, damage: 10, ownerId: 'A' };
    expect(isOutOfBounds(touchRight, arena)).toBe(true);

    // Touching top wall: y - radius <= 0
    const touchTop = { id: 'p4', pos: vec2(500, 8), vel: vec2(0, -10), radius, damage: 10, ownerId: 'A' };
    expect(isOutOfBounds(touchTop, arena)).toBe(true);

    // Touching bottom wall: y + radius >= 1000
    const touchBottom = { id: 'p5', pos: vec2(500, 992), vel: vec2(0, 10), radius, damage: 10, ownerId: 'A' };
    expect(isOutOfBounds(touchBottom, arena)).toBe(true);
  });

  it('returns to a moving owner after its outbound time and is caught', () => {
    const ownerStart = vec2(0, 0);
    const spawned = spawnProjectiles(ownerStart, 0, 1, 10, 2, 10, 'A', 1, {
      kind: 'returning',
      returnAfter: 1,
      ability: 'boomerang',
    }).projectiles[0];

    const outbound = updateProjectile(spawned, 1);
    expect(outbound.phase).toBe('returning');
    expect(outbound.pos).toEqual(vec2(10, 0));

    const ownerMoved = vec2(4, 0);
    const returning = updateProjectile(outbound, 0.6, ownerMoved);
    expect(returning.pos).toEqual(ownerMoved);
    expect(returning.vel.x).toBeCloseTo(-10);
    expect(returning.vel.y).toBeCloseTo(0);
    expect(isCaughtByOwner(returning, ownerMoved)).toBe(true);
  });

  it('can force a returning projectile to turn around when it reaches a wall', () => {
    const projectile = spawnProjectiles(vec2(10, 10), 0, 1, 10, 2, 10, 'A', 1, {
      kind: 'returning',
      returnAfter: 10,
    }).projectiles[0];

    const returning = forceReturnAtWall(projectile);
    expect(returning.phase).toBe('returning');
    expect(updateProjectile(returning, 0.5, vec2(5, 10)).pos).toEqual(vec2(5, 10));
  });
});
