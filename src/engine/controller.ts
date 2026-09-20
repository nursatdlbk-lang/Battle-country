import { FighterState } from './fighter';
import { ArenaBounds } from './collision';

export interface BattleContext {
  readonly arena: ArenaBounds;
  readonly fighters: readonly FighterState[];
  readonly time: number;
  readonly frame: number;
}

/**
 * Pluggable movement / AI controller interface for future fighter behaviors.
 */
export interface FighterController {
  readonly type: string;
  update(fighter: FighterState, context: BattleContext, dt: number): void;
}

/**
 * BallisticController (V1 default):
 * Fighters behave like physical bouncing balls.
 * The controller does nothing during update because physical movement and bounces
 * are handled by velocity integration, wall collisions, and elastic circle collisions.
 */
export class BallisticController implements FighterController {
  readonly type = 'ballistic';

  update(_fighter: FighterState, _context: BattleContext, _dt: number): void {
    // Ballistic movement is intentionally handled by the physics integration.
  }
}
