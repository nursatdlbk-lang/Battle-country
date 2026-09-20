import { describe, expect, it } from 'vitest';
import { BattleConfig } from '../engine/battle-config';
import { createBattle, stepBattle } from '../engine/battle-engine';
import { getMeleeWeaponHitbox, getMeleeWeaponPosition, getMeleeWeaponSpriteRotation, MeleeWeaponState } from '../engine/melee-weapon';
import { distance, dot, normalize, rotate, sub } from '../engine/vector';
import { COUNTRIES, getCountry, runtimeAttackKind } from '../data/countries';

const config: BattleConfig = {
  seed: 11,
  fps: 60,
  maxDuration: 120,
  arena: { x: 0, y: 0, width: 800, height: 600 },
  fighters: [
    { id: 'A', name: 'A', countryId: 'kz', attackTemplate: 'orbiting_blade', radius: 30, mass: 1, hp: 100, speed: 0, type: 'melee' },
    { id: 'B', name: 'B', countryId: 'fr', attackTemplate: 'thrust', radius: 30, mass: 1, hp: 100, speed: 0, type: 'melee' },
  ],
  melee: { baseDamage: 20, damageGrowthPerHit: 0, orbitRadius: 80, rotationSpeed: 0, weaponRadius: 15 },
  ranged: { baseDamage: 0, damageGrowthPerHit: 0, orbitRadius: 40, rotationSpeed: 0, weaponRadius: 12, cooldown: 100, projectileSpeed: 1, projectileRadius: 1, initialProjectileCount: 1, projectileGrowthPerHit: 0, maxProjectileCount: 1 },
  suddenDeath: { thresholds: [] },
  effects: { particles: false, trails: false, glow: false, hitFlash: false, cameraShake: false, criticalEffect: false, deathSlowMotion: false, winnerAnimation: false, damageNumbers: false },
  audio: { musicVolume: 0, sfxVolume: 0 },
  simulationMode: 'auto',
};

function positionedBattle(targetPosition: { x: number; y: number }, battleConfig = config) {
  const state = createBattle(battleConfig);
  return {
    ...state,
    fighters: [
      { ...state.fighters[0], pos: { x: 200, y: 200 }, vel: { x: 0, y: 0 }, weapon: { ...state.fighters[0].weapon, angle: 0 } },
      { ...state.fighters[1], pos: targetPosition, vel: { x: 0, y: 0 }, weapon: { ...state.fighters[1].weapon, angle: 0 } },
    ],
  };
}

