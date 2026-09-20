export function calculateMeleeDamage(baseDamage: number, growthPerHit: number, hitCount: number): number {
  return baseDamage + (growthPerHit * hitCount);
}

export function calculateProjectileCount(initialCount: number, growthPerHit: number, hitCount: number, maxCount: number): number {
  return Math.min(maxCount, initialCount + Math.floor(hitCount * growthPerHit));
}

export function calculateRangedDamage(baseDamage: number, growthPerHit: number, hitCount: number): number {
  return baseDamage + (growthPerHit * hitCount);
}
