import { afterEach, describe, expect, it } from 'vitest';
import { getArenaDimensions, getBattleConfigFromStore, useStore } from '../ui/store';
import { BattleConfigSchema } from '../engine/battle-config';
import { createBattle, stepBattle } from '../engine/battle-engine';
import { distance } from '../engine/vector';

const initial = { ...useStore.getState(), battleMode: 'free' as const };
afterEach(() => useStore.setState(initial));

describe('arena and preview sizes', () => {
  it.each(['small', 'medium', 'large'] as const)('keeps %s arena dimensions and non-overlapping spawns through export', arenaSize => {
    for (const aspectRatio of ['1920x1080', '1080x1920'] as const) {
      const config = getBattleConfigFromStore({ ...initial, arenaSize, aspectRatio });
      expect(BattleConfigSchema.parse(JSON.parse(JSON.stringify(config)))).toEqual(config);
      const { fighters } = createBattle(config);
      expect(distance(fighters[0].pos, fighters[1].pos)).toBeGreaterThanOrEqual(fighters[0].radius + fighters[1].radius);
      for (const fighter of fighters) {
        expect(fighter.pos.x).toBeGreaterThanOrEqual(fighter.radius);
        expect(fighter.pos.x).toBeLessThanOrEqual(config.arena.width - fighter.radius);
        expect(fighter.pos.y).toBeGreaterThanOrEqual(fighter.radius);
        expect(fighter.pos.y).toBeLessThanOrEqual(config.arena.height - fighter.radius);
      }
    }
  });

  it('uses compact defaults and keeps the display slider out of the battle config', () => {
    expect(getArenaDimensions(initial)).toEqual({ width: 540, height: 960 });
    const before = getBattleConfigFromStore(useStore.getState());
    useStore.getState().setPreviewHeight(240);
    expect(useStore.getState().previewHeight).toBe(240);
    expect(getBattleConfigFromStore(useStore.getState())).toEqual(before);
    useStore.getState().setSeed(99);
    expect(getBattleConfigFromStore(useStore.getState()).arena).toEqual(before.arena);
  });

  it('uses custom smaller arena bounds without changing fighter physics', () => {
    useStore.getState().setSeed(42);
    useStore.getState().setCustomArenaDimensions(480, 480);
    const smallConfig = getBattleConfigFromStore(useStore.getState());
    const small = createBattle(smallConfig);

    expect(smallConfig.arena).toMatchObject({ x: 0, y: 0, width: 480, height: 480 });
    for (const fighter of small.fighters) {
      const configured = smallConfig.fighters.find(candidate => candidate.id === fighter.id)!;
      expect(fighter.radius).toBe(configured.radius);
      expect(fighter.mass).toBe(configured.mass);
      expect(Math.hypot(fighter.vel.x, fighter.vel.y)).toBeCloseTo(configured.speed, 8);
      expect(fighter.pos.x).toBeGreaterThanOrEqual(smallConfig.arena.x + fighter.radius);
      expect(fighter.pos.x).toBeLessThanOrEqual(smallConfig.arena.x + smallConfig.arena.width - fighter.radius);
      expect(fighter.pos.y).toBeGreaterThanOrEqual(smallConfig.arena.y + fighter.radius);
      expect(fighter.pos.y).toBeLessThanOrEqual(smallConfig.arena.y + smallConfig.arena.height - fighter.radius);
    }

    let state = small;
    let firstWallBounce = Infinity;
    for (let frame = 0; frame < 600; frame++) {
      state = stepBattle(state, smallConfig);
      if (state.events.some(event => event.type === 'wall_bounce')) {
        firstWallBounce = state.frame;
        break;
      }
    }

    useStore.getState().setCustomArenaDimensions(1920, 1080);
    const largeConfig = getBattleConfigFromStore(useStore.getState());
    let largeState = createBattle(largeConfig);
    let largeFirstWallBounce = Infinity;
    for (let frame = 0; frame < 600; frame++) {
      largeState = stepBattle(largeState, largeConfig);
      if (largeState.events.some(event => event.type === 'wall_bounce')) {
        largeFirstWallBounce = largeState.frame;
        break;
      }
    }
    expect(firstWallBounce).toBeLessThan(largeFirstWallBounce);
  });

  it('does not let changing only the seed change arena dimensions', () => {
    useStore.getState().setCustomArenaDimensions(480, 480);
    const before = getBattleConfigFromStore(useStore.getState()).arena;
    useStore.getState().setSeed(123456);
    expect(getBattleConfigFromStore(useStore.getState()).arena).toEqual(before);
  });
  it('exports arbitrary dimensions and square fields with deterministic starts', () => {
    useStore.getState().setCustomArenaDimensions(680, 680);
    const square = getBattleConfigFromStore(useStore.getState());
    expect(square.arena).toMatchObject({ width: 680, height: 680 });
    expect(createBattle(square)).toEqual(createBattle(BattleConfigSchema.parse(JSON.parse(JSON.stringify(square)))));
    useStore.getState().setCustomArenaDimensions(1024, 768);
    expect(getBattleConfigFromStore(useStore.getState()).arena).toMatchObject({ width: 1024, height: 768 });
    useStore.getState().setArenaSize('square');
    expect(getArenaDimensions(useStore.getState())).toEqual({ width: 720, height: 720 });
  });

  it('normalizes custom dimensions for video and leaves room for fighters', () => {
    useStore.getState().setCustomArenaDimensions(641, 479);
    expect(getArenaDimensions(useStore.getState())).toEqual({ width: 642, height: 480 });
    useStore.getState().updateFighterA({ radius: 100 });
    useStore.getState().updateFighterB({ radius: 100 });
    useStore.getState().setCustomArenaDimensions(50, 50);
    expect(getArenaDimensions(useStore.getState())).toEqual({ width: 400, height: 400 });
    expect(() => createBattle(getBattleConfigFromStore(useStore.getState()))).not.toThrow();
    useStore.getState().setCustomArenaDimensions(Infinity, 99999);
    expect(getArenaDimensions(useStore.getState())).toEqual({ width: 400, height: 4096 });
  });

});