describe('weapon-only combat collisions', () => {
  it('orients every country melee PNG with its declared grip inward and striking end outward', () => {
    const radial = { x: 1, y: 0 };
    for (const country of COUNTRIES.filter((candidate) => runtimeAttackKind(candidate.basicAttackTemplate) === 'melee')) {
      const rotation = getMeleeWeaponSpriteRotation({ angle: 0, hitCount: 0 }, country.weaponHitbox);
      const rotatedGrip = rotate(country.weaponHitbox.gripAnchor, rotation);
      expect(dot(normalize(rotatedGrip), radial), country.id).toBeCloseTo(-1, 6);
      for (const segment of country.weaponHitbox.damageSegments) {
        const rotatedTip = rotate(segment.end, rotation);
        expect(dot(rotatedTip, radial), `${country.id} combat end`).toBeGreaterThan(0);
      }
    }
  });

  it('rotates the Canadian and Norwegian axes blade-first while every country declares a stable direction', () => {
    for (const country of COUNTRIES) expect([1, -1]).toContain(country.weaponSpinDirection);
    expect(getCountry('ca')?.weaponSpinDirection).toBe(-1);
    expect(getCountry('no')?.weaponSpinDirection).toBe(-1);
    const canadaConfig: BattleConfig = {
      ...config,
      fighters: [{ ...config.fighters[0], countryId: 'ca', attackTemplate: 'orbiting_blade' }, config.fighters[1]],
      melee: { ...config.melee, rotationSpeed: 2 },
    };
    const before = createBattle(canadaConfig);
    const after = stepBattle(before, canadaConfig);
    expect((after.fighters[0].weapon as MeleeWeaponState).angle).toBeLessThan(0);
  });

  it('gives thrust, tethered and orbiting weapons distinct physical reach', () => {
    const center = { x: 200, y: 200 };
    const angle = 0;
    const orbit = getMeleeWeaponPosition({ angle, hitCount: 0, motion: 'orbiting_blade' }, center, config.melee);
    const thrust = getMeleeWeaponPosition({ angle, hitCount: 0, motion: 'thrust' }, center, config.melee);
    const tethered = getMeleeWeaponPosition({ angle, hitCount: 0, motion: 'tethered_weapon' }, center, config.melee);
    expect(distance(center, thrust)).toBeLessThan(distance(center, orbit));
    expect(distance(center, tethered)).toBeGreaterThan(distance(center, orbit));
  });

  it('keeps body impacts elastic and damage-free when the blade capsule misses', () => {
    const after = stepBattle(positionedBattle({ x: 200, y: 150 }), config);

    expect(after.events).toContainEqual(expect.objectContaining({ type: 'fighter_collision', fighterAId: 'A', fighterBId: 'B' }));
    expect(after.events.filter((event) => event.type === 'damage')).toEqual([]);
    expect(after.fighters.find((fighter) => fighter.id === 'B')?.hp).toBe(100);
  });

  it.each(['kz', 'id', 'kr'] as const)('damages a contact at the visible %s weapon tip, not at the sprite hub', (countryId) => {
    const battleConfig: BattleConfig = {
      ...config,
      fighters: [{ ...config.fighters[0], countryId, attackTemplate: getCountry(countryId)!.basicAttackTemplate }, config.fighters[1]],
    };
    const initial = positionedBattle({ x: 600, y: 500 }, battleConfig);
    const initialAttacker = initial.fighters[0];
    const profile = getCountry(countryId)!.weaponHitbox;
    const hitbox = getMeleeWeaponHitbox(initialAttacker.weapon as MeleeWeaponState, initialAttacker.pos, initialAttacker.radius, battleConfig.melee, profile);
    const bladeTip = distance(hitbox.start, initialAttacker.pos) > distance(hitbox.end, initialAttacker.pos) ? hitbox.start : hitbox.end;
    const outward = normalize(sub(bladeTip, hitbox.center));
    const targetPosition = {
      x: bladeTip.x + outward.x * (30 + hitbox.radius - 1),
      y: bladeTip.y + outward.y * (30 + hitbox.radius - 1),
    };
    const before = positionedBattle(targetPosition, battleConfig);
    const attacker = before.fighters[0];
    const profiledHitbox = getMeleeWeaponHitbox(attacker.weapon as MeleeWeaponState, attacker.pos, attacker.radius, battleConfig.melee, profile);
    expect(profiledHitbox.center).not.toEqual({ x: 280, y: 200 });
    expect(distance(targetPosition, profiledHitbox.center)).toBeGreaterThan(30 + profiledHitbox.radius);

    const after = stepBattle(before, battleConfig);
    expect(after.events.filter((event) => event.type === 'fighter_collision')).toEqual([]);
    expect(after.events).toContainEqual(expect.objectContaining({ type: 'hit', attackerId: 'A', targetId: 'B', weaponType: 'melee' }));
    expect(after.fighters.find((fighter) => fighter.id === 'B')?.hp).toBe(80);
  });

  it('honours only a small visual tolerance outside the painted blade width', () => {
    const initial = positionedBattle({ x: 600, y: 500 });
    const attacker = initial.fighters[0];
    const hitbox = getMeleeWeaponHitbox(attacker.weapon as MeleeWeaponState, attacker.pos, attacker.radius, config.melee, getCountry('kz')!.weaponHitbox);
    const axis = normalize(sub(hitbox.end, hitbox.start));
    const outsideNormal = { x: -axis.y, y: axis.x };
    const visualRadius = hitbox.radius - getCountry('kz')!.weaponHitbox.hitTolerance;
    const withinTolerance = {
      x: hitbox.center.x + outsideNormal.x * (30 + visualRadius + 1),
      y: hitbox.center.y + outsideNormal.y * (30 + visualRadius + 1),
    };

    const tolerantHit = stepBattle(positionedBattle(withinTolerance), config);
    expect(tolerantHit.events).toContainEqual(expect.objectContaining({ type: 'hit', attackerId: 'A', targetId: 'B' }));

    const targetPosition = {
      x: hitbox.center.x + outsideNormal.x * (30 + visualRadius + getCountry('kz')!.weaponHitbox.hitTolerance + 0.5),
      y: hitbox.center.y + outsideNormal.y * (30 + visualRadius + getCountry('kz')!.weaponHitbox.hitTolerance + 0.5),
    };

    const after = stepBattle(positionedBattle(targetPosition), config);
    expect(after.events.filter((event) => event.type === 'fighter_collision' || event.type === 'damage')).toEqual([]);
    expect(after.fighters.find((fighter) => fighter.id === 'B')?.hp).toBe(100);
  });
});
