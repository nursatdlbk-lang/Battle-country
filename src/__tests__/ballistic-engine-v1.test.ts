import { describe, expect, it } from 'vitest';
import { BattleConfig } from '../engine/battle-config';
import { createBattle, stepBattle } from '../engine/battle-engine';
import { FighterController } from '../engine/controller';
import { distance } from '../engine/vector';

const config: BattleConfig = {
  seed: 17,
  fps: 20,
  maxDuration: 30,
  arena: { x: 0, y: 0, width: 1000, height: 600 },
  fighters: [
    { id: 'a', name: 'A', radius: 20, mass: 1, hp: 100, speed: 100, type: 'melee' },
    { id: 'b', name: 'B', radius: 20, mass: 1, hp: 100, speed: 100, type: 'ranged' },
  ],
  melee: { baseDamage: 1, damageGrowthPerHit: 0, orbitRadius: 10, rotationSpeed: 0, weaponRadius: 1 },
  ranged: {
    baseDamage: 1,
    damageGrowthPerHit: 0,
    orbitRadius: 10,
    rotationSpeed: 0,
    weaponRadius: 1,
    cooldown: 100,
    projectileSpeed: 1,
    projectileRadius: 1,
    initialProjectileCount: 1,
    projectileGrowthPerHit: 0,
    maxProjectileCount: 1,
  },
  suddenDeath: { thresholds: [] },
  effects: {
    particles: false,
    trails: false,
    glow: false,
    hitFlash: false,
    cameraShake: false,
    criticalEffect: false,
    deathSlowMotion: false,
    winnerAnimation: false,
    damageNumbers: false,
  },
  audio: { musicVolume: 0, sfxVolume: 0 },
  simulationMode: 'auto',
};

describe('V1 ballistic engine', () => {
  it('uses the configured FPS and retains velocity while no collision or sudden death occurs', () => {
    const initial = createBattle(config);
    const state = {
      ...initial,
      fighters: [
        { ...initial.fighters[0], pos: { x: 100, y: 100 }, vel: { x: 100, y: 0 } },
        { ...initial.fighters[1], pos: { x: 800, y: 500 }, vel: { x: -100, y: 0 } },
      ],
    };

    const next = stepBattle(state, config);

    expect(initial.dt).toBe(1 / config.fps);
    expect(next.dt).toBe(1 / config.fps);
    expect(next.time).toBe(1 / config.fps);
    expect(next.fighters.map((fighter) => fighter.vel)).toEqual(state.fighters.map((fighter) => fighter.vel));
    expect(next.fighters[0].pos).toEqual({ x: 105, y: 100 });
  });

  it('is seed deterministic and falls back to a non-overlapping layout after rejected random placements', () => {
    const tightConfig = {
      ...config,
      arena: { x: 0, y: 0, width: 120, height: 60 },
      fighters: config.fighters.map((fighter) => ({ ...fighter, radius: 30, speed: 0 })),
    };
    const first = createBattle(tightConfig);
    const second = createBattle(tightConfig);

    expect(first.fighters).toEqual(second.fighters);
    expect(distance(first.fighters[0].pos, first.fighters[1].pos)).toBeGreaterThanOrEqual(60);
  });

  it('rejects invalid FPS, fighters that cannot fit, and configurations with no non-overlapping layout', () => {
    expect(() => createBattle({ ...config, fps: 0 })).toThrow(/fps/i);
    expect(() => createBattle({ ...config, arena: { x: 0, y: 0, width: 30, height: 30 } })).toThrow(/cannot fit/i);
    expect(() => createBattle({
      ...config,
      arena: { x: 0, y: 0, width: 60, height: 60 },
      fighters: config.fighters.map((fighter) => ({ ...fighter, radius: 30 })),
    })).toThrow(/without overlap/i);
  });

  it('keeps historical states immutable when a void controller mutates its draft', () => {
    const mutatingController: FighterController = {
      type: 'test',
      update(fighter): void {
        (fighter.vel as { x: number }).x = 75;
      },
    };
    const initial = createBattle(config);
    const state = {
      ...initial,
      fighters: [
        { ...initial.fighters[0], controller: mutatingController, pos: { x: 100, y: 100 }, vel: { x: 20, y: 0 } },
        { ...initial.fighters[1], pos: { x: 800, y: 500 }, vel: { x: 0, y: 0 } },
      ],
    };

    const next = stepBattle(state, config);

    expect(state.fighters[0].vel).toEqual({ x: 20, y: 0 });
    expect(next.fighters[0].vel).toEqual({ x: 75, y: 0 });
  });

  it('puts every event on the returned state frame and emits a winner event when the battle finishes', () => {
    const oneFrameConfig = {
      ...config,
      maxDuration: 1 / config.fps,
      fighters: [config.fighters[0]],
    };
    const next = stepBattle(createBattle(oneFrameConfig), oneFrameConfig);

    expect(next.finished).toBe(true);
    expect(next.statistics.winner).toBe('a');
    expect(next.events).toEqual([
      expect.objectContaining({ type: 'winner', frame: next.frame, winnerId: 'a' }),
    ]);
    expect(next.events.every((event) => event.frame === next.frame)).toBe(true);
  });
});
