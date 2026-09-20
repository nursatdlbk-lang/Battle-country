import { BattleConfig, BattleRulesSchema } from './battle-config';
import { ArenaBoundsConfig } from './battle-config';

export type EffectiveBattleRules = ReturnType<typeof BattleRulesSchema.parse>;

/** V1 configs get the V2 rules at runtime without changing their serialized shape. */
export function getBattleRules(config: BattleConfig): EffectiveBattleRules {
  if (config.version === 2 || config.battleRules) return BattleRulesSchema.parse(config.battleRules ?? {});
  // A document without V2 markers is genuinely V1: preserve its historical physics exactly.
  const never = Number.MAX_SAFE_INTEGER;
  return BattleRulesSchema.parse({
    accelerateAt: never, accelerationMultiplier: 1, escalationAt: never,
    shrinkPerSecond: 0, damageRampPerSecond: 0, healDisabledAt: never,
    deterministicKoAt: never,
  });
}

export function getEffectiveArena(arena: ArenaBoundsConfig, time: number, rules: EffectiveBattleRules): ArenaBoundsConfig {
  const elapsed = Math.max(0, time - rules.escalationAt);
  const arenaScale = Math.max(rules.minimumArenaScale, 1 - elapsed * rules.shrinkPerSecond);
  const width = arena.width * arenaScale;
  const height = arena.height * arenaScale;
  return { x: arena.x + (arena.width - width) / 2, y: arena.y + (arena.height - height) / 2, width, height };
}

export function getRuleMultipliers(time: number, rules: EffectiveBattleRules) {
  const speed = time >= rules.accelerateAt ? rules.accelerationMultiplier : 1;
  const damage = time < rules.escalationAt ? 1 : 1 + (time - rules.escalationAt) * rules.damageRampPerSecond;
  return { speed, damage, healingEnabled: time < rules.healDisabledAt };
}
