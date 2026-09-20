import { BattleConfig } from '../engine/battle-config';
import { BattleState } from '../engine/battle-state';
import { createBattle, stepBattle } from '../engine/battle-engine';
import { BattleEvent } from '../engine/events';

export interface BattleTimeline {
  readonly states: BattleState[];
  readonly eventsByFrame: Map<number, BattleEvent[]>;
  readonly allEvents: BattleEvent[];
  readonly totalFrames: number;
  readonly winner: string | null;
  getStateAt(frame: number): BattleState;
  getEventsAt(frame: number): BattleEvent[];
}

/**
 * Pre-computes and caches the entire battle timeline deterministically.
 * Provides
 * instant O(1) random access for Remotion frame rendering and scrubbing.
 */
export function buildBattleTimeline(
  config: BattleConfig,
  maxFrames?: number,
): BattleTimeline {
  const limit = maxFrames ?? Math.ceil(config.maxDuration * config.fps);
  const states: BattleState[] = [];
  const eventsByFrame = new Map<number, BattleEvent[]>();
  const allEvents: BattleEvent[] = [];

  let state = createBattle(config);
  states.push(state);

  for (let f = 1; f <= limit; f++) {
    state = stepBattle(state, config);
    states.push(state);

    if (state.events.length > 0) {
      eventsByFrame.set(state.frame, [...state.events]);
      allEvents.push(...state.events);
    }

    if (state.finished) {
      // Pad out remaining frames with finished state if desired or break
      break;
    }
  }

  const finalState = states[states.length - 1];

  return {
    states,
    eventsByFrame,
    allEvents,
    totalFrames: states.length,
    winner: finalState.winner,
    getStateAt(frame: number): BattleState {
      frame = Math.floor(frame);
      if (frame <= 0) return states[0];
      if (frame >= states.length) return states[states.length - 1];
      return states[frame];
    },
    getEventsAt(frame: number): BattleEvent[] {
      return eventsByFrame.get(frame) ?? [];
    },
  };
}
