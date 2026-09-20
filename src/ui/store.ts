import { create } from 'zustand';
import { clampArenaDimension } from './arena-dimensions';
import { BattleConfig } from '../engine/battle-config';
import { getCountry, runtimeAttackKind } from '../data/countries';

export interface BattleStore {
  // General
  aspectRatio: '1080x1920' | '1920x1080';
  arenaSize: 'small' | 'medium' | 'large' | 'square' | 'custom';
  customArena: { width: number; height: number };
  previewHeight: number;
  fps: number;
  seed: number;
  maxDuration: number; // seconds
  simulationMode: 'auto' | 'forceA' | 'forceB';
  battleMode: 'tournament' | 'free';

  // Fighter A (melee)
  fighterA: {
    countryId: string;
    name: string;
    sprite: string;
    hp: number;
    radius: number;
    speed: number;
    mass: number;
    weapon: {
      sprite: string;
      baseDamage: number;
      damageGrowthPerHit: number;
      orbitRadius: number;
      rotationSpeed: number;
      weaponRadius: number;
    };
  };

  // Fighter B (ranged)
  fighterB: {
    countryId: string;
    name: string;
    sprite: string;
    hp: number;
    radius: number;
    speed: number;
    mass: number;
    weapon: {
      sprite: string;
      projectileSprite: string;
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
    };
  };

  // Sudden Death
  suddenDeath: {
    thresholds: Array<{ time: number; speedMultiplier: number; damageMultiplier: number }>;
  };

  // Effects
  effects: {
    particles: boolean;
    trails: boolean;
    glow: boolean;
    hitFlash: boolean;
    cameraShake: boolean;
    criticalEffect: boolean;
    deathSlowMotion: boolean;
    winnerAnimation: boolean;
    damageNumbers: boolean;
  };

  // Audio
  audio: {
    musicVolume: number;
    sfxVolume: number;
    music: string;
    meleeHit: string;
    projectileShot: string;
    projectileImpact: string;
    ko: string;
    winner: string;
  };

  // Preview state
  isPlaying: boolean;
  isPaused: boolean;
  currentFrame: number;

  // Actions
  setAspectRatio: (ratio: '1080x1920' | '1920x1080') => void;
  setArenaSize: (size: BattleStore['arenaSize']) => void;
  setCustomArenaDimensions: (width: number, height: number) => void;
  setPreviewHeight: (height: number) => void;
  setFps: (fps: number) => void;
  setSeed: (seed: number) => void;
  randomizeSeed: () => void;
  setMaxDuration: (d: number) => void;
  setSimulationMode: (m: 'auto' | 'forceA' | 'forceB') => void;
  setBattleMode: (mode: 'tournament' | 'free') => void;
  updateFighterA: (updates: Partial<BattleStore['fighterA']>) => void;
  updateFighterAWeapon: (updates: Partial<BattleStore['fighterA']['weapon']>) => void;
  updateFighterB: (updates: Partial<BattleStore['fighterB']>) => void;
  updateFighterBWeapon: (updates: Partial<BattleStore['fighterB']['weapon']>) => void;
  updateSuddenDeath: (thresholds: BattleStore['suddenDeath']['thresholds']) => void;
  updateEffects: (updates: Partial<BattleStore['effects']>) => void;
  updateAudio: (updates: Partial<BattleStore['audio']>) => void;
  setPlaying: (playing: boolean) => void;
  setPaused: (paused: boolean) => void;
  setCurrentFrame: (frame: number) => void;
}

