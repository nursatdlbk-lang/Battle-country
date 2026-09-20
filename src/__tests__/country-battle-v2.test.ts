import { describe, expect, it } from 'vitest';
import { BattleConfigSchema } from '../engine/battle-config';
import { createBattle, simulateBattle, stepBattle } from '../engine/battle-engine';
import { COUNTRIES, COUNTRY_IDS, getCountry, runtimeAttackKind } from '../data/countries';
import { advanceTournament, createTournament, deriveMatchSeed, deserializeTournament, seededShuffle, serializeTournament } from '../engine/tournament';

const config = BattleConfigSchema.parse({
  version: 2, seed: 7, fps: 10, maxDuration: 120,
  arena: { x: 0, y: 0, width: 4000, height: 2000 },
  fighters: [
    { id: 'jp', name: 'Japan', countryId: 'jp', radius: 20, mass: 1, hp: 100000, speed: 0, type: 'melee' },
    { id: 'kz', name: 'Kazakhstan', countryId: 'kz', radius: 20, mass: 1, hp: 100000, speed: 0, type: 'ranged' },
  ],
  melee: { baseDamage: 0, damageGrowthPerHit: 0, orbitRadius: 10, rotationSpeed: 0, weaponRadius: 1 },
  ranged: { baseDamage: 0, damageGrowthPerHit: 0, orbitRadius: 10, rotationSpeed: 0, weaponRadius: 1, cooldown: 100, projectileSpeed: 1, projectileRadius: 1, initialProjectileCount: 1, projectileGrowthPerHit: 0, maxProjectileCount: 1 },
  suddenDeath: { thresholds: [] }, effects: {}, audio: { musicVolume: 0, sfxVolume: 0 }, simulationMode: 'auto',
});

