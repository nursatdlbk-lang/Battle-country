import { BattleEvent } from './events';
import { FighterState } from './fighter';
import { MeleeWeaponState, MeleeWeaponConfig, getMeleeWeaponDamage } from './melee-weapon';
import { RangedWeaponState, RangedWeaponConfig, getRangedWeaponDamage, getProjectileCount } from './ranged-weapon';

export interface FighterStats {
  hitsDone: number;
  damageDone: number;
  currentWeaponDamage: number;
  projectileCount: number;
  hp: number;
  maxHp: number;
}

export interface BattleStatistics {
  fighters: Record<string, FighterStats>;
  elapsedTime: number;
  winner: string | null;
  suddenDeathPhase: number;
}

export function createStatistics(fighterIds: string[]): BattleStatistics {
  const fighters: Record<string, FighterStats> = {};
  for (const id of fighterIds) {
    fighters[id] = {
      hitsDone: 0,
      damageDone: 0,
      currentWeaponDamage: 0,
      projectileCount: 0,
      hp: 0,
      maxHp: 0,
    };
  }
  return {
    fighters,
    elapsedTime: 0,
    winner: null,
    suddenDeathPhase: 0,
  };
}

export interface StatsUpdateContext {
  fighters: FighterState[];
  time: number;
  meleeConfig: MeleeWeaponConfig;
  rangedConfig: RangedWeaponConfig;
}

export function updateStatistics(
  stats: BattleStatistics,
  events: BattleEvent[],
  ctx: StatsUpdateContext,
): BattleStatistics {
  // Deep copy fighter stats
  const newFighters: Record<string, FighterStats> = {};
  for (const id in stats.fighters) {
    newFighters[id] = { ...stats.fighters[id] };
  }

  // Process events
  for (const event of events) {
    switch (event.type) {
      case 'hit': {
        const fs = newFighters[event.attackerId];
        if (fs) {
          fs.hitsDone += 1;
        }
        break;
      }
      case 'damage': {
        // Find attacker from preceding hit event
        const hitEvent = events.find(
          e => e.type === 'hit' && e.targetId === event.targetId && e.frame === event.frame,
        );
        if (hitEvent && hitEvent.type === 'hit') {
          const fs = newFighters[hitEvent.attackerId];
          if (fs) {
            fs.damageDone += event.amount;
          }
        }
        break;
      }
      case 'sudden_death_phase':
        break; // handled below
      case 'kill':
        break; // handled below
    }
  }

  // Sync with current fighter state
  let winner = stats.winner;
  let suddenDeathPhase = stats.suddenDeathPhase;

  for (const f of ctx.fighters) {
    const fs = newFighters[f.id];
    if (!fs) continue;

    fs.hp = f.hp;
    fs.maxHp = f.maxHp;

    if (f.type === 'melee') {
      const weapon = f.weapon as MeleeWeaponState;
      fs.currentWeaponDamage = getMeleeWeaponDamage(weapon, ctx.meleeConfig);
      fs.projectileCount = 0;
    } else {
      const weapon = f.weapon as RangedWeaponState;
      fs.currentWeaponDamage = getRangedWeaponDamage(weapon, ctx.rangedConfig);
      fs.projectileCount = getProjectileCount(weapon, ctx.rangedConfig);
    }
  }

  // Check events for phase changes and kills
  for (const event of events) {
    if (event.type === 'sudden_death_phase') {
      suddenDeathPhase = event.phase;
    } else if (event.type === 'kill' && !winner) {
      winner = event.killerId;
    } else if (event.type === 'winner') {
      winner = event.winnerId;
    }
  }

  return {
    fighters: newFighters,
    elapsedTime: ctx.time,
    winner,
    suddenDeathPhase,
  };
}
