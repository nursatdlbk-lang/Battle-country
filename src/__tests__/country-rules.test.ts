import { describe, expect, it } from 'vitest';
import { BattleConfigSchema } from '../engine/battle-config';
import { createBattle, stepBattle } from '../engine/battle-engine';
import { getBattleRules, getEffectiveArena, getRuleMultipliers } from '../engine/battle-rules';
import { MeleeWeaponState } from '../engine/melee-weapon';
import { getCountry } from '../data/countries';

const makeConfig = (a = 'jp', b = 'kz') => BattleConfigSchema.parse({
  version: 2, seed: 71, fps: 10, maxDuration: 120,
  arena: { x: 0, y: 0, width: 2000, height: 3000 },
  fighters: [
    { id: 'A', name: a, countryId: a, radius: 20, mass: 1, hp: 100000, speed: 0, type: 'melee' },
    { id: 'B', name: b, countryId: b, radius: 20, mass: 1, hp: 100000, speed: 0, type: 'melee' },
  ],
  melee: { baseDamage: 0, damageGrowthPerHit: 0, orbitRadius: 5, rotationSpeed: 1, weaponRadius: 1 },
  ranged: { baseDamage: 0, damageGrowthPerHit: 0, orbitRadius: 5, rotationSpeed: 1, weaponRadius: 1, cooldown: 100, projectileSpeed: 10, projectileRadius: 1, initialProjectileCount: 1, projectileGrowthPerHit: 0, maxProjectileCount: 1 },
  suddenDeath: { thresholds: [] }, effects: {}, audio: {}, simulationMode: 'auto',
});

describe('country battle timing rules', () => {
  it('doubles movement, weapon rotation, projectile cadence and speed without doubling hit damage', () => {
    const config = makeConfig(); let state = createBattle(config);
    while (state.frame < 298) state = stepBattle(state, config);
    const angle298 = (state.fighters[0].weapon as MeleeWeaponState).angle;
    state = stepBattle(state, config); const angle299 = (state.fighters[0].weapon as MeleeWeaponState).angle;
    state = stepBattle(state, config); const angle300 = (state.fighters[0].weapon as MeleeWeaponState).angle;
    expect(angle299 - angle298).toBeCloseTo(0.1, 8);
    expect(angle300 - angle299).toBeCloseTo(0.2, 8);
    expect(getRuleMultipliers(30, getBattleRules(config)).speed).toBe(2);
    expect(config.melee.baseDamage).toBe(0);
  });

  it('shrinks smoothly to exactly 35 percent and ramps damage 15 percent per five seconds', () => {
    const config = makeConfig(); const rules = getBattleRules(config);
    expect(getEffectiveArena(config.arena, 60, rules)).toMatchObject({ x: 0, y: 0, width: 2000, height: 3000 });
    const finalArena = getEffectiveArena(config.arena, 120, rules);
    expect(finalArena.width).toBeCloseTo(700, 8); expect(finalArena.height).toBeCloseTo(1050, 8);
    expect(getRuleMultipliers(65, rules).damage).toBeCloseTo(1.15, 8);
    expect(getRuleMultipliers(60, rules).healingEnabled).toBe(false);
  });

  it('casts simultaneous charged ultimates and does not recharge without new damage', () => {
    const config = makeConfig('jp', 'jp'); let state = createBattle(config); const casts: number[] = [];
    const required = getCountry('jp')!.ultimateSpec.chargeRequired;
    state = { ...state, fighters: state.fighters.map((fighter) => ({ ...fighter, ultimateCharge: required })) };
    while (state.frame < 80) {
      state = stepBattle(state, config);
      casts.push(...state.events.filter((event) => event.type === 'ultimate_cast').map(() => state.frame));
    }
    expect(casts).toHaveLength(2);
    expect(new Set(casts).size).toBe(1);
    expect(state.fighters[0].ultimateCharge).toBe(0);
  });

  it('telegraphs an ultimate, slows motion without moving the camera, then activates it', () => {
    const config = makeConfig('jp', 'kz');
    let state = createBattle(config);
    state = { ...state, fighters: state.fighters.map((fighter) => fighter.id === 'A'
      ? { ...fighter, ultimateCharge: getCountry('jp')!.ultimateSpec.chargeRequired }
      : fighter) };
    state = stepBattle(state, config);
    expect(state.events).toContainEqual(expect.objectContaining({ type: 'ultimate_windup', fighterId: 'A' }));
    expect(state.fighters[0].ultimateStatus).toBe('casting');
    const beforeAngle = (state.fighters[0].weapon as MeleeWeaponState).angle;
    state = stepBattle(state, config);
    const slowedRotation = (state.fighters[0].weapon as MeleeWeaponState).angle - beforeAngle;
    expect(slowedRotation).toBeCloseTo(0.02, 8);
    while (!state.events.some((event) => event.type === 'ultimate_cast')) state = stepBattle(state, config);
    expect(state.frame).toBeLessThan(10);
    expect(state.events).toContainEqual(expect.objectContaining({ type: 'ultimate_cast', fighterId: 'A' }));
  });

  it('uses HP, then damage, then seed to guarantee a winner and is language-independent', () => {
    const ru = { ...makeConfig(), maxDuration: 1, presentation: { locale: 'ru' as const, showCountryNames: true, showUltimateNames: true } };
    const en = { ...ru, presentation: { ...ru.presentation, locale: 'en' as const } };
    let stateRu = createBattle(ru); let stateEn = createBattle(en);
    for (let i = 0; i < 20; i++) { stateRu = stepBattle(stateRu, ru); stateEn = stepBattle(stateEn, en); }
    expect(stateRu.winner).toMatch(/^[AB]$/); expect(stateRu.winner).toBe(stateEn.winner);
    expect(stateRu).toEqual(stateEn);
  });
});