export const useStore = create<BattleStore>((set) => ({
  aspectRatio: '1080x1920',
  arenaSize: 'small',
  customArena: { width: 960, height: 540 },
  previewHeight: 360,
  fps: 60,
  seed: 42,
  maxDuration: 120,
  simulationMode: 'auto',
  battleMode: 'tournament',

  fighterA: {
    countryId: 'kz',
    name: 'Казахстан',
    sprite: '/assets/fighters/fighter_a.svg',
    hp: 1000,
    radius: 64,
    speed: 240,
    mass: 1,
    weapon: {
      sprite: '/assets/weapons/melee_weapon.svg',
      baseDamage: 20,
      damageGrowthPerHit: 2,
      orbitRadius: 104,
      rotationSpeed: 3,
      weaponRadius: 26,
    },
  },

  fighterB: {
    countryId: 'jp',
    name: 'Япония',
    sprite: '/assets/fighters/fighter_b.svg',
    hp: 1000,
    radius: 64,
    speed: 240,
    mass: 1,
    weapon: {
      sprite: '/assets/weapons/ranged_weapon.svg',
      projectileSprite: '/assets/projectiles/projectile.svg',
      baseDamage: 15,
      damageGrowthPerHit: 1.5,
      cooldown: 0.8,
      rotationSpeed: 2,
      projectileSpeed: 400,
      projectileRadius: 8,
      initialProjectileCount: 1,
      projectileGrowthPerHit: 1,
      maxProjectileCount: 4,
      orbitRadius: 100,
      weaponRadius: 24,
    },
  },

  suddenDeath: {
    thresholds: [
      { time: 60, speedMultiplier: 1.3, damageMultiplier: 1.5 },
      { time: 75, speedMultiplier: 1.5, damageMultiplier: 2.0 },
    ],
  },

  effects: {
    particles: true,
    trails: true,
    glow: true,
    hitFlash: true,
    cameraShake: true,
    criticalEffect: true,
    deathSlowMotion: true,
    winnerAnimation: true,
    damageNumbers: true,
  },

  audio: {
    musicVolume: 0.7,
    sfxVolume: 0.7,
    music: '',
    meleeHit: '',
    projectileShot: '',
    projectileImpact: '',
    ko: '',
    winner: '',
  },

  isPlaying: false,
  isPaused: false,
  currentFrame: 0,

  setAspectRatio: (aspectRatio) => set((state) => ({ aspectRatio, arenaSize: state.arenaSize === 'custom' || state.arenaSize === 'square' ? 'small' : state.arenaSize })),
  setArenaSize: (arenaSize) => set((state) => ({
    arenaSize,
    ...(arenaSize === 'custom' ? { customArena: getArenaDimensions(state) } : {}),
  })),
  setCustomArenaDimensions: (width, height) => set((state) => {
    const limits = getArenaResizeLimits(state);
    return {
      arenaSize: 'custom',
      customArena: {
        width: clampArenaDimension(width, limits.minWidth),
        height: clampArenaDimension(height, limits.minHeight),
      },
      isPlaying: false,
      currentFrame: 0,
    };
  }),
  setPreviewHeight: (height) => set({ previewHeight: Math.max(240, Math.min(600, height)) }),
  setFps: (fps) => set({ fps }),
  setSeed: (seed) => set({ seed }),
  randomizeSeed: () => set({ seed: Math.floor(Math.random() * 1000000) }),
  setMaxDuration: (maxDuration) => set({ maxDuration }),
  setSimulationMode: (simulationMode) => set({ simulationMode }),
  setBattleMode: (battleMode) => set({ battleMode }),

  updateFighterA: (updates) =>
    set((state) => ({ fighterA: { ...state.fighterA, ...updates } })),
  updateFighterAWeapon: (updates) =>
    set((state) => ({
      fighterA: { ...state.fighterA, weapon: { ...state.fighterA.weapon, ...updates } },
    })),

  updateFighterB: (updates) =>
    set((state) => ({ fighterB: { ...state.fighterB, ...updates } })),
  updateFighterBWeapon: (updates) =>
    set((state) => ({
      fighterB: { ...state.fighterB, weapon: { ...state.fighterB.weapon, ...updates } },
    })),

  updateSuddenDeath: (thresholds) =>
    set((state) => ({ suddenDeath: { ...state.suddenDeath, thresholds } })),

  updateEffects: (updates) =>
    set((state) => ({ effects: { ...state.effects, ...updates } })),
  updateAudio: (updates) => set((state) => ({ audio: { ...state.audio, ...updates } })),

  setPlaying: (isPlaying) => set({ isPlaying }),
  setPaused: (isPaused) => set({ isPaused }),
  setCurrentFrame: (currentFrame) => set({ currentFrame }),
}));

export function getArenaDimensions(store: Pick<BattleStore, 'arenaSize' | 'aspectRatio' | 'customArena'>) {
  if (store.arenaSize === 'custom') return store.customArena;
  if (store.arenaSize === 'square') return { width: 720, height: 720 };
  const dimensions = { small: [960, 540], medium: [1280, 720], large: [1920, 1080] } as const;
  const [width, height] = dimensions[store.arenaSize];
  return store.aspectRatio === '1080x1920' ? { width: height, height: width } : { width, height };
}

