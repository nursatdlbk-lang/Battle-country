import { BattleState } from './battle-state';
import { HitEvent, DamageEvent, ProjectileSpawnEvent, KillEvent } from './events';

export interface Ability {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly cooldown: number;
  readonly currentCooldown: number;
  activate(state: BattleState, casterId: string): BattleState;
}

export interface Passive {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly hooks: Partial<EventHooks>;
}

export interface Ultimate {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly chargeRequired: number;
  readonly currentCharge: number;
  activate(state: BattleState, casterId: string): BattleState;
}

export interface EventHooks {
  onBattleStart(state: BattleState): BattleState;
  onUpdate(state: BattleState, dt: number): BattleState;
  onHit(state: BattleState, event: HitEvent): BattleState;
  onDamage(state: BattleState, event: DamageEvent): BattleState;
  onProjectileSpawn(state: BattleState, event: ProjectileSpawnEvent): BattleState;
  onKill(state: BattleState, event: KillEvent): BattleState;
  onHealthThreshold(state: BattleState, fighterId: string, threshold: number): BattleState;
}
