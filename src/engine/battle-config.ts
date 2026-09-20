import { z } from 'zod';
import { MeleeWeaponConfig } from './melee-weapon';
import { RangedWeaponConfig } from './ranged-weapon';
import { SuddenDeathConfig } from './sudden-death';

export const ArenaBoundsSchema = z.object({
  x: z.number().default(0),
  y: z.number().default(0),
  width: z.number().default(1920),
  height: z.number().default(1080),
});

export type ArenaBoundsConfig = z.infer<typeof ArenaBoundsSchema>;

export const MeleeWeaponConfigSchema = z.object({
  baseDamage: z.number().default(20),
  damageGrowthPerHit: z.number().default(2),
  orbitRadius: z.number().default(50),
  rotationSpeed: z.number().default(3),
  weaponRadius: z.number().default(15),
});

export const RangedWeaponConfigSchema = z.object({
  baseDamage: z.number().default(15),
  damageGrowthPerHit: z.number().default(1.5),
  orbitRadius: z.number().default(40),
  rotationSpeed: z.number().default(2),
  weaponRadius: z.number().default(12),
  cooldown: z.number().default(0.8),
  projectileSpeed: z.number().default(400),
  projectileRadius: z.number().default(8),
  initialProjectileCount: z.number().default(1),
  projectileGrowthPerHit: z.number().default(1),
  maxProjectileCount: z.number().default(4),
});

export const FighterConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  radius: z.number().default(30),
  mass: z.number().default(1),
  hp: z.number().default(1000),
  speed: z.number().default(200),
  type: z.enum(['melee', 'ranged']),
  attackTemplate: z.enum(['orbiting_blade', 'thrust', 'shooter', 'returning_projectile', 'tethered_weapon']).optional(),
  /** ISO-ish id from data/countries. Optional so V1 documents continue to parse. */
  countryId: z.string().optional(),
});

export const SuddenDeathThresholdSchema = z.object({
  time: z.number(),
  speedMultiplier: z.number(),
  damageMultiplier: z.number(),
});

export const SuddenDeathConfigSchema = z.object({
  thresholds: z.array(SuddenDeathThresholdSchema).default([
    { time: 60, speedMultiplier: 1.3, damageMultiplier: 1.5 },
    { time: 75, speedMultiplier: 1.5, damageMultiplier: 2.0 },
  ]),
});

export const EffectsConfigSchema = z.object({
  particles: z.boolean().default(true),
  trails: z.boolean().default(true),
  glow: z.boolean().default(true),
  hitFlash: z.boolean().default(true),
  cameraShake: z.boolean().default(true),
  criticalEffect: z.boolean().default(true),
  deathSlowMotion: z.boolean().default(true),
  winnerAnimation: z.boolean().default(true),
  damageNumbers: z.boolean().default(true),
});

export const AudioConfigSchema = z.object({
  musicVolume: z.number().min(0).max(1).default(0.7),
  sfxVolume: z.number().min(0).max(1).default(0.7),
  music: z.string().optional(),
  meleeHit: z.string().optional(),
  projectileShot: z.string().optional(),
  projectileImpact: z.string().optional(),
  ko: z.string().optional(),
  winner: z.string().optional(),
  ultimateReady: z.string().optional(),
  ultimateCast: z.string().optional(),
});

export const PresentationConfigSchema = z.object({
  locale: z.enum(['ru', 'en']).default('ru'),
  showCountryNames: z.boolean().default(true),
  showUltimateNames: z.boolean().default(true),
  title: z.string().optional(),
});

/** Gameplay switches introduced by the country-battle format. */
export const BattleRulesSchema = z.object({
  accelerateAt: z.number().default(30),
  accelerationMultiplier: z.number().positive().default(2),
  escalationAt: z.number().default(60),
  /** Fraction of the original arena removed per second after escalation. */
  shrinkPerSecond: z.number().min(0).default(0.012),
  minimumArenaScale: z.number().min(0.1).max(1).default(0.35),
  /** 0.03/s is exactly +15% for each five-second interval. */
  damageRampPerSecond: z.number().min(0).default(0.03),
  healDisabledAt: z.number().default(60),
  deterministicKoAt: z.number().positive().default(120),
  ultimateChargePerSecond: z.number().default(4),
  ultimateDamageDealtFactor: z.number().default(0.18),
  ultimateDamageReceivedFactor: z.number().default(0.12),
  ultimateThreshold: z.number().positive().default(100),
  ultimateLockout: z.number().min(0).default(4),
});

export const TournamentMetadataSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  seed: z.number().optional(),
  round: z.number().int().min(1).optional(),
  matchNumber: z.number().int().min(1).optional(),
}).strict();

export const BattleConfigSchema = z.object({
  /** V1 omitted this field; V2 writes `2`. It deliberately stays optional for round-trip compatibility. */
  version: z.literal(2).optional(),
  seed: z.number(),
  fps: z.number().default(60),
  maxDuration: z.number().default(120),
  arena: ArenaBoundsSchema.default({ x: 0, y: 0, width: 1920, height: 1080 }),
  fighters: z.array(FighterConfigSchema),
  melee: MeleeWeaponConfigSchema.prefault({}),
  ranged: RangedWeaponConfigSchema.prefault({}),
  suddenDeath: SuddenDeathConfigSchema.prefault({}),
  effects: EffectsConfigSchema.prefault({}),
  audio: AudioConfigSchema.prefault({}),
  simulationMode: z.enum(['auto', 'forceA', 'forceB']).default('auto'),
  presentation: PresentationConfigSchema.optional(),
  battleRules: BattleRulesSchema.optional(),
  tournament: TournamentMetadataSchema.optional(),
});

export type BattleConfig = z.infer<typeof BattleConfigSchema>;
