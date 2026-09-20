import { RngState } from './rng';
import { FighterState } from './fighter';
import { Projectile } from './projectile';
import { BattleEvent } from './events';
import { HitRegistryState } from './hit-registry';
import { BattleStatistics } from './statistics';
import { Vec2 } from './vector';

export interface BattleZone {
  readonly id: string;
  readonly ownerId: string;
  readonly pos: Vec2;
  readonly radius: number;
  readonly damagePerSecond: number;
  readonly expiresAt: number;
  readonly ability: string;
  readonly interval: number;
  readonly nextDamageAt: number;
}

export interface BattleSummon {
  readonly id: string;
  readonly ownerId: string;
  readonly pos: Vec2;
  readonly vel?: Vec2;
  readonly targetId?: string;
  readonly phase?: 'approach' | 'returning' | 'marker';
  readonly speed?: number;
  readonly attackRange?: number;
  readonly expiresAt: number;
  readonly damage: number;
  readonly interval: number;
  readonly nextAttackAt: number;
  readonly ability: string;
  readonly oneShot?: boolean;
}

export interface BattleState {
  readonly frame: number;
  readonly time: number;
  readonly dt: number;
  readonly fighters: FighterState[];
  readonly projectiles: Projectile[];
  readonly events: BattleEvent[];
  readonly rng: RngState;
  readonly hitRegistry: HitRegistryState;
  readonly statistics: BattleStatistics;
  readonly winner: string | null;
  readonly finished: boolean;
  readonly suddenDeathPhase: number;
  readonly nextProjectileId: number;
  readonly zones: readonly BattleZone[];
  readonly summons: readonly BattleSummon[];
  readonly nextEffectId: number;
}
