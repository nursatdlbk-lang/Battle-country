import { Vec2, add, vec2, rotate } from './vector';

export interface RangedWeaponState {
  readonly angle: number;
  readonly cooldownTimer: number;
  readonly hitCount: number;
}

export interface RangedWeaponConfig {
  baseDamage: number;
  damageGrowthPerHit: number;
  orbitRadius: number;
  rotationSpeed: number;
  weaponRadius: number;
  cooldown: number;
  projectileSpeed: number;
  projectileRadius: number;
  initialProjectileCount: number;
  projectileGrowthPerHit: number;
  maxProjectileCount: number;
}

export function createRangedWeapon(config: RangedWeaponConfig): RangedWeaponState {
  return { angle: 0, cooldownTimer: 0, hitCount: 0 };
}

export function updateRangedWeapon(
  state: RangedWeaponState, 
  dt: number, 
  config: RangedWeaponConfig
): { weapon: RangedWeaponState; shouldFire: boolean; } {
  let newAngle = state.angle + config.rotationSpeed * dt;
  let newCooldown = state.cooldownTimer - dt;
  let shouldFire = false;
  
  if (newCooldown <= 0) {
    shouldFire = true;
    newCooldown = config.cooldown; // Wait, actually should only reset if we intend to fire, which we just did.
  }

  return { 
    weapon: { ...state, angle: newAngle, cooldownTimer: newCooldown }, 
    shouldFire 
  };
}

export function getRangedWeaponPosition(state: RangedWeaponState, fighterPos: Vec2, config: RangedWeaponConfig): Vec2 {
  const offset = rotate(vec2(config.orbitRadius, 0), state.angle);
  return add(fighterPos, offset);
}

export function getProjectileCount(state: RangedWeaponState, config: RangedWeaponConfig): number {
  return Math.min(
    config.maxProjectileCount,
    config.initialProjectileCount + Math.floor(state.hitCount * config.projectileGrowthPerHit)
  );
}

export function getRangedWeaponDamage(state: RangedWeaponState, config: RangedWeaponConfig): number {
  return config.baseDamage + state.hitCount * config.damageGrowthPerHit;
}
