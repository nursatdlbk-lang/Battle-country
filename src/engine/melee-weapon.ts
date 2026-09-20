import { Vec2, add, rotate, scale, vec2 } from './vector';

export interface MeleeWeaponState {
  readonly angle: number;
  readonly hitCount: number;
  readonly motion?: 'orbiting_blade' | 'thrust' | 'tethered_weapon';
}

export interface MeleeWeaponConfig {
  baseDamage: number;
  damageGrowthPerHit: number;
  orbitRadius: number;
  rotationSpeed: number;
  weaponRadius: number;
}

/** A damaging part of the source PNG, in normalized sprite coordinates. */
export interface MeleeWeaponDamageSegment {
  /** Edge of the weapon beside the guard. */
  readonly start: Vec2;
  /** Visible tip / striking edge of the weapon. */
  readonly end: Vec2;
}

/**
 * Art-space measurements for a country weapon PNG. Coordinates are relative
 * to the center of its square sprite before Pixi rotation. The grip is used to
 * orient the art toward the countryball; only the declared edge segments deal
 * damage. This deliberately excludes a sprite pivot or an invisible orbit
 * circle from combat.
 */
export interface MeleeWeaponHitboxProfile {
  readonly gripAnchor: Vec2;
  readonly damageSegments: readonly MeleeWeaponDamageSegment[];
  readonly bladeWidthFraction: number;
  /** Small allowance for antialiasing and frame-to-frame movement, in pixels. */
  readonly hitTolerance: number;
}

export const DEFAULT_MELEE_WEAPON_HITBOX_PROFILE: MeleeWeaponHitboxProfile = {
  // The fallback weapon is a conventional bottom-left to top-right blade.
  gripAnchor: { x: -0.34, y: 0.34 },
  damageSegments: [{ start: { x: -0.12, y: 0.12 }, end: { x: 0.46, y: -0.46 } }],
  bladeWidthFraction: 0.11,
  hitTolerance: 2,
};

/** Geometry shared by collision detection and the renderer. */
export interface MeleeWeaponHitbox {
  readonly spriteCenter: Vec2;
  readonly grip: Vec2;
  /** Midpoint of the actual damaging edge. */
  readonly center: Vec2;
  readonly start: Vec2;
  readonly end: Vec2;
  /** Capsule half-width, including only the small visual tolerance. */
  readonly radius: number;
}

export function createMeleeWeapon(config: MeleeWeaponConfig): MeleeWeaponState {
  return { angle: 0, hitCount: 0 };
}

export function updateMeleeWeapon(state: MeleeWeaponState, dt: number, config: MeleeWeaponConfig): MeleeWeaponState {
  return { ...state, angle: state.angle + config.rotationSpeed * dt };
}

export function getMeleeWeaponPosition(state: MeleeWeaponState, fighterPos: Vec2, config: MeleeWeaponConfig): Vec2 {
  let reach = config.orbitRadius;
  if (state.motion === 'thrust') {
    // The weapon repeatedly pulls close, then extends along its current facing.
    const thrust = (1 + Math.sin(state.angle * 2 - Math.PI / 2)) / 2;
    reach *= 0.5 + thrust * 0.65;
  } else if (state.motion === 'tethered_weapon') {
    reach *= 1.18;
  }
  return add(fighterPos, rotate(vec2(reach, 0), state.angle));
}

/** Matches the sprite size used for the visual weapon in Pixi. */
export function getMeleeWeaponSpriteSize(fighterRadius: number): number {
  return Math.max(62, fighterRadius * 2.7);
}

/**
 * Rotates each asset so its declared grip points back to its owner. The combat
 * end consequently always points outward, even when source PNGs are mirrored.
 */
export function getMeleeWeaponSpriteRotation(
  state: MeleeWeaponState,
  profile: MeleeWeaponHitboxProfile = DEFAULT_MELEE_WEAPON_HITBOX_PROFILE,
): number {
  const gripAngle = Math.atan2(profile.gripAnchor.y, profile.gripAnchor.x);
  return state.angle + Math.PI - gripAngle;
}

export function getMeleeWeaponGripPosition(
  state: MeleeWeaponState,
  fighterPos: Vec2,
  fighterRadius: number,
  config: MeleeWeaponConfig,
  profile: MeleeWeaponHitboxProfile = DEFAULT_MELEE_WEAPON_HITBOX_PROFILE,
): Vec2 {
  const spriteCenter = getMeleeWeaponPosition(state, fighterPos, config);
  return add(
    spriteCenter,
    rotate(scale(profile.gripAnchor, getMeleeWeaponSpriteSize(fighterRadius)), getMeleeWeaponSpriteRotation(state, profile)),
  );
}

/** Returns every visible damaging edge transformed exactly like the PNG sprite. */
export function getMeleeWeaponHitboxes(
  state: MeleeWeaponState,
  fighterPos: Vec2,
  fighterRadius: number,
  config: MeleeWeaponConfig,
  profile: MeleeWeaponHitboxProfile = DEFAULT_MELEE_WEAPON_HITBOX_PROFILE,
): readonly MeleeWeaponHitbox[] {
  const spriteCenter = getMeleeWeaponPosition(state, fighterPos, config);
  const spriteSize = getMeleeWeaponSpriteSize(fighterRadius);
  const rotation = getMeleeWeaponSpriteRotation(state, profile);
  const grip = add(spriteCenter, rotate(scale(profile.gripAnchor, spriteSize), rotation));
  const radius = Math.min(config.weaponRadius, spriteSize * profile.bladeWidthFraction / 2) + profile.hitTolerance;

  return profile.damageSegments.map((segment) => {
    const start = add(spriteCenter, rotate(scale(segment.start, spriteSize), rotation));
    const end = add(spriteCenter, rotate(scale(segment.end, spriteSize), rotation));
    return {
      spriteCenter,
      grip,
      center: { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 },
      start,
      end,
      radius,
    };
  });
}

/** Backwards-compatible primary edge accessor. */
export function getMeleeWeaponHitbox(
  state: MeleeWeaponState,
  fighterPos: Vec2,
  fighterRadius: number,
  config: MeleeWeaponConfig,
  profile: MeleeWeaponHitboxProfile = DEFAULT_MELEE_WEAPON_HITBOX_PROFILE,
): MeleeWeaponHitbox {
  return getMeleeWeaponHitboxes(state, fighterPos, fighterRadius, config, profile)[0];
}

export function getMeleeWeaponDamage(state: MeleeWeaponState, config: MeleeWeaponConfig): number {
  return config.baseDamage + state.hitCount * config.damageGrowthPerHit;
}
