export interface DamageResult {
  newHp: number;
  actualDamage: number;
  isDead: boolean;
}

export function applyDamage(currentHp: number, baseDamage: number, damageMultiplier: number): DamageResult {
  const actualDamage = Math.max(0, baseDamage * damageMultiplier);
  const newHp = Math.max(0, currentHp - actualDamage);
  const isDead = newHp <= 0;
  
  return { newHp, actualDamage, isDead };
}
