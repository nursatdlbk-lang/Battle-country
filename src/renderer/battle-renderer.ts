import { BattleConfig } from '../engine/battle-config';
import { BattleState } from '../engine/battle-state';
import { BattleTimeline } from './timeline-cache';

/** Canvas backend boundary shared by live playback and frame-based export. */
export interface BattleRenderer {
  readonly isReady: boolean;
  init(canvas: HTMLCanvasElement, width: number, height: number): Promise<void>;
  render(state: BattleState, config: BattleConfig, history: readonly BattleState[]): void;
  destroy(): void;
}

export function renderBattleFrame(
  renderer: BattleRenderer, timeline: BattleTimeline, frame: number, config: BattleConfig,
): void {
  const index = Math.max(0, Math.floor(frame));
  const state = timeline.getStateAt(index);
  // Let visual effects expire during the victory hold without advancing physics.
  const presentation = index > state.frame ? { ...state, frame: index, events: [] } : state;
  renderer.render(presentation, config, timeline.states.slice(Math.max(0, index - 34), index + 1));
}

export function getVideoDuration(timeline: BattleTimeline, fps: number): number {
  return timeline.totalFrames + Math.ceil(fps * 2);
}
