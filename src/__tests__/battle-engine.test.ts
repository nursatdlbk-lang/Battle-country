import { describe, it, expect } from 'vitest';
import {
  createBattle,
  stepBattle,
  simulateBattle,
  getStateAtFrame,
} from '../engine/battle-engine';
import { BattleConfig } from '../engine/battle-config';
import { distance } from '../engine/vector';

describe('BattleEngine Simulation & Determinism', () => {
  const baseConfig: BattleConfig = {
    seed: 42,
    fps: 60,
    maxDuration: 120,
    arena: { x: 0, y: 0, width: 1920, height: 1080 },
    fighters: [
      { id: 'fA', name: 'Fighter A', radius: 30, mass: 1, hp: 1000, speed: 200, type: 'melee' },
      { id: 'fB', name: 'Fighter B', radius: 30, mass: 1, hp: 1000, speed: 200, type: 'ranged' },
    ],
    melee: {
      baseDamage: 20,
      damageGrowthPerHit: 2,
      orbitRadius: 50,
      rotationSpeed: 3,
      weaponRadius: 15,
    },
    ranged: {
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
    },
    suddenDeath: {
      thresholds: [
        { time: 60, speedMultiplier: 1.3, damageMultiplier: 1.5 },
        { time: 75, speedMultiplier: 1.5, damageMultiplier: 2.0 },
      ],
    },
    effects: {
      particles: true,
      trails: true,
      glow: true,
      hitFlash: true,
      cameraShake: true,
      criticalEffect: true,
      deathSlowMotion: true,
      winnerAnimation: true,
      damageNumbers: true,
    },
    audio: {
      musicVolume: 0.7,
      sfxVolume: 0.7,
    },
    simulationMode: 'auto',
  };

  it('fighters cannot initially spawn overlapping each other', () => {
    for (let testSeed = 1; testSeed <= 50; testSeed++) {
      const state = createBattle({ ...baseConfig, seed: testSeed });
      const fA = state.fighters[0];
      const fB = state.fighters[1];
      const dist = distance(fA.pos, fB.pos);
      expect(dist).toBeGreaterThanOrEqual(fA.radius + fB.radius + 30);
    }
  });

  it('same seed produces exact same battle across full simulation', () => {
    const framesToSimulate = 180; // 3 seconds at 60 FPS
    const sim1 = simulateBattle(baseConfig, framesToSimulate);
    const sim2 = simulateBattle(baseConfig, framesToSimulate);

    expect(sim1.frame).toBe(sim2.frame);
    expect(sim1.time).toBe(sim2.time);
    expect(sim1.finished).toBe(sim2.finished);
    expect(sim1.winner).toBe(sim2.winner);

    // Deep compare fighters
    for (let i = 0; i < sim1.fighters.length; i++) {
      expect(sim1.fighters[i].pos.x).toBe(sim2.fighters[i].pos.x);
      expect(sim1.fighters[i].pos.y).toBe(sim2.fighters[i].pos.y);
      expect(sim1.fighters[i].vel.x).toBe(sim2.fighters[i].vel.x);
      expect(sim1.fighters[i].vel.y).toBe(sim2.fighters[i].vel.y);
      expect(sim1.fighters[i].hp).toBe(sim2.fighters[i].hp);
      expect(sim1.fighters[i].weapon.hitCount).toBe(sim2.fighters[i].weapon.hitCount);
    }

    // Deep compare projectiles
    expect(sim1.projectiles.length).toBe(sim2.projectiles.length);
    for (let i = 0; i < sim1.projectiles.length; i++) {
      expect(sim1.projectiles[i].pos.x).toBe(sim2.projectiles[i].pos.x);
      expect(sim1.projectiles[i].pos.y).toBe(sim2.projectiles[i].pos.y);
    }
  });

  it('preview simulation and frame-based simulation produce matching results', () => {
    // 1. Step sequentially (preview simulation mode)
    let seqState = createBattle(baseConfig);
    for (let f = 0; f < 150; f++) {
      seqState = stepBattle(seqState, baseConfig);
    }

    // 2. Direct lookup at frame (Remotion frame-based mode)
    const frameState = getStateAtFrame(baseConfig, 150);

    expect(frameState.frame).toBe(seqState.frame);
    expect(frameState.time).toBeCloseTo(seqState.time, 6);

    for (let i = 0; i < seqState.fighters.length; i++) {
      expect(frameState.fighters[i].pos.x).toBe(seqState.fighters[i].pos.x);
      expect(frameState.fighters[i].pos.y).toBe(seqState.fighters[i].pos.y);
      expect(frameState.fighters[i].vel.x).toBe(seqState.fighters[i].vel.x);
      expect(frameState.fighters[i].vel.y).toBe(seqState.fighters[i].vel.y);
      expect(frameState.fighters[i].hp).toBe(seqState.fighters[i].hp);
    }
  });

  it('upgrades happen only after confirmed hits', () => {
    let state = createBattle(baseConfig);

    for (let f = 0; f < 300; f++) {
      const prevHitCountA = state.fighters[0].weapon.hitCount;
      const prevHitCountB = state.fighters[1].weapon.hitCount;

      state = stepBattle(state, baseConfig);

      const hitEventsA = state.events.filter(
        (e) => e.type === 'hit' && e.attackerId === state.fighters[0].id,
      );
      const hitEventsB = state.events.filter(
        (e) => e.type === 'hit' && e.attackerId === state.fighters[1].id,
      );

      // Hit count increases if and only if hit occurred
      expect(state.fighters[0].weapon.hitCount).toBe(prevHitCountA + hitEventsA.length);
      expect(state.fighters[1].weapon.hitCount).toBe(prevHitCountB + hitEventsB.length);

      if (state.finished) break;
    }
  });
});