describe('country battle v2', () => {
  it('has the approved, stable 32-country roster', () => {
    expect(COUNTRIES).toHaveLength(32);
    expect(COUNTRY_IDS).toEqual(['kz', 'ru', 'ua', 'us', 'ca', 'mx', 'br', 'ar', 'gb', 'fr', 'de', 'it', 'es', 'gr', 'tr', 'eg', 'ma', 'ng', 'za', 'sa', 'in', 'pk', 'cn', 'jp', 'kr', 'th', 'id', 'vn', 'mn', 'au', 'nz', 'no']);
    expect(getCountry('jp')).toMatchObject({ name: { ru: 'Япония', en: 'Japan' }, ultimateTemplate: 'stealth' });
  });

  it('does not passively charge ultimates when no damage is dealt', () => {
    const state = simulateBattle(config, 10);
    expect(state.fighters[0].ultimateCharge).toBe(0);
    expect(state.fighters[1].ultimateCharge).toBe(0);
  });

  it('charges by confirmed basic damage using the attacking country profile', () => {
    let state = createBattle(config);
    const attacker = state.fighters[0];
    const target = state.fighters[1];
    state = {
      ...state,
      projectiles: [{
        id: 'charge-test', pos: { ...target.pos }, vel: { x: 0, y: 0 }, radius: target.radius,
        damage: 100, ownerId: attacker.id, source: 'basic', visual: 'energy',
      }],
    };
    state = stepBattle(state, config);
    expect(state.fighters[0].ultimateCharge).toBeCloseTo(100 * getCountry('jp')!.ultimateSpec.chargePerDamage, 8);
    expect(state.fighters[1].ultimateCharge).toBe(0);
  });

  it('uses the Japan stealth window and releases eight shuriken deterministically', () => {
    let state = createBattle(config);
    state = { ...state, fighters: state.fighters.map((fighter) => fighter.id === 'jp'
      ? { ...fighter, ultimateCharge: getCountry('jp')!.ultimateSpec.chargeRequired }
      : fighter) };
    let release: typeof state.events[number] | undefined;
    for (let frame = 0; frame < 40; frame++) {
      state = stepBattle(state, config);
      release ??= state.events.find((event) => event.type === 'projectile_spawn' && event.ownerId === 'jp');
    }
    expect(state.fighters[0].stealthUntil).toBeGreaterThan(0);
    expect(release).toEqual(expect.objectContaining({ type: 'projectile_spawn', ownerId: 'jp', count: 8 }));
  });

  it('throws Australia weapon-shaped boomerangs that turn around and return to their owner', () => {
    const australia = BattleConfigSchema.parse({
      ...config,
      fps: 20,
      fighters: [
        { id: 'au', name: 'Australia', countryId: 'au', attackTemplate: 'returning_projectile', radius: 20, mass: 1, hp: 100000, speed: 0, type: 'ranged' },
        { id: 'ca', name: 'Canada', countryId: 'ca', attackTemplate: 'orbiting_blade', radius: 20, mass: 1, hp: 100000, speed: 0, type: 'melee' },
      ],
      ranged: { ...config.ranged, cooldown: 0.2, projectileSpeed: 120, projectileRadius: 3 },
    });
    let state = createBattle(australia);
    let sawOutbound = false;
    let sawReturning = false;
    let sawCatch = false;
    let maxWeaponsInFlight = 0;
    let throws = 0;
    for (let frame = 0; frame < 100; frame++) {
      state = stepBattle(state, australia);
      const activeWeapons = state.projectiles.filter((projectile) => projectile.ownerId === 'au' && projectile.kind === 'returning');
      maxWeaponsInFlight = Math.max(maxWeaponsInFlight, activeWeapons.length);
      throws += state.events.filter((event) => event.type === 'projectile_spawn' && event.ownerId === 'au').length;
      sawOutbound ||= state.projectiles.some((projectile) => projectile.ownerId === 'au' && projectile.kind === 'returning' && projectile.phase === 'outbound' && projectile.visual === 'weapon');
      sawReturning ||= state.projectiles.some((projectile) => projectile.ownerId === 'au' && projectile.phase === 'returning');
      sawCatch ||= state.events.some((event) => event.type === 'projectile_destroy' && event.reason === 'returned');
    }
    expect(sawOutbound).toBe(true);
    expect(sawReturning).toBe(true);
    expect(sawCatch).toBe(true);
    expect(maxWeaponsInFlight).toBe(1);
    expect(throws).toBeGreaterThan(1);
  });

  it('moves Kazakhstan eagle to the opponent, strikes there, and returns toward its owner', () => {
    const eagleConfig = BattleConfigSchema.parse({
      ...config,
      fps: 20,
      arena: { x: 0, y: 0, width: 900, height: 540 },
      fighters: [
        { id: 'kz', name: 'Kazakhstan', countryId: 'kz', attackTemplate: 'orbiting_blade', radius: 28, mass: 1, hp: 100000, speed: 0, type: 'melee' },
        { id: 'target', name: 'Target', countryId: 'ca', attackTemplate: 'orbiting_blade', radius: 28, mass: 1, hp: 100000, speed: 0, type: 'melee' },
      ],
      melee: { ...config.melee, baseDamage: 0, rotationSpeed: 0 },
    });
    let state = createBattle(eagleConfig);
    state = { ...state, fighters: state.fighters.map((fighter) => fighter.id === 'kz'
      ? { ...fighter, ultimateCharge: getCountry('kz')!.ultimateSpec.chargeRequired }
      : fighter) };
    let spawnPosition: { x: number; y: number } | undefined;
    let moved = false;
    let struck = false;
    let returned = false;
    for (let frame = 0; frame < 150; frame++) {
      state = stepBattle(state, eagleConfig);
      const eagle = state.summons.find((summon) => summon.ownerId === 'kz');
      if (eagle && !spawnPosition) spawnPosition = { ...eagle.pos };
      if (eagle && spawnPosition && Math.hypot(eagle.pos.x - spawnPosition.x, eagle.pos.y - spawnPosition.y) > 20) moved = true;
      struck ||= state.events.some((event) => event.type === 'special_hit' && event.attackerId === 'kz' && event.ability === 'eagle_dive');
      returned ||= eagle?.phase === 'returning';
    }
    expect(moved).toBe(true);
    expect(struck).toBe(true);
    expect(returned).toBe(true);
  });

  it('turns the United States revolver toward the opponent at a limited rate instead of snapping or orbiting freely', () => {
    const revolverConfig = BattleConfigSchema.parse({
      ...config,
      fps: 20,
      arena: { x: 0, y: 0, width: 900, height: 540 },
      fighters: [
        { id: 'us', name: 'USA', countryId: 'us', attackTemplate: 'shooter', radius: 28, mass: 1, hp: 100000, speed: 0, type: 'ranged' },
        { id: 'target', name: 'Target', countryId: 'ca', attackTemplate: 'orbiting_blade', radius: 28, mass: 1, hp: 100000, speed: 0, type: 'melee' },
      ],
      ranged: { ...config.ranged, cooldown: 0.2, projectileSpeed: 200 },
    });
    let state = createBattle(revolverConfig);
    const firstUs = state.fighters.find((fighter) => fighter.id === 'us')!;
    const target = state.fighters.find((fighter) => fighter.id === 'target')!;
    const expected = Math.atan2(target.pos.y - firstUs.pos.y, target.pos.x - firstUs.pos.x);

    // One frame in, the turret should have turned partway toward the target
    // (bounded by its turn rate) rather than snapping to the exact angle instantly.
    state = stepBattle(state, revolverConfig);
    const afterOneFrame = (state.fighters.find((fighter) => fighter.id === 'us')!.weapon as { angle: number }).angle;
    expect(Math.abs(afterOneFrame)).toBeGreaterThan(0);
    expect(Math.abs(afterOneFrame - expected)).toBeGreaterThan(0.001);

    // Given enough frames to catch up, it should be tracking close to the target.
    for (let frame = 0; frame < 30; frame++) state = stepBattle(state, revolverConfig);
    const settled = (state.fighters.find((fighter) => fighter.id === 'us')!.weapon as { angle: number }).angle;
    expect(settled).toBeCloseTo(expected, 1);

    // Fired shots should head roughly toward the opponent, but with a small
    // random aim error rather than laser-perfect accuracy every time.
    expect(state.projectiles.length).toBeGreaterThan(0);
    for (const projectile of state.projectiles) {
      const shotAngle = Math.atan2(projectile.vel.y, projectile.vel.x);
      expect(Math.abs(shotAngle - expected)).toBeLessThan(0.2);
    }
  });

  it('telegraphs and activates the declared ultimate for every one of the 32 countries', () => {
    for (const country of COUNTRIES) {
      const countryConfig = BattleConfigSchema.parse({
        ...config,
        fighters: [
          { id: 'A', name: country.name.en, countryId: country.id, attackTemplate: country.basicAttackTemplate, radius: 20, mass: 1, hp: 100000, speed: 0, type: runtimeAttackKind(country.basicAttackTemplate) },
          { id: 'B', name: 'Training target', countryId: 'kz', attackTemplate: 'orbiting_blade', radius: 20, mass: 1, hp: 100000, speed: 0, type: 'melee' },
        ],
      });
      let state = createBattle(countryConfig);
      state = { ...state, fighters: state.fighters.map((fighter) => fighter.id === 'A'
        ? { ...fighter, ultimateCharge: country.ultimateSpec.chargeRequired }
        : fighter) };
      let windup = false;
      let cast = false;
      for (let frame = 0; frame < 30; frame++) {
        state = stepBattle(state, countryConfig);
        windup ||= state.events.some((event) => event.type === 'ultimate_windup' && event.fighterId === 'A' && event.template === country.ultimateTemplate);
        cast ||= state.events.some((event) => event.type === 'ultimate_cast' && event.fighterId === 'A' && event.template === country.ultimateTemplate);
      }
      expect(windup, `${country.id} windup`).toBe(true);
      expect(cast, `${country.id} cast`).toBe(true);
    }
  });

  it('builds a deterministic 31-match bracket and advances winners', () => {
    const first = createTournament(COUNTRY_IDS, 99);
    expect(first.matches).toHaveLength(31);
    expect(first.entrants).toEqual(seededShuffle(COUNTRY_IDS, 99));
    const advanced = advanceTournament(first, first.matches[0].a!);
    expect(advanced.matches[0].winner).toBe(first.matches[0].a);
    expect(advanced.matches[16].a).toBe(first.matches[0].a);
    expect(deserializeTournament(serializeTournament(advanced))).toEqual(advanced);
    expect(deriveMatchSeed(99, 'r1m1')).toBe(deriveMatchSeed(99, 'r1m1'));
    expect(deriveMatchSeed(99, 'r1m1')).not.toBe(deriveMatchSeed(99, 'r1m2'));
  });
});
