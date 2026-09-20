import { Vec2, vec2 } from './vector';
import { MeleeWeaponState, MeleeWeaponConfig, createMeleeWeapon } from './melee-weapon';
import { RangedWeaponState, RangedWeaponConfig, createRangedWeapon } from './ranged-weapon';
import { FighterController, BallisticController } from './controller';
import { BasicAttackTemplate, CountryId, UltimateTemplate, getCountry } from '../data/countries';

export interface TimedStatus {
  readonly kind: 'invulnerable' | 'stealth' | 'ultimate_lockout' | 'shuriken_release' | 'ultimate_windup' | 'dash_speed' | 'boost_speed';
  readonly until: number;
}

export interface FighterState {
  readonly id: string;
  readonly name: string;
  readonly pos: Vec2;
  readonly vel: Vec2;
  readonly radius: number;
  readonly mass: number;
  readonly hp: number;
  readonly maxHp: number;
  readonly type: 'melee' | 'ranged';
  readonly weapon: MeleeWeaponState | RangedWeaponState;
  readonly speed: number;
  readonly alive: boolean;
  readonly controller: FighterController;
  readonly countryId?: CountryId;
  /** Starts at zero and is filled by the V2 deterministic charge formula. */
  readonly ultimateCharge: number;
  readonly ultimateLockoutUntil: number;
  readonly ultimateStatus: 'idle' | 'ready' | 'casting' | 'locked';
  readonly ultimateTemplate?: UltimateTemplate;
  readonly statuses: readonly TimedStatus[];
  readonly shield: number;
  readonly stealthUntil: number;
}

export interface FighterConfig {
  id: string;
  name: string;
  radius: number;
  mass: number;
  hp: number;
  speed: number;
  type: 'melee' | 'ranged';
  countryId?: string;
  attackTemplate?: BasicAttackTemplate;
}

export function createFighter(
  config: FighterConfig,
  startPos: Vec2,
  startVel: Vec2,
  weaponConfig?: MeleeWeaponConfig | RangedWeaponConfig,
  controller?: FighterController,
): FighterState {
  let weapon: MeleeWeaponState | RangedWeaponState;
  if (config.type === 'melee') {
    weapon = {
      ...createMeleeWeapon(
      (weaponConfig as MeleeWeaponConfig) ?? {
        baseDamage: 20,
        damageGrowthPerHit: 2,
        orbitRadius: 50,
        rotationSpeed: 3,
        weaponRadius: 15,
      },
      ),
      motion: config.attackTemplate === 'thrust' || config.attackTemplate === 'tethered_weapon'
        ? config.attackTemplate
        : 'orbiting_blade',
    };
  } else {
    weapon = createRangedWeapon(
      (weaponConfig as RangedWeaponConfig) ?? {
        baseDamage: 15,
        damageGrowthPerHit: 1.5,
        orbitRadius: 40,
        rotationSpeed: 2,
        weaponRadius: 12,
        cooldown: 0.8,
        projectileSpeed: 400,
        projectileRadius: 8,
        initialProjectileCount: 1,
        projectileGrowthPerHit: 1,
        maxProjectileCount: 4,
      },
    );
  }

  return {
    id: config.id,
    name: config.name,
    pos: startPos,
    vel: startVel,
    radius: config.radius,
    mass: config.mass,
    hp: config.hp,
    maxHp: config.hp,
    type: config.type,
    weapon,
    speed: config.speed,
    alive: true,
    controller: controller ?? new BallisticController(),
    countryId: getCountry(config.countryId)?.id,
    ultimateCharge: 0,
    ultimateLockoutUntil: 0,
    ultimateStatus: 'idle',
    ultimateTemplate: getCountry(config.countryId)?.ultimateTemplate,
    statuses: [],
    shield: 0,
    stealthUntil: 0,
  };
}
