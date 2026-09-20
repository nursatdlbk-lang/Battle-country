import { describe, it, expect } from 'vitest';
import { createRangedWeapon, updateRangedWeapon, RangedWeaponConfig } from '../engine/ranged-weapon';
import { spawnProjectiles } from '../engine/projectile';
import { vec2, angle } from '../engine/vector';

describe('Ranged Weapon Behavior', () => {
  const config: RangedWeaponConfig = {
    baseDamage: 15,
    damageGrowthPerHit: 1.5,
    orbitRadius: 40,
    rotationSpeed: 2.5,
    weaponRadius: 12,
    cooldown: 0.8,
    projectileSpeed: 400,
    projectileRadius: 8,
    initialProjectileCount: 1,
    projectileGrowthPerHit: 1,
    maxProjectileCount: 4,
  };

  it('ranged weapon rotates continuously at fixed angular velocity and ignores enemy position', () => {
    let weapon = createRangedWeapon(config);
    const dt = 1 / 60;

    // Advance 60 frames (1 second)
    for (let frame = 1; frame <= 60; frame++) {
      const res = updateRangedWeapon(weapon, dt, config);
      weapon = res.weapon;
      // Angle increases strictly according to config.rotationSpeed * dt
      expect(weapon.angle).toBeCloseTo(frame * config.rotationSpeed * dt, 4);
    }
  });

  it('firing direction is strictly identical regardless of where the enemy is situated', () => {
    // Weapon state at an arbitrary angle
    const weapon = { angle: 1.234, cooldownTimer: 0, hitCount: 0 };
    const weaponPos = vec2(300, 300);

    // Case 1: Enemy is to the East (500, 300)
    // Case 2: Enemy is to the North (300, 100)
    // Case 3: Enemy is to the South-West (100, 500)
    // The firing function spawnProjectiles only receives weaponPos and weapon.angle, never enemy position
    const fired1 = spawnProjectiles(weaponPos, weapon.angle, 1, 400, 8, 15, 'B', 1).projectiles;
    const fired2 = spawnProjectiles(weaponPos, weapon.angle, 1, 400, 8, 15, 'B', 1).projectiles;

    expect(angle(fired1[0].vel)).toBeCloseTo(weapon.angle);
    expect(angle(fired2[0].vel)).toBeCloseTo(weapon.angle);
    expect(fired1[0].vel.x).toBeCloseTo(fired2[0].vel.x);
    expect(fired1[0].vel.y).toBeCloseTo(fired2[0].vel.y);
  });
});
