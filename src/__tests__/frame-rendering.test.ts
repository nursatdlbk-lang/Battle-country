import { describe, expect, it } from 'vitest';
import { BattleConfigSchema } from '../engine/battle-config';
import { createBattle, getStateAtFrame } from '../engine/battle-engine';
import { BattleState } from '../engine/battle-state';
import { buildBattleTimeline } from '../renderer/timeline-cache';
import { BattleRenderer, renderBattleFrame, getVideoDuration } from '../renderer/battle-renderer';
import { deriveVisualEffects } from '../renderer/visual-effects';

const config = BattleConfigSchema.parse({
  seed: 42, maxDuration: 4,
  fighters: [
    { id: 'a', name: 'A', type: 'melee' },
    { id: 'b', name: 'B', type: 'ranged' },
  ],
});

describe('shared deterministic frame rendering', () => {
  it.each([30, 60])('maps frame N to N/fps seconds at %i FPS and keeps events aligned', fps => {
    const input = { ...config, fps };
    const timeline = buildBattleTimeline(input);
    expect(timeline.getStateAt(fps * 3).time).toBe(3);
    expect(timeline.getStateAt(fps * 3)).toEqual(getStateAtFrame(input, fps * 3));
    for (const event of timeline.allEvents) {
      expect(timeline.getEventsAt(event.frame)).toContain(event);
      expect(timeline.getStateAt(event.frame).time).toBe(event.time);
    }
    expect(timeline.allEvents.filter(e => e.type === 'winner')).toHaveLength(1);
  });

  it('reconstructs hit effects at event positions after skipping or revisiting frames', () => {
    const initial = createBattle(config);
    const hit: BattleState = {
      ...initial, frame: 10, time: 10 / config.fps,
      events: [{ type: 'hit', frame: 10, time: 10 / config.fps,
        attackerId: 'a', targetId: 'b', weaponType: 'melee', damage: 20, impact: { x: 345, y: 177 } }],
    };
    const states = Array.from({ length: 51 }, (_, frame) => frame === 10 ? hit : {
      ...initial, frame, time: frame / config.fps, events: [],
    });
    const realTimeline = buildBattleTimeline(config);
    const timeline = { ...realTimeline, states, getStateAt: (frame: number) => states[Math.min(frame, 50)] };
    let output: ReturnType<typeof deriveVisualEffects> | undefined;
    const renderer: BattleRenderer = {
      isReady: true, init: async () => {}, destroy: () => {},
      render: (state, input, history) => { output = deriveVisualEffects(history, state.frame, input); },
    };
    renderBattleFrame(renderer, timeline, 15, config);
    const direct = output;
    expect(direct!.particles).toHaveLength(12);
    expect(direct!.particles[0].x).toBe(345);
    expect(direct!.particles[0].y).toBe(177);
    expect(direct!.damageNumbers).toHaveLength(1);
    expect(direct!.hitImpacts).toHaveLength(1);
    expect(direct!.hitImpacts[0]).toMatchObject({ targetId: 'b', x: 345, y: 177, startFrame: 10 });
    renderBattleFrame(renderer, timeline, 49, config);
    expect(output!.particles).toEqual([]);
    expect(output!.damageNumbers).toEqual([]);
    expect(output!.hitImpacts).toEqual([]);
    for (let frame = 0; frame <= 15; frame++) renderBattleFrame(renderer, timeline, frame, config);
    expect(output).toEqual(direct);
    renderBattleFrame(renderer, timeline, 0, config);
    expect(output!.particles).toEqual([]);
  });

  it('keeps the terminal state visible for the full victory hold', () => {
    const timeline = buildBattleTimeline(config);
    expect(getVideoDuration(timeline, config.fps)).toBe(timeline.totalFrames + 120);
    const end = timeline.getStateAt(99999);
    expect(end.finished).toBe(true);
    expect(timeline.getEventsAt(end.frame + 1)).toEqual([]);
  });

  it('renders ultimate damage as an emphasized named impact even when ordinary numbers are disabled', () => {
    const initial = createBattle(config);
    const target = initial.fighters[1];
    const special: BattleState = {
      ...initial,
      frame: 20,
      time: 20 / config.fps,
      events: [{ type: 'special_hit', frame: 20, time: 20 / config.fps, attackerId: 'a', targetId: 'b', ability: 'starfall', amount: 104, impact: { ...target.pos } }],
    };
    const effects = deriveVisualEffects([special], 20, { ...config, effects: { ...config.effects, damageNumbers: false } });
    expect(effects.damageNumbers).toContainEqual(expect.objectContaining({ text: '⚡ starfall: -104', emphasis: true }));
    expect(effects.hitImpacts).toContainEqual(expect.objectContaining({ targetId: 'b', color: 0xfde047 }));
  });
});