/** Leave enough space for both fighter circles when reducing the arena. */
export function getArenaResizeLimits(store: Pick<BattleStore, 'fighterA' | 'fighterB'>) {
  const diameterSum = 2 * (store.fighterA.radius + store.fighterB.radius);
  const minimum = Math.max(240, Math.ceil(diameterSum / 2) * 2);
  return { minWidth: minimum, minHeight: minimum, maxDimension: Math.max(4096, minimum) };
}

export function getBattleConfigFromStore(store: BattleStore): BattleConfig {
  const locked = store.battleMode === 'tournament';
  // Tournament fights use the standardized fighters/rules below, but the arena is
  // still a user-facing physical setting.  Previously this branch silently
  // replaced it with 1080 × 1920, making the arena controls look broken.
  const { width: w, height: h } = getArenaDimensions(store);
  const countryA = getCountry(store.fighterA.countryId);
  const countryB = getCountry(store.fighterB.countryId);
  return {
    version: 2,
    seed: store.seed,
    fps: locked ? 60 : store.fps,
    maxDuration: locked ? 120 : store.maxDuration,
    simulationMode: locked ? 'auto' : store.simulationMode,
    arena: {
      x: 0,
      y: 0,
      width: w,
      height: h,
    },
    fighters: [
      {
        id: 'A',
        name: store.fighterA.name,
        radius: locked ? 64 : store.fighterA.radius,
        mass: locked ? 1 : store.fighterA.mass,
        hp: locked ? 1000 : store.fighterA.hp,
        speed: locked ? 240 : store.fighterA.speed,
        type: countryA ? runtimeAttackKind(countryA.basicAttackTemplate) : 'melee',
        countryId: countryA?.id,
        attackTemplate: countryA?.basicAttackTemplate,
      },
      {
        id: 'B',
        name: store.fighterB.name,
        radius: locked ? 64 : store.fighterB.radius,
        mass: locked ? 1 : store.fighterB.mass,
        hp: locked ? 1000 : store.fighterB.hp,
        speed: locked ? 240 : store.fighterB.speed,
        type: countryB ? runtimeAttackKind(countryB.basicAttackTemplate) : 'ranged',
        countryId: countryB?.id,
        attackTemplate: countryB?.basicAttackTemplate,
      },
    ],
    melee: {
      baseDamage: locked ? 18 : store.fighterA.weapon.baseDamage,
      damageGrowthPerHit: locked ? 1.5 : store.fighterA.weapon.damageGrowthPerHit,
      orbitRadius: locked ? 104 : store.fighterA.weapon.orbitRadius,
      rotationSpeed: locked ? 3 : store.fighterA.weapon.rotationSpeed,
      weaponRadius: locked ? 26 : store.fighterA.weapon.weaponRadius,
    },
    ranged: {
      baseDamage: locked ? 16 : store.fighterB.weapon.baseDamage,
      damageGrowthPerHit: locked ? 1.25 : store.fighterB.weapon.damageGrowthPerHit,
      orbitRadius: locked ? 100 : store.fighterB.weapon.orbitRadius,
      rotationSpeed: locked ? 2.4 : store.fighterB.weapon.rotationSpeed,
      weaponRadius: locked ? 24 : store.fighterB.weapon.weaponRadius,
      cooldown: locked ? 0.8 : store.fighterB.weapon.cooldown,
      projectileSpeed: locked ? 420 : store.fighterB.weapon.projectileSpeed,
      projectileRadius: locked ? 12 : store.fighterB.weapon.projectileRadius,
      initialProjectileCount: locked ? 1 : store.fighterB.weapon.initialProjectileCount,
      projectileGrowthPerHit: locked ? 0.25 : store.fighterB.weapon.projectileGrowthPerHit,
      maxProjectileCount: locked ? 4 : store.fighterB.weapon.maxProjectileCount,
    },
    suddenDeath: {
      thresholds: locked ? [] : store.suddenDeath.thresholds,
    },
    effects: {
      ...store.effects,
    },
    audio: {
      ...store.audio,
    },
    presentation: { locale: 'ru', showCountryNames: true, showUltimateNames: true },
    battleRules: {
      accelerateAt: 30,
      accelerationMultiplier: 2,
      escalationAt: 60,
      shrinkPerSecond: 0.012,
      minimumArenaScale: 0.35,
      damageRampPerSecond: 0.03,
      healDisabledAt: 60,
      deterministicKoAt: 120,
      ultimateChargePerSecond: 4,
      ultimateDamageDealtFactor: 0.18,
      ultimateDamageReceivedFactor: 0.12,
      ultimateThreshold: 100,
      ultimateLockout: 4,
    },
  };
}
