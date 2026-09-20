export type BattleEventType = 
  | 'hit' 
  | 'damage' 
  | 'projectile_spawn' 
  | 'projectile_destroy' 
  | 'kill' 
  | 'sudden_death_phase' 
  | 'wall_bounce' 
  | 'fighter_collision'
  | 'ultimate_ready'
  | 'ultimate_windup'
  | 'ultimate_cast'
  | 'shield_absorb'
  | 'zone_spawn'
  | 'summon_spawn'
  | 'shield_start'
  | 'healing'
  | 'invisibility_start'
  | 'invisibility_end'
  | 'dash_start'
  | 'special_hit'
  | 'ultimate_end'
  | 'time_limit_ko'
  | 'winner';

export interface BaseBattleEvent {
  type: BattleEventType;
  frame: number;
  time: number;
}

export interface HitEvent extends BaseBattleEvent {
  type: 'hit';
  attackerId: string;
  targetId: string;
  weaponType: 'melee' | 'projectile';
  damage: number;
  /** Contact point on the rendered weapon/projectile, when available. */
  impact?: { x: number; y: number };
}

export interface DamageEvent extends BaseBattleEvent {
  type: 'damage';
  attackerId?: string;
  targetId: string;
  amount: number;
  remainingHp: number;
}

export interface ProjectileSpawnEvent extends BaseBattleEvent {
  type: 'projectile_spawn';
  ownerId: string;
  count: number;
}

export interface ProjectileDestroyEvent extends BaseBattleEvent {
  type: 'projectile_destroy';
  reason: 'wall' | 'hit' | 'returned';
}

export interface KillEvent extends BaseBattleEvent {
  type: 'kill';
  killerId: string;
  victimId: string;
}

export interface SuddenDeathPhaseEvent extends BaseBattleEvent {
  type: 'sudden_death_phase';
  phase: number;
  speedMultiplier: number;
  damageMultiplier: number;
}

export interface WallBounceEvent extends BaseBattleEvent {
  type: 'wall_bounce';
  fighterId: string;
}

export interface FighterCollisionEvent extends BaseBattleEvent {
  type: 'fighter_collision';
  fighterAId: string;
  fighterBId: string;
}

export interface WinnerEvent extends BaseBattleEvent {
  type: 'winner';
  /** Null denotes a draw. */
  winnerId: string | null;
}

export interface UltimateReadyEvent extends BaseBattleEvent { type: 'ultimate_ready'; fighterId: string; }
export interface UltimateWindupEvent extends BaseBattleEvent { type: 'ultimate_windup'; fighterId: string; template: string; until: number; }
export interface UltimateCastEvent extends BaseBattleEvent { type: 'ultimate_cast'; fighterId: string; template: string; }
export interface ShieldAbsorbEvent extends BaseBattleEvent { type: 'shield_absorb'; fighterId: string; amount: number; remainingShield: number; }
export interface ZoneSpawnEvent extends BaseBattleEvent { type: 'zone_spawn'; ownerId: string; zoneId: string; }
export interface SummonSpawnEvent extends BaseBattleEvent { type: 'summon_spawn'; ownerId: string; summonId: string; }
export interface TimeLimitKoEvent extends BaseBattleEvent { type: 'time_limit_ko'; winnerId: string | null; }
export interface ShieldStartEvent extends BaseBattleEvent { type: 'shield_start'; fighterId: string; amount: number; }
export interface HealingEvent extends BaseBattleEvent { type: 'healing'; fighterId: string; amount: number; }
export interface InvisibilityStartEvent extends BaseBattleEvent { type: 'invisibility_start'; fighterId: string; until: number; }
export interface InvisibilityEndEvent extends BaseBattleEvent { type: 'invisibility_end'; fighterId: string; }
export interface DashStartEvent extends BaseBattleEvent { type: 'dash_start'; fighterId: string; until: number; }
export interface SpecialHitEvent extends BaseBattleEvent {
  type: 'special_hit';
  attackerId: string;
  targetId: string;
  ability: string;
  amount: number;
  impact?: { x: number; y: number };
}
export interface UltimateEndEvent extends BaseBattleEvent { type: 'ultimate_end'; fighterId: string; }

export type BattleEvent = 
  | HitEvent 
  | DamageEvent 
  | ProjectileSpawnEvent 
  | ProjectileDestroyEvent 
  | KillEvent 
  | SuddenDeathPhaseEvent 
  | WallBounceEvent 
  | FighterCollisionEvent
  | UltimateReadyEvent
  | UltimateWindupEvent
  | UltimateCastEvent
  | ShieldAbsorbEvent
  | ZoneSpawnEvent
  | SummonSpawnEvent
  | TimeLimitKoEvent
  | ShieldStartEvent
  | HealingEvent
  | InvisibilityStartEvent
  | InvisibilityEndEvent
  | DashStartEvent
  | SpecialHitEvent
  | UltimateEndEvent
  | WinnerEvent;
